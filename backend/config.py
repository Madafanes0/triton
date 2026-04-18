"""TorchForge backend configuration — loaded from config.json in project folder."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Literal

# Repository root (contains backend/, electron/, project/ default)
_REPO_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_PROJECT = _REPO_ROOT / "project"
_APP_STATE_PATH = _REPO_ROOT / "app_config.json"

LLMBackend = Literal["ollama", "llamacpp"]


def _read_app_project_root() -> Path | None:
    if not _APP_STATE_PATH.is_file():
        return None
    try:
        with open(_APP_STATE_PATH, encoding="utf-8") as f:
            data = json.load(f)
        pr = data.get("project_root") or data.get("project_folder")
        if pr:
            return Path(str(pr)).expanduser().resolve()
    except (json.JSONDecodeError, OSError, TypeError):
        pass
    return None


def set_app_project_root(path: str | Path) -> Path:
    """Persist selected project folder for subsequent launches."""
    resolved = Path(path).expanduser().resolve()
    _APP_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {"project_root": str(resolved)}
    try:
        if _APP_STATE_PATH.is_file():
            with open(_APP_STATE_PATH, encoding="utf-8") as f:
                existing = json.load(f)
            if isinstance(existing, dict):
                existing.update(payload)
                payload = existing  # type: ignore[assignment]
    except (json.JSONDecodeError, OSError):
        pass
    with open(_APP_STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return resolved


def get_project_root() -> Path:
    root = os.environ.get("TORCHFORGE_PROJECT_ROOT")
    if root:
        return Path(root).resolve()
    from_app = _read_app_project_root()
    if from_app:
        return from_app
    return _DEFAULT_PROJECT.resolve()


def _config_path() -> Path:
    return get_project_root() / "config.json"


def default_config() -> dict[str, Any]:
    return {
        "llm_backend": "ollama",
        "model_name": "codellama:13b-instruct",
        "model_path": "./models/codellama-13b.gguf",
        "max_tokens": 2048,
        "temperature": 0.2,
        "xgrammar_enabled": True,
        # Triton compilation / first-run JIT can be slow on some machines.
        "execution_timeout_sec": 600,
        "gpu_required": True,
        "font_size_px": 14,
        "line_height": 1.5,
        "project_folder": "",
    }


def load_config() -> dict[str, Any]:
    path = _config_path()
    base = default_config()
    if not path.is_file():
        return base
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            allowed = set(default_config().keys())
            for k, v in data.items():
                if k in allowed:
                    base[k] = v  # type: ignore[index]
    except (json.JSONDecodeError, OSError):
        pass
    return base


def save_config(updates: dict[str, Any]) -> dict[str, Any]:
    current = load_config()
    allowed = set(default_config().keys())
    for key, val in updates.items():
        if key in allowed:
            current[key] = val
    path = _config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    return current


# Module-level snapshot (refreshed on save)
_config = load_config()


def refresh_config() -> None:
    global _config
    _config = load_config()


def get_llm_backend() -> LLMBackend:
    b = str(_config.get("llm_backend", "ollama")).lower()
    return "llamacpp" if b == "llamacpp" else "ollama"


def get_model_name() -> str:
    return str(_config.get("model_name", "codellama:13b-instruct"))


def get_model_path() -> str:
    return str(_config.get("model_path", "./models/codellama-13b.gguf"))


def get_max_tokens() -> int:
    return int(_config.get("max_tokens", 2048))


def get_temperature() -> float:
    return float(_config.get("temperature", 0.2))


def is_xgrammar_enabled() -> bool:
    return bool(_config.get("xgrammar_enabled", True))


def get_execution_timeout_sec() -> int:
    return int(_config.get("execution_timeout_sec", 120))


def is_gpu_required() -> bool:
    return bool(_config.get("gpu_required", True))


def get_font_size_px() -> int:
    return int(_config.get("font_size_px", 14))


def get_line_height() -> float:
    return float(_config.get("line_height", 1.5))
