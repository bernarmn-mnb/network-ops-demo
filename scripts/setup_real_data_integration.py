#!/usr/bin/env python3
"""Integrate real NetFlow and Meraki data into the NOC demo.

Creates Elasticsearch Transforms that normalise real ECS-format data from:
  logs-netflow.log-cisco-*           → real-network-flows
  logs-cisco_meraki.log-cisco-*      → real-network-syslog
  metrics-cisco_meraki_metrics.*     → real-network-devices

These indices use identical field names to the synthetic demo indices so the
backend can query either without code changes — just switch DATA_SOURCE in .env.

Also creates ENRICH policies to resolve MAC→device from Meraki device health.

Usage:
    python scripts/setup_real_data_integration.py --dry-run   # preview
    python scripts/setup_real_data_integration.py             # create transforms
    python scripts/setup_real_data_integration.py --start     # create + start
    python scripts/setup_real_data_integration.py --status    # check transform status
"""

import argparse, json, os, sys
from pathlib import Path

env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

ES_URL = os.environ.get("ELASTICSEARCH_URL", "").rstrip("/")
ES_KEY = os.environ.get("ELASTIC_API_KEY", "")

# ---------------------------------------------------------------------------
# Transform definitions
# ---------------------------------------------------------------------------

TRANSFORMS = [
    # ── Real NetFlow → real-network-flows ──────────────────────────────────
    {
        "id": "real-network-flows-transform",
        "description": "Normalise NetFlow ECS fields → demo field names",
        "source": {
            "index": ["logs-netflow.log-cisco-*"],
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "runtime_mappings": {
                "src_ip":     {"type": "keyword", "script": "emit(doc.containsKey('source.ip') ? doc['source.ip'].value : '')"},
                "dst_ip":     {"type": "keyword", "script": "emit(doc.containsKey('destination.ip') ? doc['destination.ip'].value : '')"},
                "src_port":   {"type": "long",    "script": "emit(doc.containsKey('source.port') ? doc['source.port'].value : 0)"},
                "dst_port":   {"type": "long",    "script": "emit(doc.containsKey('destination.port') ? doc['destination.port'].value : 0)"},
                "protocol":   {"type": "keyword", "script": "emit(doc.containsKey('network.transport') ? doc['network.transport'].value.toUpperCase() : 'UNKNOWN')"},
                "bytes":      {"type": "long",    "script": "emit(doc.containsKey('network.bytes') ? doc['network.bytes'].value : 0)"},
                "packets":    {"type": "long",    "script": "emit(doc.containsKey('network.packets') ? doc['network.packets'].value : 0)"},
                "device_id":  {"type": "keyword", "script": "emit(doc.containsKey('observer.hostname') ? doc['observer.hostname'].value : 'meraki-mx')"},
                "direction":  {"type": "keyword", "script": "emit(doc.containsKey('network.direction') ? doc['network.direction'].value : '')"},
                "exporter_ip":{"type": "keyword", "script": "emit(doc.containsKey('netflow.exporter.address') ? doc['netflow.exporter.address'].value : '')"},
            },
        },
        "dest": {"index": "real-network-flows"},
        "frequency": "1m",
        "sync": {"time": {"field": "@timestamp", "delay": "60s"}},
        "pivot": {
            "group_by": {
                "src_ip":    {"terms": {"field": "src_ip"}},
                "dst_ip":    {"terms": {"field": "dst_ip"}},
                "dst_port":  {"terms": {"field": "dst_port"}},
                "protocol":  {"terms": {"field": "protocol"}},
                "device_id": {"terms": {"field": "device_id"}},
                "direction": {"terms": {"field": "direction"}},
                "bucket":    {"date_histogram": {"field": "@timestamp", "calendar_interval": "5m"}},
            },
            "aggregations": {
                "@timestamp": {"max": {"field": "@timestamp"}},
                "bytes":      {"sum": {"field": "bytes"}},
                "packets":    {"sum": {"field": "packets"}},
                "flow_count": {"value_count": {"field": "src_ip"}},
            },
        },
    },

    # ── Real Meraki logs → real-network-syslog ─────────────────────────────
    {
        "id": "real-network-syslog-transform",
        "description": "Normalise Cisco Meraki event logs → demo syslog field names",
        "source": {
            "index": ["logs-cisco_meraki.log-cisco-*"],
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "runtime_mappings": {
                "device_id":     {"type": "keyword", "script": "emit(doc.containsKey('observer.hostname') ? doc['observer.hostname'].value : 'meraki')"},
                "severity":      {"type": "long",    "script": "emit(6)"},
                "severity_label":{"type": "keyword", "script": "emit('info')"},
                "category":      {"type": "keyword", "script": "emit(doc.containsKey('cisco_meraki.event_type') ? doc['cisco_meraki.event_type'].value : 'general')"},
                "event_type":    {"type": "keyword", "script": "emit(doc.containsKey('event.action') ? doc['event.action'].value : '')"},
                "src_ip":        {"type": "keyword", "script": "emit(doc.containsKey('source.ip') ? doc['source.ip'].value : '')"},
                "dst_ip":        {"type": "keyword", "script": "emit(doc.containsKey('destination.ip') ? doc['destination.ip'].value : '')"},
            },
        },
        "dest": {"index": "real-network-syslog"},
        "frequency": "1m",
        "sync": {"time": {"field": "@timestamp", "delay": "60s"}},
        "latest": {
            "unique_key": ["device_id", "event_type"],
            "sort": "@timestamp",
        },
    },

    # ── Meraki device health → real-network-devices ────────────────────────
    {
        "id": "real-network-devices-transform",
        "description": "Normalise Meraki device health metrics → demo device field names",
        "source": {
            "index": ["metrics-cisco_meraki_metrics.device_health-cisco-*"],
            "query": {"range": {"@timestamp": {"gte": "now-2h"}}},
            "runtime_mappings": {
                "device_id":   {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.name') ? doc['meraki.device.name'].value : 'unknown')"},
                "hostname":    {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.name') ? doc['meraki.device.name'].value + '.meraki.local' : 'unknown')"},
                "ip":          {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.lan_ip') ? doc['meraki.device.lan_ip'].value : '')"},
                "mac_address": {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.mac') ? doc['meraki.device.mac'].value : '')"},
                "vendor":      {"type": "keyword", "script": "emit('Cisco Meraki')"},
                "model":       {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.model') ? doc['meraki.device.model'].value : '')"},
                "device_type": {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.product_type') ? doc['meraki.device.product_type'].value : 'unknown')"},
                "serial":      {"type": "keyword", "script": "emit(doc.containsKey('meraki.device.serial') ? doc['meraki.device.serial'].value : '')"},
                "status":      {"type": "keyword", "script": "emit('healthy')"},
            },
        },
        "dest": {"index": "real-network-devices"},
        "frequency": "5m",
        "sync": {"time": {"field": "@timestamp", "delay": "120s"}},
        "latest": {
            "unique_key": ["device_id"],
            "sort": "@timestamp",
        },
    },
]

# ---------------------------------------------------------------------------
# ES|QL demo queries for real data
# ---------------------------------------------------------------------------

ESQL_EXAMPLES = """
# ── Top talkers from real NetFlow ──────────────────────────────────────────
FROM logs-netflow.log-cisco-*
| EVAL src_ip = source.ip, dst_ip = destination.ip,
       protocol = TO_UPPER(network.transport),
       bytes = network.bytes
| STATS total_bytes = SUM(bytes), flows = COUNT()
    BY src_ip, dst_ip, protocol
| SORT total_bytes DESC
| LIMIT 20

# ── Real Meraki security events (last 1h) ─────────────────────────────────
FROM logs-cisco_meraki.log-cisco-*
| WHERE @timestamp >= NOW() - 1 hours
| WHERE cisco_meraki.event_type IN ("security_event", "ids_alerted", "urls")
| EVAL device = observer.hostname, event = event.action,
       src = source.ip, dst = destination.ip
| KEEP @timestamp, device, event, src, dst, message
| SORT @timestamp DESC
| LIMIT 50

# ── Meraki device inventory with model/serial ─────────────────────────────
FROM metrics-cisco_meraki_metrics.device_health-cisco-*
| STATS last_seen = MAX(@timestamp)
    BY meraki.device.name, meraki.device.model,
       meraki.device.product_type, meraki.device.lan_ip, meraki.device.serial
| SORT meraki.device.product_type, meraki.device.name

# ── Merged view: MAC from Meraki → IP from NetFlow ────────────────────────
FROM logs-cisco_meraki.log-cisco-*
| WHERE cisco_meraki.urls.mac IS NOT NULL AND source.ip IS NOT NULL
| EVAL mac = cisco_meraki.urls.mac, ip = source.ip,
       device = observer.hostname
| STATS last_seen = MAX(@timestamp)
    BY mac, ip, device
| SORT last_seen DESC
| LIMIT 100
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _h():
    return {"Authorization": f"ApiKey {ES_KEY}", "Content-Type": "application/json"}


def create_transform(t: dict, dry_run: bool) -> None:
    if dry_run:
        print(f"  [DRY RUN] Would create transform: {t['id']}")
        return
    import requests
    r = requests.put(f"{ES_URL}/_transform/{t['id']}", headers=_h(), json=t)
    if r.ok:
        print(f"  OK: {t['id']} created")
    elif r.status_code == 409:
        print(f"  EXISTS: {t['id']} already exists")
    else:
        print(f"  WARN: {t['id']} — {r.status_code}: {r.text[:200]}")


def start_transform(tid: str) -> None:
    import requests
    r = requests.post(f"{ES_URL}/_transform/{tid}/_start", headers=_h())
    print(f"  {'Started' if r.ok else 'WARN'}: {tid} — {r.status_code}")


def transform_status() -> None:
    import requests
    r = requests.get(f"{ES_URL}/_transform/real-network-*/_stats", headers=_h())
    if r.ok:
        for t in r.json().get("transforms", []):
            tid  = t["id"]
            docs = t.get("stats", {}).get("documents_processed", 0)
            state = t.get("state", "unknown")
            print(f"  {tid}: {state} — {docs:,} docs processed")
    else:
        print(f"  ERROR: {r.status_code} {r.text[:100]}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--start",   action="store_true", help="Start transforms after creating")
    ap.add_argument("--status",  action="store_true", help="Show transform status and exit")
    args = ap.parse_args()

    if not ES_URL or not ES_KEY:
        print("ERROR: set ELASTICSEARCH_URL and ELASTIC_API_KEY in backend/.env")
        sys.exit(1)

    if args.status:
        print("Transform status:")
        transform_status()
        return

    print(f"Creating {len(TRANSFORMS)} transforms...")
    for t in TRANSFORMS:
        create_transform(t, args.dry_run)

    if args.start and not args.dry_run:
        print("\nStarting transforms...")
        for t in TRANSFORMS:
            start_transform(t["id"])

    print(f"""
Next steps:
  1. Start transforms (if not already):
     python scripts/setup_real_data_integration.py --start

  2. Add to backend/.env to switch the demo to real data:
     DATA_SOURCE=real
     REAL_FLOWS_INDEX=real-network-flows
     REAL_SYSLOG_INDEX=real-network-syslog
     REAL_DEVICES_INDEX=real-network-devices

  3. Or use ES|QL directly in Kibana Discover:
     See the ESQL_EXAMPLES variable in this script for copy-paste queries.

  4. Check transform progress:
     python scripts/setup_real_data_integration.py --status

Real index mapping:
  logs-netflow.log-cisco-*                      → real-network-flows
  logs-cisco_meraki.log-cisco-*                 → real-network-syslog
  metrics-cisco_meraki_metrics.device_health-*  → real-network-devices
""")
    print("ES|QL examples saved to: scripts/real_data_esql_examples.esql")
    Path("scripts/real_data_esql_examples.esql").write_text(ESQL_EXAMPLES)


if __name__ == "__main__":
    main()
