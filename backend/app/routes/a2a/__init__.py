"""
A2A Routes Package

Agent-to-Agent communication routes using OpenAI function calling.
Provides a coordinator LLM that can call Agent Builder agents and
client-side functions.

Modules:
- agents.py: Agent card fetching and /agents endpoints
- functions.py: Function definition builders
- chat.py: Main chat endpoint with function calling
- health.py: Health check and configuration status

Usage:
    from backend.app.routes.a2a import router
    app.include_router(router)

Endpoints:
- GET  /api/a2a/health          - Check A2A configuration status
- GET  /api/a2a/health/test     - Test LLM proxy connectivity
- GET  /api/a2a/agents          - List all agents with function definitions
- GET  /api/a2a/agents/{id}     - Get specific agent and function definition
- POST /api/a2a/call-agent      - Direct agent call (testing)
- POST /api/a2a/chat            - Coordinator chat with function calling
"""

from fastapi import APIRouter

from .agents import router as agents_router
from .chat import router as chat_router
from .health import router as health_router

# Create main router with prefix
router = APIRouter(prefix="/api/a2a", tags=["a2a"])

# Include sub-routers (they don't have prefixes, so paths are relative to /api/a2a)
router.include_router(health_router)
router.include_router(agents_router)
router.include_router(chat_router)

# Re-export commonly used functions for external use
from .agents import fetch_agent_card, fetch_all_agent_cards
from .functions import build_function_from_agent_card, extract_agent_id_from_function_name

__all__ = [
    "router",
    "fetch_agent_card",
    "fetch_all_agent_cards",
    "build_function_from_agent_card",
    "extract_agent_id_from_function_name",
]

