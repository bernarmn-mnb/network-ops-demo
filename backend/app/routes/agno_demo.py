"""
Agno-style Coordinator with Agent Builder Backend
--------------------------------------------------
Demonstrates how external agent frameworks (Agno, LangGraph, CrewAI) 
can integrate with Elastic Agent Builder as the knowledge/action layer.

Architecture:
  User → Agno Coordinator (LLM) → Agent Builder Agents (Kibana)
                                      ↓
                              Elasticsearch, Tools, etc.

This shows Agent Builder as a "plug-in" capability for broader agent ecosystems.
"""

from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import requests

from ..config import settings
from .a2a.agents import fetch_all_agent_cards
from .a2a.functions import build_function_from_agent_card, extract_agent_id_from_function_name

router = APIRouter()


# --- API Models ---

class AgnoChatRequest(BaseModel):
    message: str
    stream: bool = True


class AgentNode(BaseModel):
    id: str
    name: str
    description: str
    type: str  # 'coordinator' | 'agent' | 'tool'
    children: List[str] = []


class AgentGraph(BaseModel):
    nodes: List[AgentNode]


# --- Helper Functions ---

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


def call_agent_builder_streaming(agent_id: str, agent_name: str, user_input: str):
    """
    Call an Agent Builder agent and STREAM the response with full thinking process.
    This is the bridge between Agno and Agent Builder.
    
    Yields SSE events for:
    - agent_reasoning: LLM thinking process
    - agent_tool_call: Tool invocations with params
    - agent_tool_status: Progress messages
    - agent_tool_result: Tool outputs
    - agent_text_chunk: Response text chunks
    
    Returns the full response text at the end.
    """
    url = get_agent_builder_streaming_url()
    headers = get_agent_builder_auth_headers()
    payload = {"input": user_input, "agent_id": agent_id}
    full_response = ""
    
    try:
        response = requests.post(url, headers=headers, json=payload, stream=True, timeout=120)
        
        if not response.ok:
            error_event = {
                "event": "agent_error",
                "data": {
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "message": f"Agent Builder error: {response.status_code}"
                }
            }
            yield f"data: {json.dumps(error_event)}\n\n", f"Error: Agent Builder error: {response.status_code}"
            return
        
        for line in response.iter_lines():
            if not line:
                continue
            line_str = line.decode('utf-8')
            if line_str.startswith(':'):
                continue
            if not line_str.startswith('data: '):
                continue
            data_str = line_str[6:]
            
            try:
                data = json.loads(data_str)
                payload_data = data.get("data", data)
                
                # Reasoning events - show LLM thinking
                if "reasoning" in payload_data:
                    event = {
                        "event": "agent_reasoning",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "reasoning": payload_data["reasoning"]
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                
                # Tool call initiation - show what tool is being called
                if "tool_call_id" in payload_data and "params" in payload_data:
                    event = {
                        "event": "agent_tool_call",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "tool_id": payload_data.get("tool_call_id"),
                            "tool_name": payload_data.get("tool_id"),
                            "params": payload_data.get("params")
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                
                # Tool status messages - progress updates
                elif "message" in payload_data and "tool_call_id" in payload_data:
                    event = {
                        "event": "agent_tool_status",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "tool_id": payload_data.get("tool_call_id"),
                            "message": payload_data.get("message")
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                
                # Tool results - show what the tool returned
                if "results" in payload_data and "tool_call_id" in payload_data:
                    event = {
                        "event": "agent_tool_result",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "tool_id": payload_data.get("tool_call_id"),
                            "tool_name": payload_data.get("tool_id"),
                            "result": payload_data.get("results")
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                
                # Text chunks - the actual response text
                if "text_chunk" in payload_data:
                    chunk = payload_data["text_chunk"]
                    full_response += chunk
                    event = {
                        "event": "agent_text_chunk",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "text_chunk": chunk
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                
                # Final message content
                elif "message_content" in payload_data:
                    content = payload_data["message_content"]
                    if not full_response:
                        full_response = content
                    event = {
                        "event": "agent_text_chunk",
                        "data": {
                            "agent_id": agent_id,
                            "agent_name": agent_name,
                            "text_chunk": content
                        }
                    }
                    yield f"data: {json.dumps(event)}\n\n", None
                    
            except json.JSONDecodeError:
                continue
        
        # Final yield with the complete response
        yield None, full_response or "Agent completed but returned no text."
        
    except requests.RequestException as e:
        error_event = {
            "event": "agent_error",
            "data": {
                "agent_id": agent_id,
                "agent_name": agent_name,
                "message": f"Connection error: {str(e)}"
            }
        }
        yield f"data: {json.dumps(error_event)}\n\n", f"Error: {str(e)}"


def get_coordinator_system_prompt(agents: List[Dict]) -> str:
    """Build the coordinator's system prompt with available Agent Builder agents."""
    if not agents:
        return "You are a helpful assistant. No specialized agents are currently available."
    
    agent_descriptions = "\n".join([
        f"- {agent.get('name', 'Unknown')}: {agent.get('description', 'No description')}"
        for agent in agents
    ])
    
    return f"""You are a coordinator agent that orchestrates requests using specialized Elastic Agent Builder agents.

Available Agent Builder agents:
{agent_descriptions}

Your job is to:
1. Understand what the user needs
2. Call the appropriate Agent Builder agent using the provided functions
3. Summarize or enhance the agent's response for the user

IMPORTANT: These agents are powered by Elastic Agent Builder and have access to:
- Elasticsearch knowledge bases
- Custom tools and integrations
- Domain-specific expertise

Always try to use an agent when the request matches their capabilities."""


def call_llm(messages: List[Dict], functions: List[Dict] = None, stream: bool = True):
    """Call the LLM proxy with the given messages."""
    if not settings.LLM_PROXY_URL or not settings.LLM_PROXY_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="LLM proxy not configured. Set LLM_PROXY_URL and LLM_PROXY_API_KEY."
        )
    
    url = f"{settings.LLM_PROXY_URL}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.LLM_PROXY_API_KEY}",
    }
    
    payload = {
        "model": settings.LLM_PROXY_MODEL or "gpt-4o",
        "messages": messages,
        "stream": stream,
    }
    
    if functions:
        payload["functions"] = functions
        payload["function_call"] = "auto"
    
    response = requests.post(url, headers=headers, json=payload, stream=stream, timeout=120)
    
    if not response.ok:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"LLM proxy error: {response.text[:200]}"
        )
    
    return response


# --- Endpoints ---

@router.get("/structure", response_model=AgentGraph)
async def get_agent_structure():
    """
    Returns the structure of the Agno coordinator + Agent Builder agents.
    Shows how external frameworks integrate with Agent Builder.
    """
    nodes = []
    
    # Fetch real Agent Builder agents
    agent_cards = fetch_all_agent_cards()
    
    # Coordinator Node (Agno/external framework)
    agent_names = [card.get("name", "Unknown Agent") for card in agent_cards]
    nodes.append(AgentNode(
        id="coordinator",
        name="Agno Coordinator",
        description="External LLM coordinator that routes to Agent Builder agents",
        type="coordinator",
        children=agent_names if agent_names else ["No agents available"]
    ))
    
    # Agent Builder Agent Nodes
    for card in agent_cards:
        agent_name = card.get("name", "Unknown Agent")
        agent_desc = card.get("description", "No description")
        skills = card.get("skills", [])
        
        skill_names = [skill.get("name", "unknown") for skill in skills]
        
        nodes.append(AgentNode(
            id=agent_name,
            name=agent_name,
            description=f"[Agent Builder] {agent_desc}",
            type="agent",
            children=skill_names[:5]  # Limit to first 5 skills for UI
        ))
        
        # Add skill/tool nodes
        for skill in skills[:5]:
            skill_name = skill.get("name", "unknown")
            skill_desc = skill.get("description", "No description")[:100]
            nodes.append(AgentNode(
                id=f"{agent_name}_{skill_name}",
                name=skill_name,
                description=skill_desc,
                type="tool",
                children=[]
            ))
    
    # If no agents found, show placeholder
    if not agent_cards:
        nodes.append(AgentNode(
            id="no_agents",
            name="No Agent Builder Agents",
            description="Configure agents in Kibana Agent Builder",
            type="agent",
            children=[]
        ))
            
    return AgentGraph(nodes=nodes)


@router.post("/chat")
async def chat(request: AgnoChatRequest):
    """
    Chat with the Agno coordinator that uses Agent Builder agents.
    
    Flow:
    1. Agno coordinator (LLM) receives user message
    2. Coordinator decides which Agent Builder agent to call
    3. Agent Builder agent executes (search, tools, etc.)
    4. Coordinator summarizes response for user
    """
    
    # Fetch available Agent Builder agents
    agent_cards = fetch_all_agent_cards()
    
    if not agent_cards:
        # No agents - just use coordinator directly
        def no_agents_generator():
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': 'No Agent Builder agents available. Configure agents in Kibana.'}})}\n\n"
        return StreamingResponse(no_agents_generator(), media_type="text/event-stream")
    
    # Build function definitions from agent cards
    functions = [build_function_from_agent_card(card) for card in agent_cards]
    
    # Create agent ID lookup
    agent_lookup = {}
    for card in agent_cards:
        func_def = build_function_from_agent_card(card)
        agent_url = card.get("url", "")
        agent_id = agent_url.split("/a2a/")[-1] if "/a2a/" in agent_url else None
        if agent_id:
            agent_lookup[func_def["name"]] = {
                "id": agent_id,
                "name": card.get("name", "Unknown"),
                "card": card
            }
    
    def event_generator():
        try:
            # Build messages with coordinator system prompt
            messages = [
                {"role": "system", "content": get_coordinator_system_prompt(agent_cards)},
                {"role": "user", "content": request.message}
            ]
            
            # Call LLM coordinator with Agent Builder functions
            response = call_llm(messages, functions=functions, stream=True)
            
            accumulated_text = ""
            function_call_buffer = {"name": "", "arguments": ""}
            
            for line in response.iter_lines():
                if not line:
                    continue
                    
                line_str = line.decode('utf-8')
                if not line_str.startswith('data: '):
                    continue
                    
                data_str = line_str[6:]
                if data_str.strip() == '[DONE]':
                    break
                
                try:
                    data = json.loads(data_str)
                    choice = data.get("choices", [{}])[0]
                    delta = choice.get("delta", {})
                    finish_reason = choice.get("finish_reason")
                    
                    # Handle function call (coordinator deciding to call Agent Builder)
                    if "function_call" in delta:
                        fc = delta["function_call"]
                        if "name" in fc:
                            function_call_buffer["name"] = fc["name"]
                            agent_info = agent_lookup.get(fc["name"], {})
                            
                            # Emit that coordinator is routing to Agent Builder
                            event = {
                                "event": "agent_tool_call",
                                "data": {
                                    "agent_id": "coordinator",
                                    "tool_name": agent_info.get("name", fc["name"]),
                                    "function_name": fc["name"],
                                    "message": f"Routing to Agent Builder: {agent_info.get('name', 'Unknown')}"
                                }
                            }
                            yield f"data: {json.dumps(event)}\n\n"
                            
                        if "arguments" in fc:
                            function_call_buffer["arguments"] += fc["arguments"]
                    
                    # Handle text content (coordinator speaking directly)
                    if "content" in delta and delta["content"]:
                        chunk = delta["content"]
                        accumulated_text += chunk
                        event = {
                            "event": "text_chunk",
                            "data": {"text_chunk": chunk}
                        }
                        yield f"data: {json.dumps(event)}\n\n"
                    
                    # Handle function call completion - CALL AGENT BUILDER
                    if finish_reason == "function_call":
                        func_name = function_call_buffer["name"]
                        try:
                            args = json.loads(function_call_buffer["arguments"])
                        except json.JSONDecodeError:
                            args = {}
                        
                        agent_info = agent_lookup.get(func_name, {})
                        agent_id = agent_info.get("id")
                        agent_name = agent_info.get("name", "Unknown Agent")
                        user_input = args.get("input", request.message)
                        
                        if agent_id:
                            # Emit that we're calling Agent Builder
                            event = {
                                "event": "function_call",
                                "data": {
                                    "function_name": func_name,
                                    "agent_id": agent_id,
                                    "agent_name": agent_name,
                                    "input": user_input,
                                    "message": f"Calling Agent Builder agent: {agent_name}"
                                }
                            }
                            yield f"data: {json.dumps(event)}\n\n"
                            
                            # CALL AGENT BUILDER WITH STREAMING - expose full thinking process!
                            agent_response = ""
                            for sse_event, final_response in call_agent_builder_streaming(agent_id, agent_name, user_input):
                                if sse_event:
                                    yield sse_event  # Stream reasoning, tool calls, results to frontend
                                if final_response is not None:
                                    agent_response = final_response
                            
                            # Emit completion marker
                            event = {
                                "event": "agent_complete",
                                "data": {
                                    "agent_id": agent_id,
                                    "agent_name": agent_name,
                                    "message": f"Agent Builder agent {agent_name} completed"
                                }
                            }
                            yield f"data: {json.dumps(event)}\n\n"
                            
                            # Continue conversation with Agent Builder result
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "function_call": {
                                    "name": func_name,
                                    "arguments": function_call_buffer["arguments"]
                                }
                            })
                            messages.append({
                                "role": "function",
                                "name": func_name,
                                "content": agent_response
                            })
                            
                            # Get coordinator's final response
                            final_response = call_llm(messages, stream=True)
                            for final_line in final_response.iter_lines():
                                if not final_line:
                                    continue
                                final_line_str = final_line.decode('utf-8')
                                if not final_line_str.startswith('data: '):
                                    continue
                                final_data_str = final_line_str[6:]
                                if final_data_str.strip() == '[DONE]':
                                    break
                                try:
                                    final_data = json.loads(final_data_str)
                                    final_choice = final_data.get("choices", [{}])[0]
                                    final_delta = final_choice.get("delta", {})
                                    if "content" in final_delta and final_delta["content"]:
                                        event = {
                                            "event": "text_chunk",
                                            "data": {"text_chunk": final_delta["content"]}
                                        }
                                        yield f"data: {json.dumps(event)}\n\n"
                                except json.JSONDecodeError:
                                    pass
                        else:
                            # No agent ID found
                            event = {
                                "event": "error",
                                "data": {"message": f"Could not find Agent Builder agent for {func_name}"}
                            }
                            yield f"data: {json.dumps(event)}\n\n"
                            
                except json.JSONDecodeError:
                    continue
                    
        except HTTPException as e:
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': e.detail}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': str(e)}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
