#!/usr/bin/env python3
"""Generate synthetic network impact data for the interface flap/outage demo.

Creates four indices:
  network-mac-table   — switch MAC address tables (port → MAC mappings)
  network-arp-table   — router ARP tables (MAC → IP mappings)
  network-dns         — DNS/DHCP records (IP → hostname, user, department)
  network-impact      — pre-joined impact view (flap event → all affected devices)

Also creates two Elasticsearch ENRICH policies for live ES|QL cross-index joins:
  mac-to-ip           — enriches MAC addresses with IP and router info
  ip-to-hostname      — enriches IPs with hostname, user, department

Two synthetic scenarios:
  FLAP   — acc-sw-03 Gi0/1 bounces 3 times (Finance + Trading users affected)
  OUTAGE — acc-sw-02 Gi0/3 goes cleanly down (HR + NOC users affected)

Usage:
    python scripts/generate_network_impact.py --dry-run
    python scripts/generate_network_impact.py
"""

import argparse, json, os, random, sys, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

ES_URL    = os.environ.get("ELASTICSEARCH_URL", "").rstrip("/")
ES_KEY    = os.environ.get("ELASTIC_API_KEY", "")
KB_URL    = os.environ.get("KIBANA_URL", "").rstrip("/")

# ---------------------------------------------------------------------------
# Device + user catalogue
# ---------------------------------------------------------------------------

SITE_B_DEVICES = [
    # (ip_suffix, hostname, mac, port, vlan, device_type, user, department, floor)
    (10, "fin-ws-01",  "00:1A:2B:10:00:01", "Gi0/2",  20, "workstation", "alice.chen",    "Finance",  "2"),
    (11, "fin-ws-02",  "00:1A:2B:10:00:02", "Gi0/3",  20, "workstation", "bob.smith",     "Finance",  "2"),
    (12, "fin-ws-03",  "00:1A:2B:10:00:03", "Gi0/4",  20, "workstation", "carol.martinez","Finance",  "2"),
    (13, "fin-ws-04",  "00:1A:2B:10:00:04", "Gi0/5",  20, "workstation", "david.lee",     "Finance",  "2"),
    (14, "fin-ws-05",  "00:1A:2B:10:00:05", "Gi0/6",  20, "workstation", "emma.wilson",   "Finance",  "2"),
    (15, "fin-ws-06",  "00:1A:2B:10:00:06", "Gi0/7",  20, "workstation", "frank.taylor",  "Finance",  "3"),
    (16, "fin-ws-07",  "00:1A:2B:10:00:07", "Gi0/8",  20, "workstation", "grace.anderson","Finance",  "3"),
    (17, "fin-ws-08",  "00:1A:2B:10:00:08", "Gi0/9",  20, "workstation", "henry.brown",   "Finance",  "3"),
    (20, "trd-ws-01",  "00:1A:2B:20:00:01", "Gi0/10", 21, "workstation", "ivan.petrov",   "Trading",  "4"),
    (21, "trd-ws-02",  "00:1A:2B:20:00:02", "Gi0/11", 21, "workstation", "julia.kim",     "Trading",  "4"),
    (22, "trd-ws-03",  "00:1A:2B:20:00:03", "Gi0/12", 21, "workstation", "kevin.walsh",   "Trading",  "4"),
    (23, "trd-ws-04",  "00:1A:2B:20:00:04", "Gi0/13", 21, "workstation", "laura.jones",   "Trading",  "4"),
    (24, "trd-ws-05",  "00:1A:2B:20:00:05", "Gi0/14", 21, "workstation", "marcus.obi",    "Trading",  "4"),
    (25, "trd-ws-06",  "00:1A:2B:20:00:06", "Gi0/15", 21, "workstation", "nina.patel",    "Trading",  "4"),
    (30, "hr-ws-01",   "00:1A:2B:30:00:01", "Gi0/16", 20, "workstation", "olivia.garcia", "HR",       "1"),
    (31, "hr-ws-02",   "00:1A:2B:30:00:02", "Gi0/17", 20, "workstation", "peter.zhang",   "HR",       "1"),
    (32, "hr-ws-03",   "00:1A:2B:30:00:03", "Gi0/18", 20, "workstation", "quinn.murphy",  "HR",       "1"),
    (33, "hr-ws-04",   "00:1A:2B:30:00:04", "Gi0/19", 20, "workstation", "rachel.scott",  "HR",       "1"),
    (34, "hr-ws-05",   "00:1A:2B:30:00:05", "Gi0/20", 20, "workstation", "sam.johnson",   "HR",       "1"),
    (35, "noc-ws-01",  "00:1A:2B:40:00:01", "Gi0/21", 99, "workstation", "tanya.williams","NOC",      "5"),
    (36, "noc-ws-02",  "00:1A:2B:40:00:02", "Gi0/22", 99, "workstation", "uma.singh",     "NOC",      "5"),
    (37, "noc-ws-03",  "00:1A:2B:40:00:03", "Gi0/23", 99, "workstation", "victor.chen",   "NOC",      "5"),
    (38, "noc-ws-04",  "00:1A:2B:40:00:04", "Gi0/24", 99, "workstation", "wendy.fox",     "NOC",      "5"),
    (39, "it-ws-01",   "00:1A:2B:50:00:01", "Gi0/25", 99, "workstation", "xavier.brown",  "IT",       "5"),
    (40, "it-ws-02",   "00:1A:2B:50:00:02", "Gi0/26", 99, "workstation", "yasmin.ali",    "IT",       "5"),
    (41, "it-ws-03",   "00:1A:2B:50:00:03", "Gi0/27", 99, "workstation", "zach.white",    "IT",       "5"),
    # Servers
    (50, "trd-srv-01", "00:1A:2B:60:00:01", "Gi0/28", 21, "server",      "",              "Trading",  "B1"),
    (51, "trd-srv-02", "00:1A:2B:60:00:02", "Gi0/29", 21, "server",      "",              "Trading",  "B1"),
    (52, "file-srv-01","00:1A:2B:60:00:03", "Gi0/30", 20, "server",      "",              "IT",       "B1"),
    (53, "print-srv",  "00:1A:2B:60:00:04", "Gi0/31", 20, "server",      "",              "IT",       "B1"),
    # VoIP phones (data VLAN 20, voice VLAN 30)
    (60, "voip-fin-01","00:1A:2B:70:00:01", "Gi0/32", 30, "voip_phone",  "alice.chen",    "Finance",  "2"),
    (61, "voip-fin-02","00:1A:2B:70:00:02", "Gi0/33", 30, "voip_phone",  "bob.smith",     "Finance",  "2"),
    (62, "voip-trd-01","00:1A:2B:70:00:03", "Gi0/34", 30, "voip_phone",  "ivan.petrov",   "Trading",  "4"),
    (63, "voip-hr-01", "00:1A:2B:70:00:04", "Gi0/35", 30, "voip_phone",  "olivia.garcia", "HR",       "1"),
    # Printers
    (80, "printer-01", "00:1A:2B:80:00:01", "Gi0/40", 20, "printer",     "",              "Finance",  "2"),
    (81, "printer-02", "00:1A:2B:80:00:02", "Gi0/41", 20, "printer",     "",              "HR",       "1"),
    # Network infrastructure
    (100,"acc-sw-03",  "00:1A:2B:90:00:01", "Gi0/1",  1,  "switch",      "",              "IT",       "B1"),
    (101,"voip-gw-01", "00:1A:2B:90:00:02", "Gi0/42", 30, "voip_gateway","",              "IT",       "B1"),
]

# acc-sw-02 devices (Site-A floor 2) — for the OUTAGE scenario
SITE_A_FL2_DEVICES = [
    (110, "ops-ws-01", "00:1C:3D:10:00:01", "Gi0/5",  20, "workstation", "anna.ford",     "Operations","2"),
    (111, "ops-ws-02", "00:1C:3D:10:00:02", "Gi0/6",  20, "workstation", "brian.stone",   "Operations","2"),
    (112, "ops-ws-03", "00:1C:3D:10:00:03", "Gi0/7",  20, "workstation", "claire.reed",   "Operations","2"),
    (113, "sec-ws-01", "00:1C:3D:20:00:01", "Gi0/8",  99, "workstation", "dan.marsh",     "Security", "2"),
    (114, "sec-ws-02", "00:1C:3D:20:00:02", "Gi0/9",  99, "workstation", "eve.stone",     "Security", "2"),
    (115, "mgmt-ws-01","00:1C:3D:30:00:01", "Gi0/10", 99, "workstation", "fred.cole",     "IT",       "2"),
    (116, "voip-ops-01","00:1C:3D:40:00:01","Gi0/11", 30, "voip_phone",  "anna.ford",     "Operations","2"),
    (117, "printer-03","00:1C:3D:50:00:01", "Gi0/20", 20, "printer",     "",              "Operations","2"),
]

def _now() -> datetime:
    return datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Index document builders
# ---------------------------------------------------------------------------

def build_mac_table(ts: datetime, crawl_id: str) -> list[dict]:
    docs = []
    # acc-sw-03 (Site-B) — affected by FLAP scenario
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_B_DEVICES:
        docs.append({
            "@timestamp": ts.isoformat(),
            "crawl_id": crawl_id,
            "device_id": "acc-sw-03",
            "device_hostname": "acc-sw-03.corp.local",
            "site": "Site-B",
            "vlan_id": vlan,
            "mac_address": mac,
            "port": port,
            "uplink_port": "GigabitEthernet0/1",
            "entry_type": "dynamic",
            "age_seconds": random.randint(30, 300),
        })
    # acc-sw-02 (Site-A floor 2) — affected by OUTAGE scenario
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_A_FL2_DEVICES:
        docs.append({
            "@timestamp": ts.isoformat(),
            "crawl_id": crawl_id,
            "device_id": "acc-sw-02",
            "device_hostname": "acc-sw-02.corp.local",
            "site": "Site-A",
            "vlan_id": vlan,
            "mac_address": mac,
            "port": port,
            "uplink_port": "GigabitEthernet0/3",
            "entry_type": "dynamic",
            "age_seconds": random.randint(30, 300),
        })
    return docs


def build_arp_table(ts: datetime) -> list[dict]:
    docs = []
    # site-b-rtr ARP for 10.2.1.x
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_B_DEVICES:
        docs.append({
            "@timestamp": ts.isoformat(),
            "router_device_id": "site-b-rtr",
            "router_hostname": "site-b-rtr.corp.local",
            "ip_address": f"10.2.1.{ip_s}",
            "mac_address": mac,
            "interface": "GigabitEthernet0/2",
            "vlan_id": vlan,
            "entry_type": "dynamic",
            "age_minutes": random.randint(1, 240),
        })
    # site-a-rtr ARP for 10.1.2.x
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_A_FL2_DEVICES:
        docs.append({
            "@timestamp": ts.isoformat(),
            "router_device_id": "site-a-rtr",
            "router_hostname": "site-a-rtr.corp.local",
            "ip_address": f"10.1.2.{ip_s}",
            "mac_address": mac,
            "interface": "GigabitEthernet0/3",
            "vlan_id": vlan,
            "entry_type": "dynamic",
            "age_minutes": random.randint(1, 240),
        })
    return docs


def build_dns_table(ts: datetime) -> list[dict]:
    docs = []
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_B_DEVICES:
        fqdn = f"{hostname}.siteb.corp.local"
        docs.append({
            "@timestamp": ts.isoformat(),
            "ip_address": f"10.2.1.{ip_s}",
            "mac_address": mac,
            "hostname": hostname,
            "fqdn": fqdn,
            "ptr_record": f"{ip_s}.1.2.10.in-addr.arpa",
            "site": "Site-B",
            "building": "HQ-B",
            "floor": floor,
            "device_type": dtype,
            "user_name": user or "",
            "user_email": f"{user}@corp.local" if user else "",
            "department": dept,
            "record_source": "dhcp",
            "ttl_seconds": 3600,
        })
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_A_FL2_DEVICES:
        fqdn = f"{hostname}.sitea.corp.local"
        docs.append({
            "@timestamp": ts.isoformat(),
            "ip_address": f"10.1.2.{ip_s}",
            "mac_address": mac,
            "hostname": hostname,
            "fqdn": fqdn,
            "ptr_record": f"{ip_s}.2.1.10.in-addr.arpa",
            "site": "Site-A",
            "building": "HQ-A",
            "floor": floor,
            "device_type": dtype,
            "user_name": user or "",
            "user_email": f"{user}@corp.local" if user else "",
            "department": dept,
            "record_source": "dhcp",
            "ttl_seconds": 3600,
        })
    return docs


def build_impact_events(ts: datetime) -> list[dict]:
    """Build the pre-joined network-impact index with both scenarios."""
    docs = []

    # ── SCENARIO A: FLAP — acc-sw-03 Gi0/1 bouncing (Site-B) ───────────────
    # Timeline: first flap 18 min ago, last recovery 4 min ago, still down
    flap_event_id = str(uuid.uuid4())
    flap_start = ts - timedelta(minutes=18)
    flap_bounces = [
        {"type": "down", "at": flap_start},
        {"type": "up",   "at": flap_start + timedelta(minutes=2)},
        {"type": "down", "at": flap_start + timedelta(minutes=5)},
        {"type": "up",   "at": flap_start + timedelta(minutes=7)},
        {"type": "down", "at": flap_start + timedelta(minutes=14)},
    ]
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_B_DEVICES:
        if dtype == "switch":
            continue  # skip infrastructure
        docs.append({
            "@timestamp": ts.isoformat(),
            "event_id": flap_event_id,
            "event_type": "flap",
            "trigger_device": "acc-sw-03",
            "trigger_device_hostname": "acc-sw-03.corp.local",
            "trigger_interface": "GigabitEthernet0/1",
            "trigger_description": f"Interface GigabitEthernet0/1 flapping — {len(flap_bounces)} state changes in 14 minutes",
            "flap_count": len(flap_bounces),
            "flap_timeline": [{"type": b["type"], "at": b["at"].isoformat()} for b in flap_bounces],
            "first_detected": flap_start.isoformat(),
            "last_event": (flap_start + timedelta(minutes=14)).isoformat(),
            "duration_minutes": 18,
            "site": "Site-B",
            # Device identity chain
            "switch_device": "acc-sw-03",
            "switch_port": port,
            "uplink_port": "GigabitEthernet0/1",
            "vlan_id": vlan,
            "mac_address": mac,
            "ip_address": f"10.2.1.{ip_s}",
            "hostname": hostname,
            "fqdn": f"{hostname}.siteb.corp.local",
            "device_type": dtype,
            "user_name": user or "",
            "user_email": f"{user}@corp.local" if user else "",
            "department": dept,
            "building": "HQ-B",
            "floor": floor,
            "status": "offline",
        })

    # ── SCENARIO B: OUTAGE — acc-sw-02 Gi0/3 clean down (Site-A fl.2) ──────
    outage_event_id = str(uuid.uuid4())
    outage_start = ts - timedelta(minutes=7)
    for ip_s, hostname, mac, port, vlan, dtype, user, dept, floor in SITE_A_FL2_DEVICES:
        docs.append({
            "@timestamp": ts.isoformat(),
            "event_id": outage_event_id,
            "event_type": "outage",
            "trigger_device": "acc-sw-02",
            "trigger_device_hostname": "acc-sw-02.corp.local",
            "trigger_interface": "GigabitEthernet0/3",
            "trigger_description": "Interface GigabitEthernet0/3 link down — CRC errors detected",
            "flap_count": 1,
            "flap_timeline": [{"type": "down", "at": outage_start.isoformat()}],
            "first_detected": outage_start.isoformat(),
            "last_event": outage_start.isoformat(),
            "duration_minutes": 7,
            "site": "Site-A",
            "switch_device": "acc-sw-02",
            "switch_port": port,
            "uplink_port": "GigabitEthernet0/3",
            "vlan_id": vlan,
            "mac_address": mac,
            "ip_address": f"10.1.2.{ip_s}",
            "hostname": hostname,
            "fqdn": f"{hostname}.sitea.corp.local",
            "device_type": dtype,
            "user_name": user or "",
            "user_email": f"{user}@corp.local" if user else "",
            "department": dept,
            "building": "HQ-A",
            "floor": floor,
            "status": "offline",
        })

    return docs


# ---------------------------------------------------------------------------
# ENRICH policies
# ---------------------------------------------------------------------------

def create_enrich_policies(dry_run: bool) -> None:
    if dry_run:
        print("[DRY RUN] Would create ENRICH policies: mac-to-ip, ip-to-hostname")
        return
    try:
        import requests
        h = {"Authorization": f"ApiKey {ES_KEY}", "Content-Type": "application/json"}

        for name, policy in [
            ("mac-to-ip", {
                "match": {
                    "indices": ["network-arp-table"],
                    "match_field": "mac_address",
                    "enrich_fields": ["ip_address", "router_device_id", "vlan_id"],
                }
            }),
            ("ip-to-hostname", {
                "match": {
                    "indices": ["network-dns"],
                    "match_field": "ip_address",
                    "enrich_fields": ["hostname", "fqdn", "user_name", "user_email",
                                      "department", "device_type", "building", "floor"],
                }
            }),
        ]:
            r = requests.put(f"{ES_URL}/_enrich/policy/{name}", headers=h, json=policy)
            if r.ok:
                print(f"  OK: enrich policy '{name}' created")
                # Execute to build the enrich index
                r2 = requests.post(f"{ES_URL}/_enrich/policy/{name}/_execute", headers=h)
                if r2.ok:
                    print(f"  OK: enrich policy '{name}' executed (index built)")
                else:
                    print(f"  WARN: execute failed: {r2.text[:100]}")
            elif r.status_code == 409:
                print(f"  OK: enrich policy '{name}' already exists")
            else:
                print(f"  WARN: {name}: {r.status_code} {r.text[:100]}")
    except Exception as e:
        print(f"  WARN: could not create enrich policies: {e}")


def create_kibana_dataview(index: str, name: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would create Kibana data view '{name}'")
        return
    try:
        import requests
        h = {"Authorization": f"ApiKey {ES_KEY}", "Content-Type": "application/json", "kbn-xsrf": "true"}
        resp = requests.post(f"{KB_URL}/api/data_views/data_view", headers=h,
            json={"data_view": {"title": index, "name": name, "timeFieldName": "@timestamp"}, "override": True})
        if resp.ok:
            print(f"  OK: Kibana data view '{name}'")
        else:
            print(f"  WARN: data view '{name}': {resp.status_code}")
    except Exception as e:
        print(f"  WARN: data view: {e}")


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

def bulk_index(es, index: str, docs: list[dict], dry_run: bool) -> None:
    if dry_run:
        print(f"\n[DRY RUN] {index}: {len(docs)} docs")
        print(json.dumps(docs[0], indent=2, default=str)[:400])
        return
    from elasticsearch.helpers import bulk
    success, errors = bulk(es, ({"_index": index, "_source": d} for d in docs), raise_on_error=False)
    if errors:
        print(f"  WARN: {len(errors)} errors")
    print(f"  OK: indexed {success} docs into {index}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    es = None
    if not args.dry_run:
        if not ES_URL or not ES_KEY:
            print("ERROR: ELASTICSEARCH_URL and ELASTIC_API_KEY must be set in backend/.env")
            sys.exit(1)
        try:
            from elasticsearch import Elasticsearch
            es = Elasticsearch(ES_URL, api_key=ES_KEY, request_timeout=15)
            print(f"Connected: ES {es.info()['version']['number']}")
        except Exception as e:
            print(f"ERROR: {e}"); sys.exit(1)

    ts     = datetime.now(timezone.utc)
    crawl  = str(uuid.uuid4())

    print("\nGenerating MAC address tables...")
    bulk_index(es, "network-mac-table", build_mac_table(ts, crawl), args.dry_run)

    print("Generating ARP tables...")
    bulk_index(es, "network-arp-table", build_arp_table(ts), args.dry_run)

    print("Generating DNS/DHCP records...")
    bulk_index(es, "network-dns", build_dns_table(ts), args.dry_run)

    print("Generating network-impact events (flap + outage)...")
    bulk_index(es, "network-impact", build_impact_events(ts), args.dry_run)

    print("\nCreating ENRICH policies...")
    create_enrich_policies(args.dry_run)

    print("\nCreating Kibana data views...")
    for idx, name in [
        ("network-mac-table", "Network MAC Address Table"),
        ("network-arp-table", "Network ARP Table"),
        ("network-dns",       "Network DNS / DHCP"),
        ("network-impact",    "Network Impact Analysis"),
    ]:
        create_kibana_dataview(idx, name, args.dry_run)

    total = (len(SITE_B_DEVICES) + len(SITE_A_FL2_DEVICES))
    print(f"\nDone!")
    print(f"  MAC table entries : {total}")
    print(f"  ARP entries       : {total}")
    print(f"  DNS records       : {total}")
    impact = len([d for d in SITE_B_DEVICES if d[5] != 'switch']) + len(SITE_A_FL2_DEVICES)
    print(f"  Impact documents  : {impact} ({len([d for d in SITE_B_DEVICES if d[5]!='switch'])} flap + {len(SITE_A_FL2_DEVICES)} outage)")
    print(f"\nES|QL demo query:")
    print("""  FROM network-mac-table
  | WHERE device_id == "acc-sw-03"
  | ENRICH mac-to-ip ON mac_address
  | ENRICH ip-to-hostname ON ip_address
  | KEEP vlan_id, mac_address, ip_address, hostname, user_name, department
  | SORT department, hostname""")


if __name__ == "__main__":
    main()
