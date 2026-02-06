"""
MCP Server proxy routes.

Provides endpoints to interact with the Elastic Agent Builder MCP server,
including listing tools, getting server info, and testing tool execution.

This module acts as a proxy between the frontend and Kibana's MCP endpoint,
handling JSON-RPC 2.0 protocol details and authentication.

Endpoints:
    GET  /api/mcp/health - Health check and MCP URL
    GET  /api/mcp/info   - Full server info with client configuration examples
    GET  /api/mcp/tools  - List all available tools (built-in and custom)
    POST /api/mcp/tools/call - Execute a specific tool with arguments

MCP Protocol:
    The Elastic MCP server uses JSON-RPC 2.0 over HTTP POST.
    All requests require specific headers including Accept: application/json.
    
    See: hive-mind/patterns/elastic/MCP_SERVER_INTEGRATION.md

Note:
    This implementation uses raw httpx for simplicity rather than the official
    MCP Python SDK. For production integrations requiring advanced features
    like streaming or bidirectional communication, consider using the SDK:
    `pip install mcp`
"""

import json
import httpx
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


class MCPRequest(BaseModel):
    """Generic MCP JSON-RPC request."""
    method: str
    params: Dict[str, Any] = {}


class ToolCallRequest(BaseModel):
    """Request to call a specific tool."""
    tool_name: str
    arguments: Dict[str, Any] = {}


def get_mcp_url() -> str:
    """Get the MCP server URL."""
    return f"{settings.KIBANA_URL}/api/agent_builder/mcp"


def get_headers() -> Dict[str, str]:
    """Get headers for MCP requests."""
    return {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "kbn-xsrf": "true",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def mcp_request(method: str, params: Dict[str, Any] = None, request_id: int = 1) -> Dict[str, Any]:
    """
    Send a JSON-RPC 2.0 request to the MCP server.
    
    Args:
        method: The MCP method to call (e.g., "initialize", "tools/list", "tools/call")
        params: Parameters for the method
        request_id: JSON-RPC request ID
        
    Returns:
        The JSON-RPC response
    """
    if not settings.KIBANA_URL or not settings.ELASTIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="KIBANA_URL or ELASTIC_API_KEY not configured"
        )
    
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "id": request_id,
        "params": params or {}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                get_mcp_url(),
                headers=get_headers(),
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"MCP server error: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to MCP server: {str(e)}"
            )


@router.get("/info")
async def get_mcp_info():
    """
    Get MCP server information and connection details.
    
    Returns server info, connection URL, and configuration examples.
    """
    mcp_url = get_mcp_url()
    
    # Check if MCP is configured
    if not settings.KIBANA_URL:
        server_info = {}
        protocol_version = "unknown"
        capabilities = {}
        connected = False
        error = "KIBANA_URL not configured - set up Agent Builder connection to use MCP"
    else:
        # Try to initialize and get server info
        try:
            result = await mcp_request("initialize", {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "mcp-explorer",
                    "version": "1.0.0"
                }
            })
            
            server_info = result.get("result", {}).get("serverInfo", {})
            protocol_version = result.get("result", {}).get("protocolVersion", "unknown")
            capabilities = result.get("result", {}).get("capabilities", {})
            connected = True
            error = None
        except HTTPException as e:
            server_info = {}
            protocol_version = "unknown"
            capabilities = {}
            connected = False
            error = e.detail
    
    return {
        "connected": connected,
        "error": error,
        "mcp_url": mcp_url,
        "kibana_url": settings.KIBANA_URL,
        "server_info": server_info,
        "protocol_version": protocol_version,
        "capabilities": capabilities,
        "configuration_examples": {
            "cursor": {
                "path": "~/.cursor/mcp.json",
                "config": {
                    "mcpServers": {
                        "elastic-agent-builder": {
                            "command": "npx",
                            "args": [
                                "mcp-remote",
                                mcp_url,
                                "--header",
                                "Authorization:${AUTH_HEADER}"
                            ],
                            "env": {
                                "AUTH_HEADER": "ApiKey YOUR_API_KEY_HERE"
                            }
                        }
                    }
                }
            },
            "claude_desktop": {
                "path": "~/Library/Application Support/Claude/claude_desktop_config.json (macOS)",
                "config": {
                    "mcpServers": {
                        "elastic": {
                            "command": "npx",
                            "args": [
                                "mcp-remote",
                                mcp_url,
                                "--header",
                                "Authorization:ApiKey YOUR_API_KEY_HERE"
                            ]
                        }
                    }
                }
            }
        }
    }


@router.get("/tools")
async def list_tools():
    """
    List all available tools from the MCP server.
    
    Returns empty lists if KIBANA_URL is not configured (graceful degradation).
    
    Returns both built-in and custom tools with their schemas.
    """
    # Check if MCP is configured
    if not settings.KIBANA_URL:
        return {
            "total": 0,
            "builtin_count": 0,
            "custom_count": 0,
            "builtin_tools": [],
            "custom_tools": [],
            "all_tools": [],
            "error": "KIBANA_URL not configured - MCP tools unavailable"
        }
    
    try:
        result = await mcp_request("tools/list", {}, request_id=2)
    except HTTPException as e:
        # Return empty list with error instead of raising
        return {
            "total": 0,
            "builtin_count": 0,
            "custom_count": 0,
            "builtin_tools": [],
            "custom_tools": [],
            "all_tools": [],
            "error": str(e.detail)
        }
    
    if "error" in result:
        return {
            "total": 0,
            "builtin_count": 0,
            "custom_count": 0,
            "builtin_tools": [],
            "custom_tools": [],
            "all_tools": [],
            "error": f"MCP error: {result['error'].get('message', 'Unknown error')}"
        }
    
    tools = result.get("result", {}).get("tools", [])
    
    # Categorize tools
    builtin_tools = [t for t in tools if t["name"].startswith("platform_")]
    custom_tools = [t for t in tools if not t["name"].startswith("platform_")]
    
    return {
        "total": len(tools),
        "builtin_count": len(builtin_tools),
        "custom_count": len(custom_tools),
        "builtin_tools": builtin_tools,
        "custom_tools": custom_tools,
        "all_tools": tools
    }


@router.post("/tools/call")
async def call_tool(request: ToolCallRequest):
    """
    Call a specific tool with the provided arguments.
    
    This is useful for testing tools directly.
    """
    result = await mcp_request("tools/call", {
        "name": request.tool_name,
        "arguments": request.arguments
    }, request_id=3)
    
    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=f"Tool call error: {result['error'].get('message', 'Unknown error')}"
        )
    
    # Parse the nested response
    content = result.get("result", {}).get("content", [])
    
    if content and content[0].get("type") == "text":
        try:
            parsed_content = json.loads(content[0].get("text", "{}"))
            return {
                "success": True,
                "tool_name": request.tool_name,
                "raw_result": result.get("result"),
                "parsed_results": parsed_content.get("results", []),
                "result_count": len(parsed_content.get("results", []))
            }
        except json.JSONDecodeError:
            return {
                "success": True,
                "tool_name": request.tool_name,
                "raw_result": result.get("result"),
                "parsed_results": None,
                "result_count": 0
            }
    
    return {
        "success": True,
        "tool_name": request.tool_name,
        "raw_result": result.get("result"),
        "parsed_results": None,
        "result_count": 0
    }


@router.get("/health")
async def mcp_health():
    """
    Quick health check for MCP connectivity.
    """
    try:
        result = await mcp_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "health-check", "version": "1.0.0"}
        })
        
        if "result" in result:
            return {"status": "healthy", "mcp_url": get_mcp_url()}
        else:
            return {"status": "unhealthy", "error": result.get("error", {}).get("message")}
    except HTTPException as e:
        return {"status": "unhealthy", "error": e.detail}

