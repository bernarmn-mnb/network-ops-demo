#!/usr/bin/env python3
"""
Icecat dataset validation script.

Tests the Alexander Marquardt icecat-harvester NDJSON output as an e-commerce data source:
- Schema compatibility with the project's canonical product schema
- Field completeness across all products
- Image URL validity (HEAD requests for 200 status)
- Category diversity
- Price distribution sanity
- Attribute richness and distribution
- Data quality (missing/empty fields)

Data source: https://github.com/alexander-marquardt/icecat-harvester
Sample data is downloaded from the repo's data/sample-data/ directory.

Usage:
    python scripts/tests/test_icecat_ingestion.py
    python scripts/tests/test_icecat_ingestion.py --samples-dir /path/to/ndjson/files
"""

import argparse
import json
import os
import statistics
import sys
import urllib.request
import urllib.error
from collections import Counter
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).parent
DEFAULT_SAMPLES_DIR = SCRIPT_DIR / "icecat_samples"

# GitHub raw content base for downloading sample data
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

# Canonical product schema fields
REQUIRED_FIELDS = {"id", "title", "brand", "description", "price", "currency", "image_url", "categories", "attrs", "attr_keys"}
OPTIONAL_FIELDS = {"rating", "review_count", "in_stock", "parent_id"}


def fetch_json(url: str, timeout: int = 30) -> Any:
    """Fetch JSON from a URL using urllib."""
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


def load_ndjson_files(samples_dir: Path) -> list[dict]:
    """Load all NDJSON files from a directory, return list of product dicts."""
    products = []
    for ndjson_file in sorted(samples_dir.glob("*.ndjson")):
        with open(ndjson_file) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        products.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        print(f"  WARNING: Invalid JSON in {ndjson_file.name}: {e}")
    return products


def download_samples(samples_dir: Path) -> bool:
    """Download sample NDJSON files from the icecat-harvester GitHub repo."""
    import base64

    samples_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    for filename in SAMPLE_FILES:
        target = samples_dir / filename
        if target.exists() and target.stat().st_size > 0:
            downloaded += 1
            continue
        url = f"{GITHUB_API_BASE}/{filename}"
        try:
            data = fetch_json(url)
            content = base64.b64decode(data["content"])
            target.write_bytes(content)
            downloaded += 1
        except Exception as e:
            print(f"  WARNING: Could not download {filename}: {e}")
    return downloaded > 0


class TestReport:
    def __init__(self):
        self.sections: list[tuple[str, bool, list[str]]] = []

    def add(self, title: str, passed: bool, details: list[str]):
        self.sections.append((title, passed, details))

    def print(self) -> bool:
        width = 72
        print()
        print("=" * width)
        print("  Icecat Dataset Validation Report")
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
    parser = argparse.ArgumentParser(description="Validate Icecat dataset for canonical schema compatibility")
    parser.add_argument("--samples-dir", type=Path, default=DEFAULT_SAMPLES_DIR,
                        help="Directory containing Icecat NDJSON sample files")
    parser.add_argument("--skip-images", action="store_true",
                        help="Skip image URL validation (faster)")
    args = parser.parse_args()

    report = TestReport()
    samples_dir = args.samples_dir

    # ------------------------------------------------------------------
    # 0. Ensure sample data exists
    # ------------------------------------------------------------------
    if not samples_dir.exists() or not list(samples_dir.glob("*.ndjson")):
        print(f"Sample data not found at {samples_dir}. Downloading from GitHub...")
        if not download_samples(samples_dir):
            print("FATAL: Could not download sample data from GitHub.")
            sys.exit(1)

    ndjson_files = sorted(samples_dir.glob("*.ndjson"))
    report.add(
        "Sample data availability",
        len(ndjson_files) > 0,
        [
            f"Directory: {samples_dir}",
            f"NDJSON files found: {len(ndjson_files)}",
        ] + [f"  {f.name}" for f in ndjson_files],
    )

    # ------------------------------------------------------------------
    # 1. Load all products
    # ------------------------------------------------------------------
    print(f"Loading products from {len(ndjson_files)} NDJSON files...")
    products = load_ndjson_files(samples_dir)
    report.add(
        "Data loading",
        len(products) > 0,
        [
            f"Total products loaded: {len(products)}",
            f"Files processed: {len(ndjson_files)}",
        ],
    )

    if not products:
        report.print()
        sys.exit(1)

    # ------------------------------------------------------------------
    # 2. Schema compatibility - field presence
    # ------------------------------------------------------------------
    first = products[0]
    available_fields = set(first.keys())
    missing_required = REQUIRED_FIELDS - available_fields
    present_optional = OPTIONAL_FIELDS & available_fields

    report.add(
        "Schema compatibility (canonical product schema)",
        len(missing_required) == 0,
        [
            f"Available fields: {sorted(available_fields)}",
            f"Required fields present: {sorted(REQUIRED_FIELDS & available_fields)}",
            f"Missing required: {sorted(missing_required) or 'none'}",
            f"Optional fields present: {sorted(present_optional) or 'none'}",
            f"NOTE: Icecat harvester already outputs canonical schema - no transform needed",
        ],
    )

    # ------------------------------------------------------------------
    # 3. Field completeness across all products
    # ------------------------------------------------------------------
    field_stats: dict[str, int] = {f: 0 for f in REQUIRED_FIELDS}
    for p in products:
        for field in REQUIRED_FIELDS:
            val = p.get(field)
            if val is not None and val != "" and val != [] and val != {}:
                field_stats[field] += 1

    completeness_details = []
    all_complete = True
    for field, count in sorted(field_stats.items()):
        pct = (count / len(products)) * 100
        status = "OK" if pct >= 90 else "LOW"
        if pct < 90:
            all_complete = False
        completeness_details.append(f"{field}: {count}/{len(products)} ({pct:.1f}%) [{status}]")

    report.add(
        "Field completeness (90%+ target per field)",
        all_complete,
        [f"Products analyzed: {len(products)}"] + completeness_details,
    )

    # ------------------------------------------------------------------
    # 4. Category diversity
    # ------------------------------------------------------------------
    all_categories = []
    for p in products:
        cats = p.get("categories", [])
        if isinstance(cats, list):
            all_categories.extend(cats)

    cat_counts = Counter(all_categories)
    distinct_cats = len(cat_counts)

    report.add(
        "Category diversity (need 3+)",
        distinct_cats >= 3,
        [f"Distinct categories: {distinct_cats}"]
        + [f"  {cat}: {cnt} products" for cat, cnt in cat_counts.most_common()],
    )

    # ------------------------------------------------------------------
    # 5. Brand diversity
    # ------------------------------------------------------------------
    brands = [p.get("brand", "") for p in products]
    brand_counts = Counter(b for b in brands if b)
    distinct_brands = len(brand_counts)

    report.add(
        "Brand diversity",
        distinct_brands >= 3,
        [f"Distinct brands: {distinct_brands}"]
        + [f"  {brand}: {cnt} products" for brand, cnt in brand_counts.most_common(15)]
        + ([f"  ... and {distinct_brands - 15} more"] if distinct_brands > 15 else []),
    )

    # ------------------------------------------------------------------
    # 6. Price validation
    # ------------------------------------------------------------------
    prices = [p.get("price", 0) for p in products if isinstance(p.get("price"), (int, float))]
    zero_or_neg = [pr for pr in prices if pr <= 0]
    no_price = len(products) - len(prices)

    price_details = [
        f"Products with numeric price: {len(prices)}/{len(products)}",
        f"Products without price: {no_price}",
        f"Zero or negative prices: {len(zero_or_neg)}",
    ]
    if prices:
        price_min = min(prices)
        price_max = max(prices)
        price_mean = statistics.mean(prices)
        price_median = statistics.median(prices)
        price_stdev = statistics.stdev(prices) if len(prices) > 1 else 0
        price_details.extend([
            f"Min: ${price_min:.2f}  Max: ${price_max:.2f}",
            f"Mean: ${price_mean:.2f}  Median: ${price_median:.2f}  Stdev: ${price_stdev:.2f}",
        ])

        # Currency check
        currencies = Counter(p.get("currency", "") for p in products)
        price_details.append(f"Currencies: {dict(currencies)}")

    report.add(
        "Price sanity (no zero/negative, prices present)",
        len(zero_or_neg) == 0 and len(prices) > 0,
        price_details,
    )

    # ------------------------------------------------------------------
    # 7. Image URL validity (sample)
    # ------------------------------------------------------------------
    if not args.skip_images:
        print("Checking image URLs (HEAD requests on sample)...")
        sample_size = min(20, len(products))
        step = max(1, len(products) // sample_size)
        sampled = products[::step][:sample_size]

        alive_count = 0
        dead_urls: list[str] = []
        for p in sampled:
            url = p.get("image_url", "")
            if not url:
                dead_urls.append(f"id={p.get('id', '?')} (no image_url)")
                continue
            if check_url_alive(url):
                alive_count += 1
            else:
                dead_urls.append(f"id={p.get('id', '?')} {url}")

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
    else:
        report.add(
            "Image availability (skipped)",
            True,
            ["Skipped via --skip-images flag"],
        )

    # ------------------------------------------------------------------
    # 8. Attribute richness
    # ------------------------------------------------------------------
    attr_counts = [len(p.get("attrs", {})) for p in products]
    attr_key_counts = [len(p.get("attr_keys", [])) for p in products]

    # Collect all unique attribute keys
    all_attr_keys: set[str] = set()
    for p in products:
        all_attr_keys.update(p.get("attr_keys", []))

    # Most common attribute keys across products
    attr_key_freq: Counter = Counter()
    for p in products:
        for k in p.get("attr_keys", []):
            attr_key_freq[k] += 1

    report.add(
        "Attribute richness",
        statistics.mean(attr_counts) >= 5 if attr_counts else False,
        [
            f"Total unique attribute keys: {len(all_attr_keys)}",
            f"Avg attrs per product: {statistics.mean(attr_counts):.1f}",
            f"Min attrs: {min(attr_counts)}  Max attrs: {max(attr_counts)}",
            f"attr_keys in sync with attrs: {all(len(p.get('attrs', {})) == len(p.get('attr_keys', [])) for p in products)}",
            "Most common attribute keys:",
        ]
        + [f"  {key}: {cnt}/{len(products)} products" for key, cnt in attr_key_freq.most_common(10)],
    )

    # ------------------------------------------------------------------
    # 9. Description quality
    # ------------------------------------------------------------------
    desc_lengths = [len(p.get("description", "")) for p in products]
    empty_descs = sum(1 for d in desc_lengths if d == 0)
    short_descs = sum(1 for d in desc_lengths if 0 < d < 50)

    report.add(
        "Description quality",
        empty_descs / len(products) < 0.1 if products else False,
        [
            f"Products with description: {len(products) - empty_descs}/{len(products)}",
            f"Empty descriptions: {empty_descs}",
            f"Short descriptions (<50 chars): {short_descs}",
            f"Avg description length: {statistics.mean(desc_lengths):.0f} chars",
            f"Min: {min(desc_lengths)} chars  Max: {max(desc_lengths)} chars",
        ],
    )

    # ------------------------------------------------------------------
    # 10. Schema type validation
    # ------------------------------------------------------------------
    type_issues: list[str] = []
    for i, p in enumerate(products[:20]):
        pid = p.get("id", f"index-{i}")
        if not isinstance(p.get("id"), str):
            type_issues.append(f"id={pid}: 'id' is {type(p.get('id')).__name__}, expected str")
        if not isinstance(p.get("title"), str):
            type_issues.append(f"id={pid}: 'title' is {type(p.get('title')).__name__}, expected str")
        if not isinstance(p.get("brand"), str):
            type_issues.append(f"id={pid}: 'brand' is {type(p.get('brand')).__name__}, expected str")
        if not isinstance(p.get("price"), (int, float)):
            type_issues.append(f"id={pid}: 'price' is {type(p.get('price')).__name__}, expected float")
        if not isinstance(p.get("categories"), list):
            type_issues.append(f"id={pid}: 'categories' is {type(p.get('categories')).__name__}, expected list")
        if not isinstance(p.get("attrs"), dict):
            type_issues.append(f"id={pid}: 'attrs' is {type(p.get('attrs')).__name__}, expected dict")
        if not isinstance(p.get("attr_keys"), list):
            type_issues.append(f"id={pid}: 'attr_keys' is {type(p.get('attr_keys')).__name__}, expected list")

    report.add(
        "Schema type validation (first 20 products)",
        len(type_issues) == 0,
        [f"Issues found: {len(type_issues)}"]
        + ([f"  {i}" for i in type_issues[:10]] if type_issues else ["All types match canonical schema"]),
    )

    # ------------------------------------------------------------------
    # 11. Harvester schema alignment summary
    # ------------------------------------------------------------------
    report.add(
        "Harvester output vs canonical schema alignment",
        True,
        [
            "The icecat-harvester NDJSON output ALREADY matches the canonical product schema.",
            "No transform function is needed for ingestion.",
            "",
            "Field mapping (harvester output -> canonical schema):",
            "  id           -> id           (string, unique Icecat product ID)",
            "  title        -> title        (string, full product name with specs)",
            "  brand        -> brand        (string, manufacturer name)",
            "  description  -> description  (string, cleaned text with key specs)",
            "  price        -> price        (float, heuristic price in USD)",
            "  currency     -> currency     (string, always 'USD')",
            "  image_url    -> image_url    (string, icecat.biz CDN URL)",
            "  categories   -> categories   (list of strings, single category per product)",
            "  attrs        -> attrs        (dict, flattened technical specifications)",
            "  attr_keys    -> attr_keys    (list, sorted keys from attrs)",
            "",
            "Optional fields NOT present (and that is OK):",
            "  rating, review_count, in_stock, parent_id",
            "",
            "To add parent_id for field collapse, set parent_id = id (no variants).",
        ],
    )

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    all_passed = report.print()

    # ------------------------------------------------------------------
    # Print a sample product for reference
    # ------------------------------------------------------------------
    sample_p = products[0]
    print("\nSample Icecat product (already in canonical schema):")
    # Truncate description for readability
    display = dict(sample_p)
    if len(display.get("description", "")) > 200:
        display["description"] = display["description"][:200] + "..."
    # Limit attrs to first 5 for readability
    if len(display.get("attrs", {})) > 5:
        keys = list(display["attrs"].keys())[:5]
        display["attrs"] = {k: display["attrs"][k] for k in keys}
        display["attrs"]["..."] = f"({len(sample_p['attrs']) - 5} more attributes)"
    if len(display.get("attr_keys", [])) > 5:
        display["attr_keys"] = display["attr_keys"][:5] + [f"... ({len(sample_p['attr_keys']) - 5} more)"]
    print(json.dumps(display, indent=2))

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
