"""Project file read/write under project root."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend import config

router = APIRouter(prefix="/files", tags=["files"])


def _project_root() -> Path:
    return Path(config.get_project_root()).resolve()


def _safe_rel(rel: str) -> Path:
    if not rel or rel.startswith(("/", "\\")):
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_PATH", "message": "Path must be relative", "detail": {}},
        )
    p = Path(rel)
    if ".." in p.parts:
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_PATH", "message": "Path traversal not allowed", "detail": {}},
        )
    full = (_project_root() / p).resolve()
    try:
        full.relative_to(_project_root())
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_PATH", "message": "Outside project root", "detail": {}},
        ) from exc
    return full


class SaveBody(BaseModel):
    path: str = Field(..., description="Relative path within project")
    content: str


@router.get("/read")
async def read_file(path: str = Query(..., description="Relative path")) -> dict[str, Any]:
    config.refresh_config()
    target = _safe_rel(path)
    if not target.is_file():
        raise HTTPException(
            status_code=404,
            detail={"error": "NOT_FOUND", "message": "File not found", "detail": {"path": path}},
        )
    text = target.read_text(encoding="utf-8")
    return {"path": path, "content": text}


@router.post("/save")
async def save_file(body: SaveBody) -> dict[str, Any]:
    config.refresh_config()
    target = _safe_rel(body.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body.content, encoding="utf-8")
    return {"path": body.path, "saved": True}

