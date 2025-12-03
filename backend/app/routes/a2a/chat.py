"""
A2A Chat Endpoint

Provides the coordinator LLM chat endpoint with function calling support.
Handles both server-side functions (Agent Builder agents) and client-side
functions (executed in the browser).

LLM Documentation:
- POST /api/a2a/chat: Main chat endpoint with streaming
- POST /api/a2a/call-agent: Direct agent call (for testing)

Flow:
1. User sends message to coordinator LLM via /api/a2a/chat
2. Coordinator decides if it needs to call an agent (function call)
3. If server-side: Call Agent Builder and stream response
4. If client-side: Emit event for browser to handle
5. Return final response to user
"""

import json
import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ...config import settings
from .agents import fetch_all_agent_cards
from .functions import build_function_from_agent_card
from .handlers import (
    handle_client_function,
    handle_server_function,
    get_agent_builder_streaming_url,
    get_agent_builder_auth_headers,
)

router = APIRouter()


class CallAgentRequest(BaseModel):
    """Request body for calling an agent directly."""
    agent_id: str
    input: str
    conversation_id: Optional[str] = None


class ClientFunctionDef(BaseModel):
    """Definition for a client-side function (executed in browser, not server)."""
    name: str
    description: str
    parameters: Dict[str, Any]


class ChatRequest(BaseModel):
    """Request body for A2A chat endpoint."""
    message: str
    conversation_id: Optional[str] = None
    functions: Optional[List[Dict[str, Any]]] = None
    system_prompt: Optional[str] = None
    client_functions: Optional[List[ClientFunctionDef]] = None


@router.post("/call-agent")
async def call_agent(request: CallAgentRequest):
    """
    Call an Agent Builder agent and return SSE stream.
    
    This endpoint is for direct agent calls (testing/debugging).
    In normal flow, agents are called via the /chat endpoint.
    """
    payload = {
        "input": request.input,
        "agent_id": request.agent_id,
    }
    
    if request.conversation_id:
        payload["conversation_id"] = request.conversation_id
    
    try:
        upstream_response = requests.post(
            get_agent_builder_streaming_url(),
            headers=get_agent_builder_auth_headers(),
            json=payload,
            stream=True,
            timeout=120,
        )
        
        if not upstream_response.ok:
            error_body = upstream_response.text
            raise HTTPException(
                status_code=upstream_response.status_code,
                detail=f"Agent Builder error: {error_body}"
            )
        
        def event_generator():
            """Generate SSE events from upstream response."""
            try:
                for chunk in upstream_response.iter_content(chunk_size=None):
                    if chunk:
                        yield chunk
            except Exception as e:
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
                "X-Accel-Buffering": "no",
            }
        )
        
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Agent Builder: {str(e)}"
        )


@router.post("/chat")
async def a2a_chat(request: ChatRequest):
    """
    A2A chat endpoint with function calling.
    
    Flow:
    1. Fetches agent functions (if not provided)
    2. Optionally accepts client-side functions
    3. Calls LLM proxy with all function definitions
    4. Handles function calls via handlers module
    5. Streams responses back to frontend
    """
    # Get server-side functions
    if request.functions:
        server_functions = request.functions
    else:
        agent_cards = fetch_all_agent_cards()
        server_functions = [
            build_function_from_agent_card(card)
            for card in agent_cards
        ]
    
    # Build client-side function definitions
    client_function_names: set = set()
    client_functions_list = []
    if request.client_functions:
        for cf in request.client_functions:
            client_function_names.add(cf.name)
            client_functions_list.append({
                "name": cf.name,
                "description": cf.description,
                "parameters": cf.parameters
            })
    
    # Combine all functions
    functions = server_functions + client_functions_list
    
    if not functions:
        raise HTTPException(
            status_code=400,
            detail="No functions available. Ensure agents are configured."
        )
    
    def is_client_function(func_name: str) -> bool:
        """Check if function should be executed client-side."""
        return func_name in client_function_names
    
    # Ensure LLM proxy configuration
    if not settings.LLM_PROXY_URL or not settings.LLM_PROXY_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "LLM_PROXY_NOT_CONFIGURED",
                "message": "LLM proxy is not configured",
                "setup_hint": "Add LLM_PROXY_URL and LLM_PROXY_API_KEY to backend/.env and restart the server"
            }
        )
    
    # Prepare LLM proxy request
    llm_url = f"{settings.LLM_PROXY_URL}/chat/completions"
    llm_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.LLM_PROXY_API_KEY}",
    }
    
    # Build messages
    messages = []
    if request.system_prompt:
        messages.append({"role": "system", "content": request.system_prompt})
    messages.append({"role": "user", "content": request.message})
    
    llm_payload = {
        "model": settings.LLM_PROXY_MODEL,
        "messages": messages,
        "functions": functions,
        "function_call": "auto",
        "stream": True,
    }
    
    try:
        llm_response = requests.post(
            llm_url,
            headers=llm_headers,
            json=llm_payload,
            stream=True,
            timeout=120,
        )
        
        if not llm_response.ok:
            error_body = llm_response.text
            # Map LLM proxy errors to user-friendly messages
            if llm_response.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error_code": "LLM_PROXY_AUTH_FAILED",
                        "message": "LLM proxy authentication failed",
                        "setup_hint": "Check your LLM_PROXY_API_KEY in backend/.env - it may be expired or invalid"
                    }
                )
            elif llm_response.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error_code": "LLM_PROXY_FORBIDDEN",
                        "message": "Access to LLM proxy denied",
                        "setup_hint": "Your API key may not have the required permissions. Contact your LLM proxy administrator."
                    }
                )
            elif llm_response.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error_code": "LLM_PROXY_RATE_LIMITED",
                        "message": "Too many requests to LLM proxy",
                        "setup_hint": "Please wait a moment before trying again"
                    }
                )
            else:
                raise HTTPException(
                    status_code=llm_response.status_code,
                    detail={
                        "error_code": "LLM_PROXY_ERROR",
                        "message": f"LLM proxy error: {error_body[:200]}",
                        "setup_hint": "Check the LLM proxy service status"
                    }
                )
        
        def event_generator():
            """Generate SSE events from LLM proxy, handling function calls."""
            conversation_messages = messages.copy()
            function_call_buffer: Dict[str, Dict[str, str]] = {}
            current_function_name: Optional[str] = None
            
            try:
                for line in llm_response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        
                        if line_str.startswith(':'):
                            continue
                        
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]
                            if data_str.strip() == '[DONE]':
                                break
                            
                            try:
                                data = json.loads(data_str)
                                choice = data.get("choices", [{}])[0]
                                delta = choice.get("delta", {})
                                
                                # Handle function call streaming
                                if "function_call" in delta:
                                    fc_delta = delta["function_call"]
                                    
                                    if "name" in fc_delta:
                                        current_function_name = fc_delta["name"]
                                        function_call_buffer[current_function_name] = {
                                            "name": current_function_name,
                                            "arguments": ""
                                        }
                                    
                                    if "arguments" in fc_delta and current_function_name:
                                        if current_function_name not in function_call_buffer:
                                            function_call_buffer[current_function_name] = {
                                                "name": current_function_name,
                                                "arguments": ""
                                            }
                                        function_call_buffer[current_function_name]["arguments"] += fc_delta["arguments"]
                                
                                # Handle regular content
                                if "content" in delta:
                                    event_data = json.dumps({
                                        "event": "text_chunk",
                                        "data": {"text_chunk": delta["content"]}
                                    })
                                    yield f"data: {event_data}\n\n".encode('utf-8')
                                
                                # Handle function call completion
                                finish_reason = choice.get("finish_reason")
                                if finish_reason == "function_call" and current_function_name:
                                    function_call = function_call_buffer.get(current_function_name)
                                    if function_call:
                                        try:
                                            arguments = json.loads(function_call["arguments"])
                                            
                                            if is_client_function(current_function_name):
                                                yield from handle_client_function(
                                                    current_function_name,
                                                    arguments,
                                                    function_call,
                                                    conversation_messages,
                                                    functions,
                                                    llm_url,
                                                    llm_headers,
                                                    is_client_function
                                                )
                                            else:
                                                yield from handle_server_function(
                                                    current_function_name,
                                                    arguments,
                                                    function_call,
                                                    request.message,
                                                    conversation_messages,
                                                    functions,
                                                    llm_url,
                                                    llm_headers
                                                )
                                            
                                            current_function_name = None
                                            function_call_buffer = {}
                                        except json.JSONDecodeError:
                                            pass
                                
                            except json.JSONDecodeError:
                                pass
                
            except Exception as e:
                error_msg = json.dumps({
                    "event": "error",
                    "data": {"message": str(e)}
                })
                yield f"data: {error_msg}\n\n".encode('utf-8')
            finally:
                llm_response.close()
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except requests.exceptions.ConnectionError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "error_code": "LLM_PROXY_UNREACHABLE",
                "message": "Could not connect to LLM proxy",
                "setup_hint": "Check LLM_PROXY_URL in backend/.env and verify your network connection"
            }
        )
    except requests.exceptions.Timeout as e:
        raise HTTPException(
            status_code=504,
            detail={
                "error_code": "LLM_PROXY_TIMEOUT",
                "message": "Connection to LLM proxy timed out",
                "setup_hint": "The LLM proxy may be slow or overloaded. Try again in a moment."
            }
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail={
                "error_code": "LLM_PROXY_ERROR",
                "message": f"LLM proxy request failed: {str(e)[:200]}",
                "setup_hint": "Check LLM proxy configuration and service status"
            }
        )
