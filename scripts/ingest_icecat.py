#!/usr/bin/env python3
"""
Icecat product data ingestion script.

Loads NDJSON data from the Alexander Marquardt icecat-harvester
(https://github.com/alexander-marquardt/icecat-harvester) and bulk-indexes
it into Elasticsearch using the canonical product schema.

The harvester output already matches the canonical schema, so no field
transform is needed. This script adds optional parent_id for field collapse
and handles bulk indexing with retry logic.

Usage:
    # Index from local NDJSON files (produced by icecat-harvester)
    python scripts/ingest_icecat.py --input ./path/to/ndjson/dir

    # Index from GitHub sample data (auto-downloads ~50 products)
    python scripts/ingest_icecat.py --use-samples

    # Limit number of products
    python scripts/ingest_icecat.py --input ./data --limit 500

    # Filter by category
    python scripts/ingest_icecat.py --input ./data --category Laptops

    # Dry run (validate and report, no indexing)
    python scripts/ingest_icecat.py --input ./data --dry-run

    # Custom index name
    python scripts/ingest_icecat.py --input ./data --index my-products
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass


SCRIPT_DIR = Path(__file__).parent
SAMPLES_DIR = SCRIPT_DIR / "tests" / "icecat_samples"
DEFAULT_INDEX = "products-icecat"

GITHUB_API_BASE = "https://api.github.com/repos/alexander-marquardt/icecat-harvester/contents/data/sample-data"
SAMPLE_FILES = [
    "Laptops.ndjson",
    "Smartphones.ndjson",
    "TVs.ndjson",
    "Tablets.ndjson",
    "Mobile_Phones.ndjson",
    "PCs-Workstations.ndjson",
    "Mobile_Phone_Cases.ndjson",
    "Laptop_Spare_Parts.ndjson",
    "TV_Mounts_and_Stands.ndjson",
]

# Canonical product mapping (inference_id left as placeholder)
INDEX_MAPPING = {
    "settings": {
        "number_of_replicas": 1
    },
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "title": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
                "copy_to": "semantic_content"
            },
            "brand": {"type": "keyword"},
            "description": {
                "type": "text",
                "copy_to": "semantic_content"
            },
            "price": {"type": "float"},
            "currency": {"type": "keyword"},
            "image_url": {"type": "keyword", "index": False},
            "categories": {"type": "keyword"},
            "attrs": {"type": "flattened"},
            "attr_keys": {"type": "keyword"},
            "rating": {"type": "float"},
            "review_count": {"type": "integer"},
            "in_stock": {"type": "boolean"},
            "parent_id": {"type": "keyword"},
            "semantic_content": {
                "type": "semantic_text",
                "inference_id": "<YOUR_INFERENCE_ENDPOINT>"
            }
        }
    }
}


def fetch_json_api(url: str, timeout: int = 30) -> Any:
    """Fetch JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/ingest"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def download_samples(samples_dir: Path) -> int:
    """Download sample NDJSON files from GitHub. Returns count of files available."""
    samples_dir.mkdir(parents=True, exist_ok=True)
    available = 0
    for filename in SAMPLE_FILES:
        target = samples_dir / filename
        if target.exists() and target.stat().st_size > 0:
            available += 1
            continue
        url = f"{GITHUB_API_BASE}/{filename}"
        try:
            data = fetch_json_api(url)
            content = base64.b64decode(data["content"])
            target.write_bytes(content)
            available += 1
            print(f"  Downloaded {filename}")
        except Exception as e:
            print(f"  WARNING: Could not download {filename}: {e}")
    return available


def load_ndjson_dir(input_dir: Path, category_filter: str | None = None) -> list[dict]:
    """Load products from all NDJSON files in a directory."""
    products = []
    ndjson_files = sorted(input_dir.glob("*.ndjson"))
    if not ndjson_files:
        # Check subdirectories (harvester organizes by category folders)
        ndjson_files = sorted(input_dir.rglob("*.ndjson"))

    for ndjson_file in ndjson_files:
        with open(ndjson_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    product = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Apply category filter if specified
                if category_filter:
                    cats = product.get("categories", [])
                    if not any(category_filter.lower() in c.lower() for c in cats):
                        continue

                products.append(product)

    return products


def prepare_product(product: dict) -> dict:
    """Prepare a product for indexing. Adds parent_id if missing."""
    doc = dict(product)
    # Set parent_id to own id for field collapse support (no variants)
    if "parent_id" not in doc:
        doc["parent_id"] = doc.get("id", "")
    return doc


def create_index(es_url: str, api_key: str, index_name: str, mapping: dict) -> bool:
    """Create an ES index with the given mapping. Returns True on success."""
    url = f"{es_url}/{index_name}"
    body = json.dumps(mapping).encode()
    req = urllib.request.Request(url, data=body, method="PUT", headers={
        "Content-Type": "application/json",
        "Authorization": f"ApiKey {api_key}",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result.get("acknowledged", False)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        if "resource_already_exists_exception" in error_body:
            print(f"  Index '{index_name}' already exists, will append data.")
            return True
        print(f"  ERROR creating index: {e.code} {error_body}")
        return False


def bulk_index(es_url: str, api_key: str, index_name: str, products: list[dict],
               batch_size: int = 500) -> tuple[int, int]:
    """Bulk index products. Returns (success_count, error_count)."""
    success = 0
    errors = 0
    total = len(products)

    for batch_start in range(0, total, batch_size):
        batch = products[batch_start:batch_start + batch_size]
        body_lines = []
        for doc in batch:
            action = {"index": {"_index": index_name, "_id": doc.get("id", "")}}
            body_lines.append(json.dumps(action))
            body_lines.append(json.dumps(doc))
        body = "\n".join(body_lines) + "\n"

        url = f"{es_url}/_bulk"
        req = urllib.request.Request(url, data=body.encode(), method="POST", headers={
            "Content-Type": "application/x-ndjson",
            "Authorization": f"ApiKey {api_key}",
        })
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode())
                if result.get("errors"):
                    for item in result.get("items", []):
                        if "error" in item.get("index", {}):
                            errors += 1
                        else:
                            success += 1
                else:
                    success += len(batch)
        except Exception as e:
            print(f"  ERROR in bulk batch {batch_start}-{batch_start + len(batch)}: {e}")
            errors += len(batch)

        pct = min(100, (batch_start + len(batch)) / total * 100)
        print(f"  Progress: {batch_start + len(batch)}/{total} ({pct:.0f}%)")

    return success, errors


def main():
    parser = argparse.ArgumentParser(
        description="Ingest Icecat product data into Elasticsearch"
    )
    parser.add_argument("--input", type=Path,
                        help="Directory containing NDJSON files from icecat-harvester")
    parser.add_argument("--use-samples", action="store_true",
                        help="Use sample data from GitHub (auto-downloads ~50 products)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit number of products to ingest (0 = all)")
    parser.add_argument("--category", type=str, default=None,
                        help="Filter by category name (case-insensitive substring match)")
    parser.add_argument("--index", type=str, default=DEFAULT_INDEX,
                        help=f"Elasticsearch index name (default: {DEFAULT_INDEX})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Load and validate data without indexing")
    parser.add_argument("--no-create-index", action="store_true",
                        help="Skip index creation (assume it exists)")
    parser.add_argument("--batch-size", type=int, default=500,
                        help="Bulk indexing batch size (default: 500)")
    args = parser.parse_args()

    # Determine input source
    if args.use_samples:
        input_dir = SAMPLES_DIR
        if not input_dir.exists() or not list(input_dir.glob("*.ndjson")):
            print("Downloading sample data from GitHub...")
            count = download_samples(input_dir)
            if count == 0:
                print("FATAL: Could not download any sample data.")
                sys.exit(1)
            print(f"  {count} sample files available.")
    elif args.input:
        input_dir = args.input
        if not input_dir.exists():
            print(f"FATAL: Input directory does not exist: {input_dir}")
            sys.exit(1)
    else:
        print("ERROR: Specify --input <dir> or --use-samples")
        parser.print_help()
        sys.exit(1)

    # Load products
    print(f"Loading products from {input_dir}...")
    products = load_ndjson_dir(input_dir, category_filter=args.category)
    print(f"  Loaded {len(products)} products")

    if not products:
        print("No products found. Check your input directory or category filter.")
        sys.exit(1)

    # Apply limit
    if args.limit > 0 and len(products) > args.limit:
        products = products[:args.limit]
        print(f"  Limited to {len(products)} products")

    # Prepare products (add parent_id)
    products = [prepare_product(p) for p in products]

    # Report summary
    from collections import Counter
    cat_counts = Counter()
    brand_counts = Counter()
    for p in products:
        for c in p.get("categories", []):
            cat_counts[c] += 1
        brand_counts[p.get("brand", "Unknown")] += 1

    print(f"\n  Categories: {dict(cat_counts)}")
    print(f"  Brands: {len(brand_counts)} distinct")
    prices = [p["price"] for p in products if isinstance(p.get("price"), (int, float)) and p["price"] > 0]
    if prices:
        print(f"  Price range: ${min(prices):.2f} - ${max(prices):.2f}")

    if args.dry_run:
        print("\n  DRY RUN: Skipping Elasticsearch indexing.")
        print(f"  {len(products)} products ready for indexing to '{args.index}'.")

        # Print a sample
        sample = products[0]
        display = dict(sample)
        if len(display.get("description", "")) > 150:
            display["description"] = display["description"][:150] + "..."
        if len(display.get("attrs", {})) > 5:
            keys = list(display["attrs"].keys())[:5]
            display["attrs"] = {k: display["attrs"][k] for k in keys}
            display["attrs"]["..."] = f"({len(sample['attrs']) - 5} more)"
        if len(display.get("attr_keys", [])) > 5:
            display["attr_keys"] = display["attr_keys"][:5] + ["..."]
        print("\n  Sample document:")
        print(json.dumps(display, indent=2))
        sys.exit(0)

    # Check ES credentials
    es_url = os.environ.get("ELASTICSEARCH_URL", "").rstrip("/")
    api_key = os.environ.get("ELASTIC_API_KEY", "")
    if not es_url or not api_key:
        print("\nERROR: ELASTICSEARCH_URL and ELASTIC_API_KEY environment variables required.")
        print("Set them in .env or export them:")
        print("  export ELASTICSEARCH_URL='https://your-cluster.es.cloud.com'")
        print("  export ELASTIC_API_KEY='your-api-key'")
        sys.exit(1)

    # Create index
    if not args.no_create_index:
        print(f"\nCreating index '{args.index}'...")
        # Remove semantic_content field if inference endpoint is placeholder
        mapping = json.loads(json.dumps(INDEX_MAPPING))
        semantic_cfg = mapping["mappings"]["properties"].get("semantic_content", {})
        if semantic_cfg.get("inference_id", "").startswith("<"):
            print("  NOTE: Removing semantic_content field (no inference endpoint configured).")
            print("  Set a real inference_id in the mapping to enable semantic search.")
            del mapping["mappings"]["properties"]["semantic_content"]
            # Also remove copy_to references
            for field in ["title", "description"]:
                if "copy_to" in mapping["mappings"]["properties"].get(field, {}):
                    del mapping["mappings"]["properties"][field]["copy_to"]

        if not create_index(es_url, api_key, args.index, mapping):
            print("FATAL: Could not create index.")
            sys.exit(1)

    # Bulk index
    print(f"\nIndexing {len(products)} products to '{args.index}'...")
    success, errors = bulk_index(es_url, api_key, args.index, products, batch_size=args.batch_size)
    print(f"\n  Indexed: {success}")
    print(f"  Errors: {errors}")

    if errors > 0:
        print(f"\n  WARNING: {errors} documents failed to index.")
        sys.exit(1)
    else:
        print(f"\n  All {success} products indexed successfully to '{args.index}'.")
        sys.exit(0)


if __name__ == "__main__":
    main()
