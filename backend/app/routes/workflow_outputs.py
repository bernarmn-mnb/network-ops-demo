"""Workflow AI Outputs API.

Reads AI analysis results written to the workflow-ai-outputs index
by workflow elasticsearch.index steps. Each workflow writes its AI
output directly to ES; this endpoint serves the latest results to
the frontend.
"""

import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter
from ..config import settings

router = APIRouter(prefix="/api/workflow-outputs", tags=["workflow-outputs"])

OUTPUT_INDEX = "workflow-ai-outputs"
KB_WORKFLOWS_URL = "app/enterprise_search/kibana_workflows"


@router.get("")
async def get_all_outputs():
    """Return the latest AI output per workflow."""
    raw = await asyncio.to_thread(_fetch_outputs, None, 20)
    return {
        "outputs": raw if raw else _DEMO_OUTPUTS,
        "kibana_url": f"{(settings.KIBANA_URL or '').rstrip('/')}/{KB_WORKFLOWS_URL}",
        "source": "elasticsearch" if raw else "demo",
    }


@router.get("/{workflow_id}")
async def get_workflow_output(workflow_id: str):
    """Return the latest AI output for a specific workflow."""
    raw = await asyncio.to_thread(_fetch_outputs, workflow_id, 1)
    entry = raw[0] if raw else next(
        (d for d in _DEMO_OUTPUTS if d["workflow_id"] == workflow_id), None
    )
    return {
        "output": entry,
        "kibana_url": f"{(settings.KIBANA_URL or '').rstrip('/')}/{KB_WORKFLOWS_URL}",
        "source": "elasticsearch" if raw else "demo",
    }


def _fetch_outputs(workflow_id: str | None, size: int) -> list[dict] | None:
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=5)
        query: dict = {"match_all": {}}
        if workflow_id:
            query = {"term": {"workflow_id.keyword": workflow_id}}
        resp = es.search(index=OUTPUT_INDEX, body={
            "size": size,
            "sort": [{"@timestamp": "desc"}],
            "query": query,
        })
        if resp["hits"]["total"]["value"] == 0:
            return None
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return None


_DEMO_OUTPUTS: list[dict] = [
    {
        "workflow_id": "network-anomaly-triage",
        "workflow_name": "Network Anomaly Triage",
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "site-b-rtr",
        "flows_found": 5000,
        "snmp_samples": 288,
        "ai_output": (
            "**Severity: CRITICAL**\n\n"
            "**Root Cause**: The CPU spike on site-b-rtr (95%) correlates with an abnormally high "
            "flow rate from 10.2.1.45 → 172.16.1.20 on TCP/443 (28% of total bandwidth). This pattern "
            "is consistent with a bulk data transfer or potential data exfiltration event originating "
            "from the Site-B user subnet.\n\n"
            "**Immediate Containment Actions**:\n"
            "1. `show ip route 10.2.1.45` — verify routing for the suspicious host\n"
            "2. `interface GigabitEthernet0/2 / shutdown` — isolate the uplink if transfer continues\n"
            "3. `show conn address 10.2.1.45` — enumerate active sessions on the ASA firewall\n"
            "4. `debug ip packet 101` with ACL filtering on 10.2.1.45 — capture traffic sample\n\n"
            "**Escalation**: Engage security team if flow continues beyond 15 minutes. "
            "CPU at 95% risks OSPF adjacency loss and further Site-B isolation."
        ),
        "execution_id": "demo",
    },
]
