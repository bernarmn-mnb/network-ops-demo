#!/usr/bin/env python3
"""Generate synthetic network telemetry data and ingest into Elasticsearch.

Creates realistic NetFlow records, SNMP metrics, syslog events, and device
inventory across four indices:

  network-devices   — 10 devices (firewall, routers, switches, servers)
  network-flows     — 5 000 NetFlow records (24h, weighted by business hours)
  network-snmp      — ~2 880 SNMP samples (5-min interval × 10 devices × 24h)
  network-syslog    — 500 syslog events (mixed severity, realistic messages)

Usage:
    # Dry run — print sample documents
    python scripts/generate_network_telemetry.py --dry-run

    # Ingest (reads ES creds from backend/.env)
    python scripts/generate_network_telemetry.py

    # Ingest with custom counts
    python scripts/generate_network_telemetry.py --flows 10000 --snmp-interval 10
"""

import argparse
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Try to load .env from backend
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

ES_URL = os.environ.get("ELASTICSEARCH_URL", "")
ES_KEY = os.environ.get("ELASTIC_API_KEY", "")

# ---------------------------------------------------------------------------
# Device inventory — fixed for reproducible demo topology
# ---------------------------------------------------------------------------

DEVICES = [
    {"device_id": "fw-01",       "hostname": "fw-01.corp.local",       "ip": "10.0.0.1",    "type": "firewall", "vendor": "Cisco",   "model": "ASA 5506-X",       "location": "DC-1/Rack-A1",  "upstream_device": None},
    {"device_id": "core-sw-01",  "hostname": "core-sw-01.corp.local",  "ip": "10.0.1.1",    "type": "switch",   "vendor": "Arista",  "model": "7050CX3-32S",       "location": "DC-1/Rack-B1",  "upstream_device": "fw-01"},
    {"device_id": "site-a-rtr",  "hostname": "site-a-rtr.corp.local",  "ip": "10.1.0.1",    "type": "router",   "vendor": "Juniper", "model": "MX104",             "location": "Site-A/Rack-01", "upstream_device": "core-sw-01"},
    {"device_id": "site-b-rtr",  "hostname": "site-b-rtr.corp.local",  "ip": "10.2.0.1",    "type": "router",   "vendor": "Juniper", "model": "MX104",             "location": "Site-B/Rack-01", "upstream_device": "core-sw-01"},
    {"device_id": "dmz-sw",      "hostname": "dmz-sw.corp.local",      "ip": "172.16.0.1",  "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 9300-48P", "location": "DC-1/Rack-C1",  "upstream_device": "core-sw-01"},
    {"device_id": "acc-sw-01",   "hostname": "acc-sw-01.corp.local",   "ip": "10.1.1.1",    "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48", "location": "Site-A/Floor-1", "upstream_device": "site-a-rtr"},
    {"device_id": "acc-sw-02",   "hostname": "acc-sw-02.corp.local",   "ip": "10.1.2.1",    "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48", "location": "Site-A/Floor-2", "upstream_device": "site-a-rtr"},
    {"device_id": "acc-sw-03",   "hostname": "acc-sw-03.corp.local",   "ip": "10.2.1.1",    "type": "switch",   "vendor": "Cisco",   "model": "Catalyst 2960X-48", "location": "Site-B/Floor-1", "upstream_device": "site-b-rtr"},
    {"device_id": "web-srv",     "hostname": "web-srv-01.corp.local",  "ip": "172.16.1.10", "type": "server",   "vendor": "Dell",    "model": "PowerEdge R640",    "location": "DC-1/DMZ",      "upstream_device": "dmz-sw"},
    {"device_id": "app-srv",     "hostname": "app-srv-01.corp.local",  "ip": "172.16.1.20", "type": "server",   "vendor": "Dell",    "model": "PowerEdge R740xd",  "location": "DC-1/DMZ",      "upstream_device": "dmz-sw"},
]

DEVICE_IPS = {d["device_id"]: d["ip"] for d in DEVICES}

# Subnet ranges for host IP generation
SUBNETS = {
    "site-a": ["10.1.1.", "10.1.2."],
    "site-b": ["10.2.1."],
    "dmz":    ["172.16.1."],
}

PROTOCOLS = ["TCP", "UDP", "ICMP", "ESP", "GRE"]
PROTO_WEIGHTS = [0.55, 0.30, 0.10, 0.03, 0.02]

COMMON_PORTS = [443, 80, 53, 22, 25, 110, 143, 8080, 8443, 3306, 5432, 1433, 3389]
PORT_WEIGHTS  = [0.28, 0.12, 0.20, 0.06, 0.04, 0.03, 0.03, 0.04, 0.06, 0.04, 0.03, 0.03, 0.04]


def rand_host_ip() -> str:
    subnet = random.choice(["10.1.1.", "10.1.2.", "10.2.1.", "172.16.1."])
    return subnet + str(random.randint(2, 254))


def ts_24h_ago(hours_back: float) -> str:
    """Return ISO-8601 timestamp N hours in the past."""
    return (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()


def business_hours_weight(ts: datetime) -> float:
    """Higher weight during business hours Mon-Fri 08-18."""
    hour = ts.hour
    weekday = ts.weekday()
    if weekday >= 5:
        return 0.3
    if 8 <= hour < 18:
        return 1.0
    if hour in (7, 18, 19):
        return 0.6
    return 0.2


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def gen_flows(count: int) -> list[dict]:
    records = []
    now = datetime.now(timezone.utc)
    for _ in range(count):
        hours_back = random.uniform(0, 23.9)
        ts = now - timedelta(hours=hours_back)
        # weight toward business hours
        if random.random() > business_hours_weight(ts):
            hours_back = random.uniform(0, 23.9)
            ts = now - timedelta(hours=hours_back)

        proto = random.choices(PROTOCOLS, PROTO_WEIGHTS)[0]
        port = random.choices(COMMON_PORTS, PORT_WEIGHTS)[0] if proto in ("TCP", "UDP") else 0
        src = rand_host_ip()
        dst_type = random.choice(["internal", "internal", "internal", "external"])
        dst = rand_host_ip() if dst_type == "internal" else f"203.0.{random.randint(1,254)}.{random.randint(1,254)}"

        # Inject anomaly: large flows from 10.2.1.x to app-srv around "now-4h"
        if hours_back < 5 and src.startswith("10.2.1.") and random.random() < 0.08:
            dst = "172.16.1.20"
            port = 443

        device = random.choice(DEVICES)
        bytes_ = int(random.lognormvariate(14, 3))
        packets = max(1, int(bytes_ / random.randint(64, 1500)))

        records.append({
            "@timestamp": ts.isoformat(),
            "device_id": device["device_id"],
            "src_ip": src,
            "dst_ip": dst,
            "src_port": random.randint(1024, 65535) if proto in ("TCP", "UDP") else 0,
            "dst_port": port,
            "protocol": proto,
            "bytes": bytes_,
            "packets": packets,
            "duration_ms": random.randint(1, 30000),
            "packets_per_second": round(packets / max(0.001, random.uniform(0.1, 30)), 2),
            "direction": random.choice(["inbound", "outbound"]),
        })
    return records


def gen_snmp(interval_minutes: int = 5) -> list[dict]:
    records = []
    now = datetime.now(timezone.utc)
    samples_per_device = int(24 * 60 / interval_minutes)

    # site-b-rtr CPU spike scenario (last 4h = high CPU)
    anomaly_devices = {"site-b-rtr": {"cpu_base": 92, "mem_base": 86}}

    for device in DEVICES:
        did = device["device_id"]
        anom = anomaly_devices.get(did)

        for i in range(samples_per_device):
            ts = now - timedelta(minutes=i * interval_minutes)
            hour = ts.hour
            load_factor = business_hours_weight(ts)

            if anom and i < int(4 * 60 / interval_minutes):
                # last 4 hours: elevated metrics for site-b-rtr
                cpu = min(100, anom["cpu_base"] + random.uniform(-3, 4))
                mem = min(100, anom["mem_base"] + random.uniform(-2, 3))
            else:
                # normal baseline per device type
                base_cpu = {"firewall": 35, "router": 30, "switch": 15, "server": 45}.get(device["type"], 20)
                base_mem = {"firewall": 50, "router": 55, "switch": 30, "server": 65}.get(device["type"], 40)
                cpu = max(1, base_cpu * load_factor + random.uniform(-5, 10))
                mem = max(1, base_mem + random.uniform(-5, 8))

            in_oct = int(random.uniform(1e6, 5e8) * load_factor)
            out_oct = int(in_oct * random.uniform(0.3, 1.2))
            in_err = random.randint(0, 3 if did not in ("acc-sw-02",) else 15)
            out_err = random.randint(0, 2)

            records.append({
                "@timestamp": ts.isoformat(),
                "device_id": did,
                "hostname": device["hostname"],
                "interface": f"Gi0/{random.randint(0, 3)}",
                "in_octets": in_oct,
                "out_octets": out_oct,
                "in_errors": in_err,
                "out_errors": out_err,
                "cpu_util": round(cpu, 1),
                "mem_util": round(mem, 1),
                "in_utilization_pct": round(min(100, in_oct / 1.25e8 * 100), 1),
                "out_utilization_pct": round(min(100, out_oct / 1.25e8 * 100), 1),
            })
    return records


SYSLOG_TEMPLATES = {
    "firewall": [
        (3, "security", "%ASA-3-710003: TCP access denied from {src}:{sp} to {dst}:{dp} on interface outside"),
        (5, "security", "%ASA-5-304001: {src} Accessed URL http://{dst}:{dp}/api/v2/data"),
        (3, "security", "%ASA-3-338008: Dynamic filter exceeded maximum number of requests: {src} to {dst}"),
        (4, "security", "%ASA-4-411002: Line protocol on Interface outside, changed state to down"),
        (6, "security", "%ASA-6-302013: Built inbound TCP connection {conn} for outside:{src}/{sp} to inside:{dst}/{dp}"),
    ],
    "router": [
        (5, "routing", "OSPF-5-ADJCHG: Process 1, Nbr {src} on Gi0/1 from LOADING to FULL, Loading Done"),
        (3, "routing", "BGP-3-NOTIFICATION: sent to neighbor {src} 4/0 (hold time expired) 0 bytes"),
        (4, "routing", "LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to down"),
        (6, "routing", "SYS-6-LOGGINGHOST_STARTSTOP: Logging to host {dst} port 514 started - CLI initiated"),
        (3, "performance", "SYS-3-CPUHOG: Task ran for {ms}ms, process = IP Input, PC = 0x0, SP = 0x0"),
    ],
    "switch": [
        (5, "hardware", "SW_MATM-4-MACFLAP_NOTIF: Host {mac} in vlan {vlan} is flapping between port Gi1/0/{p1} and Gi1/0/{p2}"),
        (4, "hardware", "ETHCNTR-3-LOOP_BACK_DETECTED: Loopback detected on GigabitEthernet1/0/{p1}"),
        (6, "hardware", "LINK-3-UPDOWN: Interface GigabitEthernet1/0/{p1}, changed state to up"),
        (3, "performance", "STORM_CONTROL-3-FILTERED: A packet storm was detected on Gi1/0/{p1}. A packet storm was filtered on the interface"),
        (5, "security", "DOT1X-5-FAIL: Authentication failed for client ({mac}) on Interface Gi1/0/{p1}"),
    ],
    "server": [
        (6, "security", "sshd[{pid}]: Accepted publickey for svcuser from {src} port {sp} ssh2"),
        (4, "performance", "kernel: OOM killer invoked: score {score} for process {proc}"),
        (5, "hardware", "smartd[{pid}]: Device: /dev/sda [SAT], SMART Failure: (Reallocated_Sector_Ct)"),
        (6, "security", "nginx[{pid}]: {src} - - [{ts}] \"GET /api/health HTTP/1.1\" 200 142 \"-\" \"kube-probe/1.26\""),
        (3, "performance", "kernel: NFS: server 10.0.1.5 not responding, still trying"),
    ],
}


def _random_mac() -> str:
    return ":".join(f"{random.randint(0,255):02x}" for _ in range(6))


def _fmt_msg(template: str) -> str:
    replacements = {
        "{src}": rand_host_ip(),
        "{dst}": rand_host_ip(),
        "{sp}": str(random.randint(1024, 65535)),
        "{dp}": str(random.choice(COMMON_PORTS)),
        "{conn}": str(random.randint(1000000, 9999999)),
        "{mac}": _random_mac(),
        "{vlan}": str(random.choice([10, 20, 30, 100, 200])),
        "{p1}": str(random.randint(1, 24)),
        "{p2}": str(random.randint(1, 24)),
        "{pid}": str(random.randint(1000, 50000)),
        "{score}": str(random.randint(100, 999)),
        "{proc}": random.choice(["java", "python", "node", "nginx"]),
        "{ms}": str(random.randint(200, 5000)),
        "{ts}": datetime.now(timezone.utc).strftime("%d/%b/%Y:%H:%M:%S +0000"),
    }
    for k, v in replacements.items():
        template = template.replace(k, v)
    return template


SEVERITY_LABELS = {0: "emergency", 1: "alert", 2: "critical", 3: "error", 4: "warning", 5: "notice", 6: "info", 7: "debug"}


def gen_syslog(count: int) -> list[dict]:
    records = []
    now = datetime.now(timezone.utc)

    for _ in range(count):
        hours_back = random.expovariate(0.4)  # more recent events more likely
        hours_back = min(hours_back, 23.9)
        ts = now - timedelta(hours=hours_back)

        device = random.choice(DEVICES)
        device_type = device["type"]
        templates = SYSLOG_TEMPLATES.get(device_type, SYSLOG_TEMPLATES["switch"])
        severity, category, template = random.choice(templates)

        # bias toward more severe events in last 4 hours
        if hours_back < 4 and device["device_id"] == "site-b-rtr":
            severity = random.choice([3, 3, 3, 4, 5])

        records.append({
            "@timestamp": ts.isoformat(),
            "device_id": device["device_id"],
            "hostname": device["hostname"],
            "severity": severity,
            "severity_label": SEVERITY_LABELS[severity],
            "facility": 23,
            "facility_label": "local7",
            "message": _fmt_msg(template),
            "category": category,
        })
    return sorted(records, key=lambda r: r["@timestamp"], reverse=True)


# ---------------------------------------------------------------------------
# Elasticsearch ingest
# ---------------------------------------------------------------------------

def bulk_index(es, index: str, docs: list[dict], dry_run: bool) -> None:
    if dry_run:
        print(f"\n[DRY RUN] {index}: {len(docs)} documents (first 2 shown)")
        for d in docs[:2]:
            print(json.dumps(d, indent=2, default=str)[:500])
        return

    from elasticsearch.helpers import bulk

    def _actions():
        for doc in docs:
            yield {"_index": index, "_source": doc}

    success, errors = bulk(es, _actions(), raise_on_error=False)
    if errors:
        print(f"  WARN: {len(errors)} errors during bulk ingest into {index}")
    print(f"  OK: indexed {success} docs into {index}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate network telemetry demo data")
    parser.add_argument("--dry-run", action="store_true", help="Print samples without indexing")
    parser.add_argument("--flows", type=int, default=5000, help="Number of NetFlow records")
    parser.add_argument("--syslog", type=int, default=500, help="Number of syslog records")
    parser.add_argument("--snmp-interval", type=int, default=5, help="SNMP poll interval in minutes")
    args = parser.parse_args()

    es = None
    if not args.dry_run:
        if not ES_URL or not ES_KEY:
            print("ERROR: ELASTICSEARCH_URL and ELASTIC_API_KEY must be set in backend/.env")
            sys.exit(1)
        try:
            from elasticsearch import Elasticsearch
            es = Elasticsearch(ES_URL, api_key=ES_KEY, request_timeout=10)
            info = es.info()
            print(f"Connected to Elasticsearch {info['version']['number']}")
        except Exception as e:
            print(f"ERROR: Cannot connect to Elasticsearch: {e}")
            sys.exit(1)

    print(f"Generating {len(DEVICES)} devices...")
    bulk_index(es, "network-devices", DEVICES, args.dry_run)

    print(f"Generating {args.flows} NetFlow records...")
    flows = gen_flows(args.flows)
    bulk_index(es, "network-flows", flows, args.dry_run)

    snmp_count = len(DEVICES) * int(24 * 60 / args.snmp_interval)
    print(f"Generating ~{snmp_count} SNMP samples ({args.snmp_interval}min interval × {len(DEVICES)} devices × 24h)...")
    snmp = gen_snmp(args.snmp_interval)
    bulk_index(es, "network-snmp", snmp, args.dry_run)

    print(f"Generating {args.syslog} syslog records...")
    syslog = gen_syslog(args.syslog)
    bulk_index(es, "network-syslog", syslog, args.dry_run)

    print("\nDone! Indices: network-devices, network-flows, network-snmp, network-syslog")
    if not args.dry_run:
        print("\nNext steps:")
        print("  1. Open Kibana → Discover to explore the data")
        print("  2. Run the Network Topology page in the demo app")
        print("  3. Deploy the network workflow recipes from the Workflows page")


if __name__ == "__main__":
    main()
