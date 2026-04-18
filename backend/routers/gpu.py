"""GPU status endpoint."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from backend.services import gpu_detector

router = APIRouter(prefix="/gpu", tags=["gpu"])


@router.get("/status")
async def gpu_status() -> dict[str, Any]:
    return gpu_detector.get_gpu_status()
