"""Persisted settings (model + paths + UI)."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend import config

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    settings: dict[str, Any]


class SettingsUpdate(BaseModel):
    llm_backend: Optional[str] = None
    model_name: Optional[str] = None
    model_path: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    xgrammar_enabled: Optional[bool] = None
    execution_timeout_sec: Optional[int] = None
    gpu_required: Optional[bool] = None
    font_size_px: Optional[int] = None
    line_height: Optional[float] = None
    project_folder: Optional[str] = None


@router.get("")
async def get_settings() -> dict[str, Any]:
    config.refresh_config()
    data = config.load_config()
    data["project_root"] = str(config.get_project_root())
    return {"settings": data}


@router.post("")
async def post_settings(body: SettingsUpdate) -> dict[str, Any]:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "project_folder" in updates and updates["project_folder"]:
        try:
            config.set_app_project_root(str(updates["project_folder"]))
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_PATH",
                    "message": str(exc),
                    "detail": {},
                },
            ) from exc
    # Persist model/UI settings in project config.json
    saved = config.save_config(updates)
    config.refresh_config()
    saved["project_root"] = str(config.get_project_root())
    return {"settings": saved}
