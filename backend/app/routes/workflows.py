"""Elastic Workflows Proxy Route

Proxies requests to the Kibana Workflows Management API,
keeping API keys secure on the backend.

CRITICAL: Requires the x-elastic-internal-origin: kibana header
on Elastic Cloud Serverless. Without it, all workflow endpoints
return "exists but is not available with the current configuration".

API REFERENCE:
- Kibana source: src/platform/plugins/shared/workflows_management/README.md
- Workflow CRUD: /api/workflows
- Execution monitoring: /api/workflowExecutions
"""

from typing import Any

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


def get_kibana_headers() -> dict:
    """Get authentication headers for Kibana Workflows API.

    The x-elastic-internal-origin header is REQUIRED on serverless.
    Uses WORKFLOWS_API_KEY if set (needs workflowsManagement privilege),
    otherwise falls back to ELASTIC_API_KEY.
    """
    api_key = settings.WORKFLOWS_API_KEY or settings.ELASTIC_API_KEY
    return {
        "Authorization": f"ApiKey {api_key}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
        "x-elastic-internal-origin": "kibana",
    }


def kibana_url(path: str) -> str:
    """Build full Kibana API URL."""
    base = settings.KIBANA_URL.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def proxy_get(path: str, params: dict | None = None) -> Any:
    """Proxy a GET request to the Kibana Workflows API."""
    try:
        resp = requests.get(
            kibana_url(path),
            headers=get_kibana_headers(),
            params=params,
            timeout=30,
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_post(path: str, json_body: Any = None) -> Any:
    """Proxy a POST request to the Kibana Workflows API."""
    try:
        resp = requests.post(
            kibana_url(path),
            headers=get_kibana_headers(),
            json=json_body,
            timeout=60,
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_put(path: str, json_body: Any = None) -> Any:
    """Proxy a PUT request to the Kibana Workflows API."""
    try:
        resp = requests.put(
            kibana_url(path),
            headers=get_kibana_headers(),
            json=json_body,
            timeout=30,
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


def proxy_delete(path: str, json_body: Any = None) -> Any:
    """Proxy a DELETE request to the Kibana Workflows API."""
    try:
        resp = requests.delete(
            kibana_url(path),
            headers=get_kibana_headers(),
            json=json_body,
            timeout=30,
        )
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        # DELETE may return empty body
        if resp.text:
            return resp.json()
        return {"status": "deleted"}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Kibana connection error: {e!s}")


# --- Workflow CRUD ---


class WorkflowSearchRequest(BaseModel):
    limit: int = 20
    page: int = 1
    enabled: bool | None = None
    query: str | None = None


class WorkflowCreateRequest(BaseModel):
    yaml: str


class WorkflowUpdateRequest(BaseModel):
    yaml: str


class WorkflowRunRequest(BaseModel):
    inputs: dict[str, Any] = {}


class WorkflowTestRequest(BaseModel):
    workflowYaml: str
    inputs: dict[str, Any] = {}


@router.post("/search")
async def search_workflows(request: WorkflowSearchRequest):
    """Search and list workflows with optional filters."""
    body = {"limit": request.limit, "page": request.page}
    if request.enabled is not None:
        body["enabled"] = request.enabled
    if request.query:
        body["query"] = request.query
    return proxy_post("api/workflows/search", body)


@router.get("/stats")
async def get_stats():
    """Get workflow statistics (enabled/disabled counts, execution history)."""
    return proxy_get("api/workflows/stats")


@router.get("/connectors")
async def get_connectors():
    """Get available connectors for workflow steps."""
    return proxy_get("api/workflows/connectors")


@router.get("/schema")
async def get_schema(loose: bool = False):
    """Get the workflow JSON schema for YAML validation."""
    return proxy_get("api/workflows/workflow-json-schema", {"loose": str(loose).lower()})


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a workflow by ID."""
    return proxy_get(f"api/workflows/{workflow_id}")


@router.post("")
async def create_workflow(request: WorkflowCreateRequest):
    """Create a new workflow from YAML definition."""
    return proxy_post("api/workflows", {"yaml": request.yaml})


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, request: WorkflowUpdateRequest):
    """Update a workflow's YAML definition."""
    return proxy_put(f"api/workflows/{workflow_id}", {"yaml": request.yaml})


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow."""
    return proxy_delete(f"api/workflows/{workflow_id}")


@router.post("/{workflow_id}/clone")
async def clone_workflow(workflow_id: str):
    """Clone an existing workflow."""
    return proxy_post(f"api/workflows/{workflow_id}/clone")


# --- Workflow Execution ---


@router.post("/{workflow_id}/run")
async def run_workflow(workflow_id: str, request: WorkflowRunRequest):
    """Execute a workflow with optional inputs. Returns execution ID."""
    return proxy_post(
        f"api/workflows/{workflow_id}/run",
        {"inputs": request.inputs},
    )


@router.post("/test")
async def test_workflow(request: WorkflowTestRequest):
    """Test a workflow without saving it. Returns execution ID."""
    return proxy_post(
        "api/workflows/test",
        {"workflowYaml": request.workflowYaml, "inputs": request.inputs},
    )


# --- Execution Monitoring ---


@router.get("/executions/by-workflow/{workflow_id}")
async def get_executions(
    workflow_id: str,
    page: int = 1,
    perPage: int = 20,
    statuses: str | None = None,
):
    """List executions for a workflow."""
    params = {"workflowId": workflow_id, "page": page, "perPage": perPage}
    if statuses:
        params["statuses"] = statuses
    return proxy_get("api/workflowExecutions", params)


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get detailed execution status including step results."""
    return proxy_get(f"api/workflowExecutions/{execution_id}")


@router.get("/executions/{execution_id}/logs")
async def get_execution_logs(
    execution_id: str,
    limit: int = 50,
    offset: int = 0,
):
    """Get execution logs for debugging and audit."""
    return proxy_get(
        f"api/workflowExecutions/{execution_id}/logs",
        {"limit": limit, "offset": offset},
    )


@router.post("/executions/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running workflow execution."""
    return proxy_post(f"api/workflowExecutions/{execution_id}/cancel")


# --- Health ---


@router.get("/health/check")
async def workflows_health():
    """Check if the Workflows API is accessible."""
    try:
        result = proxy_get("api/workflows/stats")
        return {
            "status": "healthy",
            "workflows_enabled": True,
            "stats": result,
        }
    except HTTPException:
        return {
            "status": "unhealthy",
            "workflows_enabled": False,
            "message": "Workflows API not accessible. Check workflows:ui:enabled setting.",
        }
