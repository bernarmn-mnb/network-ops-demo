#!/usr/bin/env python3
"""Simulate netcrawl CDP/LLDP discovery and ingest results into Elasticsearch.

Generates realistic CDP/LLDP neighbor data matching the ytti/netcrawl JSON output
format for the demo topology, then indexes it into the `cdp_lldp` Elasticsearch
index and creates a Kibana data view.

Usage:
    # Run full crawl simulation (all devices)
    python scripts/simulate_netcrawl.py

    # Simulate crawl triggered by an interface-down event
    python scripts/simulate_netcrawl.py --trigger-device site-b-rtr --trigger-interface GigabitEthernet0/2

    # Dry run — print what would be indexed
    python scripts/simulate_netcrawl.py --dry-run
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
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
KIBANA_URL = os.environ.get("KIBANA_URL", "").rstrip("/")

INDEX = "cdp_lldp"

# ---------------------------------------------------------------------------
# Demo topology — CDP/LLDP adjacency table
# Each entry: (local_device, local_ip, local_iface, neighbor_hostname, neighbor_ip, neighbor_iface, protocol, platform)
# ---------------------------------------------------------------------------
CDP_LLDP_LINKS = [
    # Internet → FW-01
    ("fw-01.corp.local",      "10.0.0.1",   "GigabitEthernet0/0",     "internet-edge",               "203.0.113.1",  "xe-0/0/0",                  "CDP",  "Cisco ASA 5506-X",         ["Router", "Trans-Bridge"]),
    # FW-01 → Core-SW-01
    ("fw-01.corp.local",      "10.0.0.1",   "GigabitEthernet0/1",     "core-sw-01.corp.local",        "10.0.1.1",     "TenGigabitEthernet0/1",     "CDP",  "Arista 7050CX3-32S",       ["Switch", "Router"]),
    ("core-sw-01.corp.local", "10.0.1.1",   "TenGigabitEthernet0/1",  "fw-01.corp.local",             "10.0.0.1",     "GigabitEthernet0/1",        "CDP",  "Cisco ASA 5506-X",         ["Router"]),
    # Core-SW-01 → Site-A-RTR
    ("core-sw-01.corp.local", "10.0.1.1",   "TenGigabitEthernet0/2",  "site-a-rtr.corp.local",        "10.1.0.1",     "xe-1/0/0",                  "LLDP", "Juniper MX104",            ["Router"]),
    ("site-a-rtr.corp.local", "10.1.0.1",   "xe-1/0/0",               "core-sw-01.corp.local",        "10.0.1.1",     "TenGigabitEthernet0/2",     "LLDP", "Arista 7050CX3-32S",       ["Switch", "Router"]),
    # Core-SW-01 → Site-B-RTR
    ("core-sw-01.corp.local", "10.0.1.1",   "TenGigabitEthernet0/3",  "site-b-rtr.corp.local",        "10.2.0.1",     "xe-1/0/0",                  "LLDP", "Juniper MX104",            ["Router"]),
    ("site-b-rtr.corp.local", "10.2.0.1",   "xe-1/0/0",               "core-sw-01.corp.local",        "10.0.1.1",     "TenGigabitEthernet0/3",     "LLDP", "Arista 7050CX3-32S",       ["Switch", "Router"]),
    # Core-SW-01 → DMZ-SW
    ("core-sw-01.corp.local", "10.0.1.1",   "TenGigabitEthernet0/4",  "dmz-sw.corp.local",            "172.16.0.1",   "TenGigabitEthernet1/0/1",   "CDP",  "Cisco Catalyst 9300-48P",  ["Switch"]),
    ("dmz-sw.corp.local",     "172.16.0.1", "TenGigabitEthernet1/0/1","core-sw-01.corp.local",        "10.0.1.1",     "TenGigabitEthernet0/4",     "CDP",  "Arista 7050CX3-32S",       ["Switch", "Router"]),
    # Site-A-RTR → Acc-SW-01
    ("site-a-rtr.corp.local", "10.1.0.1",   "xe-2/0/0",               "acc-sw-01.corp.local",         "10.1.1.1",     "GigabitEthernet0/1",        "CDP",  "Cisco Catalyst 2960X-48",  ["Switch"]),
    ("acc-sw-01.corp.local",  "10.1.1.1",   "GigabitEthernet0/1",     "site-a-rtr.corp.local",        "10.1.0.1",     "xe-2/0/0",                  "CDP",  "Juniper MX104",            ["Router"]),
    # Site-A-RTR → Acc-SW-02
    ("site-a-rtr.corp.local", "10.1.0.1",   "xe-3/0/0",               "acc-sw-02.corp.local",         "10.1.2.1",     "GigabitEthernet0/1",        "CDP",  "Cisco Catalyst 2960X-48",  ["Switch"]),
    ("acc-sw-02.corp.local",  "10.1.2.1",   "GigabitEthernet0/1",     "site-a-rtr.corp.local",        "10.1.0.1",     "xe-3/0/0",                  "CDP",  "Juniper MX104",            ["Router"]),
    # Site-B-RTR → Acc-SW-03 (this is the "down" interface in our demo scenario)
    ("site-b-rtr.corp.local", "10.2.0.1",   "GigabitEthernet0/2",     "acc-sw-03.corp.local",         "10.2.1.1",     "GigabitEthernet0/1",        "CDP",  "Cisco Catalyst 2960X-48",  ["Switch"]),
    ("acc-sw-03.corp.local",  "10.2.1.1",   "GigabitEthernet0/1",     "site-b-rtr.corp.local",        "10.2.0.1",     "GigabitEthernet0/2",        "CDP",  "Juniper MX104",            ["Router"]),
    # DMZ-SW → Web-SRV
    ("dmz-sw.corp.local",     "172.16.0.1", "TenGigabitEthernet1/0/2","web-srv-01.corp.local",        "172.16.1.10",  "eth0",                      "LLDP", "Dell PowerEdge R640",      ["Station"]),
    ("web-srv-01.corp.local", "172.16.1.10","eth0",                    "dmz-sw.corp.local",            "172.16.0.1",   "TenGigabitEthernet1/0/2",   "LLDP", "Cisco Catalyst 9300-48P",  ["Switch"]),
    # DMZ-SW → App-SRV
    ("dmz-sw.corp.local",     "172.16.0.1", "TenGigabitEthernet1/0/3","app-srv-01.corp.local",        "172.16.1.20",  "eth0",                      "LLDP", "Dell PowerEdge R740xd",    ["Station"]),
    ("app-srv-01.corp.local", "172.16.1.20","eth0",                    "dmz-sw.corp.local",            "172.16.0.1",   "TenGigabitEthernet1/0/3",   "LLDP", "Cisco Catalyst 9300-48P",  ["Switch"]),
]

SYSLOG_INTERFACE_DOWN = [
    {
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "site-b-rtr",
        "hostname": "site-b-rtr.corp.local",
        "severity": 5,
        "severity_label": "notice",
        "facility": 23,
        "facility_label": "local7",
        "message": "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to down",
        "category": "hardware",
        "interface": "GigabitEthernet0/2",
        "event_type": "interface_down",
    },
    {
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "acc-sw-03",
        "hostname": "acc-sw-03.corp.local",
        "severity": 5,
        "severity_label": "notice",
        "facility": 23,
        "facility_label": "local7",
        "message": "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to down",
        "category": "hardware",
        "interface": "GigabitEthernet0/1",
        "event_type": "interface_down",
    },
]


def netcrawl_json_output() -> dict:
    """Build the netcrawl-format JSON output for all devices in the topology."""
    result: dict[str, list] = {}
    for (local_dev, local_ip, local_iface, neighbor_name, neighbor_ip, neighbor_iface, proto, platform, caps) in CDP_LLDP_LINKS:
        if local_dev not in result:
            result[local_dev] = []
        result[local_dev].append({
            "ip": neighbor_ip,
            "name": neighbor_name,
            "interface": {
                "source": local_iface,
                "destination": neighbor_iface,
            },
            "raw": {
                "ip": neighbor_ip,
                "name": neighbor_name,
            },
            "protocol": proto,
            "platform": platform,
            "capabilities": caps,
        })
    return result


def build_cdp_lldp_docs(crawl_id: str, trigger_device: str | None, trigger_interface: str | None) -> list[dict]:
    """Convert netcrawl JSON output to flat ES documents."""
    docs = []
    ts = datetime.now(timezone.utc).isoformat()
    crawl_output = netcrawl_json_output()

    for local_device, neighbors in crawl_output.items():
        for neighbor in neighbors:
            docs.append({
                "@timestamp": ts,
                "crawl_id": crawl_id,
                "trigger_event": "interface_down" if trigger_device else "manual",
                "trigger_device": trigger_device or "",
                "trigger_interface": trigger_interface or "",
                "local_device": local_device,
                "local_ip": next(
                    (ip for (dev, ip, iface, *_) in CDP_LLDP_LINKS if dev == local_device and iface == neighbor["interface"]["source"]),
                    "",
                ),
                "local_interface": neighbor["interface"]["source"],
                "neighbor_hostname": neighbor["name"],
                "neighbor_ip": neighbor["ip"],
                "neighbor_interface": neighbor["interface"]["destination"],
                "protocol": neighbor["protocol"],
                "platform": neighbor["platform"],
                "capabilities": neighbor["capabilities"],
                "link_status": "down" if (
                    trigger_device and local_device.startswith(trigger_device.replace("-rtr", "").replace("-sw", ""))
                    and neighbor["interface"]["source"] == trigger_interface
                ) else "up",
            })
    return docs


def create_kibana_dataview(dry_run: bool) -> None:
    """Create a Kibana data view for the cdp_lldp index."""
    if dry_run:
        print(f"[DRY RUN] Would create Kibana data view '{INDEX}'")
        return
    try:
        import requests
        headers = {
            "Authorization": f"ApiKey {ES_KEY}",
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
        }
        payload = {
            "data_view": {
                "title": INDEX,
                "name": "CDP/LLDP Network Topology",
                "timeFieldName": "@timestamp",
            },
            "override": True,
        }
        resp = requests.post(
            f"{KIBANA_URL}/api/data_views/data_view",
            headers=headers,
            json=payload,
            timeout=10,
        )
        if resp.status_code in (200, 201):
            dv_id = resp.json().get("data_view", {}).get("id", "unknown")
            print(f"  OK: Kibana data view '{INDEX}' created (id: {dv_id})")
        elif resp.status_code == 409:
            print(f"  OK: Kibana data view '{INDEX}' already exists")
        else:
            print(f"  WARN: data view creation returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"  WARN: could not create data view: {e}")


def bulk_index(es, index: str, docs: list[dict], dry_run: bool) -> None:
    from elasticsearch.helpers import bulk

    if dry_run:
        print(f"\n[DRY RUN] {index}: {len(docs)} documents (first shown)")
        print(json.dumps(docs[0], indent=2, default=str)[:600])
        return

    def _actions():
        for doc in docs:
            yield {"_index": index, "_source": doc}

    success, errors = bulk(es, _actions(), raise_on_error=False)
    if errors:
        print(f"  WARN: {len(errors)} errors indexing into {index}")
    print(f"  OK: indexed {success} docs into {index}")


def main():
    parser = argparse.ArgumentParser(description="Simulate netcrawl CDP/LLDP and ingest to Elasticsearch")
    parser.add_argument("--dry-run", action="store_true", help="Print documents without indexing")
    parser.add_argument("--trigger-device", default=None, help="Device that triggered the crawl (interface down event)")
    parser.add_argument("--trigger-interface", default=None, help="Interface that went down")
    parser.add_argument("--print-netcrawl-json", action="store_true", help="Print raw netcrawl JSON output and exit")
    args = parser.parse_args()

    if args.print_netcrawl_json:
        print(json.dumps(netcrawl_json_output(), indent=2))
        return

    es = None
    if not args.dry_run:
        if not ES_URL or not ES_KEY:
            print("ERROR: ELASTICSEARCH_URL and ELASTIC_API_KEY must be set in backend/.env")
            sys.exit(1)
        try:
            from elasticsearch import Elasticsearch
            es = Elasticsearch(ES_URL, api_key=ES_KEY, request_timeout=10)
            print(f"Connected to Elasticsearch {es.info()['version']['number']}")
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)

    crawl_id = str(uuid.uuid4())
    trigger_device = args.trigger_device or "site-b-rtr"
    trigger_interface = args.trigger_interface or "GigabitEthernet0/2"

    print(f"\nSimulating netcrawl CDP/LLDP discovery")
    print(f"  Trigger: {trigger_device} / {trigger_interface}")
    print(f"  Crawl ID: {crawl_id}")

    # Ingest interface-down syslog events
    print("\nIndexing interface-down syslog trigger events...")
    bulk_index(es, "network-syslog", SYSLOG_INTERFACE_DOWN, args.dry_run)

    # Build and ingest CDP/LLDP topology documents
    print("\nRunning CDP/LLDP crawl simulation (netcrawl format)...")
    cdp_docs = build_cdp_lldp_docs(crawl_id, trigger_device, trigger_interface)
    print(f"  Discovered {len(cdp_docs)} neighbor adjacencies across {len(set(d['local_device'] for d in cdp_docs))} devices")
    bulk_index(es, INDEX, cdp_docs, args.dry_run)

    # Create Kibana data view
    print("\nCreating Kibana data view...")
    create_kibana_dataview(args.dry_run)

    print(f"\nDone!")
    print(f"  Index:     {INDEX}")
    print(f"  Documents: {len(cdp_docs)} adjacency records")
    print(f"  Crawl ID:  {crawl_id}")
    print(f"\nNext steps:")
    print(f"  1. Open Kibana → Discover → select 'CDP/LLDP Network Topology' data view")
    print(f"  2. Deploy the network_interface_down workflow")
    print(f"  3. Topology page will now show live CDP/LLDP topology")


if __name__ == "__main__":
    main()
