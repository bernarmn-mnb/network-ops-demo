"""Cisco Meraki Analysis API routes.

Queries real Meraki data when DATA_SOURCE=real:
  logs-cisco_meraki.log-cisco-*                  — syslog/URL/security events
  metrics-cisco_meraki_metrics.device_health-*   — device inventory & health
"""

import asyncio
from fastapi import APIRouter, Query
from ..config import settings

router = APIRouter(prefix="/api/network/meraki", tags=["meraki"])

MERAKI_LOG_IDX     = "logs-cisco_meraki.log-cisco-*"
MERAKI_METRICS_IDX = "metrics-cisco_meraki_metrics.device_health-cisco-*"

KIBANA_DASHBOARDS = [
    {
        "id": "syslog_overview",
        "dashboard_id": "cisco_meraki-4832a430-af22-11ec-a899-6f7e676e0fb4",
        "title": "[Logs Cisco Meraki] Syslog Events Overview",
    },
    {
        "id": "device_health",
        "dashboard_id": "cisco_meraki_metrics-d6b9863a-88e2-4e3d-a2a7-36ca1ee525b1",
        "title": "[Metrics Cisco Meraki] Device Health Overview",
    },
]


@router.get("/dashboards")
async def get_dashboards():
    kb = (settings.KIBANA_URL or "").rstrip("/")
    return [
        {**d, "url": f"{kb}/app/dashboards#/view/{d['dashboard_id']}"}
        for d in KIBANA_DASHBOARDS
    ]


def _sync_meraki_stats(time_range: str) -> dict | None:
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=12)
        body = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
            "aggs": {
                "total_events":    {"value_count": {"field": "event.action"}},
                "unique_src":      {"cardinality": {"field": "source.ip"}},
                "unique_devices":  {"cardinality": {"field": "observer.hostname"}},
                "by_event_type":   {"terms": {"field": "cisco_meraki.event_type",  "size": 10}},
                "by_event_action": {"terms": {"field": "event.action",             "size": 10}},
                "top_devices":     {"terms": {"field": "observer.hostname",        "size": 12}},
                "top_src_ip":      {"terms": {"field": "source.ip",               "size": 10}},
                "top_domains":     {"terms": {"field": "url.domain",              "size": 12}},
                "top_dst_ip":      {"terms": {"field": "destination.ip",          "size": 10}},
                "timeline": {
                    "date_histogram": {"field": "@timestamp", "calendar_interval": "1h"},
                    "aggs": {"count": {"value_count": {"field": "event.action"}}},
                },
                "security_events": {
                    "filter": {"terms": {"cisco_meraki.event_type": ["ids_alerted", "security_event", "airmarshal_events"]}},
                    "aggs": {
                        "count": {"value_count": {"field": "event.action"}},
                        "latest": {"top_hits": {"size": 5, "sort": [{"@timestamp": "desc"}],
                            "_source": ["@timestamp", "observer.hostname", "message",
                                        "cisco_meraki.event_type", "source.ip", "destination.ip"]}},
                    },
                },
                "url_events": {
                    "filter": {"term": {"cisco_meraki.event_type": "urls"}},
                    "aggs": {"count": {"value_count": {"field": "event.action"}}},
                },
                "airmarshal": {
                    "filter": {"term": {"cisco_meraki.event_type": "airmarshal_events"}},
                    "aggs": {
                        "count": {"value_count": {"field": "event.action"}},
                        "latest": {"top_hits": {"size": 5, "sort": [{"@timestamp": "desc"}],
                            "_source": ["@timestamp", "observer.hostname", "message"]}},
                    },
                },
            },
        }
        resp = es.search(index=MERAKI_LOG_IDX, body=body)
        a = resp.get("aggregations", {})
        hits = resp["hits"]["total"]["value"]

        def buckets(k):
            return [{"key": b["key"], "count": b["doc_count"]} for b in a.get(k, {}).get("buckets", [])]

        def top_hits_to_list(agg_key):
            hits_raw = a.get(agg_key, {}).get("latest", {}).get("hits", {}).get("hits", [])
            return [h["_source"] for h in hits_raw]

        timeline = [
            {"timestamp": b["key_as_string"], "count": b.get("count", {}).get("value", 0)}
            for b in a.get("timeline", {}).get("buckets", [])
        ]

        return {
            "total_events":   hits,
            "unique_src":     a.get("unique_src",     {}).get("value", 0),
            "unique_devices": a.get("unique_devices", {}).get("value", 0),
            "security_count": a.get("security_events", {}).get("count", {}).get("value", 0),
            "url_count":      a.get("url_events",      {}).get("count", {}).get("value", 0),
            "airmarshal_count": a.get("airmarshal",   {}).get("count", {}).get("value", 0),
            "by_event_type":  buckets("by_event_type"),
            "by_event_action": buckets("by_event_action"),
            "top_devices":    buckets("top_devices"),
            "top_src_ip":     buckets("top_src_ip"),
            "top_domains":    buckets("top_domains"),
            "top_dst_ip":     buckets("top_dst_ip"),
            "timeline":       timeline,
            "security_events": top_hits_to_list("security_events"),
            "airmarshal_events": top_hits_to_list("airmarshal"),
            "data_source": "real",
            "index": MERAKI_LOG_IDX,
        }
    except Exception as e:
        return {"error": str(e)}


def _sync_meraki_devices() -> list[dict] | None:
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=8)
        resp = es.search(index=MERAKI_METRICS_IDX, body={
            "size": 0,
            "aggs": {
                "by_device": {
                    "terms": {"field": "meraki.device.name", "size": 50},
                    "aggs": {
                        "latest": {"top_hits": {"size": 1, "sort": [{"@timestamp": "desc"}],
                            "_source": ["meraki.device.name", "meraki.device.model",
                                        "meraki.device.product_type", "meraki.device.lan_ip",
                                        "meraki.device.mac", "meraki.device.serial",
                                        "meraki.device.firmware", "@timestamp"]}},
                    },
                }
            },
        })
        devices = []
        for b in resp["aggregations"]["by_device"]["buckets"]:
            hits = b.get("latest", {}).get("hits", {}).get("hits", [])
            if hits:
                src = hits[0]["_source"]
                dev = src.get("meraki", {}).get("device", {})
                devices.append({
                    "name":         dev.get("name", b["key"]),
                    "model":        dev.get("model", ""),
                    "product_type": dev.get("product_type", ""),
                    "lan_ip":       dev.get("lan_ip", ""),
                    "mac":          dev.get("mac", ""),
                    "serial":       dev.get("serial", ""),
                    "firmware":     dev.get("firmware", ""),
                    "last_seen":    src.get("@timestamp", ""),
                    "event_count":  b["doc_count"],
                })
        return sorted(devices, key=lambda d: d["event_count"], reverse=True)
    except Exception:
        return None


@router.get("/stats")
async def get_meraki_stats(time_range: str = Query(default="24h")):
    result = await asyncio.to_thread(_sync_meraki_stats, time_range)
    if result and not result.get("error"):
        return result
    return _SYNTHETIC_STATS


@router.get("/devices")
async def get_meraki_devices():
    result = await asyncio.to_thread(_sync_meraki_devices)
    if result:
        return {"devices": result, "source": "real"}
    return {"devices": _SYNTHETIC_DEVICES, "source": "demo"}


# ---------------------------------------------------------------------------
# Synthetic fallback
# ---------------------------------------------------------------------------

_SYNTHETIC_STATS = {
    "total_events": 1_396_247, "unique_src": 41, "unique_devices": 5,
    "security_count": 108, "url_count": 1_349_824, "airmarshal_count": 108,
    "by_event_type": [{"key": "urls", "count": 1_349_824}, {"key": "events", "count": 46_315},
                      {"key": "airmarshal_events", "count": 108}],
    "by_event_action": [{"key": "http-access-error", "count": 980_000},
                        {"key": "http-access", "count": 369_824}],
    "top_devices": [{"key": "MX68", "count": 748_117}, {"key": "Tiffany_AP", "count": 442_520},
                    {"key": "Corey_Room_AP", "count": 95_754}, {"key": "MR34_HOME", "count": 62_065},
                    {"key": "Bonus_Room_AP", "count": 47_791}],
    "top_src_ip": [{"key": "192.168.20.168", "count": 762_415},
                   {"key": "192.168.20.143", "count": 165_934},
                   {"key": "192.168.20.2",   "count": 132_963}],
    "top_domains": [{"key": "cdn-ec-nas-012.cla-nat-smf-hd.xcr.comcast.net", "count": 443_246},
                    {"key": "es.redsector.inf.elasticnet.co", "count": 93_809},
                    {"key": "easip-client.ccp.xcal.tv", "count": 27_879}],
    "top_dst_ip": [{"key": "8.8.8.8", "count": 98_000}, {"key": "1.1.1.1", "count": 45_000}],
    "timeline": [{"timestamp": f"2026-06-11T{h:02d}:00:00Z",
                  "count": 45_000 + (h % 8) * 12_000} for h in range(24)],
    "security_events": [], "airmarshal_events": [],
    "data_source": "synthetic", "index": "synthetic",
}

_SYNTHETIC_DEVICES = [
    {"name": "MX68",          "model": "MX68",    "product_type": "appliance", "lan_ip": "192.168.20.1",  "mac": "00:18:0a:7d:9b:14", "serial": "Q2JN-XXXX-0001", "firmware": "18.211.2", "last_seen": "", "event_count": 748117},
    {"name": "Tiffany_AP",    "model": "MR42",    "product_type": "wireless",  "lan_ip": "192.168.20.5",  "mac": "00:18:0a:7d:9b:21", "serial": "Q2XX-XXXX-0002", "firmware": "29.7.1",  "last_seen": "", "event_count": 442520},
    {"name": "Corey_Room_AP", "model": "MR34",    "product_type": "wireless",  "lan_ip": "192.168.20.6",  "mac": "00:18:0a:7d:9b:22", "serial": "Q2XX-XXXX-0003", "firmware": "29.7.1",  "last_seen": "", "event_count": 95754},
    {"name": "8 Port Switch", "model": "MS220-8P","product_type": "switch",    "lan_ip": "192.168.128.54","mac": "00:18:0a:7d:9b:13", "serial": "Q2HP-3M4W-3VJ8", "firmware": "14.33",   "last_seen": "", "event_count": 42000},
    {"name": "Bonus_Room_AP", "model": "MR34",    "product_type": "wireless",  "lan_ip": "192.168.20.8",  "mac": "00:18:0a:7d:9b:24", "serial": "Q2XX-XXXX-0005", "firmware": "29.7.1",  "last_seen": "", "event_count": 47791},
]
