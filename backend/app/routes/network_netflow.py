"""NetFlow Analysis API routes.

Queries real NetFlow data (logs-netflow.log-cisco-*) when DATA_SOURCE=real,
falls back to synthetic network-flows index otherwise.
"""

import asyncio
from fastapi import APIRouter, Query
from ..config import settings

router = APIRouter(prefix="/api/network/netflow", tags=["netflow"])

KIBANA_DASHBOARDS = {
    "overview":      ("netflow-34e26884-161a-4448-9556-43b5bf2f62a2", "[Logs Netflow] Overview"),
    "flow_records":  ("netflow-94972700-de4a-4272-9143-2fa8d4981365", "[Logs Netflow] Flow Records"),
    "top_n":         ("netflow-14387a13-53bc-43a4-b9cd-63977aa8d87c", "[Logs Netflow] Top-N"),
    "geo":           ("netflow-77326664-23be-4bf1-a126-6d7e60cfc024", "[Logs Netflow] Geo Location"),
    "traffic":       ("netflow-38012abe-c611-4124-8497-381fcd85acc8", "[Logs Netflow] Traffic Analysis"),
    "exporters":     ("netflow-feebb4e6-b13e-4e4e-b9fc-d3a178276425", "[Logs Netflow] Flow Exporters"),
    "autonomous":    ("netflow-c64665f9-d222-421e-90b0-c7310d944b8a", "[Logs Netflow] Autonomous Systems"),
    "conversations": ("netflow-acd7a630-0c71-4840-bc9e-4a3801374a32", "[Logs Netflow] Conversation Partners"),
}


@router.get("/dashboards")
async def get_dashboards():
    """Return links to all Kibana NetFlow dashboards."""
    kb = (settings.KIBANA_URL or "").rstrip("/")
    return [
        {
            "id": key,
            "dashboard_id": did,
            "title": title,
            "url": f"{kb}/app/dashboards#/view/{did}",
        }
        for key, (did, title) in KIBANA_DASHBOARDS.items()
    ]


def _netflow_index() -> str:
    if settings.DATA_SOURCE == "real":
        return "logs-netflow.log-cisco-*"
    return settings.REAL_FLOWS_INDEX if settings.REAL_FLOWS_INDEX != "real-network-flows" else "network-flows"


# Field name mapping: real ECS vs synthetic
def _fields(real: bool):
    if real:
        return {
            "bytes":    "network.bytes",
            "packets":  "network.packets",
            "src_ip":   "source.ip",
            "dst_ip":   "destination.ip",
            "src_port": "source.port",
            "dst_port": "destination.port",
            "protocol": "network.transport",
            "direction": "network.direction",
        }
    return {
        "bytes":    "bytes",
        "packets":  "packets",
        "src_ip":   "src_ip",
        "dst_ip":   "dst_ip",
        "src_port": "src_port",
        "dst_port": "dst_port",
        "protocol": "protocol",
        "direction": "direction",
    }


def _sync_netflow(time_range: str) -> dict | None:
    if not (settings.ELASTICSEARCH_URL and settings.ELASTIC_API_KEY):
        return None
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(settings.ELASTICSEARCH_URL, api_key=settings.ELASTIC_API_KEY, request_timeout=10)
        real = settings.DATA_SOURCE == "real"
        f = _fields(real)
        idx = _netflow_index()

        body = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
            "aggs": {
                "total_bytes":   {"sum":         {"field": f["bytes"]}},
                "total_packets": {"sum":         {"field": f["packets"]}},
                "unique_src":    {"cardinality": {"field": f["src_ip"]}},
                "unique_dst":    {"cardinality": {"field": f["dst_ip"]}},
                "by_protocol":   {"terms":       {"field": f["protocol"], "size": 8}},
                "by_direction":  {"terms":       {"field": f["direction"], "size": 4}},
                "top_src":       {"terms":       {"field": f["src_ip"], "size": 10}},
                "top_dst":       {"terms":       {"field": f["dst_ip"], "size": 10}},
                "top_dst_port":  {"terms":       {"field": f["dst_port"], "size": 10}},
                "timeline": {
                    "date_histogram": {"field": "@timestamp", "calendar_interval": "1h"},
                    "aggs": {"bytes": {"sum": {"field": f["bytes"]}},
                             "flows": {"value_count": {"field": f["src_ip"]}}},
                },
                "top_pairs": {
                    "multi_terms": {
                        "terms": [{"field": f["src_ip"]}, {"field": f["dst_ip"]},
                                  {"field": f["protocol"]}],
                        "size": 20,
                    },
                    "aggs": {
                        "bytes": {"sum": {"field": f["bytes"]}},
                        "flows": {"value_count": {"field": f["src_ip"]}},
                    },
                },
            },
        }

        resp = es.search(index=idx, body=body)
        hits_total = resp["hits"]["total"]["value"]
        agg = resp.get("aggregations", {})

        def buckets(key):
            return [{"key": b["key"], "count": b["doc_count"]}
                    for b in agg.get(key, {}).get("buckets", [])]

        timeline = [
            {"timestamp": b["key_as_string"],
             "bytes": b.get("bytes", {}).get("value", 0),
             "flows": b.get("flows", {}).get("value", 0)}
            for b in agg.get("timeline", {}).get("buckets", [])
        ]

        top_pairs = []
        for b in agg.get("top_pairs", {}).get("buckets", []):
            keys = b["key"]
            top_pairs.append({
                "src_ip":   keys[0] if len(keys) > 0 else "",
                "dst_ip":   keys[1] if len(keys) > 1 else "",
                "protocol": keys[2] if len(keys) > 2 else "",
                "bytes":    b.get("bytes", {}).get("value", 0),
                "flows":    b.get("flows", {}).get("value", 0),
            })

        return {
            "total_flows":   hits_total,
            "total_bytes":   agg.get("total_bytes",   {}).get("value", 0),
            "total_packets": agg.get("total_packets", {}).get("value", 0),
            "unique_src":    agg.get("unique_src",    {}).get("value", 0),
            "unique_dst":    agg.get("unique_dst",    {}).get("value", 0),
            "by_protocol":   buckets("by_protocol"),
            "by_direction":  buckets("by_direction"),
            "top_src":       buckets("top_src"),
            "top_dst":       buckets("top_dst"),
            "top_dst_port":  buckets("top_dst_port"),
            "timeline":      timeline,
            "top_pairs":     top_pairs,
            "index":         idx,
            "data_source":   settings.DATA_SOURCE,
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/stats")
async def get_netflow_stats(time_range: str = Query(default="24h")):
    """Return NetFlow aggregate statistics for the given time range."""
    result = await asyncio.to_thread(_sync_netflow, time_range)
    if result and not result.get("error"):
        return result
    # Synthetic fallback
    return _SYNTHETIC_STATS


_SYNTHETIC_STATS = {
    "total_flows":   1_284_739,
    "total_bytes":   17_200_000_000,
    "total_packets": 12_450_000,
    "unique_src":    47,
    "unique_dst":    312,
    "by_protocol":   [{"key": "TCP", "count": 697_450}, {"key": "UDP", "count": 385_422},
                      {"key": "ICMP", "count": 201_867}],
    "by_direction":  [{"key": "outbound", "count": 642_370}, {"key": "inbound", "count": 580_104},
                      {"key": "internal", "count": 62_265}],
    "top_src":       [{"key": "10.2.1.45", "count": 308_180}, {"key": "10.1.1.12", "count": 249_508},
                      {"key": "10.2.1.101", "count": 150_088}, {"key": "10.1.2.55", "count": 140_273},
                      {"key": "10.0.0.50", "count": 120_845}],
    "top_dst":       [{"key": "172.16.1.20", "count": 287_400}, {"key": "8.8.8.8", "count": 198_320},
                      {"key": "172.16.1.10", "count": 175_000}, {"key": "10.2.1.45", "count": 142_000},
                      {"key": "1.1.1.1", "count": 98_000}],
    "top_dst_port":  [{"key": "443", "count": 614_043}, {"key": "53", "count": 309_399},
                      {"key": "80", "count": 189_287}, {"key": "8443", "count": 95_241},
                      {"key": "22", "count": 66_018}],
    "timeline": [{"timestamp": f"2026-06-09T{h:02d}:00:00Z",
                  "bytes": 650_000_000 + (h % 8) * 120_000_000,
                  "flows": 48_000 + (h % 8) * 8_000}
                 for h in range(24)],
    "top_pairs": [
        {"src_ip": "10.2.1.45",  "dst_ip": "172.16.1.20", "protocol": "TCP", "bytes": 4_820_000_000, "flows": 12847},
        {"src_ip": "10.1.1.12",  "dst_ip": "8.8.8.8",     "protocol": "UDP", "bytes": 2_100_000_000, "flows": 98432},
        {"src_ip": "10.2.1.101", "dst_ip": "172.16.1.10",  "protocol": "TCP", "bytes": 1_750_000_000, "flows": 34218},
        {"src_ip": "10.1.2.55",  "dst_ip": "10.2.1.45",   "protocol": "TCP", "bytes": 980_000_000,   "flows": 5621},
    ],
    "index": "network-flows",
    "data_source": "synthetic",
}
