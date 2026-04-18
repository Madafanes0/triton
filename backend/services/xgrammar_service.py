"""xGrammar JSON-schema compilation and constrained decoding helpers."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Optional, Tuple

from backend.schemas.agent_response import AgentResponse, get_agent_response_json_schema


def build_grammar_compiler() -> Tuple[Any, Any]:
    """
    Build xGrammar GrammarCompiler + compiled JSON schema grammar.
    Requires `transformers` for tokenizer alignment with the target model family.
    Raises RuntimeError if xgrammar or transformers is unavailable.
    """
    import xgrammar as xgr  # noqa: PLC0415

    schema_str = json.dumps(get_agent_response_json_schema())
    try:
        from transformers import AutoTokenizer  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError("transformers required for xgrammar tokenizer binding") from exc

    tok_id = os.environ.get("TORCHFORGE_XGRAMMAR_TOKENIZER", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
    tokenizer = AutoTokenizer.from_pretrained(tok_id, trust_remote_code=True)
    vocab_size = getattr(tokenizer, "vocab_size", None) or len(tokenizer)
    tokenizer_info = xgr.TokenizerInfo.from_huggingface(tokenizer, vocab_size=vocab_size)
    compiler = xgr.GrammarCompiler(tokenizer_info)
    compiled = compiler.compile_json_schema(schema_str)
    return compiler, compiled


def extract_json_object(text: str) -> str:
    """Strip markdown fences and return the first balanced JSON object substring."""
    s = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", s, re.IGNORECASE)
    if fence:
        s = fence.group(1).strip()
    start = s.find("{")
    if start < 0:
        return s
    depth = 0
    for i in range(start, len(s)):
        c = s[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return s[start:]


def parse_agent_response(text: str) -> AgentResponse:
    raw = extract_json_object(text)
    data = json.loads(raw)
    return AgentResponse.model_validate(data)


def validate_or_retry_prompt(
    raw_output: str,
    last_error: Optional[str],
) -> str:
    """Append validation error for LLM retry turns."""
    base = "Respond with ONLY a single JSON object matching the TorchForge schema. No markdown."
    if last_error:
        return f"{base}\nPrevious output failed validation: {last_error}\nRaw output was:\n{raw_output[:8000]}"
    return base
