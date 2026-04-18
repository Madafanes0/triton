"""Pluggable LLM: Ollama or llama.cpp with structured JSON output."""

from __future__ import annotations

import asyncio
import json
import queue
import threading
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional

from pydantic import ValidationError

from backend import config
from backend.schemas.agent_response import AGENT_SYSTEM_PROMPT
from backend.services import xgrammar_service


_llama_instance: Any = None


def _get_llama() -> Any:
    global _llama_instance
    if _llama_instance is not None:
        return _llama_instance
    from llama_cpp import Llama  # noqa: PLC0415

    config.refresh_config()
    path = Path(config.get_model_path()).expanduser()
    if not path.is_file():
        raise FileNotFoundError(str(path))
    try:
        import torch

        n_gpu = -1 if torch.cuda.is_available() else 0
    except Exception:
        n_gpu = 0
    _llama_instance = Llama(model_path=str(path), n_gpu_layers=n_gpu, verbose=False)
    return _llama_instance


def _check_ollama_reachable() -> None:
    import ollama  # noqa: PLC0415

    try:
        ollama.list()
    except Exception as exc:
        raise ConnectionError(
            "Ollama service not reachable. Start Ollama and ensure it is listening on localhost:11434 "
            "(e.g. open the Ollama app, or run `ollama serve`), then pull a model "
            f"(e.g. `ollama pull {config.get_model_name()}`)."
        ) from exc


def _ollama_stream_messages(messages: List[Dict[str, str]]) -> queue.Queue:
    q: queue.Queue = queue.Queue()
    model = config.get_model_name()

    def worker() -> None:
        try:
            import ollama  # noqa: PLC0415

            stream = ollama.chat(
                model=model,
                messages=messages,
                stream=True,
                options={
                    "temperature": config.get_temperature(),
                    "num_predict": config.get_max_tokens(),
                },
            )
            for chunk in stream:
                msg = chunk.get("message") or {}
                piece = msg.get("content") or ""
                if piece:
                    q.put({"type": "token", "text": piece})
        except Exception as exc:
            q.put({"type": "error", "error": "MODEL_NOT_LOADED", "message": str(exc)})
        finally:
            q.put(None)

    threading.Thread(target=worker, daemon=True).start()
    return q


def _llama_stream_messages(messages: List[Dict[str, str]]) -> queue.Queue:
    q: queue.Queue = queue.Queue()

    def worker() -> None:
        try:
            llm = _get_llama()
            config.refresh_config()
            stream = llm.create_chat_completion(
                messages=messages,
                max_tokens=config.get_max_tokens(),
                temperature=config.get_temperature(),
                stream=True,
            )
            for chunk in stream:
                choice = (chunk.get("choices") or [{}])[0]
                delta = choice.get("delta") or {}
                piece = delta.get("content") or ""
                if piece:
                    q.put({"type": "token", "text": piece})
        except FileNotFoundError as exc:
            q.put({"type": "error", "error": "MODEL_NOT_LOADED", "message": str(exc)})
        except Exception as exc:
            q.put({"type": "error", "error": "MODEL_NOT_LOADED", "message": str(exc)})
        finally:
            q.put(None)

    threading.Thread(target=worker, daemon=True).start()
    return q


async def _drain_token_queue(q: queue.Queue) -> AsyncIterator[Dict[str, Any]]:
    loop = asyncio.get_running_loop()
    while True:
        item: Any = await loop.run_in_executor(None, q.get)
        if item is None:
            break
        yield item


def _build_messages(
    user_text: str,
    code_context: Optional[str],
    attach_file: bool,
    retry_hint: Optional[str],
) -> List[Dict[str, str]]:
    sys_content = AGENT_SYSTEM_PROMPT
    if retry_hint:
        sys_content += "\n\n" + retry_hint
    user_body = user_text
    if attach_file and code_context:
        user_body += "\n\n--- CURRENT FILE ---\n" + code_context + "\n--- END FILE ---\n"
    return [
        {"role": "system", "content": sys_content},
        {"role": "user", "content": user_body},
    ]


async def stream_agent_completion(
    user_text: str,
    code_context: Optional[str],
    attach_file: bool,
) -> AsyncIterator[Dict[str, Any]]:
    """
    Yields token events, then a complete or error event.
    Retries up to 2 times on JSON / schema validation failure when xgrammar post-validate is used.
    """
    config.refresh_config()
    max_attempts = 3
    last_raw = ""
    last_err: Optional[str] = None

    for attempt in range(1, max_attempts + 1):
        retry_hint = None
        if attempt > 1:
            retry_hint = xgrammar_service.validate_or_retry_prompt(last_raw, last_err)

        messages = _build_messages(user_text, code_context, attach_file, retry_hint)

        if config.get_llm_backend() == "ollama":
            try:
                _check_ollama_reachable()
            except Exception as exc:
                yield {
                    "type": "error",
                    "error": "MODEL_NOT_LOADED",
                    "message": str(exc),
                    "detail": {},
                }
                return
            token_q = _ollama_stream_messages(messages)
        else:
            try:
                token_q = _llama_stream_messages(messages)
            except FileNotFoundError as exc:
                yield {
                    "type": "error",
                    "error": "MODEL_NOT_LOADED",
                    "message": str(exc),
                    "detail": {},
                }
                return

        parts: List[str] = []
        async for ev in _drain_token_queue(token_q):
            if ev.get("type") == "error":
                yield ev
                return
            if ev.get("type") == "token":
                parts.append(ev.get("text", ""))
                yield {"type": "chunk", "text": ev.get("text", "")}

        raw = "".join(parts)
        last_raw = raw
        try:
            parsed = xgrammar_service.parse_agent_response(raw)
            yield {"type": "complete", "response": parsed.model_dump()}
            return
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            last_err = str(exc)
            if attempt >= max_attempts:
                yield {
                    "type": "error",
                    "error": "XGRAMMAR_PARSE_FAIL",
                    "message": "Model output was not valid JSON for the TorchForge schema.",
                    "detail": {"raw": raw[:50000]},
                }
                return
            # Retry: emit a small notice for UI
            yield {
                "type": "retry",
                "attempt": attempt,
                "message": "Validation failed; retrying with stricter instructions…",
            }
