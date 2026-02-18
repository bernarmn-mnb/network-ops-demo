"""Agent Builder Management Routes

CRUD proxy for Agent Builder agents and tools via the Kibana REST API.
Keeps API keys secure on the backend. Complements agent.py (chat streaming)
and follows the same proxy pattern as workflows.py.

API REFERENCE:
- Agents: /api/agent_builder/agents
- Tools:  /api/agent_builder/tools
- Chat:   /api/agent_builder/converse (sync), /api/agent_builder/converse/async (SSE)
- See: hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md
"""

from typing import Any

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/agent", tags=["agent-management"])


# ── Helpers ──────────────────────────────────────────────────────────────────


def get_headers() -> dict:
    """Auth headers for Agent Builder API."""
    return {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
    }


def kibana_url(path: str) -> str:
    """Build full Kibana API URL."""
    base = settings.KIBANA_URL.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def proxy_get(path: str) -> Any:
    try:
        resp = requests.get(kibana_url(path), headers=get_headers(), timeout=30)
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_post(path: str, json_body: Any = None, timeout: int = 60) -> Any:
    try:
        resp = requests.post(
            kibana_url(path), headers=get_headers(), json=json_body, timeout=timeout
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_put(path: str, json_body: Any = None) -> Any:
    try:
        resp = requests.put(
            kibana_url(path), headers=get_headers(), json=json_body, timeout=30
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_delete(path: str) -> Any:
    try:
        resp = requests.delete(kibana_url(path), headers=get_headers(), timeout=30)
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        if resp.text:
            return resp.json()
        return {"status": "deleted"}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


# ── Request Models ───────────────────────────────────────────────────────────


class CreateAgentRequest(BaseModel):
    id: str
    name: str
    description: str = ""
    instructions: str
    tool_ids: list[str] = []
    labels: list[str] = []


class UpdateAgentRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: str | None = None
    tool_ids: list[str] | None = None


class CreateToolRequest(BaseModel):
    id: str
    type: str  # "index_search", "esql", "workflow"
    description: str
    configuration: dict[str, Any]
    tags: list[str] = []


class TestChatRequest(BaseModel):
    input: str
    agent_id: str
    conversation_id: str | None = None


# ── Agent Routes ─────────────────────────────────────────────────────────────


@router.get("/agents")
async def list_agents():
    """List all Agent Builder agents."""
    return proxy_get("api/agent_builder/agents")


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get a specific agent's configuration including system prompt and tools."""
    return proxy_get(f"api/agent_builder/agents/{agent_id}")


@router.post("/agents")
async def create_agent(request: CreateAgentRequest):
    """Create a new Agent Builder agent.

    Accepts a flat request body and maps it to the Kibana API format.
    The system prompt goes in configuration.instructions.
    """
    body = {
        "id": request.id,
        "name": request.name,
        "description": request.description,
        "labels": request.labels,
        "configuration": {
            "instructions": request.instructions,
            "tools": [{"tool_ids": request.tool_ids}] if request.tool_ids else [],
        },
    }
    return proxy_post("api/agent_builder/agents", body)


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update an existing agent's name, prompt, or tools.

    Only provided fields are updated. Omitted fields are left unchanged.
    """
    # Build update body with only provided fields
    body: dict[str, Any] = {}
    if request.name is not None:
        body["name"] = request.name
    if request.description is not None:
        body["description"] = request.description

    config: dict[str, Any] = {}
    if request.instructions is not None:
        config["instructions"] = request.instructions
    if request.tool_ids is not None:
        config["tools"] = [{"tool_ids": request.tool_ids}]
    if config:
        body["configuration"] = config

    return proxy_put(f"api/agent_builder/agents/{agent_id}", body)


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    return proxy_delete(f"api/agent_builder/agents/{agent_id}")


# ── Tool Routes ──────────────────────────────────────────────────────────────


@router.get("/tools")
async def list_tools():
    """List all available tools (built-in and custom)."""
    return proxy_get("api/agent_builder/tools")


@router.post("/tools")
async def create_tool(request: CreateToolRequest):
    """Create a custom tool (index_search, esql, or workflow type)."""
    body = {
        "id": request.id,
        "type": request.type,
        "description": request.description,
        "tags": request.tags,
        "configuration": request.configuration,
    }
    return proxy_post("api/agent_builder/tools", body)


@router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: str):
    """Delete a custom tool."""
    return proxy_delete(f"api/agent_builder/tools/{tool_id}")


# ── Test Chat (Non-Streaming) ───────────────────────────────────────────────


@router.post("/chat/test")
async def test_chat(request: TestChatRequest):
    """Send a non-streaming test message to an agent.

    Returns the full response (no SSE). Useful for testing agent behaviour
    before wiring up the streaming UI. Accepts any agent_id — not limited
    to the AGENT_ID in .env.
    """
    body: dict[str, Any] = {
        "input": request.input,
        "agent_id": request.agent_id,
    }
    if request.conversation_id:
        body["conversation_id"] = request.conversation_id
    return proxy_post("api/agent_builder/converse", body, timeout=120)
