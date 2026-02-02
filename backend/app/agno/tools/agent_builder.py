"""Agent Builder Bridge Tool for Agno.

This module provides an Agno tool that bridges to Elastic Agent Builder agents.
It dynamically discovers available agents and routes requests to them.

Usage:
    from app.agno.tools import AgentBuilderToolkit
    
    agent = Agent(
        model=model,
        tools=[AgentBuilderToolkit()],
    )

The toolkit provides:
- get_available_agents: List all Agent Builder agents
- call_agent_builder: Call a specific agent with a query
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional

import requests
from agno.run.agent import CustomEvent
from agno.tools import tool, Toolkit

from ...config import settings
from ...routes.a2a.agents import fetch_all_agent_cards
from ...routes.a2a.functions import build_function_from_agent_card

logger = logging.getLogger(__name__)


# ============================================================================
# Custom Events for Agent Builder (streamed to UI)
# ============================================================================

@dataclass
class AgentReasoningEvent(CustomEvent):
    """Event emitted when Agent Builder agent is reasoning."""
    
    # All fields need defaults since CustomEvent parent has defaults
    reasoning: str = ""


@dataclass
class AgentToolCallEvent(CustomEvent):
    """Event emitted when Agent Builder agent calls a tool."""
    
    tool_id: str = ""
    tool_name: str = ""
    params: Optional[Dict[str, Any]] = None


@dataclass
class AgentToolResultEvent(CustomEvent):
    """Event emitted when Agent Builder agent receives tool result."""
    
    tool_id: str = ""
    tool_name: str = ""
    result: Any = None


@dataclass
class AgentTextChunkEvent(CustomEvent):
    """Event emitted when Agent Builder agent produces text."""
    
    text_chunk: str = ""


# ============================================================================
# Helper Functions
# ============================================================================

def get_agent_builder_streaming_url() -> str:
    """Construct the Agent Builder streaming API URL."""
    return f"{settings.KIBANA_URL}/api/agent_builder/converse/async"


def get_agent_builder_auth_headers() -> dict:
    """Get authentication headers for Kibana API."""
    return {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
    }


def extract_agent_id_from_url(url: str) -> Optional[str]:
    """Extract agent ID from A2A URL.
    
    URL format: .../api/agent_builder/a2a/{agent_id}
    """
    if "/a2a/" in url:
        return url.split("/a2a/")[-1]
    return None


# ============================================================================
# Agent Discovery
# ============================================================================

def get_available_agents() -> str:
    """
    Get list of available Agent Builder agents.
    
    Returns a JSON string with agent names and descriptions.
    Use this to understand what agents are available before calling them.
    
    Returns:
        JSON string containing list of available agents with their capabilities
    """
    try:
        agent_cards = fetch_all_agent_cards()
        
        if not agent_cards:
            return json.dumps({
                "agents": [],
                "message": "No Agent Builder agents found. Configure agents in Kibana."
            })
        
        agents = []
        for card in agent_cards:
            agent_url = card.get("url", "")
            agent_id = extract_agent_id_from_url(agent_url)
            
            # Get skill names
            skills = card.get("skills", [])
            skill_names = [s.get("name", s.get("id", "unknown")) for s in skills[:5]]
            
            agents.append({
                "id": agent_id,
                "name": card.get("name", "Unknown"),
                "description": card.get("description", ""),
                "skills": skill_names,
            })
        
        return json.dumps({"agents": agents})
        
    except Exception as e:
        logger.error(f"Error fetching agents: {e}")
        return json.dumps({"error": str(e), "agents": []})


# ============================================================================
# Agent Builder Tool (Streaming)
# ============================================================================

@tool(
    name="call_agent_builder",
    description="Call an Elastic Agent Builder agent with a user query. "
                "Agent Builder agents have access to Elasticsearch, knowledge bases, "
                "and custom tools. First call get_available_agents to see what agents exist."
)
async def call_agent_builder(agent_id: str, query: str) -> str:
    """
    Call an Elastic Agent Builder agent and stream the response.
    
    This tool bridges Agno to Elastic Agent Builder. The agent will process
    the query using its configured tools (Elasticsearch, MCP, etc.) and
    return a response.
    
    Args:
        agent_id: The ID of the Agent Builder agent to call
        query: The user's query or message to send to the agent
    
    Returns:
        The agent's response text
    
    Yields:
        Custom events for reasoning, tool calls, and results (for UI display)
    """
    if not settings.KIBANA_URL or not settings.ELASTIC_API_KEY:
        # Can't use return with value in async generator, so yield error and exit
        yield AgentTextChunkEvent(
            agent_id=agent_id,
            agent_name="Error",
            text_chunk="Error: Kibana URL or API key not configured"
        )
        return
    
    # Get agent name for events
    agent_cards = fetch_all_agent_cards()
    agent_name = "Unknown Agent"
    for card in agent_cards:
        card_url = card.get("url", "")
        card_id = extract_agent_id_from_url(card_url)
        if card_id == agent_id:
            agent_name = card.get("name", agent_id)
            break
    
    url = get_agent_builder_streaming_url()
    headers = get_agent_builder_auth_headers()
    payload = {"input": query, "agent_id": agent_id}
    
    full_response = ""
    
    try:
        response = requests.post(
            url, 
            headers=headers, 
            json=payload, 
            stream=True, 
            timeout=120
        )
        
        if not response.ok:
            error_msg = f"Agent Builder error: {response.status_code}"
            logger.error(error_msg)
            yield AgentTextChunkEvent(
                agent_id=agent_id,
                agent_name=agent_name,
                text_chunk=error_msg
            )
            return
        
        for line in response.iter_lines():
            if not line:
                continue
            
            line_str = line.decode('utf-8')
            
            # Skip comments
            if line_str.startswith(':'):
                continue
            
            # Parse SSE data
            if not line_str.startswith('data: '):
                continue
            
            data_str = line_str[6:]
            
            try:
                data = json.loads(data_str)
                payload_data = data.get("data", data)
                
                # Reasoning events - yield for UI
                if "reasoning" in payload_data:
                    yield AgentReasoningEvent(
                        agent_id=agent_id,
                        agent_name=agent_name,
                        reasoning=payload_data["reasoning"]
                    )
                
                # Tool call initiation - yield for UI
                if "tool_call_id" in payload_data and "params" in payload_data:
                    yield AgentToolCallEvent(
                        agent_id=agent_id,
                        agent_name=agent_name,
                        tool_id=payload_data.get("tool_call_id", ""),
                        tool_name=payload_data.get("tool_id", ""),
                        params=payload_data.get("params")
                    )
                
                # Tool results - yield for UI
                if "results" in payload_data and "tool_call_id" in payload_data:
                    yield AgentToolResultEvent(
                        agent_id=agent_id,
                        agent_name=agent_name,
                        tool_id=payload_data.get("tool_call_id", ""),
                        tool_name=payload_data.get("tool_id", ""),
                        result=payload_data.get("results")
                    )
                
                # Text chunks - yield for UI and accumulate
                if "text_chunk" in payload_data:
                    chunk = payload_data["text_chunk"]
                    full_response += chunk
                    yield AgentTextChunkEvent(
                        agent_id=agent_id,
                        agent_name=agent_name,
                        text_chunk=chunk
                    )
                
                # Final message content
                elif "message_content" in payload_data:
                    content = payload_data["message_content"]
                    if not full_response:
                        full_response = content
                        yield AgentTextChunkEvent(
                            agent_id=agent_id,
                            agent_name=agent_name,
                            text_chunk=content
                        )
                        
            except json.JSONDecodeError:
                continue
        
        response.close()
        
    except requests.RequestException as e:
        logger.error(f"Request error calling Agent Builder: {e}")
        yield AgentTextChunkEvent(
            agent_id=agent_id,
            agent_name=agent_name,
            text_chunk=f"Error connecting to Agent Builder: {e}"
        )
        return
    
    # Yield final response marker (the full_response is accumulated from text chunks)
    if not full_response:
        yield AgentTextChunkEvent(
            agent_id=agent_id,
            agent_name=agent_name,
            text_chunk="Agent completed but returned no response."
        )


# ============================================================================
# Toolkit Class
# ============================================================================

class AgentBuilderToolkit(Toolkit):
    """Agno Toolkit for Elastic Agent Builder integration.
    
    This toolkit provides tools for discovering and calling
    Agent Builder agents from within an Agno agent or team.
    
    Usage:
        from app.agno.tools import AgentBuilderToolkit
        
        team = Team(
            model=model,
            tools=[AgentBuilderToolkit()],
            instructions="Route requests to appropriate Agent Builder agents"
        )
    """
    
    def __init__(self):
        super().__init__(name="agent_builder")
        
        # Register the tools
        self.register(get_available_agents)
        self.register(call_agent_builder)


# Note: Dynamic tool generation removed for simplicity.
# The AgentBuilderToolkit provides get_available_agents and call_agent_builder
# which is sufficient for the coordinator to route requests.
