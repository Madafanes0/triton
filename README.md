# TorchForge IDE

TorchForge is a **local-only** desktop IDE for **PyTorch + Triton** kernel development. It ships with an **Electron + React (TypeScript)** UI, a **FastAPI** backend, an embedded **xterm.js** terminal, and an **LLM agent** that returns **JSON-structured** responses validated with **Pydantic** (and optional **xGrammar** tooling on the backend).

## Requirements

- Python **3.11+**
- Node.js **18+** (for Vite/Electron)
- **NVIDIA GPU + CUDA** (execution is blocked without CUDA — Triton kernels are not executed on CPU)
- Optional: **Ollama** or a local **GGUF** model for **llama.cpp**

## Quick start

```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

This will:

1. Create `venv/`, install PyTorch (CUDA 12.1 wheels), Python deps, and npm deps.
2. Start the FastAPI backend on `http://127.0.0.1:7433`.
3. Launch Vite + Electron pointed at `http://127.0.0.1:5173`.

## Configuration

- **Project settings** (model name, timeouts, UI) persist to `project/config.json` inside the active project folder.
- **Last selected project root** persists to `app_config.json` at the repository root (so the backend can find your workspace before reading `project/config.json`).

## Backend-only smoke test

```bash
source venv/bin/activate
export PYTHONPATH="$(pwd)"
uvicorn backend.main:app --port 7433 --reload
```

```bash
curl -s http://127.0.0.1:7433/health
curl -s http://127.0.0.1:7433/gpu/status
```

## Notes

- **Torch/Triton** are intentionally **not** bundled inside the Electron app — they must exist in the Python environment used by the backend.
- The agent backend defaults to **Ollama**; switch to **llama.cpp** in **Settings** if you prefer a GGUF file.
