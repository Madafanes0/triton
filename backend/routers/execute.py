"""Run Python files under project/ with SSE output stream."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.services import code_executor

router = APIRouter(prefix="/execute", tags=["execute"])


class ExecuteBody(BaseModel):
    filepath: str = Field(..., description="Relative path inside project (used when content omitted)")
    content: Optional[str] = Field(None, description="Editor snapshot; written to temp file before run")


def _err(status: int, code: str, message: str, detail: dict[str, Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": code, "message": message, "detail": detail or {}},
    )


@router.post("")
async def execute_post(body: ExecuteBody) -> Any:
    try:
        result = await code_executor.start_execution_async(body.filepath, body.content)
        return result
    except ValueError as exc:
        code = str(exc)
        if code == "GPU_NOT_AVAILABLE":
            return _err(
                400,
                "GPU_NOT_AVAILABLE",
                "Triton kernels require a CUDA-capable GPU. Execution blocked.",
                {},
            )
        if code == "FILE_NOT_FOUND":
            return _err(404, "NOT_FOUND", "File not found", {"filepath": body.filepath})
        return _err(400, "INVALID_PATH", "Invalid or unsafe path", {})


async def _sse_gen(run_id: str) -> AsyncIterator[bytes]:
    async for ev in code_executor.stream_run(run_id):
        payload = json.dumps(ev, ensure_ascii=False)
        yield f"data: {payload}\n\n".encode("utf-8")


@router.get("/stream/{run_id}")
async def execute_stream(run_id: str) -> StreamingResponse:
    return StreamingResponse(_sse_gen(run_id), media_type="text/event-stream")
