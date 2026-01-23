"""Audit API Routes - Conversation History

Provides endpoints to retrieve conversation history from Elastic Agent Builder
for audit and review purposes. Proxies requests to Kibana's conversation API.

Endpoints:
- GET /api/audit/conversations - List all conversations
- GET /api/audit/conversations/{conversation_id} - Get full conversation detail
"""

from typing import Optional

import requests
from fastapi import APIRouter, HTTPException, Query

from ..config import settings

router = APIRouter(prefix="/api/audit", tags=["audit"])


def get_auth_headers() -> dict:
    """Get authentication headers for Kibana API."""
    return {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
    }


def get_conversations_url() -> str:
    """Get the Kibana conversations API URL."""
    return f"{settings.KIBANA_URL}/api/agent_builder/conversations"


@router.get("/conversations")
async def list_conversations(
    agent_id: str | None = Query(None, description="Filter by agent ID"),
):
    """List all conversations from Agent Builder.

    Optionally filter by agent_id to show only conversations for a specific agent.
    Returns conversation summaries (id, title, agent, user, timestamps).
    """
    try:
        # Build URL with optional query params
        url = get_conversations_url()
        params = {}
        if agent_id:
            params["agent_id"] = agent_id

        response = requests.get(
            url,
            headers=get_auth_headers(),
            params=params,
            timeout=30,
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch conversations: {response.text}",
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to connect to Agent Builder: {e!s}"
        )


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get full conversation detail by ID.

    Returns complete conversation including:
    - Metadata (id, title, agent, user, timestamps)
    - Rounds (each user→assistant exchange)
    - Steps within each round (reasoning, tool_calls, tool_results)
    - Final responses for each round
    - Performance timing (time_to_first_token, time_to_last_token)
    """
    try:
        url = f"{get_conversations_url()}/{conversation_id}"

        response = requests.get(
            url,
            headers=get_auth_headers(),
            timeout=30,
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=404, detail=f"Conversation not found: {conversation_id}"
            )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch conversation: {response.text}",
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to connect to Agent Builder: {e!s}"
        )


@router.get("/health")
async def audit_health():
    """Health check for audit endpoints."""
    try:
        # Test connectivity to conversations API
        response = requests.get(
            get_conversations_url(),
            headers=get_auth_headers(),
            timeout=10,
        )

        return {
            "status": "healthy" if response.ok else "unhealthy",
            "kibana_connected": response.ok,
            "kibana_url": settings.KIBANA_URL,
        }
    except requests.RequestException as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }
