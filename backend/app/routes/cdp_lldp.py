"""CDP/LLDP topology routes.

Wraps the simulate_netcrawl.py script as an API endpoint so Kibana Workflows
can trigger a topology crawl via HTTP. Also serves CDP/LLDP topology data
to the frontend.
"""

import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/network", tags=["cdp-lldp"])

SCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "scripts"


class CrawlRequest(BaseModel):
    device_id: str
    interface_name: str = ""
    trigger: str = "manual"


@router.post("/cdp-crawl")
async def trigger_cdp_crawl(req: CrawlRequest):
    """Trigger a CDP/LLDP crawl for a device (called by Kibana workflow or manually).

    Runs simulate_netcrawl.py which generates CDP/LLDP adjacency data and
    indexes it into the cdp_lldp Elasticsearch index.
    """
    crawl_id = str(uuid.uuid4())

    try:
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPTS_DIR / "simulate_netcrawl.py"),
                "--trigger-device", req.device_id,
                "--trigger-interface", req.interface_name,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(SCRIPTS_DIR.parent),
        )
        success = result.returncode == 0
        return {
            "crawl_id": crawl_id,
            "device_id": req.device_id,
            "interface": req.interface_name,
            "trigger": req.trigger,
            "status": "completed" if success else "failed",
            "output": result.stdout[-500:] if result.stdout else "",
            "error": result.stderr[-300:] if not success else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except subprocess.TimeoutExpired:
        return {"crawl_id": crawl_id, "status": "timeout", "device_id": req.device_id}
    except Exception as e:
        return {"crawl_id": crawl_id, "status": "error", "error": str(e)}


@router.get("/cdp-topology")
async def get_cdp_topology():
    """Return the latest CDP/LLDP topology from Elasticsearch."""
    es_data = await _query_cdp_topology()
    return {
        "links": es_data if es_data else _DEMO_CDP_LINKS,
        "source": "elasticsearch" if es_data else "demo",
    }


@router.get("/cdp-topology/{device_id}")
async def get_device_cdp_topology(device_id: str):
    """Return CDP/LLDP neighbors for a specific device."""
    es_data = await _query_device_topology(device_id)
    links = [l for l in _DEMO_CDP_LINKS if l["local_device"].startswith(device_id)]
    return {
        "device_id": device_id,
        "links": es_data if es_data else links,
        "source": "elasticsearch" if es_data else "demo",
    }


# ---------------------------------------------------------------------------
# Demo fallback data
# ---------------------------------------------------------------------------

_DEMO_CDP_LINKS = [
    {"local_device": "fw-01.corp.local",      "local_interface": "GigabitEthernet0/1",    "neighbor_hostname": "core-sw-01.corp.local",   "neighbor_ip": "10.0.1.1",   "neighbor_interface": "TenGigabitEthernet0/1",   "protocol": "CDP",  "platform": "Arista 7050CX3-32S",       "link_status": "up"},
    {"local_device": "core-sw-01.corp.local", "local_interface": "TenGigabitEthernet0/1",  "neighbor_hostname": "fw-01.corp.local",         "neighbor_ip": "10.0.0.1",   "neighbor_interface": "GigabitEthernet0/1",      "protocol": "CDP",  "platform": "Cisco ASA 5506-X",         "link_status": "up"},
    {"local_device": "core-sw-01.corp.local", "local_interface": "TenGigabitEthernet0/2",  "neighbor_hostname": "site-a-rtr.corp.local",    "neighbor_ip": "10.1.0.1",   "neighbor_interface": "xe-1/0/0",                "protocol": "LLDP", "platform": "Juniper MX104",            "link_status": "up"},
    {"local_device": "core-sw-01.corp.local", "local_interface": "TenGigabitEthernet0/3",  "neighbor_hostname": "site-b-rtr.corp.local",    "neighbor_ip": "10.2.0.1",   "neighbor_interface": "xe-1/0/0",                "protocol": "LLDP", "platform": "Juniper MX104",            "link_status": "up"},
    {"local_device": "core-sw-01.corp.local", "local_interface": "TenGigabitEthernet0/4",  "neighbor_hostname": "dmz-sw.corp.local",        "neighbor_ip": "172.16.0.1", "neighbor_interface": "TenGigabitEthernet1/0/1", "protocol": "CDP",  "platform": "Cisco Catalyst 9300-48P",  "link_status": "up"},
    {"local_device": "site-a-rtr.corp.local", "local_interface": "xe-2/0/0",               "neighbor_hostname": "acc-sw-01.corp.local",     "neighbor_ip": "10.1.1.1",   "neighbor_interface": "GigabitEthernet0/1",      "protocol": "CDP",  "platform": "Cisco Catalyst 2960X-48",  "link_status": "up"},
    {"local_device": "site-a-rtr.corp.local", "local_interface": "xe-3/0/0",               "neighbor_hostname": "acc-sw-02.corp.local",     "neighbor_ip": "10.1.2.1",   "neighbor_interface": "GigabitEthernet0/1",      "protocol": "CDP",  "platform": "Cisco Catalyst 2960X-48",  "link_status": "up"},
    {"local_device": "site-b-rtr.corp.local", "local_interface": "GigabitEthernet0/2",     "neighbor_hostname": "acc-sw-03.corp.local",     "neighbor_ip": "10.2.1.1",   "neighbor_interface": "GigabitEthernet0/1",      "protocol": "CDP",  "platform": "Cisco Catalyst 2960X-48",  "link_status": "down"},
    {"local_device": "dmz-sw.corp.local",     "local_interface": "TenGigabitEthernet1/0/2","neighbor_hostname": "web-srv-01.corp.local",    "neighbor_ip": "172.16.1.10", "neighbor_interface": "eth0",                   "protocol": "LLDP", "platform": "Dell PowerEdge R640",      "link_status": "up"},
    {"local_device": "dmz-sw.corp.local",     "local_interface": "TenGigabitEthernet1/0/3","neighbor_hostname": "app-srv-01.corp.local",    "neighbor_ip": "172.16.1.20", "neighbor_interface": "eth0",                   "protocol": "LLDP", "platform": "Dell PowerEdge R740xd",    "link_status": "up"},
]


# ---------------------------------------------------------------------------
# Elasticsearch helpers — sync client wrapped in asyncio.to_thread
# ---------------------------------------------------------------------------

def _es_search(body: dict, index: str = "cdp_lldp") -> list[dict] | None:
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=4)
        resp = es.search(index=index, body=body)
        if resp["hits"]["total"]["value"] == 0:
            return None
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return None


async def _query_cdp_topology() -> list[dict] | None:
    import asyncio
    return await asyncio.to_thread(
        _es_search,
        {"size": 100, "sort": [{"@timestamp": "desc"}], "query": {"match_all": {}}},
    )


async def _query_device_topology(device_id: str) -> list[dict] | None:
    import asyncio
    return await asyncio.to_thread(
        _es_search,
        {
            "size": 50,
            "sort": [{"@timestamp": "desc"}],
            "query": {"bool": {"must": [{"match": {"local_device": device_id}}]}},
        },
    )
