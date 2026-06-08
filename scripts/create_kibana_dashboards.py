#!/usr/bin/env python3
"""Create Kibana dashboards for the Network Operations Center demo.

Deploys three dashboards to Kibana via the Dashboards API (v2023-10-31):
  1. NOC Overview        — device health KPIs, CPU/memory charts, syslog alerts
  2. NetFlow Analysis    — top talkers, protocol breakdown, traffic over time
  3. CDP/LLDP Topology   — adjacency table, protocol mix, down links

Usage:
    python scripts/create_kibana_dashboards.py              # Create / replace all
    python scripts/create_kibana_dashboards.py --dry-run    # Print JSON only
    python scripts/create_kibana_dashboards.py --delete     # Remove all NOC dashboards
"""

import argparse
import json
import os
import sys
from pathlib import Path

env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

KIBANA_URL = os.environ.get("KIBANA_URL", "").rstrip("/")
API_KEY    = os.environ.get("ELASTIC_API_KEY", "")
API_VER    = "2023-10-31"

# Confirmed working schema helpers:
#   vis(cfg)              → panel with type="vis"
#   metric(q, col, lbl)   → metric config via ES|QL
#   bar_h(q, x, y)        → horizontal bar config
#   line(q, x, y)         → line/area chart config
#   donut(q, val, grp)    → pie/donut config
#   table(q, rows, cols)  → data_table config


def _panel(cfg: dict, x: int, y: int, w: int, h: int) -> dict:
    return {"type": "vis", "grid": {"x": x, "y": y, "w": w, "h": h}, "config": cfg}


def _metric(query: str, column: str, title: str) -> dict:
    return {
        "title": title,
        "type": "metric",
        "data_source": {"type": "esql", "query": query},
        "metrics": [{"type": "primary", "column": column}],
    }


def _bar_h(title: str, query: str, x_col: str, y_col: str, y_label: str) -> dict:
    return {
        "title": title,
        "type": "xy",
        "layers": [{"type": "bar_horizontal",
            "data_source": {"type": "esql", "query": query},
            "x": {"column": x_col},
            "y": [{"column": y_col, "label": y_label}],
        }],
    }


def _line(title: str, query: str, x_col: str, y_col: str, y_label: str, area: bool = False) -> dict:
    return {
        "title": title,
        "type": "xy",
        "layers": [{"type": "area" if area else "line",
            "data_source": {"type": "esql", "query": query},
            "x": {"column": x_col},
            "y": [{"column": y_col, "label": y_label}],
        }],
    }


def _donut(title: str, query: str, val_col: str, grp_col: str) -> dict:
    return {
        "title": title,
        "type": "pie",
        "data_source": {"type": "esql", "query": query},
        "metrics": [{"column": val_col}],
        "group_by": [{"column": grp_col}],
    }


def _table(title: str, query: str, row_cols: list[str], metric_cols: list[str]) -> dict:
    return {
        "title": title,
        "type": "data_table",
        "data_source": {"type": "esql", "query": query},
        "rows":    [{"column": c} for c in row_cols],
        "metrics": [{"column": c} for c in metric_cols],
    }


# ---------------------------------------------------------------------------
# Dashboard 1 — NOC Overview
# ---------------------------------------------------------------------------
#
#  y=0  h=5   [Devices 12] [Critical Alerts 12] [Avg CPU 12] [Avg Memory 12]
#  y=5  h=12  [Top CPU bar 24] [CPU over time site-b-rtr 24]
#  y=17 h=12  [Top Memory bar 24] [Syslog alerts table 24]
#
NOC_OVERVIEW = {
    "title": "NOC Overview",
    "time_range": {"from": "now-24h", "to": "now"},
    "panels": [
        _panel(_metric(
            "FROM network-snmp | STATS `Monitored Devices` = COUNT_DISTINCT(device_id)",
            "Monitored Devices", "Monitored Devices"), 0, 0, 12, 5),
        _panel(_metric(
            "FROM network-syslog "
            "| WHERE severity <= 3 "
            "| STATS `Critical Alerts` = COUNT()",
            "Critical Alerts", "Critical Alerts (24h)"), 12, 0, 12, 5),
        _panel(_metric(
            "FROM network-snmp | STATS `Avg CPU %` = ROUND(AVG(cpu_util), 1)",
            "Avg CPU %", "Fleet Avg CPU %"), 24, 0, 12, 5),
        _panel(_metric(
            "FROM network-snmp | STATS `Avg Memory %` = ROUND(AVG(mem_util), 1)",
            "Avg Memory %", "Fleet Avg Memory %"), 36, 0, 12, 5),

        _panel(_bar_h(
            "Top 10 Devices — Avg CPU Utilisation",
            "FROM network-snmp "
            "| STATS avg_cpu = ROUND(AVG(cpu_util), 1) BY device_id "
            "| SORT avg_cpu DESC | LIMIT 10",
            "device_id", "avg_cpu", "Avg CPU %"), 0, 5, 24, 12),
        _panel(_line(
            "CPU Utilisation Over Time — site-b-rtr",
            "FROM network-snmp "
            "| WHERE device_id == \"site-b-rtr\" "
            "| STATS avg_cpu = ROUND(AVG(cpu_util), 1) "
            "    BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend) "
            "| SORT bucket ASC",
            "bucket", "avg_cpu", "CPU %"), 24, 5, 24, 12),

        _panel(_bar_h(
            "Top 10 Devices — Avg Memory Utilisation",
            "FROM network-snmp "
            "| STATS avg_mem = ROUND(AVG(mem_util), 1) BY device_id "
            "| SORT avg_mem DESC | LIMIT 10",
            "device_id", "avg_mem", "Avg Memory %"), 0, 17, 24, 12),
        _panel(_table(
            "Recent Syslog Alerts",
            "FROM network-syslog "
            "| WHERE severity <= 4 "
            "| SORT @timestamp DESC "
            "| KEEP @timestamp, device_id, severity_label, category, message "
            "| LIMIT 50",
            ["@timestamp", "device_id", "severity_label", "category"],
            ["message"]), 24, 17, 24, 12),
    ],
}


# ---------------------------------------------------------------------------
# Dashboard 2 — NetFlow Traffic Analysis
# ---------------------------------------------------------------------------
#
#  y=0  h=5   [Total Flows 12] [Total Bytes 12] [Unique Src IPs 12] [Protocols 12]
#  y=5  h=12  [Traffic over time area 24] [Protocol donut 24]
#  y=17 h=12  [Top src IPs bar 24] [Top talkers table 24]
#
NETFLOW_ANALYSIS = {
    "title": "NetFlow Traffic Analysis",
    "time_range": {"from": "now-24h", "to": "now"},
    "panels": [
        _panel(_metric(
            "FROM network-flows | STATS `Total Flows` = COUNT()",
            "Total Flows", "Total Flows (24h)"), 0, 0, 12, 5),
        _panel(_metric(
            "FROM network-flows | STATS `Total Bytes` = SUM(bytes)",
            "Total Bytes", "Total Bytes (24h)"), 12, 0, 12, 5),
        _panel(_metric(
            "FROM network-flows | STATS `Unique Src IPs` = COUNT_DISTINCT(src_ip)",
            "Unique Src IPs", "Unique Source IPs"), 24, 0, 12, 5),
        _panel(_metric(
            "FROM network-flows | STATS `Active Protocols` = COUNT_DISTINCT(protocol)",
            "Active Protocols", "Active Protocols"), 36, 0, 12, 5),

        _panel(_line(
            "Traffic Volume Over Time",
            "FROM network-flows "
            "| STATS total_bytes = SUM(bytes) "
            "    BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend) "
            "| SORT bucket ASC",
            "bucket", "total_bytes", "Bytes", area=True), 0, 5, 24, 12),
        _panel(_donut(
            "Traffic by Protocol",
            "FROM network-flows "
            "| STATS total_bytes = SUM(bytes) BY protocol "
            "| SORT total_bytes DESC",
            "total_bytes", "protocol"), 24, 5, 24, 12),

        _panel(_bar_h(
            "Top 10 Source IPs by Bytes",
            "FROM network-flows "
            "| STATS total_bytes = SUM(bytes) BY src_ip "
            "| SORT total_bytes DESC | LIMIT 10",
            "src_ip", "total_bytes", "Bytes"), 0, 17, 24, 12),
        _panel(_table(
            "Top Talkers",
            "FROM network-flows "
            "| STATS total_bytes = SUM(bytes), flow_count = COUNT() "
            "    BY src_ip, dst_ip, protocol, dst_port "
            "| SORT total_bytes DESC | LIMIT 20",
            ["src_ip", "dst_ip", "protocol", "dst_port"],
            ["total_bytes", "flow_count"]), 24, 17, 24, 12),
    ],
}


# ---------------------------------------------------------------------------
# Dashboard 3 — CDP/LLDP Topology
# ---------------------------------------------------------------------------
#
#  y=0  h=5   [Total Adj 16] [Links Up 16] [Links Down 16]
#  y=5  h=12  [Protocol donut 24] [Platform bar 24]
#  y=17 h=14  [Full adjacency table 48]
#  y=31 h=10  [Down links table 48]
#
CDP_LLDP_TOPOLOGY = {
    "title": "CDP/LLDP Topology",
    "time_range": {"from": "now-24h", "to": "now"},
    "panels": [
        _panel(_metric(
            "FROM cdp_lldp | STATS `Total Adjacencies` = COUNT()",
            "Total Adjacencies", "Total Adjacencies"), 0, 0, 16, 5),
        _panel(_metric(
            "FROM cdp_lldp | WHERE link_status == \"up\" | STATS `Links Up` = COUNT()",
            "Links Up", "Links Up"), 16, 0, 16, 5),
        _panel(_metric(
            "FROM cdp_lldp | WHERE link_status == \"down\" | STATS `Links Down` = COUNT()",
            "Links Down", "Links Down"), 32, 0, 16, 5),

        _panel(_donut(
            "Adjacencies by Discovery Protocol",
            "FROM cdp_lldp | STATS count = COUNT() BY protocol | SORT count DESC",
            "count", "protocol"), 0, 5, 24, 12),
        _panel(_bar_h(
            "Neighbour Devices by Platform",
            "FROM cdp_lldp "
            "| STATS count = COUNT() BY platform "
            "| SORT count DESC | LIMIT 10",
            "platform", "count", "Adjacencies"), 24, 5, 24, 12),

        _panel(_table(
            "All Discovered Adjacencies",
            "FROM cdp_lldp "
            "| SORT @timestamp DESC "
            "| KEEP local_device, local_interface, neighbor_hostname, "
            "       neighbor_ip, neighbor_interface, protocol, platform, link_status "
            "| LIMIT 100",
            ["local_device", "local_interface", "neighbor_hostname",
             "neighbor_ip", "neighbor_interface", "protocol", "platform"],
            ["link_status"]), 0, 17, 48, 14),

        _panel(_table(
            "Down Links",
            "FROM cdp_lldp "
            "| WHERE link_status == \"down\" "
            "| SORT @timestamp DESC "
            "| KEEP @timestamp, local_device, local_interface, "
            "       neighbor_hostname, neighbor_interface, protocol, trigger_event "
            "| LIMIT 50",
            ["@timestamp", "local_device", "local_interface",
             "neighbor_hostname", "neighbor_interface", "protocol"],
            ["trigger_event"]), 0, 31, 48, 10),
    ],
}

# ---------------------------------------------------------------------------
# Dashboard 4 — Network Impact Analysis
# ---------------------------------------------------------------------------
#
#  y=0  h=5   [Total Affected 12] [Departments 12] [Flap Events 12] [Outage Events 12]
#  y=5  h=12  [By Department bar 24] [By Device Type donut 24]
#  y=17 h=12  [MAC→IP table 48]
#  y=29 h=12  [IP→Hostname+User table 48]
#  y=41 h=14  [Full impact chain table 48]
#
NETWORK_IMPACT = {
    "title": "Network Impact Analysis",
    "time_range": {"from": "now-24h", "to": "now"},
    "panels": [
        # ── Row 1: KPIs (y=0, h=5) ──────────────────────────────────────────
        _panel(_metric(
            "FROM network-impact | WHERE status == \"offline\" | STATS `Affected Devices` = COUNT()",
            "Affected Devices", "Affected Devices"), 0, 0, 12, 5),
        _panel(_metric(
            "FROM network-impact | WHERE status == \"offline\" | STATS `Departments` = COUNT_DISTINCT(department)",
            "Departments", "Departments Impacted"), 12, 0, 12, 5),
        _panel(_metric(
            "FROM network-impact | WHERE status == \"offline\" AND event_type == \"flap\" | STATS `Flap Events` = COUNT_DISTINCT(event_id)",
            "Flap Events", "Active Flap Events"), 24, 0, 12, 5),
        _panel(_metric(
            "FROM network-impact | WHERE status == \"offline\" AND event_type == \"outage\" | STATS `Outage Events` = COUNT_DISTINCT(event_id)",
            "Outage Events", "Active Outages"), 36, 0, 12, 5),

        # ── Row 2: Dept bar + Device type donut (y=5, h=12) ─────────────────
        _panel(_bar_h(
            "Affected Devices by Department",
            "FROM network-impact | WHERE status == \"offline\" "
            "| STATS count = COUNT() BY department | SORT count DESC",
            "department", "count", "Devices"), 0, 5, 24, 12),
        _panel(_donut(
            "Affected Devices by Type",
            "FROM network-impact | WHERE status == \"offline\" "
            "| STATS count = COUNT() BY device_type | SORT count DESC",
            "count", "device_type"), 24, 5, 24, 12),

        # ── Row 3: MAC→IP mapping table (y=17, h=12) ────────────────────────
        _panel(_table(
            "MAC Address → IP Address Mapping (ARP Table)",
            "FROM network-arp-table "
            "| SORT router_device_id ASC, ip_address ASC "
            "| KEEP mac_address, ip_address, router_device_id, vlan_id, interface, age_minutes "
            "| LIMIT 100",
            ["mac_address", "ip_address", "router_device_id", "interface", "vlan_id"],
            ["age_minutes"]), 0, 17, 48, 12),

        # ── Row 4: IP→Hostname+User table (y=29, h=12) ──────────────────────
        _panel(_table(
            "IP Address → Hostname · User · Department (DNS/DHCP)",
            "FROM network-dns "
            "| SORT department ASC, hostname ASC "
            "| KEEP ip_address, hostname, fqdn, user_name, user_email, department, device_type, building, floor "
            "| LIMIT 100",
            ["ip_address", "hostname", "user_name", "user_email", "department", "device_type"],
            ["building"]), 0, 29, 48, 12),

        # ── Row 5: Full impact chain (y=41, h=14) ────────────────────────────
        _panel(_table(
            "Full Impact Chain — Switch Port → MAC → IP → Hostname → User",
            "FROM network-impact "
            "| WHERE status == \"offline\" "
            "| SORT department ASC, hostname ASC "
            "| KEEP event_type, trigger_device, trigger_interface, switch_port, vlan_id, "
            "       mac_address, ip_address, hostname, user_name, department, device_type, building, floor "
            "| LIMIT 200",
            ["event_type", "trigger_device", "switch_port", "vlan_id",
             "mac_address", "ip_address", "hostname", "user_name", "department", "device_type"],
            ["building"]), 0, 41, 48, 14),
    ],
}

DASHBOARDS = [NOC_OVERVIEW, NETFLOW_ANALYSIS, CDP_LLDP_TOPOLOGY, NETWORK_IMPACT]


# ---------------------------------------------------------------------------
# Kibana API
# ---------------------------------------------------------------------------

def _headers() -> dict:
    return {
        "Authorization": f"ApiKey {API_KEY}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
        "Elastic-Api-Version": API_VER,
    }


def _list_noc() -> list[dict]:
    import requests
    resp = requests.get(f"{KIBANA_URL}/api/dashboards", headers=_headers(), timeout=10)
    resp.raise_for_status()
    titles = {d["title"] for d in DASHBOARDS}
    return [d for d in resp.json().get("dashboards", []) if d["data"]["title"] in titles]


def _create(defn: dict) -> str:
    import requests
    resp = requests.post(f"{KIBANA_URL}/api/dashboards", headers=_headers(), json=defn, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Create failed ({resp.status_code}): {resp.text[:400]}")
    return resp.json()["id"]


def _delete(db_id: str) -> None:
    import requests
    requests.delete(f"{KIBANA_URL}/api/dashboards/{db_id}", headers=_headers(), timeout=10)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--delete", action="store_true")
    args = parser.parse_args()

    if not KIBANA_URL or not API_KEY:
        print("ERROR: KIBANA_URL and ELASTIC_API_KEY must be set in backend/.env")
        sys.exit(1)

    if args.delete:
        existing = _list_noc()
        for db in existing:
            print(f"  Deleting: {db['data']['title']} ({db['id']})")
            _delete(db["id"])
        print(f"Deleted {len(existing)} dashboard(s).")
        return

    if args.dry_run:
        for d in DASHBOARDS:
            print(f"\n{'─'*60}\n{d['title']} — {len(d['panels'])} panels\n{'─'*60}")
            print(json.dumps(d, indent=2)[:600] + "\n  ...")
        return

    # Replace any existing NOC dashboards
    existing = _list_noc()
    if existing:
        print(f"Replacing {len(existing)} existing NOC dashboard(s)...")
        for db in existing:
            _delete(db["id"])

    created: dict[str, str] = {}
    for defn in DASHBOARDS:
        print(f"Creating: {defn['title']}...")
        db_id = _create(defn)
        created[defn["title"]] = db_id
        print(f"  OK: {db_id}")

    print(f"\n{'='*60}")
    print(f"Created {len(created)} dashboard(s):\n")
    for title, db_id in created.items():
        print(f"  {title}")
        print(f"    {KIBANA_URL}/app/dashboards#/view/{db_id}\n")
    print(f"Browse all: {KIBANA_URL}/app/dashboards")


if __name__ == "__main__":
    main()
