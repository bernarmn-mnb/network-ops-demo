"""A2A Health Check Endpoint

Provides health and configuration status for A2A functionality.
Used by frontend to determine if LLM proxy is configured before
showing the A2A chat interface.

LLM Documentation:
- GET /api/a2a/health: Returns A2A configuration status
"""

import requests
from fastapi import APIRouter

from ...config import settings

router = APIRouter()


@router.get("/health")
async def a2a_health():
    """Check A2A configuration health.

    Returns status information about LLM proxy configuration
    and optionally tests connectivity.

    Response:
    - status: 'healthy' | 'not_configured' | 'unhealthy'
    - llm_proxy_configured: bool
    - llm_proxy_url: str (masked for security)
    - llm_proxy_model: str
    - setup_hint: str (if not configured)
    - error: str (if unhealthy)
    """
    # Check if LLM proxy is configured
    llm_proxy_configured = bool(settings.LLM_PROXY_URL and settings.LLM_PROXY_API_KEY)

    # Mask the URL for security (show domain only)
    masked_url = ""
    if settings.LLM_PROXY_URL:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(settings.LLM_PROXY_URL)
            masked_url = f"{parsed.scheme}://{parsed.netloc}/..."
        except Exception:
            masked_url = "configured"

    if not llm_proxy_configured:
        return {
            "status": "not_configured",
            "llm_proxy_configured": False,
            "llm_proxy_url": None,
            "llm_proxy_model": settings.LLM_PROXY_MODEL,
            "setup_hint": "A2A requires LLM proxy configuration. Add LLM_PROXY_URL and LLM_PROXY_API_KEY to backend/.env",
            "setup_steps": [
                "Edit backend/.env file",
                "Add LLM_PROXY_URL=<your-llm-proxy-url>",
                "Add LLM_PROXY_API_KEY=<your-api-key>",
                "Restart the backend: ./dev restart",
            ],
        }

    # Configuration exists - return healthy status
    # Note: We don't test connectivity here to keep the endpoint fast
    # Actual connectivity issues will be caught when chat is attempted
    return {
        "status": "healthy",
        "llm_proxy_configured": True,
        "llm_proxy_url": masked_url,
        "llm_proxy_model": settings.LLM_PROXY_MODEL,
    }


@router.get("/health/test")
async def a2a_health_test():
    """Test A2A connectivity by making a simple request to LLM proxy.

    This is slower than /health but actually verifies the connection works.
    Use this when troubleshooting configuration issues.

    Response includes all fields from /health plus:
    - connectivity_tested: bool
    - connectivity_ok: bool
    - error: str (if connectivity fails)
    """
    # First get basic health
    base_health = await a2a_health()

    if base_health["status"] == "not_configured":
        return {
            **base_health,
            "connectivity_tested": False,
            "connectivity_ok": False,
        }

    # Test connectivity with a simple models list request
    try:
        test_url = f"{settings.LLM_PROXY_URL}/models"
        headers = {
            "Authorization": f"Bearer {settings.LLM_PROXY_API_KEY}",
        }

        response = requests.get(test_url, headers=headers, timeout=10)

        if response.status_code == 200:
            return {
                **base_health,
                "connectivity_tested": True,
                "connectivity_ok": True,
            }
        elif response.status_code == 401:
            return {
                "status": "unhealthy",
                "llm_proxy_configured": True,
                "llm_proxy_url": base_health["llm_proxy_url"],
                "llm_proxy_model": base_health["llm_proxy_model"],
                "connectivity_tested": True,
                "connectivity_ok": False,
                "error": "Authentication failed - API key may be invalid or expired",
                "error_code": "LLM_PROXY_AUTH_FAILED",
                "setup_hint": "Check your LLM_PROXY_API_KEY in backend/.env - it may be expired. Contact your LLM proxy administrator for a new key.",
            }
        elif response.status_code == 403:
            return {
                "status": "unhealthy",
                "llm_proxy_configured": True,
                "llm_proxy_url": base_health["llm_proxy_url"],
                "llm_proxy_model": base_health["llm_proxy_model"],
                "connectivity_tested": True,
                "connectivity_ok": False,
                "error": "Access forbidden - API key may not have required permissions",
                "error_code": "LLM_PROXY_FORBIDDEN",
                "setup_hint": "Your API key may not have the required permissions. Contact your LLM proxy administrator.",
            }
        else:
            return {
                "status": "unhealthy",
                "llm_proxy_configured": True,
                "llm_proxy_url": base_health["llm_proxy_url"],
                "llm_proxy_model": base_health["llm_proxy_model"],
                "connectivity_tested": True,
                "connectivity_ok": False,
                "error": f"LLM proxy returned status {response.status_code}",
                "error_code": "LLM_PROXY_ERROR",
            }

    except requests.exceptions.ConnectionError:
        return {
            "status": "unhealthy",
            "llm_proxy_configured": True,
            "llm_proxy_url": base_health["llm_proxy_url"],
            "llm_proxy_model": base_health["llm_proxy_model"],
            "connectivity_tested": True,
            "connectivity_ok": False,
            "error": "Could not connect to LLM proxy",
            "error_code": "LLM_PROXY_UNREACHABLE",
            "setup_hint": "Check LLM_PROXY_URL in backend/.env and verify your network connection.",
        }
    except requests.exceptions.Timeout:
        return {
            "status": "unhealthy",
            "llm_proxy_configured": True,
            "llm_proxy_url": base_health["llm_proxy_url"],
            "llm_proxy_model": base_health["llm_proxy_model"],
            "connectivity_tested": True,
            "connectivity_ok": False,
            "error": "Connection to LLM proxy timed out",
            "error_code": "LLM_PROXY_TIMEOUT",
            "setup_hint": "The LLM proxy is not responding. It may be down or there may be network issues.",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "llm_proxy_configured": True,
            "llm_proxy_url": base_health["llm_proxy_url"],
            "llm_proxy_model": base_health["llm_proxy_model"],
            "connectivity_tested": True,
            "connectivity_ok": False,
            "error": str(e),
            "error_code": "LLM_PROXY_ERROR",
        }
