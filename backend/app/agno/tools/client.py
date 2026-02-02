"""Client-Side Function Tools for Agno.

These tools represent functions that execute in the browser, not on the server.
When called, they emit events for the frontend to handle.

Usage:
    from app.agno.tools.client import create_client_function_toolkit
    
    toolkit = create_client_function_toolkit([
        {"name": "browser_beep", "description": "Play a beep sound", ...}
    ])
    
    agent = Agent(
        model=model,
        tools=[toolkit],
    )
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from agno.run.agent import CustomEvent
from agno.tools import Toolkit

logger = logging.getLogger(__name__)


# ============================================================================
# Custom Event for Client Function Calls
# ============================================================================

@dataclass
class ClientFunctionCallEvent(CustomEvent):
    """Event emitted when a client-side function should be called.
    
    This event is sent to the frontend, which executes the function
    in the browser and returns the result.
    """
    
    function_name: str = ""
    arguments: Optional[Dict[str, Any]] = None


# ============================================================================
# Client Function Toolkit Factory
# ============================================================================

def create_client_function_toolkit(
    client_functions: List[Dict[str, Any]]
) -> Optional[Toolkit]:
    """Create an Agno Toolkit from client function definitions.
    
    Each client function becomes a tool that, when called by the LLM,
    emits a ClientFunctionCallEvent for the frontend to handle.
    
    Args:
        client_functions: List of client function definitions, each with:
            - name: Function name
            - description: What the function does
            - parameters: JSON Schema for parameters
    
    Returns:
        A Toolkit containing all client functions, or None if no functions
    """
    if not client_functions:
        return None
    
    toolkit = Toolkit(name="client_functions")
    
    for func_def in client_functions:
        func_name = func_def.get("name", "unknown")
        func_desc = func_def.get("description", "A client-side function")
        func_params = func_def.get("parameters", {})
        
        # Create a tool function that yields the client call event
        # We need to create a closure to capture the function name
        def make_client_tool(name: str, description: str, params: Dict[str, Any]):
            """Create a client tool function."""
            
            async def client_tool(**kwargs):
                """
                Execute a client-side function in the browser.
                
                This function emits an event for the frontend to handle.
                The actual execution happens in the browser.
                """
                # Yield the event for the frontend
                yield ClientFunctionCallEvent(
                    function_name=name,
                    arguments=kwargs,
                )
                # Yield a final confirmation message (generators can't return values)
                yield f"✅ Triggered client function '{name}' in the browser"
            
            # Set function metadata for Agno
            client_tool.__name__ = name
            client_tool.__doc__ = f"{description}\n\nThis function executes in the browser."
            
            # Add parameter annotations from schema
            # Agno uses these to build the tool definition
            if params.get("properties"):
                annotations = {}
                for param_name, param_def in params["properties"].items():
                    param_type = param_def.get("type", "string")
                    if param_type == "number":
                        annotations[param_name] = float
                    elif param_type == "integer":
                        annotations[param_name] = int
                    elif param_type == "boolean":
                        annotations[param_name] = bool
                    else:
                        annotations[param_name] = str
                client_tool.__annotations__ = annotations
            
            return client_tool
        
        # Create and register the tool
        tool_func = make_client_tool(func_name, func_desc, func_params)
        toolkit.register(tool_func)
        logger.debug(f"Registered client function tool: {func_name}")
    
    return toolkit
