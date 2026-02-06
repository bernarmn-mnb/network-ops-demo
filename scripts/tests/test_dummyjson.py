#!/usr/bin/env python3
"""
DummyJSON API validation script.

Tests https://dummyjson.com/products as an e-commerce data source:
- Response structure and field completeness
- API rate limits (sequential request bursts)
- Image URL validity (HEAD requests for 200 status)
- Category diversity
- Price distribution sanity
- Schema compatibility with this project's common schema convention

Usage:
    python scripts/tests/test_dummyjson.py
"""

import json
import statistics
import sys
import time
import urllib.request
import urllib.error
from collections import Counter
from typing import Any


API_URL = "https://dummyjson.com/products?limit=0"
SINGLE_PRODUCT_URL = "https://dummyjson.com/products/1"

# Fields expected for mapping to the project's common schema
# (see hive-mind/patterns/data/DATASET_REGISTRY.md#common-schema-convention)
REQUIRED_FIELDS = {"id", "title", "description", "price", "category", "images", "thumbnail"}
RECOMMENDED_FIELDS = {"brand", "rating", "stock", "tags", "sku"}

# Project common schema mapping:
#   DummyJSON field  ->  Common schema field
SCHEMA_MAP = {
    "id": "id",
    "title": "title",
    "brand": "brand",
    "description": "description",
    "price": "price",
    "thumbnail": "image_url",
    "category": "categories",
    "tags": "attr_keys",
}


def fetch_json(url: str, timeout: int = 30) -> Any:
    """Fetch JSON from a URL using urllib (no external deps beyond stdlib+requests)."""
    req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/test"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def check_url_alive(url: str, timeout: int = 10) -> bool:
    """HEAD-request a URL, return True if status 200."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "elastic-agent-starter/test"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

class TestReport:
    def __init__(self):
        self.sections: list[tuple[str, bool, list[str]]] = []

    def add(self, title: str, passed: bool, details: list[str]):
        self.sections.append((title, passed, details))

    def print(self):
        width = 72
        print()
        print("=" * width)
        print("  DummyJSON Validation Report")
        print("=" * width)
        passed = sum(1 for _, p, _ in self.sections if p)
        total = len(self.sections)
        for title, ok, details in self.sections:
            status = "PASS" if ok else "FAIL"
            print(f"\n[{status}] {title}")
            for line in details:
                print(f"       {line}")
        print()
        print("-" * width)
        print(f"  Result: {passed}/{total} checks passed")
        print("-" * width)
        return passed == total


def main():
    report = TestReport()

    # ------------------------------------------------------------------
    # 1. Fetch all products
    # ------------------------------------------------------------------
    print("Fetching all products from DummyJSON...")
    t0 = time.time()
    try:
        data = fetch_json(API_URL)
    except Exception as exc:
        print(f"FATAL: Could not reach DummyJSON API: {exc}")
        sys.exit(1)
    fetch_time = time.time() - t0

    products = data.get("products", [])
    total = data.get("total", 0)
    report.add(
        "API reachability & response time",
        len(products) > 0,
        [
            f"URL: {API_URL}",
            f"Reported total: {total}",
            f"Products returned: {len(products)}",
            f"Fetch time: {fetch_time:.2f}s",
        ],
    )

    if not products:
        report.print()
        sys.exit(1)

    # ------------------------------------------------------------------
    # 2. Field completeness
    # ------------------------------------------------------------------
    first = products[0]
    available_fields = set(first.keys())
    missing_required = REQUIRED_FIELDS - available_fields
    missing_recommended = RECOMMENDED_FIELDS - available_fields
    all_field_names = sorted(available_fields)

    report.add(
        "Field completeness",
        len(missing_required) == 0,
        [
            f"Available fields ({len(available_fields)}): {', '.join(all_field_names)}",
            f"Required present: {REQUIRED_FIELDS & available_fields}",
            f"Missing required: {missing_required or 'none'}",
            f"Recommended present: {RECOMMENDED_FIELDS & available_fields}",
            f"Missing recommended: {missing_recommended or 'none'}",
        ],
    )

    # ------------------------------------------------------------------
    # 3. Category diversity
    # ------------------------------------------------------------------
    categories = [p.get("category", "") for p in products]
    cat_counts = Counter(categories)
    distinct_cats = len(cat_counts)

    report.add(
        "Category diversity (need 5+)",
        distinct_cats >= 5,
        [f"Distinct categories: {distinct_cats}"]
        + [f"  {cat}: {cnt} products" for cat, cnt in cat_counts.most_common()],
    )

    # ------------------------------------------------------------------
    # 4. Price validation
    # ------------------------------------------------------------------
    prices = [p.get("price", 0) for p in products]
    zero_or_neg = [pr for pr in prices if pr <= 0]
    price_min = min(prices)
    price_max = max(prices)
    price_mean = statistics.mean(prices)
    price_median = statistics.median(prices)
    price_stdev = statistics.stdev(prices) if len(prices) > 1 else 0

    report.add(
        "Price sanity (no zero/negative)",
        len(zero_or_neg) == 0,
        [
            f"Products checked: {len(prices)}",
            f"Zero or negative prices: {len(zero_or_neg)}",
            f"Min: ${price_min:.2f}  Max: ${price_max:.2f}",
            f"Mean: ${price_mean:.2f}  Median: ${price_median:.2f}  Stdev: ${price_stdev:.2f}",
        ],
    )

    # ------------------------------------------------------------------
    # 5. Image URL validity (sample of up to 30 products)
    # ------------------------------------------------------------------
    print("Checking image URLs (HEAD requests on sample)...")
    sample_size = min(30, len(products))
    # Spread evenly across the product list
    step = max(1, len(products) // sample_size)
    sampled = products[::step][:sample_size]

    alive_count = 0
    dead_urls: list[str] = []
    for p in sampled:
        url = p.get("thumbnail", "")
        if not url:
            dead_urls.append(f"id={p['id']} (no thumbnail)")
            continue
        if check_url_alive(url):
            alive_count += 1
        else:
            dead_urls.append(f"id={p['id']} {url}")

    pct = (alive_count / sample_size * 100) if sample_size else 0
    report.add(
        "Image availability (90%+ target)",
        pct >= 90,
        [
            f"Sampled: {sample_size} products",
            f"Alive (HTTP 200): {alive_count} ({pct:.1f}%)",
            f"Dead/missing: {len(dead_urls)}",
        ]
        + ([f"  Failed: {u}" for u in dead_urls[:5]] if dead_urls else []),
    )

    # ------------------------------------------------------------------
    # 6. Rate limit test (50 sequential GETs)
    # ------------------------------------------------------------------
    print("Testing API rate limits (50 sequential requests)...")
    burst_count = 50
    latencies: list[float] = []
    errors: list[str] = []
    for i in range(burst_count):
        t1 = time.time()
        try:
            fetch_json(SINGLE_PRODUCT_URL, timeout=15)
            latencies.append(time.time() - t1)
        except Exception as exc:
            latencies.append(time.time() - t1)
            errors.append(f"Request {i+1}: {exc}")

    avg_latency = statistics.mean(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    total_time = sum(latencies)

    report.add(
        "Rate limit resilience (50 sequential requests)",
        len(errors) == 0,
        [
            f"Requests sent: {burst_count}",
            f"Errors: {len(errors)}",
            f"Total time: {total_time:.2f}s",
            f"Avg latency: {avg_latency*1000:.0f}ms  Max: {max_latency*1000:.0f}ms",
        ]
        + ([f"  {e}" for e in errors[:5]] if errors else []),
    )

    # ------------------------------------------------------------------
    # 7. Schema compatibility with project common schema
    # ------------------------------------------------------------------
    sample = products[0]
    compat_issues: list[str] = []

    # id should be convertible to string
    if not isinstance(sample.get("id"), (int, str)):
        compat_issues.append("id is not int or string")

    # title, description should be strings
    for f in ("title", "description"):
        if not isinstance(sample.get(f), str):
            compat_issues.append(f"{f} is not a string")

    # price should be numeric
    if not isinstance(sample.get("price"), (int, float)):
        compat_issues.append("price is not numeric")

    # category is a single string (project expects array)
    cat_val = sample.get("category")
    if isinstance(cat_val, str):
        compat_issues.append(
            "category is a single string; project schema expects array 'categories' -- wrap in list during ingestion"
        )

    # images is an array of URLs
    imgs = sample.get("images", [])
    if not isinstance(imgs, list) or not all(isinstance(u, str) for u in imgs):
        compat_issues.append("images is not an array of strings")

    # thumbnail is a string URL
    if not isinstance(sample.get("thumbnail"), str):
        compat_issues.append("thumbnail is not a string")

    # tags -> attr_keys mapping
    tags_val = sample.get("tags", [])
    if not isinstance(tags_val, list):
        compat_issues.append("tags is not a list")

    report.add(
        "Schema compatibility with project common schema",
        len(compat_issues) <= 2,  # minor transform notes are OK
        [f"DummyJSON field -> project field mapping:"]
        + [f"  {src} -> {dst}" for src, dst in SCHEMA_MAP.items()]
        + (["Notes:"] + [f"  - {i}" for i in compat_issues] if compat_issues else ["No issues"]),
    )

    # ------------------------------------------------------------------
    # 8. Variant/expansion pattern compatibility
    # ------------------------------------------------------------------
    # The project uses field collapse on parent_id for variant grouping.
    # DummyJSON does NOT have a parent_id or variant relationship,
    # so each product is standalone. Document this limitation.
    has_parent_id = "parentId" in available_fields or "parent_id" in available_fields
    has_variants_field = "variants" in available_fields
    # Check if tags or meta could serve as grouping key
    meta_val = sample.get("meta", {})
    has_barcode = isinstance(meta_val, dict) and "barcode" in meta_val

    expansion_details = [
        f"Has parent_id/parentId field: {has_parent_id}",
        f"Has variants field: {has_variants_field}",
        f"Has meta.barcode: {has_barcode}",
        f"Tags example: {sample.get('tags', [])}",
    ]
    if not has_parent_id and not has_variants_field:
        expansion_details.append(
            "NOTE: DummyJSON products are standalone -- no built-in variant grouping."
        )
        expansion_details.append(
            "For color/size expansion, generate variants during ingestion by duplicating"
        )
        expansion_details.append(
            "products with modified attributes (color, size) and a shared parent_id."
        )

    report.add(
        "Variant/expansion pattern compatibility",
        True,  # informational -- no hard fail
        expansion_details,
    )

    # ------------------------------------------------------------------
    # 9. Caching strategy recommendation
    # ------------------------------------------------------------------
    report.add(
        "Caching strategy recommendation",
        True,
        [
            "DummyJSON data is static (same products every call).",
            "Recommended: cache the full response to a local JSON file.",
            "  1. On first run: fetch from API, save to backend/data/dummyjson_cache.json",
            "  2. On subsequent runs: load from cache if file exists and is < 24h old",
            "  3. Add --refresh flag to force re-fetch",
            "  4. Cache file should be gitignored (generated data)",
            f"Payload size: ~{len(json.dumps(products))//1024} KB for {len(products)} products",
        ],
    )

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    all_passed = report.print()

    # ------------------------------------------------------------------
    # Print a sample transformed product for reference
    # ------------------------------------------------------------------
    sample_p = products[0]
    transformed = {
        "id": str(sample_p["id"]),
        "title": sample_p["title"],
        "brand": sample_p.get("brand", ""),
        "description": sample_p.get("description", ""),
        "price": sample_p["price"],
        "currency": "USD",
        "image_url": sample_p.get("thumbnail", ""),
        "categories": [sample_p.get("category", "")],
        "attrs": {
            "rating": sample_p.get("rating"),
            "stock": sample_p.get("stock"),
            "sku": sample_p.get("sku", ""),
            "weight": sample_p.get("weight"),
            "warrantyInformation": sample_p.get("warrantyInformation", ""),
            "shippingInformation": sample_p.get("shippingInformation", ""),
        },
        "attr_keys": list(sample_p.get("tags", [])),
    }
    print("\nSample transformed product (DummyJSON -> common schema):")
    print(json.dumps(transformed, indent=2))

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
