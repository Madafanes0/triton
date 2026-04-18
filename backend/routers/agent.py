"""Agent chat with SSE streaming."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.services import llm_service

router = APIRouter(prefix="/agent", tags=["agent"])


class ChatBody(BaseModel):
    message: str = Field(..., description="User message")
    code_context: Optional[str] = Field(None, description="Current editor buffer")
    attach_file: bool = Field(True, description="Append file to prompt")


async def _chat_sse(body: ChatBody) -> AsyncIterator[bytes]:
    async for ev in llm_service.stream_agent_completion(
        body.message,
        body.code_context,
        body.attach_file,
    ):
        yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n".encode("utf-8")


@router.post("/chat")
async def agent_chat(body: ChatBody) -> StreamingResponse:
    return StreamingResponse(_chat_sse(body), media_type="text/event-stream")
