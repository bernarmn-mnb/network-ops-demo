"""A2A Function Call Handlers

Handles execution of function calls during A2A chat:
- Server-side functions: Call Agent Builder agents and stream responses
- Client-side functions: Emit events for browser execution

LLM Documentation:
- handle_server_function: Execute Agent Builder agent, stream events
- handle_client_function: Emit event for browser, continue conversation
"""

import json
from collections.abc import Callable
from typing import Any, Dict, List

import requests

from ...config import settings
from .functions import extract_agent_id_from_function_name


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


def handle_client_function(
    function_name: str,
    arguments: dict[str, Any],
    function_call: dict[str, Any],
    conversation_messages: list[dict[str, Any]],
    functions: list[dict[str, Any]],
    llm_url: str,
    llm_headers: dict[str, str],
    is_client_function: Callable[[str], bool],
):
    """Handle client-side function call (executed in browser).

    1. Emits client_function_call event for frontend
    2. Adds simulated result to conversation context
    3. Continues LLM conversation
    4. Handles any nested client function calls
    """
    # Emit event for frontend
    event_data = json.dumps(
        {
            "event": "client_function_call",
            "data": {
                "function_name": function_name,
                "arguments": arguments,
                "is_client_side": True,
            },
        }
    )
    yield f"data: {event_data}\n\n".encode()

    # Add to conversation context
    client_result = {
        "status": "executed_client_side",
        "function": function_name,
        "success": True,
    }

    conversation_messages.append(
        {"role": "assistant", "content": None, "function_call": function_call}
    )
    conversation_messages.append(
        {
            "role": "function",
            "name": function_name,
            "content": json.dumps(client_result),
        }
    )

    # Continue LLM conversation
    llm_payload_continue = {
        "model": settings.LLM_PROXY_MODEL,
        "messages": conversation_messages,
        "functions": functions,
        "function_call": "auto",
        "stream": True,
    }

    llm_response_continue = requests.post(
        llm_url,
        headers=llm_headers,
        json=llm_payload_continue,
        stream=True,
        timeout=120,
    )

    if llm_response_continue.ok:
        current_fn = None
        fn_buffer: dict[str, dict[str, str]] = {}

        for continue_line in llm_response_continue.iter_lines():
            if continue_line:
                continue_line_str = continue_line.decode("utf-8")
                if continue_line_str.startswith(":"):
                    continue
                if continue_line_str.startswith("data: "):
                    continue_data_str = continue_line_str[6:]
                    if continue_data_str.strip() == "[DONE]":
                        break
                    try:
                        continue_data = json.loads(continue_data_str)
                        continue_choice = continue_data.get("choices", [{}])[0]
                        continue_delta = continue_choice.get("delta", {})

                        if "content" in continue_delta:
                            text_event = json.dumps(
                                {
                                    "event": "text_chunk",
                                    "data": {"text_chunk": continue_delta["content"]},
                                }
                            )
                            yield f"data: {text_event}\n\n".encode()

                        # Handle nested function calls
                        if "function_call" in continue_delta:
                            fc_d = continue_delta["function_call"]
                            if "name" in fc_d:
                                current_fn = fc_d["name"]
                                fn_buffer[current_fn] = {
                                    "name": current_fn,
                                    "arguments": "",
                                }
                            if "arguments" in fc_d and current_fn:
                                if current_fn not in fn_buffer:
                                    fn_buffer[current_fn] = {
                                        "name": current_fn,
                                        "arguments": "",
                                    }
                                fn_buffer[current_fn]["arguments"] += fc_d["arguments"]

                        # Check for nested client function call
                        continue_finish = continue_choice.get("finish_reason")
                        if continue_finish == "function_call" and current_fn:
                            nested_fc = fn_buffer.get(current_fn)
                            if nested_fc and is_client_function(current_fn):
                                nested_args = json.loads(nested_fc["arguments"])
                                nested_event = json.dumps(
                                    {
                                        "event": "client_function_call",
                                        "data": {
                                            "function_name": current_fn,
                                            "arguments": nested_args,
                                            "is_client_side": True,
                                        },
                                    }
                                )
                                yield f"data: {nested_event}\n\n".encode()
                    except (json.JSONDecodeError, KeyError):
                        pass

        try:
            llm_response_continue.close()
        except Exception:
            pass


def handle_server_function(
    function_name: str,
    arguments: dict[str, Any],
    function_call: dict[str, Any],
    original_message: str,
    conversation_messages: list[dict[str, Any]],
    functions: list[dict[str, Any]],
    llm_url: str,
    llm_headers: dict[str, str],
):
    """Handle server-side function call (Agent Builder).

    1. Emits function_call event
    2. Streams Agent Builder response with rich events:
       - agent_reasoning: LLM thinking
       - agent_tool_call: Tool invocation
       - agent_tool_status: Progress updates
       - agent_tool_result: Tool outputs
       - agent_text_chunk: Response text
    3. Adds result to conversation context
    4. Gets final LLM response
    """
    user_input = arguments.get("input", original_message)
    agent_id = extract_agent_id_from_function_name(function_name)

    if not agent_id:
        return

    # Emit function call event
    event_data = json.dumps(
        {
            "event": "function_call",
            "data": {
                "function_name": function_name,
                "agent_id": agent_id,
                "input": user_input,
            },
        }
    )
    yield f"data: {event_data}\n\n".encode()

    # Stream Agent Builder response
    full_agent_response = ""
    url = get_agent_builder_streaming_url()
    headers = get_agent_builder_auth_headers()
    payload_ab = {"input": user_input, "agent_id": agent_id}

    upstream = requests.post(
        url, headers=headers, json=payload_ab, stream=True, timeout=120
    )

    if not upstream.ok:
        error_event = json.dumps(
            {
                "event": "error",
                "data": {"message": f"Agent Builder error: {upstream.status_code}"},
            }
        )
        yield f"data: {error_event}\n\n".encode()
        return

    try:
        for agent_line in upstream.iter_lines():
            if not agent_line:
                continue
            line_str = agent_line.decode("utf-8")
            if line_str.startswith(":"):
                continue
            if not line_str.startswith("data: "):
                continue
            data_str = line_str[6:]

            try:
                data_agent = json.loads(data_str)
                payload_data = data_agent.get("data", data_agent)

                # Reasoning events
                if "reasoning" in payload_data:
                    agent_event = json.dumps(
                        {
                            "event": "agent_reasoning",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "reasoning": payload_data["reasoning"],
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

                # Tool call initiation
                if "tool_call_id" in payload_data and "params" in payload_data:
                    agent_event = json.dumps(
                        {
                            "event": "agent_tool_call",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "tool_id": payload_data.get("tool_call_id"),
                                "tool_name": payload_data.get("tool_id"),
                                "params": payload_data.get("params"),
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

                # Tool status messages
                elif "message" in payload_data and "tool_call_id" in payload_data:
                    agent_event = json.dumps(
                        {
                            "event": "agent_tool_status",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "tool_id": payload_data.get("tool_call_id"),
                                "message": payload_data.get("message"),
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

                # Tool results
                if "results" in payload_data and "tool_call_id" in payload_data:
                    agent_event = json.dumps(
                        {
                            "event": "agent_tool_result",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "tool_id": payload_data.get("tool_call_id"),
                                "tool_name": payload_data.get("tool_id"),
                                "result": payload_data.get("results"),
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

                # Text chunks
                if "text_chunk" in payload_data:
                    chunk_text = payload_data["text_chunk"]
                    full_agent_response += chunk_text
                    agent_event = json.dumps(
                        {
                            "event": "agent_text_chunk",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "text_chunk": chunk_text,
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

                # Final message content
                elif "message_content" in payload_data and not full_agent_response:
                    chunk_text = payload_data["message_content"]
                    full_agent_response = chunk_text
                    agent_event = json.dumps(
                        {
                            "event": "agent_text_chunk",
                            "data": {
                                "agent_id": agent_id,
                                "function_name": function_name,
                                "text_chunk": chunk_text,
                            },
                        }
                    )
                    yield f"data: {agent_event}\n\n".encode()

            except json.JSONDecodeError:
                continue
    finally:
        try:
            upstream.close()
        except Exception:
            pass

    # Add to conversation and get final response
    conversation_messages.append(
        {"role": "assistant", "content": None, "function_call": function_call}
    )
    conversation_messages.append(
        {"role": "function", "name": function_name, "content": full_agent_response}
    )

    # Call LLM with function result
    llm_payload2 = {
        "model": settings.LLM_PROXY_MODEL,
        "messages": conversation_messages,
        "functions": functions,
    }

    llm_response2 = requests.post(
        llm_url, headers=llm_headers, json=llm_payload2, timeout=30
    )

    if llm_response2.ok:
        data2 = llm_response2.json()
        message2 = data2["choices"][0]["message"]
        final_message = message2.get("content")

        if final_message:
            event_data = json.dumps(
                {"event": "text_chunk", "data": {"text_chunk": final_message}}
            )
            yield f"data: {event_data}\n\n".encode()
