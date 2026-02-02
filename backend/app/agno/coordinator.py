"""Agno Team Coordinator for Agent Builder.

This module provides the main coordinator that orchestrates
requests between users and Agent Builder agents.

The coordinator:
- Uses a Team with router pattern (respond_directly=True)
- Has Agent Builder tools registered
- Supports conversation memory via SQLite
- Supports learning mode (optional)

Usage:
    from app.agno.coordinator import get_coordinator
    
    coordinator = get_coordinator(session_id="user-123")
    response = await coordinator.arun("What can you help me with?")
"""

import logging
import os
from pathlib import Path
from typing import Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.team import Team

from ..config import settings
from .tools.agent_builder import AgentBuilderToolkit, get_available_agents
from .tools.local import LocalDemoToolkit
from .tools.client import create_client_function_toolkit

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration
# ============================================================================

# Memory/Learning configuration from environment
AGNO_LEARNING_ENABLED = os.getenv("AGNO_LEARNING_ENABLED", "true").lower() == "true"
AGNO_MEMORY_DB_PATH = os.getenv("AGNO_MEMORY_DB_PATH", "data/agno_memory.db")


def get_llm_model() -> OpenAIChat:
    """Create the LLM model configured for our proxy.
    
    Uses the LLM proxy settings from config.
    """
    if not settings.LLM_PROXY_URL or not settings.LLM_PROXY_API_KEY:
        raise ValueError(
            "LLM proxy not configured. Set LLM_PROXY_URL and LLM_PROXY_API_KEY."
        )
    
    return OpenAIChat(
        id=settings.LLM_PROXY_MODEL or "gpt-4o",
        base_url=settings.LLM_PROXY_URL,
        api_key=settings.LLM_PROXY_API_KEY,
    )


# ============================================================================
# Coordinator System Prompt
# ============================================================================

COORDINATOR_INSTRUCTIONS = """You are a helpful AI coordinator that routes requests to specialized Elastic Agent Builder agents.

Your role is to:
1. Understand what the user needs
2. Identify which Agent Builder agent(s) can help
3. Call the appropriate agent with the user's request
4. Summarize or enhance the response for the user

## Available Tools

### Local Demo Tools (always available)
- `server_beep`: Simple test - returns "beep!" text (no sound)
- `echo`: Echoes back a message you provide
- `get_current_time`: Returns the current date and time
- `random_number`: Generates a random number (optionally specify min/max)
- `calculator`: Basic arithmetic (add, subtract, multiply, divide)

### Client-Side Tools (when provided by frontend)
- These tools execute in the user's browser, not on the server
- Examples: `browser_beep` (plays actual audio), UI interactions, etc.
- PREFER these for actions that need browser capabilities (sound, visuals, etc.)

### Agent Builder Tools (requires Kibana connection)
- `get_available_agents`: List all Agent Builder agents
- `call_agent_builder`: Call a specific agent with a query

## How to Use Tools

For testing:
- Use `beep` to verify tool calling works
- Use `echo` or `calculator` to test parameter passing

For Agent Builder:
1. First, call `get_available_agents` to see what agents are available
2. Then call `call_agent_builder` with the appropriate agent_id and the user's query
3. Present the agent's response to the user, optionally adding context

## Important Notes

- Agent Builder agents have access to Elasticsearch, knowledge bases, and custom tools
- Each agent is specialized for specific tasks (sales, support, research, etc.)
- If no agent matches the request, answer directly using your own knowledge
- Always be helpful and clear in your responses

## Response Format

When presenting agent responses:
- Acknowledge which agent helped
- Present the information clearly
- Offer to help with follow-up questions
"""


# ============================================================================
# Coordinator Factory
# ============================================================================

def get_coordinator(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    enable_memory: bool = True,
    enable_learning: bool = AGNO_LEARNING_ENABLED,
    client_functions: Optional[list] = None,
) -> Agent:
    """Create an Agno coordinator agent.
    
    The coordinator routes requests to Agent Builder agents and can
    optionally maintain conversation memory and learning.
    
    Args:
        session_id: Session ID for conversation continuity
        user_id: User ID for personalization
        enable_memory: Whether to persist conversation history
        enable_learning: Whether to enable learning mode
        client_functions: Optional list of client-side function definitions
    
    Returns:
        Configured Agno Agent ready to run
    """
    # Get the LLM model
    model = get_llm_model()
    
    # Set up memory database if enabled
    db = None
    if enable_memory:
        try:
            # Import here to avoid requiring sqlite if not used
            from agno.db.sqlite import SqliteDb
            
            # Ensure data directory exists
            db_path = Path(AGNO_MEMORY_DB_PATH)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            db = SqliteDb(db_file=str(db_path))
            logger.info(f"Memory enabled with database at {db_path}")
        except Exception as e:
            logger.warning(f"Could not enable memory: {e}")
            db = None
    
    # Build tools list
    tools = [LocalDemoToolkit(), AgentBuilderToolkit()]
    
    # Add client functions if provided
    if client_functions:
        client_toolkit = create_client_function_toolkit(client_functions)
        if client_toolkit:
            tools.append(client_toolkit)
            logger.info(f"Added {len(client_functions)} client functions to coordinator")
    
    # Create the coordinator agent
    # Note: We use Agent instead of Team for simplicity since we're
    # treating Agent Builder agents as tools, not as team members
    coordinator = Agent(
        name="Agent Builder Coordinator",
        model=model,
        instructions=COORDINATOR_INSTRUCTIONS,
        tools=tools,
        db=db,
        learning=enable_learning if db else False,  # Learning requires db
        markdown=True,
    )
    
    return coordinator


def get_coordinator_team(
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    enable_memory: bool = True,
    enable_learning: bool = AGNO_LEARNING_ENABLED,
) -> Team:
    """Create an Agno Team coordinator.
    
    Alternative to get_coordinator that uses Team for more complex
    multi-agent orchestration scenarios.
    
    The Team pattern is useful when you want:
    - Multiple coordinator agents with different specializations
    - Hierarchical delegation
    - Complex routing logic
    
    Args:
        session_id: Session ID for conversation continuity
        user_id: User ID for personalization
        enable_memory: Whether to persist conversation history
        enable_learning: Whether to enable learning mode
    
    Returns:
        Configured Agno Team ready to run
    """
    # Get the LLM model
    model = get_llm_model()
    
    # Set up memory database if enabled
    db = None
    if enable_memory:
        try:
            from agno.db.sqlite import SqliteDb
            
            db_path = Path(AGNO_MEMORY_DB_PATH)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            db = SqliteDb(db_file=str(db_path))
        except Exception as e:
            logger.warning(f"Could not enable memory: {e}")
            db = None
    
    # Create the coordinator team with router pattern
    team = Team(
        name="Agent Builder Team",
        model=model,
        instructions=COORDINATOR_INSTRUCTIONS,
        tools=[LocalDemoToolkit(), AgentBuilderToolkit()],
        respond_directly=True,  # Router pattern - respond without synthesis
        db=db,
    )
    
    return team


# ============================================================================
# Status and Configuration
# ============================================================================

def get_coordinator_config() -> dict:
    """Get the current coordinator configuration.
    
    Returns configuration status for the /config endpoint.
    """
    return {
        "llm_configured": bool(settings.LLM_PROXY_URL and settings.LLM_PROXY_API_KEY),
        "llm_model": settings.LLM_PROXY_MODEL or "gpt-4o",
        "llm_proxy_url": settings.LLM_PROXY_URL[:50] + "..." if settings.LLM_PROXY_URL else None,
        "kibana_configured": bool(settings.KIBANA_URL and settings.ELASTIC_API_KEY),
        "memory_enabled": True,  # Default
        "memory_db_path": AGNO_MEMORY_DB_PATH,
        "learning_enabled": AGNO_LEARNING_ENABLED,
    }


def check_coordinator_health() -> dict:
    """Check coordinator health status.
    
    Validates that all required services are accessible.
    """
    health = {
        "healthy": True,
        "llm_proxy": {"status": "unknown"},
        "agent_builder": {"status": "unknown"},
    }
    
    # Check LLM proxy
    if settings.LLM_PROXY_URL and settings.LLM_PROXY_API_KEY:
        health["llm_proxy"]["status"] = "configured"
        # Could add actual connectivity check here
    else:
        health["llm_proxy"]["status"] = "not_configured"
        health["llm_proxy"]["error"] = "Missing LLM_PROXY_URL or LLM_PROXY_API_KEY"
        health["healthy"] = False
    
    # Check Agent Builder connectivity
    if settings.KIBANA_URL and settings.ELASTIC_API_KEY:
        try:
            agents = get_available_agents()
            import json
            agents_data = json.loads(agents)
            agent_count = len(agents_data.get("agents", []))
            health["agent_builder"]["status"] = "connected"
            health["agent_builder"]["agent_count"] = agent_count
        except Exception as e:
            health["agent_builder"]["status"] = "error"
            health["agent_builder"]["error"] = str(e)
            # Don't mark unhealthy if Agent Builder is unavailable
            # The coordinator can still work without agents
    else:
        health["agent_builder"]["status"] = "not_configured"
        health["agent_builder"]["error"] = "Missing KIBANA_URL or ELASTIC_API_KEY"
    
    return health
