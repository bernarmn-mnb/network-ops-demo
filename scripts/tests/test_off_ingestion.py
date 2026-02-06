#!/usr/bin/env python3
"""
Open Food Facts (OFF) validation script.

Tests the OFF API and data quality for e-commerce demo use:
- API reachability and response structure
- Field completeness percentages across a sample
- Image URL validity (HEAD requests)
- Category hierarchy depth and diversity
- Nutrition data availability
- Price absence documentation (OFF lacks pricing)
- Schema compatibility with this project's canonical product schema
- Dietary tag extraction (vegan, vegetarian, gluten-free)

Usage:
    python scripts/tests/test_off_ingestion.py
    python scripts/tests/test_off_ingestion.py --sample-size 50
    python scripts/tests/test_off_ingestion.py --category "olive-oils"
"""

import argparse
import json
import statistics
import sys
import time
import urllib.request
import urllib.error
from collections import Counter
from typing import Any


# OFF API v2 search endpoint
BASE_API = "https://world.openfoodfacts.org/api/v2/search"

# Fields to request from the API
API_FIELDS = [
    "code", "product_name", "product_name_en", "brands",
    "categories_hierarchy", "categories_tags",
    "image_front_url", "image_url",
    "nutriments", "nutrition_grades", "nutriscore_grade",
    "labels_tags", "labels_hierarchy",
    "serving_size", "quantity",
    "countries_tags", "ingredients_text", "ingredients_text_en",
    "nova_group", "completeness",
]

# Canonical schema required fields
CANONICAL_REQUIRED = {"id", "title", "brand", "description", "price", "currency",
                      "image_url", "categories", "attrs", "attr_keys"}

# OFF field -> canonical field mapping
SCHEMA_MAP = {
    "code": "id",
    "product_name / product_name_en": "title",
    "brands": "brand",
    "(synthesized)": "description",
    "(synthetic pricing)": "price",
    "(hardcoded EUR)": "currency",
    "image_front_url": "image_url",
    "categories_hierarchy": "categories",
    "nutriments + labels_tags": "attrs",
    "(derived from attrs)": "attr_keys",
}


def fetch_json(url: str, timeout: int = 30) -> Any:
    """Fetch JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/test"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def check_url_alive(url: str, timeout: int = 10) -> bool:
    """HEAD-request a URL, return True if status 200."""
    req = urllib.request.Request(url, method="HEAD",
                                headers={"User-Agent": "elastic-agent-starter/test"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def get_product_name(product: dict) -> str:
    """Extract the best available English product name."""
    return (product.get("product_name_en") or product.get("product_name") or "").strip()


def extract_nutrition_attrs(product: dict) -> dict:
    """Extract nutrition facts as flat attrs dict."""
    attrs = {}
    nutriments = product.get("nutriments", {})

    nutrient_map = {
        "Energy (kcal/100g)": "energy-kcal_100g",
        "Fat (g/100g)": "fat_100g",
        "Saturated fat (g/100g)": "saturated-fat_100g",
        "Carbohydrates (g/100g)": "carbohydrates_100g",
        "Sugars (g/100g)": "sugars_100g",
        "Proteins (g/100g)": "proteins_100g",
        "Salt (g/100g)": "salt_100g",
        "Fiber (g/100g)": "fiber_100g",
    }

    for label, key in nutrient_map.items():
        val = nutriments.get(key)
        if val is not None:
            attrs[label] = str(round(val, 2))

    # Nutri-Score
    grade = product.get("nutriscore_grade") or product.get("nutrition_grades")
    if grade and grade != "unknown":
        attrs["Nutri-Score"] = grade.upper()

    # NOVA group
    nova = product.get("nova_group")
    if nova:
        attrs["NOVA group"] = str(nova)

    # Serving size
    serving = product.get("serving_size")
    if serving:
        attrs["Serving size"] = serving

    # Quantity
    quantity = product.get("quantity")
    if quantity:
        attrs["Quantity"] = quantity

    return attrs


def extract_dietary_tags(product: dict) -> list:
    """Extract dietary restriction tags from labels."""
    labels = product.get("labels_tags", [])
    dietary_keywords = {
        "en:vegan": "vegan",
        "en:vegetarian": "vegetarian",
        "en:no-gluten": "gluten-free",
        "en:organic": "organic",
        "en:no-lactose": "lactose-free",
        "en:halal": "halal",
        "en:kosher": "kosher",
        "en:palm-oil-free": "palm-oil-free",
        "en:no-preservatives": "no-preservatives",
    }
    found = []
    for label in labels:
        tag = dietary_keywords.get(label)
        if tag:
            found.append(tag)
    return found


def parse_categories(hierarchy: list) -> list:
    """Clean category hierarchy for canonical schema."""
    cleaned = []
    for cat in hierarchy:
        # Remove language prefix like "en:"
        name = cat.split(":", 1)[-1] if ":" in cat else cat
        # Convert hyphens to spaces and title-case
        name = name.replace("-", " ").strip().title()
        if name:
            cleaned.append(name)
    return cleaned


def transform_off(raw: dict) -> dict:
    """Transform a raw OFF product to canonical schema."""
    name = get_product_name(raw)
    brand = (raw.get("brands") or "Unknown").split(",")[0].strip()
    categories = parse_categories(raw.get("categories_hierarchy", []))
    attrs = extract_nutrition_attrs(raw)
    dietary = extract_dietary_tags(raw)

    if dietary:
        attrs["Dietary restrictions"] = ", ".join(dietary)

    # Build description from available text
    desc_parts = []
    if name:
        desc_parts.append(name)
    if brand and brand != "Unknown":
        desc_parts.append(f"by {brand}")
    ingredients = (raw.get("ingredients_text_en") or raw.get("ingredients_text") or "").strip()
    if ingredients:
        desc_parts.append(f"Ingredients: {ingredients[:200]}")
    if categories:
        desc_parts.append(f"Category: {' > '.join(categories)}")

    description = ". ".join(desc_parts) + "." if desc_parts else ""

    return {
        "id": str(raw.get("code", "")),
        "title": name,
        "brand": brand,
        "description": description,
        "price": 0.0,  # OFF has no pricing data; use synthetic pricing in production
        "currency": "EUR",
        "image_url": raw.get("image_front_url") or raw.get("image_url") or "",
        "categories": categories if categories else ["Uncategorized"],
        "attrs": attrs,
        "attr_keys": list(attrs.keys()),
    }


class TestReport:
    def __init__(self):
        self.sections: list[tuple[str, bool, list[str]]] = []

    def add(self, title: str, passed: bool, details: list[str]):
        self.sections.append((title, passed, details))

    def print(self):
        width = 72
        print()
        print("=" * width)
        print("  Open Food Facts Validation Report")
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
    parser = argparse.ArgumentParser(description="Validate Open Food Facts as e-commerce data source")
    parser.add_argument("--sample-size", type=int, default=50,
                        help="Number of products to fetch for testing (default: 50)")
    parser.add_argument("--category", type=str, default=None,
                        help="Filter by OFF category tag (e.g., 'olive-oils', 'breakfast-cereals')")
    args = parser.parse_args()

    report = TestReport()
    sample_size = args.sample_size

    # ------------------------------------------------------------------
    # 1. API reachability
    # ------------------------------------------------------------------
    fields_param = ",".join(API_FIELDS)
    url = f"{BASE_API}?fields={fields_param}&page_size={sample_size}&json=1"
    if args.category:
        url += f"&categories_tags_en={args.category}"

    print(f"Fetching {sample_size} products from Open Food Facts API...")
    if args.category:
        print(f"  Category filter: {args.category}")

    t0 = time.time()
    try:
        data = fetch_json(url, timeout=60)
    except Exception as exc:
        print(f"FATAL: Could not reach OFF API: {exc}")
        sys.exit(1)
    fetch_time = time.time() - t0

    products = data.get("products", [])
    total_count = data.get("count", 0)
    report.add(
        "API reachability & response",
        len(products) > 0,
        [
            f"URL: {url[:120]}...",
            f"Total matching products: {total_count:,}",
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
    field_presence = Counter()
    for p in products:
        name = get_product_name(p)
        if name:
            field_presence["product_name (English)"] += 1
        if p.get("brands"):
            field_presence["brands"] += 1
        if p.get("image_front_url"):
            field_presence["image_front_url"] += 1
        if p.get("categories_hierarchy"):
            field_presence["categories_hierarchy"] += 1
        if p.get("nutriments"):
            field_presence["nutriments"] += 1
        nutr = p.get("nutriments", {})
        if nutr.get("energy-kcal_100g") is not None:
            field_presence["energy-kcal_100g"] += 1
        if nutr.get("fat_100g") is not None:
            field_presence["fat_100g"] += 1
        if nutr.get("proteins_100g") is not None:
            field_presence["proteins_100g"] += 1
        if p.get("nutrition_grades") and p["nutrition_grades"] != "unknown":
            field_presence["nutrition_grades"] += 1
        if p.get("labels_tags"):
            field_presence["labels_tags"] += 1
        if p.get("serving_size"):
            field_presence["serving_size"] += 1
        if p.get("quantity"):
            field_presence["quantity"] += 1
        if p.get("ingredients_text") or p.get("ingredients_text_en"):
            field_presence["ingredients_text"] += 1
        if p.get("nova_group"):
            field_presence["nova_group"] += 1

    n = len(products)
    completeness_details = []
    for field in ["product_name (English)", "brands", "image_front_url",
                  "categories_hierarchy", "nutriments", "energy-kcal_100g",
                  "fat_100g", "proteins_100g", "nutrition_grades",
                  "labels_tags", "serving_size", "quantity",
                  "ingredients_text", "nova_group"]:
        count = field_presence.get(field, 0)
        pct = count / n * 100
        bar = "#" * int(pct / 5) + "-" * (20 - int(pct / 5))
        completeness_details.append(f"{field:30s} [{bar}] {pct:5.1f}% ({count}/{n})")

    # Pass if product_name and image are present on >50% of products
    name_pct = field_presence.get("product_name (English)", 0) / n * 100
    image_pct = field_presence.get("image_front_url", 0) / n * 100

    report.add(
        "Field completeness",
        name_pct > 50 and image_pct > 50,
        completeness_details,
    )

    # ------------------------------------------------------------------
    # 3. Price absence documentation
    # ------------------------------------------------------------------
    report.add(
        "Price data availability",
        True,  # informational - expected to be absent
        [
            "Open Food Facts does NOT include pricing data.",
            "This is a known limitation of the dataset.",
            "Solutions:",
            "  1. Use the off-extractor's synthetic pricing (pricing_buckets.json)",
            "     - Category-based price estimation with configurable medians",
            "     - Deterministic per-product for reproducibility",
            "  2. Set price=0.0 and currency='EUR' as placeholder",
            "  3. Cross-reference with a pricing API for real prices",
            "The off-extractor tool generates synthetic prices using:",
            "  - Category-aware median unit prices (e.g. $26/L for olive oil)",
            "  - Product quantity parsing for per-unit calculation",
            "  - Gaussian noise (sigma) for realistic price variance",
        ],
    )

    # ------------------------------------------------------------------
    # 4. Category diversity and hierarchy
    # ------------------------------------------------------------------
    all_categories = []
    hierarchy_depths = []
    for p in products:
        hier = p.get("categories_hierarchy", [])
        if hier:
            hierarchy_depths.append(len(hier))
            parsed = parse_categories(hier)
            all_categories.extend(parsed)

    top_level_cats = Counter()
    for p in products:
        hier = p.get("categories_hierarchy", [])
        if hier:
            top = parse_categories([hier[0]])[0] if hier else "Unknown"
            top_level_cats[top] += 1

    distinct_cats = len(set(all_categories))
    avg_depth = statistics.mean(hierarchy_depths) if hierarchy_depths else 0
    max_depth = max(hierarchy_depths) if hierarchy_depths else 0

    cat_details = [
        f"Distinct category values: {distinct_cats}",
        f"Top-level categories: {len(top_level_cats)}",
        f"Avg hierarchy depth: {avg_depth:.1f}  Max: {max_depth}",
        f"Products with categories: {len(hierarchy_depths)}/{n}",
        "",
        "Top-level distribution:",
    ]
    for cat, cnt in top_level_cats.most_common(15):
        cat_details.append(f"  {cat}: {cnt} products")
    if len(top_level_cats) > 15:
        cat_details.append(f"  ... and {len(top_level_cats) - 15} more")

    report.add(
        "Category diversity (need 5+ top-level)",
        len(top_level_cats) >= 5,
        cat_details,
    )

    # ------------------------------------------------------------------
    # 5. Nutrition data quality
    # ------------------------------------------------------------------
    nutrient_keys = ["energy-kcal_100g", "fat_100g", "saturated-fat_100g",
                     "carbohydrates_100g", "sugars_100g", "proteins_100g",
                     "salt_100g", "fiber_100g"]
    nutrient_coverage = {}
    for key in nutrient_keys:
        count = sum(1 for p in products
                    if p.get("nutriments", {}).get(key) is not None)
        nutrient_coverage[key] = count

    nutri_details = ["Per-100g nutrient coverage:"]
    for key in nutrient_keys:
        count = nutrient_coverage[key]
        pct = count / n * 100
        nutri_details.append(f"  {key:30s} {pct:5.1f}% ({count}/{n})")

    # Check Nutri-Score coverage
    nutriscore_count = sum(1 for p in products
                          if (p.get("nutriscore_grade") or p.get("nutrition_grades", "unknown")) != "unknown")
    nutri_details.append(f"  {'Nutri-Score grade':30s} {nutriscore_count/n*100:5.1f}% ({nutriscore_count}/{n})")

    # At least energy should be present on >30% for reasonable quality
    energy_pct = nutrient_coverage.get("energy-kcal_100g", 0) / n * 100
    report.add(
        "Nutrition data quality",
        energy_pct > 30,
        nutri_details,
    )

    # ------------------------------------------------------------------
    # 6. Image URL validity (sample)
    # ------------------------------------------------------------------
    print("Checking image URLs (HEAD requests on sample)...")
    image_sample_size = min(20, len(products))
    step = max(1, len(products) // image_sample_size)
    sampled = products[::step][:image_sample_size]

    alive_count = 0
    dead_urls = []
    no_image = 0
    for p in sampled:
        url_img = p.get("image_front_url", "")
        if not url_img:
            no_image += 1
            continue
        if check_url_alive(url_img):
            alive_count += 1
        else:
            dead_urls.append(f"code={p.get('code', '?')} {url_img[:80]}")

    with_image = image_sample_size - no_image
    pct = (alive_count / with_image * 100) if with_image else 0

    report.add(
        "Image availability (80%+ target for products with images)",
        pct >= 80,
        [
            f"Sampled: {image_sample_size} products",
            f"Without image URL: {no_image}",
            f"With image URL: {with_image}",
            f"Image alive (HTTP 200): {alive_count} ({pct:.1f}%)",
            f"Dead/broken: {len(dead_urls)}",
        ]
        + ([f"  Failed: {u}" for u in dead_urls[:5]] if dead_urls else []),
    )

    # ------------------------------------------------------------------
    # 7. Dietary tag extraction
    # ------------------------------------------------------------------
    dietary_counter = Counter()
    products_with_dietary = 0
    for p in products:
        tags = extract_dietary_tags(p)
        if tags:
            products_with_dietary += 1
            for t in tags:
                dietary_counter[t] += 1

    dietary_details = [
        f"Products with dietary tags: {products_with_dietary}/{n} ({products_with_dietary/n*100:.1f}%)",
        "",
        "Dietary tag distribution:",
    ]
    for tag, cnt in dietary_counter.most_common():
        dietary_details.append(f"  {tag}: {cnt} products")
    if not dietary_counter:
        dietary_details.append("  (none found in this sample)")

    report.add(
        "Dietary tag extraction",
        True,  # informational
        dietary_details,
    )

    # ------------------------------------------------------------------
    # 8. Schema compatibility
    # ------------------------------------------------------------------
    sample = products[0]
    transformed = transform_off(sample)

    compat_issues = []

    # Check all canonical required fields are present
    for field in CANONICAL_REQUIRED:
        val = transformed.get(field)
        if val is None or val == "":
            if field == "price":
                compat_issues.append(
                    "price is always 0.0 -- OFF lacks pricing; must use synthetic pricing in production"
                )
            elif field == "description" and not transformed.get("description"):
                compat_issues.append(
                    "description may be empty if no ingredients text available -- synthesize from other fields"
                )
            else:
                compat_issues.append(f"{field} is empty or missing")

    # Categories should be an array
    cats = transformed.get("categories", [])
    if not isinstance(cats, list):
        compat_issues.append("categories is not a list")
    elif len(cats) == 0:
        compat_issues.append("categories is empty")

    # attrs should be a dict
    if not isinstance(transformed.get("attrs"), dict):
        compat_issues.append("attrs is not a dict")

    report.add(
        "Schema compatibility with canonical product schema",
        len([i for i in compat_issues if "price" not in i]) <= 1,
        ["OFF field -> canonical field mapping:"]
        + [f"  {src:40s} -> {dst}" for src, dst in SCHEMA_MAP.items()]
        + (["", "Compatibility notes:"] + [f"  - {i}" for i in compat_issues] if compat_issues else ["", "No issues"]),
    )

    # ------------------------------------------------------------------
    # 9. Data volume assessment
    # ------------------------------------------------------------------
    report.add(
        "Data volume assessment",
        True,
        [
            f"Total products in OFF database: ~4,200,000+ (raw)",
            f"Matching query total: {total_count:,}",
            f"Sample fetched: {len(products)}",
            "",
            "The off-extractor tool filters to ~100K clean products by requiring:",
            "  - English product name",
            "  - Valid front image",
            "  - At least one category",
            "",
            "Full database download options:",
            "  - JSONL: https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz",
            "  - MongoDB dump: https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.gz",
            "  - API: paginated search (this script uses)",
            "",
            "Recommended: Use the off-extractor for production ingestion.",
            "  Repo: https://github.com/alexander-marquardt/open-food-facts-ndjson-extractor",
        ],
    )

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    all_passed = report.print()

    # ------------------------------------------------------------------
    # Print sample transformed product
    # ------------------------------------------------------------------
    print("\nSample transformed product (OFF -> canonical schema):")
    print(json.dumps(transformed, indent=2, ensure_ascii=False))

    # Print a second sample if available for comparison
    if len(products) > 1:
        transformed2 = transform_off(products[len(products) // 2])
        print("\nSecond sample (mid-dataset):")
        print(json.dumps(transformed2, indent=2, ensure_ascii=False))

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
