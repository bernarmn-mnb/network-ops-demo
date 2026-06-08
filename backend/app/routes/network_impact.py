"""Network Impact Analysis API routes.

Serves MAC→IP→hostname chain data for interface flap/outage impact analysis.
Returns live data from Elasticsearch, falls back to demo data built from
the same device catalogue used in generate_network_impact.py.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api/network/impact", tags=["network-impact"])

# ---------------------------------------------------------------------------
# Demo fallback data (matches what generate_network_impact.py produces)
# ---------------------------------------------------------------------------

_DEMO_EVENTS = [
    {
        "event_id": "demo-flap-001",
        "event_type": "flap",
        "trigger_device": "acc-sw-03",
        "trigger_interface": "GigabitEthernet0/1",
        "trigger_description": "Interface GigabitEthernet0/1 flapping — 5 state changes in 14 minutes",
        "flap_count": 5,
        "first_detected": (datetime.now(timezone.utc).replace(microsecond=0).isoformat()),
        "duration_minutes": 18,
        "site": "Site-B",
        "affected_count": 35,
        "departments": ["Finance", "Trading", "HR", "NOC", "IT"],
        "status": "active",
    },
    {
        "event_id": "demo-outage-001",
        "event_type": "outage",
        "trigger_device": "acc-sw-02",
        "trigger_interface": "GigabitEthernet0/3",
        "trigger_description": "Interface GigabitEthernet0/3 link down — CRC errors detected",
        "flap_count": 1,
        "first_detected": (datetime.now(timezone.utc).replace(microsecond=0).isoformat()),
        "duration_minutes": 7,
        "site": "Site-A",
        "affected_count": 8,
        "departments": ["Operations", "Security", "IT"],
        "status": "active",
    },
]

_DEMO_DEVICES = [
    {"mac_address":"00:1A:2B:10:00:01","ip_address":"10.2.1.10","hostname":"fin-ws-01","fqdn":"fin-ws-01.siteb.corp.local","device_type":"workstation","user_name":"alice.chen","department":"Finance","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/2","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    {"mac_address":"00:1A:2B:10:00:02","ip_address":"10.2.1.11","hostname":"fin-ws-02","fqdn":"fin-ws-02.siteb.corp.local","device_type":"workstation","user_name":"bob.smith","department":"Finance","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/3","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    {"mac_address":"00:1A:2B:10:00:03","ip_address":"10.2.1.12","hostname":"fin-ws-03","fqdn":"fin-ws-03.siteb.corp.local","device_type":"workstation","user_name":"carol.martinez","department":"Finance","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/4","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    {"mac_address":"00:1A:2B:10:00:04","ip_address":"10.2.1.13","hostname":"fin-ws-04","fqdn":"fin-ws-04.siteb.corp.local","device_type":"workstation","user_name":"david.lee","department":"Finance","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/5","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    {"mac_address":"00:1A:2B:10:00:05","ip_address":"10.2.1.14","hostname":"fin-ws-05","fqdn":"fin-ws-05.siteb.corp.local","device_type":"workstation","user_name":"emma.wilson","department":"Finance","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/6","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    {"mac_address":"00:1A:2B:20:00:01","ip_address":"10.2.1.20","hostname":"trd-ws-01","fqdn":"trd-ws-01.siteb.corp.local","device_type":"workstation","user_name":"ivan.petrov","department":"Trading","vlan_id":21,"switch_device":"acc-sw-03","switch_port":"Gi0/10","event_type":"flap","status":"offline","building":"HQ-B","floor":"4"},
    {"mac_address":"00:1A:2B:20:00:02","ip_address":"10.2.1.21","hostname":"trd-ws-02","fqdn":"trd-ws-02.siteb.corp.local","device_type":"workstation","user_name":"julia.kim","department":"Trading","vlan_id":21,"switch_device":"acc-sw-03","switch_port":"Gi0/11","event_type":"flap","status":"offline","building":"HQ-B","floor":"4"},
    {"mac_address":"00:1A:2B:20:00:03","ip_address":"10.2.1.22","hostname":"trd-ws-03","fqdn":"trd-ws-03.siteb.corp.local","device_type":"workstation","user_name":"kevin.walsh","department":"Trading","vlan_id":21,"switch_device":"acc-sw-03","switch_port":"Gi0/12","event_type":"flap","status":"offline","building":"HQ-B","floor":"4"},
    {"mac_address":"00:1A:2B:30:00:01","ip_address":"10.2.1.30","hostname":"hr-ws-01","fqdn":"hr-ws-01.siteb.corp.local","device_type":"workstation","user_name":"olivia.garcia","department":"HR","vlan_id":20,"switch_device":"acc-sw-03","switch_port":"Gi0/16","event_type":"flap","status":"offline","building":"HQ-B","floor":"1"},
    {"mac_address":"00:1A:2B:40:00:01","ip_address":"10.2.1.35","hostname":"noc-ws-01","fqdn":"noc-ws-01.siteb.corp.local","device_type":"workstation","user_name":"tanya.williams","department":"NOC","vlan_id":99,"switch_device":"acc-sw-03","switch_port":"Gi0/21","event_type":"flap","status":"offline","building":"HQ-B","floor":"5"},
    {"mac_address":"00:1A:2B:60:00:01","ip_address":"10.2.1.50","hostname":"trd-srv-01","fqdn":"trd-srv-01.siteb.corp.local","device_type":"server","user_name":"","department":"Trading","vlan_id":21,"switch_device":"acc-sw-03","switch_port":"Gi0/28","event_type":"flap","status":"offline","building":"HQ-B","floor":"B1"},
    {"mac_address":"00:1A:2B:70:00:01","ip_address":"10.2.1.60","hostname":"voip-fin-01","fqdn":"voip-fin-01.siteb.corp.local","device_type":"voip_phone","user_name":"alice.chen","department":"Finance","vlan_id":30,"switch_device":"acc-sw-03","switch_port":"Gi0/32","event_type":"flap","status":"offline","building":"HQ-B","floor":"2"},
    # Outage scenario
    {"mac_address":"00:1C:3D:10:00:01","ip_address":"10.1.2.110","hostname":"ops-ws-01","fqdn":"ops-ws-01.sitea.corp.local","device_type":"workstation","user_name":"anna.ford","department":"Operations","vlan_id":20,"switch_device":"acc-sw-02","switch_port":"Gi0/5","event_type":"outage","status":"offline","building":"HQ-A","floor":"2"},
    {"mac_address":"00:1C:3D:10:00:02","ip_address":"10.1.2.111","hostname":"ops-ws-02","fqdn":"ops-ws-02.sitea.corp.local","device_type":"workstation","user_name":"brian.stone","department":"Operations","vlan_id":20,"switch_device":"acc-sw-02","switch_port":"Gi0/6","event_type":"outage","status":"offline","building":"HQ-A","floor":"2"},
    {"mac_address":"00:1C:3D:20:00:01","ip_address":"10.1.2.113","hostname":"sec-ws-01","fqdn":"sec-ws-01.sitea.corp.local","device_type":"workstation","user_name":"dan.marsh","department":"Security","vlan_id":99,"switch_device":"acc-sw-02","switch_port":"Gi0/8","event_type":"outage","status":"offline","building":"HQ-A","floor":"2"},
]


def _sync_es(index: str, body: dict) -> list[dict] | None:
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


def _sync_es_aggs(index: str, body: dict) -> dict | None:
    """Run a search query and return aggregations (for size=0 agg queries)."""
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=4)
        resp = es.search(index=index, body=body)
        return dict(resp.get("aggregations", {}))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/events")
async def get_impact_events():
    """Return active flap/outage events with affected device counts."""
    raw = await asyncio.to_thread(_sync_es, "network-impact", {
        "size": 0,
        "query": {"term": {"status": "offline"}},
        "aggs": {
            "by_event": {
                "terms": {"field": "event_id.keyword", "size": 20},
                "aggs": {
                    "info": {"top_hits": {"size": 1, "_source": [
                        "event_id", "event_type", "trigger_device", "trigger_interface",
                        "trigger_description", "flap_count", "first_detected",
                        "duration_minutes", "site", "flap_timeline",
                    ]}},
                    "affected_count": {"value_count": {"field": "mac_address.keyword"}},
                    "departments": {"terms": {"field": "department.keyword", "size": 10}},
                },
            }
        },
    })

    if raw is None:
        return {"events": _DEMO_EVENTS, "source": "demo"}

    events = []
    for bucket in (raw or []):
        info = bucket.get("info", {}).get("hits", {}).get("hits", [{}])[0].get("_source", {})
        info["affected_count"] = bucket.get("affected_count", {}).get("value", 0)
        info["departments"] = [b["key"] for b in bucket.get("departments", {}).get("buckets", [])]
        info["status"] = "active"
        events.append(info)
    return {"events": events, "source": "elasticsearch"}


@router.get("/devices")
async def get_affected_devices(event_type: str | None = None, department: str | None = None):
    """Return all affected devices with the full MAC→IP→hostname chain."""
    query: dict[str, Any] = {"bool": {"must": [{"term": {"status": "offline"}}]}}
    if event_type:
        query["bool"]["must"].append({"term": {"event_type": event_type}})
    if department:
        query["bool"]["must"].append({"term": {"department.keyword": department}})

    raw = await asyncio.to_thread(_sync_es, "network-impact", {
        "size": 200,
        "sort": [{"department.keyword": "asc"}, {"hostname.keyword": "asc"}],
        "query": query,
        "_source": ["mac_address", "ip_address", "hostname", "fqdn", "device_type",
                    "user_name", "user_email", "department", "vlan_id", "switch_device",
                    "switch_port", "event_type", "trigger_device", "trigger_interface",
                    "building", "floor", "status", "duration_minutes"],
    })

    devices = raw if raw else [
        d for d in _DEMO_DEVICES
        if (not event_type or d["event_type"] == event_type)
        and (not department or d["department"] == department)
    ]
    return {"devices": devices, "total": len(devices), "source": "elasticsearch" if raw else "demo"}


@router.get("/summary")
async def get_impact_summary():
    """Return aggregate summary of current network impact."""
    aggs = await asyncio.to_thread(_sync_es_aggs, "network-impact", {
        "size": 0,
        "query": {"term": {"status": "offline"}},
        "aggs": {
            "total_devices": {"value_count": {"field": "mac_address.keyword"}},
            "by_department": {"terms": {"field": "department.keyword", "size": 10}},
            "by_device_type": {"terms": {"field": "device_type.keyword", "size": 10}},
            "by_event_type": {"terms": {"field": "event_type.keyword", "size": 5}},
            "by_vlan": {"terms": {"field": "vlan_id", "size": 20}},
            "by_site": {"terms": {"field": "site.keyword", "size": 10}},
        },
    })

    if aggs is None:
        return {
            "total_devices": len(_DEMO_DEVICES),
            "flap_devices": sum(1 for d in _DEMO_DEVICES if d["event_type"] == "flap"),
            "outage_devices": sum(1 for d in _DEMO_DEVICES if d["event_type"] == "outage"),
            "departments_affected": len({d["department"] for d in _DEMO_DEVICES}),
            "by_department": [
                {"department": k, "count": sum(1 for d in _DEMO_DEVICES if d["department"] == k)}
                for k in sorted({d["department"] for d in _DEMO_DEVICES})
            ],
            "by_device_type": [
                {"type": k, "count": sum(1 for d in _DEMO_DEVICES if d["device_type"] == k)}
                for k in sorted({d["device_type"] for d in _DEMO_DEVICES})
            ],
            "source": "demo",
        }

    return {
        "total_devices": aggs.get("total_devices", {}).get("value", 0),
        "by_department": [
            {"department": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_department", {}).get("buckets", [])
        ],
        "by_device_type": [
            {"type": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_device_type", {}).get("buckets", [])
        ],
        "by_event_type": [
            {"event_type": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_event_type", {}).get("buckets", [])
        ],
        "by_vlan": [
            {"vlan_id": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_vlan", {}).get("buckets", [])
        ],
        "source": "elasticsearch",
    }


@router.get("/mac-chain")
async def get_mac_chain(mac_address: str | None = None, ip_address: str | None = None):
    """Resolve a single MAC or IP through the full chain: MAC→IP→hostname→user."""
    if not mac_address and not ip_address:
        return {"error": "Provide mac_address or ip_address query parameter"}

    field = "mac_address" if mac_address else "ip_address"
    value = mac_address or ip_address

    raw = await asyncio.to_thread(_sync_es, "network-impact", {
        "size": 1,
        "query": {"term": {f"{field}.keyword": value}},
    })
    if raw:
        return {"chain": raw[0], "source": "elasticsearch"}

    # Demo fallback
    match = next((d for d in _DEMO_DEVICES
                  if d.get(field) == value), None)
    return {"chain": match, "source": "demo"} if match else {"chain": None}
