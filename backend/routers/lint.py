"""Python syntax diagnostics for editor inline lint."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/lint", tags=["lint"])


class LintBody(BaseModel):
    content: str = Field(..., description="Python source to check")


class Diagnostic(BaseModel):
    line: int
    column: int = 0
    message: str
    severity: str = "error"


@router.post("/analyze")
async def lint_analyze(body: LintBody) -> dict[str, Any]:
    diagnostics: List[Diagnostic] = []
    try:
        compile(body.content, "<torchforge>", "exec")
    except SyntaxError as exc:
        line = exc.lineno or 1
        col = exc.offset or 0
        diagnostics.append(
            Diagnostic(
                line=line,
                column=col,
                message=exc.msg or "Syntax error",
                severity="error",
            )
        )
    except Exception as exc:
        diagnostics.append(
            Diagnostic(line=1, column=0, message=str(exc), severity="error")
        )
    return {"diagnostics": [d.model_dump() for d in diagnostics]}

