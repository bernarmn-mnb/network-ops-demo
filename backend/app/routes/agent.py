"""
Agent Builder Proxy Route

This route proxies requests to the Elastic Agent Builder API,
keeping API keys secure on the backend while enabling streaming.

CRITICAL PATTERNS (from hive-mind documentation):
- Use iter_content(chunk_size=None) NOT iter_lines() for SSE
- Pass raw bytes to preserve SSE protocol newlines
- Handle errors gracefully within the stream

API ENDPOINTS:
- Streaming: POST /api/agent_builder/converse/async
- Synchronous: POST /api/agent_builder/converse
"""

import json
import requests
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from ..config import settings

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    input: str
    conversation_id: Optional[str] = None


def get_streaming_api_url() -> str:
    """Construct the Agent Builder streaming API URL."""
    # The streaming API endpoint is:
    # {kibana_url}/api/agent_builder/converse/async
    return f"{settings.KIBANA_URL}/api/agent_builder/converse/async"


def get_auth_headers() -> dict:
    """Get authentication headers for Kibana API."""
    return {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",  # Required for Kibana API calls
    }


@router.post("/chat")
async def chat_agent(request: ChatRequest):
    """
    Proxy chat requests to the Elastic Agent Builder.
    
    Streams SSE events from Agent Builder back to the frontend.
    This keeps the API key secure while enabling real-time streaming.
    """
    # Construct the upstream payload
    # Note: agent_id is required in the body, not the URL
    payload = {
        "input": request.input,
        "agent_id": settings.AGENT_ID,
    }
    
    # Include conversation_id if provided (for multi-turn conversations)
    if request.conversation_id:
        payload["conversation_id"] = request.conversation_id
    
    try:
        # Make streaming request to Agent Builder
        upstream_response = requests.post(
            get_streaming_api_url(),
            headers=get_auth_headers(),
            json=payload,
            stream=True,  # CRITICAL: Enable streaming
            timeout=120,  # Agent responses can take time
        )
        
        # Check for upstream errors
        if not upstream_response.ok:
            error_body = upstream_response.text
            raise HTTPException(
                status_code=upstream_response.status_code,
                detail=f"Agent Builder error: {error_body}"
            )
        
        def event_generator():
            """
            Generate SSE events from upstream response.
            
            CRITICAL: Use iter_content() NOT iter_lines()
            iter_lines() strips empty lines which breaks SSE protocol
            """
            try:
                # chunk_size=None lets requests determine optimal chunk size
                for chunk in upstream_response.iter_content(chunk_size=None):
                    if chunk:
                        yield chunk
            except Exception as e:
                # Graceful error handling - send error as SSE event
                error_msg = json.dumps({
                    "event": "error", 
                    "data": {"message": str(e)}
                })
                yield f"data: {error_msg}\n\n".encode('utf-8')
            finally:
                upstream_response.close()
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
        
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Agent Builder: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for the agent proxy."""
    # Verify configuration is valid
    try:
        settings.validate()
        return {
            "status": "healthy",
            "agent_id": settings.AGENT_ID,
            "kibana_configured": bool(settings.KIBANA_URL),
        }
    except ValueError as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }

