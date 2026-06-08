"""Network Telemetry API routes.

Topology, device health, flow summaries, and alert feeds for the NOC demo.
Returns live data from Elasticsearch when available, falls back to built-in
demo data so the demo works out-of-the-box without pre-ingested data.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter

from ..config import settings

router = APIRouter(prefix="/api/network", tags=["network-telemetry"])

# ---------------------------------------------------------------------------
# Static demo topology — realistic enterprise network
# ---------------------------------------------------------------------------

_INTERNET = {
    "id": "internet", "hostname": "Internet", "ip": "0.0.0.0/0",
    "type": "internet", "vendor": "", "model": "", "status": "healthy",
    "cpu": 0, "mem": 0, "location": "External",
}

_DEVICES: list[dict[str, Any]] = [
    {"id": "fw-01",       "hostname": "fw-01.corp.local",       "ip": "10.0.0.1",   "type": "firewall", "vendor": "Cisco",   "model": "ASA 5506-X",        "status": "warning",  "cpu": 72, "mem": 65, "location": "DC-1/Rack-A1", "interfaces": 6,  "uptime_days": 142},
    {"id": "core-sw-01",  "hostname": "core-sw-01.corp.local",  "ip": "10.0.1.1",   "type": "switch",   "vendor": "Arista",  "model": "7050CX3-32S",        "status": "healthy",  "cpu": 18, "mem": 42, "location": "DC-1/Rack-B1", "interfaces": 32, "uptime_days": 380},
    {"id": "site-a-rtr",  "hostname": "site-a-rtr.corp.local",  "ip": "10.1.0.1",   "type": "router",   "vendor": "Juniper", "model": "MX104",              "status": "healthy",  "cpu": 35, "mem": 58, "location": "Site-A/Rack-01","interfaces": 8, "uptime_days": 215},
    {"id": "site-b-rtr",  "hostname": "site-b-rtr.corp.local",  "ip": "10.2.0.1",   "type": "router",   "vendor": "Juniper", "model": "MX104",              "status": "critical", "cpu": 95, "mem": 88, "location": "Site-B/Rack-01","interfaces": 8, "uptime_days": 12},
    {"id": "dmz-sw",      "hostname": "dmz-sw.corp.local",      "ip": "172.16.0.1", "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 9300-48P",  "status": "healthy",  "cpu": 22, "mem": 35, "location": "DC-1/Rack-C1", "interfaces": 48, "uptime_days": 287},
    {"id": "acc-sw-01",   "hostname": "acc-sw-01.corp.local",   "ip": "10.1.1.1",   "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48",  "status": "healthy",  "cpu": 8,  "mem": 28, "location": "Site-A/Floor-1","interfaces": 48, "uptime_days": 512},
    {"id": "acc-sw-02",   "hostname": "acc-sw-02.corp.local",   "ip": "10.1.2.1",   "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48",  "status": "warning",  "cpu": 12, "mem": 31, "location": "Site-A/Floor-2","interfaces": 48, "uptime_days": 87},
    {"id": "acc-sw-03",   "hostname": "acc-sw-03.corp.local",   "ip": "10.2.1.1",   "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48",  "status": "warning",  "cpu": 45, "mem": 52, "location": "Site-B/Floor-1","interfaces": 48, "uptime_days": 32},
    {"id": "web-srv",     "hostname": "web-srv-01.corp.local",  "ip": "172.16.1.10","type": "server",   "vendor": "Dell",    "model": "PowerEdge R640",     "status": "healthy",  "cpu": 42, "mem": 68, "location": "DC-1/DMZ",     "interfaces": 2,  "uptime_days": 198},
    {"id": "app-srv",     "hostname": "app-srv-01.corp.local",  "ip": "172.16.1.20","type": "server",   "vendor": "Dell",    "model": "PowerEdge R740xd",   "status": "warning",  "cpu": 78, "mem": 91, "location": "DC-1/DMZ",     "interfaces": 2,  "uptime_days": 45},
]

_LINKS: list[dict[str, Any]] = [
    {"source": "internet",   "target": "fw-01",      "bandwidth_mbps": 1000,  "utilization": 0.34},
    {"source": "fw-01",      "target": "core-sw-01", "bandwidth_mbps": 10000, "utilization": 0.28},
    {"source": "core-sw-01", "target": "site-a-rtr", "bandwidth_mbps": 1000,  "utilization": 0.45},
    {"source": "core-sw-01", "target": "site-b-rtr", "bandwidth_mbps": 1000,  "utilization": 0.82},
    {"source": "core-sw-01", "target": "dmz-sw",     "bandwidth_mbps": 10000, "utilization": 0.21},
    {"source": "site-a-rtr", "target": "acc-sw-01",  "bandwidth_mbps": 1000,  "utilization": 0.38},
    {"source": "site-a-rtr", "target": "acc-sw-02",  "bandwidth_mbps": 1000,  "utilization": 0.61},
    {"source": "site-b-rtr", "target": "acc-sw-03",  "bandwidth_mbps": 1000,  "utilization": 0.79},
    {"source": "dmz-sw",     "target": "web-srv",    "bandwidth_mbps": 10000, "utilization": 0.18},
    {"source": "dmz-sw",     "target": "app-srv",    "bandwidth_mbps": 10000, "utilization": 0.55},
]

def _now() -> datetime:
    return datetime.now(timezone.utc)


_ALERTS: list[dict[str, Any]] = [
    {"severity": "critical", "device": "site-b-rtr",  "message": "CPU utilisation 95% — threshold exceeded (baseline 35%)", "timestamp": (_now() - timedelta(minutes=4)).isoformat(),  "category": "performance"},
    {"severity": "warning",  "device": "app-srv-01",  "message": "Memory utilisation 91% — approaching capacity limit",       "timestamp": (_now() - timedelta(minutes=12)).isoformat(), "category": "performance"},
    {"severity": "warning",  "device": "fw-01",       "message": "Connection rate spike: 4,200 new sessions/sec (baseline 1,100)", "timestamp": (_now() - timedelta(minutes=18)).isoformat(), "category": "security"},
    {"severity": "warning",  "device": "acc-sw-02",   "message": "Interface Gi0/3 CRC errors: 1,847 in last 5 min",           "timestamp": (_now() - timedelta(minutes=27)).isoformat(), "category": "hardware"},
    {"severity": "warning",  "device": "acc-sw-03",   "message": "High CPU 45% — possible broadcast storm on VLAN 20",        "timestamp": (_now() - timedelta(minutes=35)).isoformat(), "category": "performance"},
    {"severity": "info",     "device": "core-sw-01",  "message": "BGP peer 10.0.1.2 state changed to Established",            "timestamp": (_now() - timedelta(minutes=58)).isoformat(), "category": "routing"},
    {"severity": "info",     "device": "web-srv-01",  "message": "TLS certificate renewed — valid until 2027-06-01",           "timestamp": (_now() - timedelta(hours=2)).isoformat(),   "category": "security"},
    {"severity": "critical", "device": "site-b-rtr",  "message": "OSPF neighbour 10.2.0.2 down — adjacency lost",             "timestamp": (_now() - timedelta(hours=3)).isoformat(),   "category": "routing"},
    {"severity": "info",     "device": "dmz-sw",      "message": "Interface Te1/0/1 link speed auto-negotiated to 10Gbps",    "timestamp": (_now() - timedelta(hours=4)).isoformat(),   "category": "hardware"},
    {"severity": "warning",  "device": "site-b-rtr",  "message": "Interface Gi0/2 input errors: 342 in last 15 min",          "timestamp": (_now() - timedelta(hours=5)).isoformat(),   "category": "hardware"},
]

_TOP_TALKERS: list[dict[str, Any]] = [
    {"src_ip": "10.2.1.45",  "dst_ip": "172.16.1.20", "protocol": "TCP",  "port": 443,  "bytes": 4_820_000_000, "flows": 12847, "pct": 28.4},
    {"src_ip": "10.1.1.12",  "dst_ip": "8.8.8.8",     "protocol": "UDP",  "port": 53,   "bytes": 2_100_000_000, "flows": 98432, "pct": 12.4},
    {"src_ip": "10.2.1.101", "dst_ip": "172.16.1.10",  "protocol": "TCP",  "port": 80,   "bytes": 1_750_000_000, "flows": 34218, "pct": 10.3},
    {"src_ip": "10.1.2.55",  "dst_ip": "10.2.1.45",   "protocol": "TCP",  "port": 8443, "bytes": 980_000_000,   "flows": 5621,  "pct": 5.8},
    {"src_ip": "10.0.0.50",  "dst_ip": "10.1.0.0/16", "protocol": "ICMP", "port": 0,    "bytes": 420_000_000,   "flows": 182000,"pct": 2.5},
]

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/topology")
async def get_topology():
    """Return topology nodes and links for the interactive diagram."""
    return {
        "nodes": [_INTERNET] + _DEVICES,
        "links": _LINKS,
        "source": "demo",
    }


@router.get("/devices")
async def get_devices():
    """Return all network devices with current health metrics."""
    es_devices = await _es_devices()
    return {
        "devices": es_devices if es_devices else _DEVICES,
        "source": "elasticsearch" if es_devices else "demo",
    }


@router.get("/summary")
async def get_summary():
    """Return traffic and health KPIs for the dashboard."""
    healthy = sum(1 for d in _DEVICES if d["status"] == "healthy")
    warning = sum(1 for d in _DEVICES if d["status"] == "warning")
    critical = sum(1 for d in _DEVICES if d["status"] == "critical")
    return {
        "total_devices": len(_DEVICES),
        "healthy": healthy,
        "warning": warning,
        "critical": critical,
        "total_flows_24h": 1_284_739,
        "bandwidth_in_mbps": 342.7,
        "bandwidth_out_mbps": 218.4,
        "top_talkers": _TOP_TALKERS,
        "source": "demo",
    }


@router.get("/alerts")
async def get_alerts():
    """Return recent network alerts sorted by recency."""
    es_alerts = await _es_alerts()
    alerts = es_alerts if es_alerts else _ALERTS
    return {
        "alerts": alerts,
        "total": len(alerts),
        "source": "elasticsearch" if es_alerts else "demo",
    }


# ---------------------------------------------------------------------------
# Elasticsearch helpers — sync client wrapped in asyncio.to_thread
# (aiohttp not installed, AsyncElasticsearch unavailable)
# ---------------------------------------------------------------------------

def _sync_es_search(index: str, body: dict) -> list[dict] | None:
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


async def _es_devices() -> list[dict] | None:
    import asyncio
    return await asyncio.to_thread(
        _sync_es_search, "network-devices", {"size": 50, "sort": [{"hostname.keyword": "asc"}]}
    )


async def _es_alerts() -> list[dict] | None:
    import asyncio
    raw = await asyncio.to_thread(
        _sync_es_search,
        "network-syslog",
        {"size": 20, "sort": [{"@timestamp": "desc"}], "query": {"range": {"@timestamp": {"gte": "now-24h"}}}},
    )
    if not raw:
        return None
    return [
        {
            "severity": h.get("severity_label", "info").lower(),
            "device": h.get("device_id", "unknown"),
            "message": h.get("message", ""),
            "timestamp": h.get("@timestamp", ""),
            "category": h.get("category", "general"),
        }
        for h in raw
    ]
