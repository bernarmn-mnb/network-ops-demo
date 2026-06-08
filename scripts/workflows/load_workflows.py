#!/usr/bin/env python3
"""Load workflow YAML definitions into the Elastic Workflows API.

Reads all .yaml files from this directory and creates/updates them
on the configured Kibana cluster via the Workflows API.

Usage:
    python scripts/workflows/load_workflows.py              # Load all workflows
    python scripts/workflows/load_workflows.py --dry-run    # Show what would be loaded
    python scripts/workflows/load_workflows.py --delete-all # Remove all non-system workflows first
"""

import argparse
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]

load_dotenv(PROJECT_ROOT / "backend" / ".env")
secrets_env = PROJECT_ROOT / ".secrets" / "ootb-admin.env"
if secrets_env.exists():
    load_dotenv(secrets_env, override=True)

KIBANA_URL = os.getenv("KIBANA_URL", "").rstrip("/")
API_KEY = os.getenv("ADMIN_API_KEY") or os.getenv("WORKFLOWS_API_KEY") or os.getenv("ELASTIC_API_KEY")

HEADERS = {
    "Authorization": f"ApiKey {API_KEY}",
    "Content-Type": "application/json",
    "kbn-xsrf": "true",
    "x-elastic-internal-origin": "kibana",
}


def search_workflows() -> list[dict]:
    """Fetch all existing workflows from the cluster."""
    resp = requests.get(
        f"{KIBANA_URL}/api/workflows",
        headers=HEADERS,
        params={"size": 100, "page": 1},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def create_workflow(yaml_content: str, name: str) -> dict:
    """Create a new workflow from YAML."""
    resp = requests.post(
        f"{KIBANA_URL}/api/workflows",
        headers=HEADERS,
        json={"workflows": [{"name": name, "yaml": yaml_content}]},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("failed"):
        raise ValueError(f"Workflow creation failed: {data['failed']}")
    created = data.get("created", [])
    return created[0] if created else {}


def update_workflow(workflow_id: str, yaml_content: str) -> dict:
    """Update an existing workflow."""
    resp = requests.put(
        f"{KIBANA_URL}/api/workflows/workflow/{workflow_id}",
        headers=HEADERS,
        json={"yaml": yaml_content},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_workflow(workflow_id: str) -> None:
    """Delete a workflow by ID."""
    resp = requests.delete(
        f"{KIBANA_URL}/api/workflows/workflow/{workflow_id}",
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()


def extract_name_from_yaml(yaml_content: str) -> str:
    """Extract the workflow name from YAML content (simple parser)."""
    for line in yaml_content.splitlines():
        stripped = line.strip()
        if stripped.startswith("name:"):
            return stripped.split(":", 1)[1].strip().strip("'\"")
    return ""


def load_yaml_files() -> list[tuple[str, str]]:
    """Load all .yaml files from the workflows directory.

    Returns list of (filename, yaml_content) tuples.
    """
    files = sorted(SCRIPT_DIR.glob("*.yaml"))
    results = []
    for f in files:
        content = f.read_text()
        results.append((f.name, content))
    return results


def main():
    parser = argparse.ArgumentParser(description="Load workflow YAMLs to Elastic cluster")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be loaded without making changes")
    parser.add_argument("--delete-all", action="store_true", help="Delete all existing workflows before loading")
    parser.add_argument("--force", action="store_true", help="Update existing workflows with the same name")
    args = parser.parse_args()

    if not KIBANA_URL or not API_KEY:
        print("ERROR: KIBANA_URL and an API key must be set.")
        print("  Set ADMIN_API_KEY in .secrets/ootb-admin.env or WORKFLOWS_API_KEY in backend/.env")
        sys.exit(1)

    yaml_files = load_yaml_files()
    if not yaml_files:
        print("No .yaml files found in", SCRIPT_DIR)
        sys.exit(0)

    print(f"Found {len(yaml_files)} workflow file(s) in {SCRIPT_DIR}")
    for fname, _ in yaml_files:
        print(f"  - {fname}")
    print()

    # Check connectivity
    try:
        existing = search_workflows()
        print(f"Cluster has {len(existing)} existing workflow(s)")
    except Exception as e:
        print(f"ERROR: Cannot connect to Workflows API: {e}")
        print(f"  URL: {KIBANA_URL}/api/workflows/search")
        sys.exit(1)

    existing_by_name = {w["name"]: w for w in existing}

    if args.delete_all and not args.dry_run:
        print("\nDeleting all existing workflows...")
        for w in existing:
            print(f"  Deleting: {w['name']} ({w['id']})")
            delete_workflow(w["id"])
        existing_by_name = {}
        print("Done.\n")

    if args.dry_run:
        print("\n--- DRY RUN (no changes will be made) ---\n")

    created, updated, skipped = 0, 0, 0

    for fname, yaml_content in yaml_files:
        name = extract_name_from_yaml(yaml_content)
        if not name:
            print(f"  SKIP {fname}: could not extract workflow name from YAML")
            skipped += 1
            continue

        if name in existing_by_name:
            if args.force:
                wid = existing_by_name[name]["id"]
                if args.dry_run:
                    print(f"  WOULD UPDATE: {name} ({wid}) from {fname}")
                else:
                    print(f"  Updating: {name} ({wid}) from {fname}")
                    update_workflow(wid, yaml_content)
                updated += 1
            else:
                print(f"  EXISTS: {name} — skipping (use --force to update)")
                skipped += 1
        else:
            if args.dry_run:
                print(f"  WOULD CREATE: {name} from {fname}")
            else:
                print(f"  Creating: {name} from {fname}")
                result = create_workflow(yaml_content, name)
                wid = result.get("id", "unknown")
                print(f"    -> ID: {wid}")
            created += 1

    print(f"\nSummary: {created} created, {updated} updated, {skipped} skipped")

    if not args.dry_run:
        final = search_workflows()
        print(f"Cluster now has {len(final)} workflow(s):")
        for w in final:
            status = "enabled" if w.get("enabled") else "disabled"
            print(f"  - {w['name']} ({w['id']}) [{status}]")


if __name__ == "__main__":
    main()
