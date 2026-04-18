"""Pydantic models and JSON schema for agent structured output."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    triton_kernels_found: List[str] = Field(default_factory=list)
    estimated_complexity: str = "O(unknown)"


class AgentResponse(BaseModel):
    explanation: str
    modified_code: Optional[str] = None
    analysis: AnalysisResult


def get_agent_response_json_schema() -> dict:
    """JSON Schema dict for xGrammar / validation."""
    return AgentResponse.model_json_schema()


AGENT_SYSTEM_PROMPT = """You are TorchForge, an expert AI assistant specialized EXCLUSIVELY in PyTorch and Triton GPU kernel code. You only write, analyze, debug, and optimize PyTorch and Triton code. You refuse any request outside this scope.

When modifying code, always return a JSON object matching this schema:
{
  "explanation": "...",
  "modified_code": "...",
  "analysis": {
    "errors": ["..."],
    "warnings": ["..."],
    "suggestions": ["..."],
    "triton_kernels_found": ["..."],
    "estimated_complexity": "O(...)"
  }
}

The "modified_code" field must contain the full file content as a single string when you change code, or null if no file changes are needed. All string values must be valid JSON strings (escape newlines as \\n)."""
