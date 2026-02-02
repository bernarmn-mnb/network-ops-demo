"""FastAPI Routes for Agno Coordinator.

This module provides REST and SSE endpoints for the Agno-based
coordinator that integrates with Agent Builder.

Endpoints:
- POST /api/agno/v2/chat: Main chat endpoint with SSE streaming
- GET /api/agno/v2/structure: Agent architecture graph
- GET /api/agno/v2/health: Health check
- GET /api/agno/v2/config: Configuration status
"""

import json
import logging
from typing import Any, Dict, List, Optional

from agno.agent import RunEvent
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .coordinator import (
    check_coordinator_health,
    get_coordinator,
    get_coordinator_config,
)
from .tools.agent_builder import (
    AgentReasoningEvent,
    AgentTextChunkEvent,
    AgentToolCallEvent,
    AgentToolResultEvent,
    get_available_agents,
)
from .tools.client import ClientFunctionCallEvent

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class ClientFunctionParam(BaseModel):
    """Parameter definition for a client function."""
    
    type: str = "object"
    properties: Dict[str, Any] = {}
    required: List[str] = []


class ClientFunctionDef(BaseModel):
    """Definition of a client-side function (executed in browser)."""
    
    name: str
    description: str
    parameters: ClientFunctionParam = ClientFunctionParam()


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    stream: bool = True
    client_functions: Optional[List[ClientFunctionDef]] = None


class AgentNode(BaseModel):
    """Node in agent architecture graph."""
    
    id: str
    name: str
    description: str
    type: str  # 'coordinator' | 'agent' | 'tool'
    children: List[str] = []


class AgentGraph(BaseModel):
    """Agent architecture graph response."""
    
    nodes: List[AgentNode]


# ============================================================================
# SSE Event Helpers
# ============================================================================

def format_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """Format an SSE event for the frontend.
    
    Frontend expects: data: {"event": "...", "data": {...}}
    """
    payload = {"event": event_type, "data": data}
    return f"data: {json.dumps(payload)}\n\n"


def convert_agno_event_to_sse(event, current_function_name: Optional[str] = None) -> Optional[str]:
    """Convert an Agno RunOutputEvent to SSE format for frontend.
    
    Maps Agno event types to our frontend's expected event format.
    """
    # Handle client function call events (executed in browser)
    if isinstance(event, ClientFunctionCallEvent):
        return format_sse_event("client_function_call", {
            "function_name": event.function_name,
            "arguments": event.arguments or {},
        })
    
    # Handle custom Agent Builder events
    if isinstance(event, AgentReasoningEvent):
        return format_sse_event("agent_reasoning", {
            "agent_id": event.agent_id,
            "function_name": current_function_name or f"call_{event.agent_id.replace('-', '_')}",
            "reasoning": event.reasoning,
        })
    
    if isinstance(event, AgentToolCallEvent):
        return format_sse_event("agent_tool_call", {
            "agent_id": event.agent_id,
            "function_name": current_function_name or f"call_{event.agent_id.replace('-', '_')}",
            "tool_id": event.tool_id,
            "tool_name": event.tool_name,
            "params": event.params,
        })
    
    if isinstance(event, AgentToolResultEvent):
        return format_sse_event("agent_tool_result", {
            "agent_id": event.agent_id,
            "function_name": current_function_name or f"call_{event.agent_id.replace('-', '_')}",
            "tool_id": event.tool_id,
            "tool_name": event.tool_name,
            "result": event.result,
        })
    
    if isinstance(event, AgentTextChunkEvent):
        return format_sse_event("agent_text_chunk", {
            "agent_id": event.agent_id,
            "function_name": current_function_name or f"call_{event.agent_id.replace('-', '_')}",
            "text_chunk": event.text_chunk,
        })
    
    # Handle standard Agno events
    if hasattr(event, 'event'):
        event_type = event.event
        
        # Text content from coordinator
        if event_type == RunEvent.run_content:
            content = getattr(event, 'content', '')
            if content:
                return format_sse_event("text_chunk", {"text_chunk": content})
        
        # Tool call started (coordinator calling Agent Builder)
        if event_type == RunEvent.tool_call_started:
            tool = getattr(event, 'tool', None)
            if tool:
                tool_name = getattr(tool, 'tool_name', 'unknown')
                # Extract agent_id from tool name (call_agent_builder)
                return format_sse_event("function_call", {
                    "function_name": tool_name,
                    "agent_id": "coordinator",
                    "input": "",  # Will be populated from tool args
                })
        
        # Tool call completed
        if event_type == RunEvent.tool_call_completed:
            tool = getattr(event, 'tool', None)
            if tool:
                return format_sse_event("function_complete", {
                    "function_name": getattr(tool, 'tool_name', 'unknown'),
                })
    
    return None


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat with the Agno coordinator.
    
    This endpoint streams SSE events for:
    - text_chunk: Direct coordinator responses
    - function_call: When coordinator routes to an agent
    - agent_*: Events from Agent Builder agents
    - error: Error messages
    
    The coordinator routes requests to appropriate Agent Builder agents
    and synthesizes responses.
    """
    async def event_generator():
        try:
            # Convert client functions to dict format if provided
            client_funcs = None
            if request.client_functions:
                client_funcs = [
                    {
                        "name": cf.name,
                        "description": cf.description,
                        "parameters": cf.parameters.model_dump() if hasattr(cf.parameters, 'model_dump') else cf.parameters,
                    }
                    for cf in request.client_functions
                ]
            
            # Get the coordinator with client functions
            coordinator = get_coordinator(
                session_id=request.session_id,
                user_id=request.user_id,
                client_functions=client_funcs,
            )
            
            current_function_name: Optional[str] = None
            
            # Run with streaming
            stream = coordinator.arun(
                request.message,
                stream=True,
                stream_events=True,
                user_id=request.user_id,
                session_id=request.session_id,
            )
            
            async for event in stream:
                # Convert Agno event to SSE format
                sse_event = convert_agno_event_to_sse(event, current_function_name)
                
                # Track current function for context
                if hasattr(event, 'event') and event.event == RunEvent.tool_call_started:
                    tool = getattr(event, 'tool', None)
                    if tool:
                        current_function_name = getattr(tool, 'tool_name', None)
                
                if sse_event:
                    yield sse_event
            
            # Send completion event
            yield format_sse_event("complete", {"status": "done"})
            
        except ValueError as e:
            # Configuration error
            yield format_sse_event("error", {"message": str(e)})
        except Exception as e:
            logger.error(f"Error in chat: {e}", exc_info=True)
            yield format_sse_event("error", {"message": f"Chat error: {str(e)}"})
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/structure", response_model=AgentGraph)
async def get_structure(client_functions: Optional[str] = None):
    """Get the agent architecture graph.
    
    Returns the structure of the coordinator and all available tools:
    - Local demo tools (server-side)
    - Client-side tools (browser)
    - Agent Builder agents (Kibana)
    
    Args:
        client_functions: Optional JSON string of client function definitions
    """
    nodes = []
    coordinator_children = []
    
    # =========================================================================
    # Local Demo Tools (always available)
    # =========================================================================
    local_tools = [
        {"name": "server_beep", "description": "Returns 'beep!' text (no audio)"},
        {"name": "echo", "description": "Echoes back a message"},
        {"name": "get_current_time", "description": "Returns current date/time"},
        {"name": "random_number", "description": "Generates random number"},
        {"name": "calculator", "description": "Basic arithmetic operations"},
    ]
    
    local_toolkit_name = "Local Demo Tools"
    coordinator_children.append(local_toolkit_name)
    
    nodes.append(AgentNode(
        id="local_demo_toolkit",
        name=local_toolkit_name,
        description="Built-in tools for testing and demos (server-side)",
        type="agent",
        children=[t["name"] for t in local_tools],
    ))
    
    for tool in local_tools:
        nodes.append(AgentNode(
            id=f"local_{tool['name']}",
            name=tool["name"],
            description=tool["description"],
            type="tool",
            children=[],
        ))
    
    # =========================================================================
    # Client-Side Tools (browser)
    # =========================================================================
    client_tools = []
    
    # Parse client functions if provided
    if client_functions:
        try:
            client_tools = json.loads(client_functions)
        except json.JSONDecodeError:
            pass
    
    # Default client tools (always show these as available)
    default_client_tools = [
        {"name": "browser_beep", "description": "Plays audio beep through speakers"},
    ]
    
    # Merge with any provided client functions
    client_tool_names = {t["name"] for t in client_tools}
    for default_tool in default_client_tools:
        if default_tool["name"] not in client_tool_names:
            client_tools.append(default_tool)
    
    if client_tools:
        client_toolkit_name = "Client-Side Tools"
        coordinator_children.append(client_toolkit_name)
        
        nodes.append(AgentNode(
            id="client_toolkit",
            name=client_toolkit_name,
            description="Tools that execute in the browser (audio, UI, etc.)",
            type="agent",
            children=[t["name"] for t in client_tools],
        ))
        
        for tool in client_tools:
            nodes.append(AgentNode(
                id=f"client_{tool['name']}",
                name=tool["name"],
                description=tool.get("description", "Client-side function"),
                type="tool",
                children=[],
            ))
    
    # =========================================================================
    # Agent Builder Agents (Kibana)
    # =========================================================================
    try:
        agents_json = get_available_agents()
        agents_data = json.loads(agents_json)
        agents = agents_data.get("agents", [])
        
        if agents:
            # Add Agent Builder toolkit group
            agent_builder_name = "Agent Builder Agents"
            coordinator_children.append(agent_builder_name)
            
            agent_names = [a.get("name", "Unknown") for a in agents]
            
            nodes.append(AgentNode(
                id="agent_builder_toolkit",
                name=agent_builder_name,
                description="Agents from Elastic Agent Builder (Kibana)",
                type="agent",
                children=agent_names,
            ))
            
            for agent in agents:
                agent_id = agent.get("id", "unknown")
                agent_name = agent.get("name", "Unknown Agent")
                agent_desc = agent.get("description", "")
                skills = agent.get("skills", [])
                
                # Add agent node
                nodes.append(AgentNode(
                    id=agent_id,
                    name=agent_name,
                    description=agent_desc,
                    type="agent",
                    children=skills[:5],
                ))
                
                # Add skill nodes
                for skill in skills[:5]:
                    nodes.append(AgentNode(
                        id=f"{agent_id}_{skill}",
                        name=skill,
                        description=f"Tool available to {agent_name}",
                        type="tool",
                        children=[],
                    ))
        
    except Exception as e:
        logger.error(f"Error fetching Agent Builder agents: {e}")
        coordinator_children.append("Agent Builder (error)")
        nodes.append(AgentNode(
            id="agent_builder_error",
            name="Agent Builder (error)",
            description=f"Could not load: {str(e)}",
            type="agent",
            children=[],
        ))
    
    # =========================================================================
    # Coordinator Node (root)
    # =========================================================================
    nodes.insert(0, AgentNode(
        id="coordinator",
        name="Agno Coordinator",
        description="Routes requests using Agno framework with LLM Proxy",
        type="coordinator",
        children=coordinator_children,
    ))
    
    return AgentGraph(nodes=nodes)


@router.get("/health")
async def health():
    """Check coordinator health.
    
    Returns health status of:
    - LLM Proxy connection
    - Agent Builder connection
    - Memory/database status
    """
    return check_coordinator_health()


@router.get("/config")
async def config():
    """Get coordinator configuration.
    
    Returns current configuration including:
    - LLM model settings
    - Memory/learning status
    - Agent Builder connection status
    """
    return get_coordinator_config()


@router.get("/agents")
async def list_agents():
    """List available Agent Builder agents.
    
    Returns the same data as get_available_agents tool,
    formatted for direct API consumption.
    """
    try:
        agents_json = get_available_agents()
        return json.loads(agents_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
