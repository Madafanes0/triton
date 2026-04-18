"""TorchForge FastAPI application entry."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import agent, execute, files, gpu, lint, settings

app = FastAPI(title="TorchForge IDE Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(agent.router)
app.include_router(execute.router)
app.include_router(files.router)
app.include_router(gpu.router)
app.include_router(lint.router)
app.include_router(settings.router)
