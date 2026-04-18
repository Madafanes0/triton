"""Safe PyTorch file execution with GPU gate and SSE streaming."""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator, Dict, Optional

from backend import config
from backend.services import gpu_detector


@dataclass
class RunState:
    queue: asyncio.Queue[Optional[Dict[str, Any]]]
    task: asyncio.Task[None]


_streams: Dict[str, RunState] = {}


def _project_dir() -> Path:
    return Path(config.get_project_root()).resolve()


def _is_safe_relative_path(rel: str) -> bool:
    if not rel or rel.startswith(("/", "\\")):
        return False
    norm = Path(rel)
    if ".." in norm.parts:
        return False
    try:
        resolved = (_project_dir() / norm).resolve()
        resolved.relative_to(_project_dir())
    except ValueError:
        return False
    return True


async def _run_subprocess(
    filepath: Path,
    timeout_sec: int,
    q: asyncio.Queue[Optional[Dict[str, Any]]],
) -> None:
    proc: Optional[asyncio.subprocess.Process] = None
    try:
        child_env = {**os.environ, "PYTHONUNBUFFERED": "1"}
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-u",
            str(filepath),
            cwd=str(_project_dir()),
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=child_env,
        )
        assert proc.stdout and proc.stderr

        async def pump(reader: asyncio.StreamReader, tag: str) -> None:
            while True:
                line = await reader.readline()
                if not line:
                    break
                text = line.decode(errors="replace")
                await q.put({"type": "output", "stream": tag, "text": text})

        async def pumps_and_wait() -> int:
            await asyncio.gather(
                pump(proc.stdout, "stdout"),  # type: ignore[union-attr]
                pump(proc.stderr, "stderr"),  # type: ignore[union-attr]
            )
            await proc.wait()  # type: ignore[union-attr]
            rc = proc.returncode  # type: ignore[union-attr]
            return int(rc) if rc is not None else -1

        rc = await asyncio.wait_for(pumps_and_wait(), timeout=timeout_sec)
        await q.put({"type": "exit", "returncode": rc})
    except asyncio.TimeoutError:
        if proc and proc.returncode is None:
            proc.kill()
            await proc.wait()
        await q.put(
            {
                "type": "error",
                "error": "EXECUTION_TIMEOUT",
                "message": f"Execution exceeded {timeout_sec}s",
            }
        )
        await q.put({"type": "exit", "returncode": -1})
    except Exception as exc:
        if proc and proc.returncode is None:
            try:
                proc.kill()
                await proc.wait()
            except Exception:
                pass
        await q.put(
            {
                "type": "error",
                "error": "EXECUTION_FAILED",
                "message": str(exc),
            }
        )
        await q.put({"type": "exit", "returncode": -1})
    finally:
        await q.put(None)


async def start_execution_async(filepath_rel: str, content: Optional[str]) -> Dict[str, Any]:
    """
    Validate path, GPU gate, write optional content to temp under project/.torchforge/, spawn run.
    Returns { run_id } or raises ValueError with message code for HTTP layer.
    """
    config.refresh_config()
    if not _is_safe_relative_path(filepath_rel):
        raise ValueError("INVALID_PATH")

    if gpu_detector.is_cuda_available() is False and config.is_gpu_required():
        raise ValueError("GPU_NOT_AVAILABLE")

    project = _project_dir()
    run_id = str(uuid.uuid4())
    run_dir = project / ".torchforge"
    run_dir.mkdir(parents=True, exist_ok=True)
    target = run_dir / f"run_{run_id}.py"

    if content is not None:
        target.write_text(content, encoding="utf-8")
    else:
        src = (project / Path(filepath_rel)).resolve()
        try:
            src.relative_to(project)
        except ValueError as exc:
            raise ValueError("INVALID_PATH") from exc
        if not src.is_file():
            raise ValueError("FILE_NOT_FOUND")
        target.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    q: asyncio.Queue[Optional[Dict[str, Any]]] = asyncio.Queue()
    timeout_sec = config.get_execution_timeout_sec()

    task = asyncio.create_task(_run_subprocess(target, timeout_sec, q))
    _streams[run_id] = RunState(queue=q, task=task)
    return {"run_id": run_id}


async def stream_run(run_id: str) -> AsyncIterator[Dict[str, Any]]:
    state = _streams.get(run_id)
    if not state:
        yield {"type": "error", "error": "NOT_FOUND", "message": "Unknown run_id", "detail": {}}
        return
    while True:
        item = await state.queue.get()
        if item is None:
            break
        yield item
    _streams.pop(run_id, None)
