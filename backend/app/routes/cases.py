"""Kibana Cases proxy route.

Called by Kibana Workflows http steps to create cases, since the workflow
cannot securely access the API key itself. The backend holds the key and
proxies the case creation.
"""

from fastapi import APIRouter
from pydantic import BaseModel
import requests as req
from ..config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])


class CaseCreateRequest(BaseModel):
    title: str
    description: str
    tags: list[str] = []
    workflow_id: str = ""
    device_id: str = ""


@router.post("/create")
async def create_case(body: CaseCreateRequest):
    """Create a Kibana case. Called by workflow http steps."""
    kb  = (settings.KIBANA_URL or "").rstrip("/")
    key = settings.ELASTIC_API_KEY
    if not kb or not key:
        return {"error": "Kibana not configured", "created": False}

    h = {
        "Authorization": f"ApiKey {key}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
    }

    # Trim description to 30k chars (Kibana Cases limit)
    description = body.description[:30000]

    payload = {
        "title":       body.title,
        "description": description,
        "connector":   {"id": "none", "name": "none", "type": ".none", "fields": None},
        "settings":    {"syncAlerts": False},
        "owner":       "cases",
        "tags":        body.tags or ["network", "ai-generated"],
    }

    try:
        r = req.post(f"{kb}/api/cases", headers=h, json=payload, timeout=15)
        if r.ok:
            case = r.json()
            return {
                "created": True,
                "case_id": case.get("id"),
                "case_url": f"{kb}/app/cases/{case.get('id')}",
                "title": case.get("title"),
            }
        return {"created": False, "error": f"{r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"created": False, "error": str(e)}


@router.get("/list")
async def list_cases(search: str = "", page: int = 1, per_page: int = 10):
    """List recent NOC cases."""
    kb  = (settings.KIBANA_URL or "").rstrip("/")
    key = settings.ELASTIC_API_KEY
    if not kb or not key:
        return {"cases": [], "total": 0}

    h = {"Authorization": f"ApiKey {key}", "kbn-xsrf": "true"}
    params = {"perPage": per_page, "page": page, "sortField": "createdAt", "sortOrder": "desc"}
    if search:
        params["search"] = search

    try:
        r = req.get(f"{kb}/api/cases/_find", headers=h, params=params, timeout=10)
        if r.ok:
            d = r.json()
            return {
                "cases": [
                    {
                        "id": c["id"],
                        "title": c["title"],
                        "status": c["status"],
                        "created": c.get("created_at", ""),
                        "tags": c.get("tags", []),
                        "url": f"{kb}/app/cases/{c['id']}",
                    }
                    for c in d.get("cases", [])
                ],
                "total": d.get("total", 0),
            }
        return {"cases": [], "total": 0}
    except Exception:
        return {"cases": [], "total": 0}
