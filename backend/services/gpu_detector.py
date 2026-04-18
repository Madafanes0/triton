"""CUDA / GPU detection via PyTorch and nvidia-smi."""

from __future__ import annotations

import subprocess
from typing import Any, Dict


def _safe_int(value: str) -> int:
    try:
        return int(float(value.strip()))
    except (ValueError, AttributeError):
        return 0


def _safe_float(value: str) -> float:
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return 0.0


def _query_nvidia_smi() -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "device_name": "",
        "vram_total_mb": 0,
        "vram_used_mb": 0,
        "vram_free_mb": 0,
        "gpu_utilization_pct": 0,
        "driver_version": "",
    }
    try:
        proc = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,driver_version",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            return out
        line = proc.stdout.strip().splitlines()[0]
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 6:
            out["device_name"] = parts[0]
            out["vram_total_mb"] = _safe_int(parts[1])
            out["vram_used_mb"] = _safe_int(parts[2])
            out["vram_free_mb"] = _safe_int(parts[3])
            out["gpu_utilization_pct"] = int(_safe_float(parts[4]))
            out["driver_version"] = parts[5]
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass
    return out


def is_cuda_available() -> bool:
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:
        return False


def get_gpu_status() -> Dict[str, Any]:
    """Aggregate status for GET /gpu/status."""
    cuda = is_cuda_available()
    smi = _query_nvidia_smi()
    device_name = smi["device_name"]
    if cuda and not device_name:
        try:
            import torch

            device_name = torch.cuda.get_device_name(0)
        except Exception:
            device_name = "CUDA device"
    return {
        "cuda_available": cuda,
        "device_name": device_name or ("No GPU" if not cuda else ""),
        "vram_total_mb": smi["vram_total_mb"],
        "vram_used_mb": smi["vram_used_mb"],
        "vram_free_mb": smi["vram_free_mb"],
        "gpu_utilization_pct": smi["gpu_utilization_pct"],
        "driver_version": smi["driver_version"],
    }
