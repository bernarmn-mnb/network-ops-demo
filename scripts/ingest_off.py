#!/usr/bin/env python3
"""
Open Food Facts ingestion script.

Downloads products from the OFF API (or from a local JSONL dump), transforms
them to the canonical product schema, and bulk-indexes to Elasticsearch.

Usage:
    # Fetch from API with limit
    python scripts/ingest_off.py --limit 500

    # Filter by category
    python scripts/ingest_off.py --limit 200 --category "breakfast-cereals"

    # Use a local JSONL file (e.g., from the off-extractor)
    python scripts/ingest_off.py --source /path/to/products.ndjson

    # Dry run (no ES indexing, just transform and report)
    python scripts/ingest_off.py --limit 100 --dry-run

    # Specify ES index name
    python scripts/ingest_off.py --limit 500 --index my-products

Environment:
    ELASTICSEARCH_URL  - Elasticsearch URL (default: http://localhost:9200)
    ELASTIC_API_KEY    - API key for authentication (optional)
    ES_INDEX           - Default index name (default: products-off)
"""

import argparse
import gzip
import hashlib
import json
import math
import os
import random
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Generator

# Load environment: app .env first, then secrets (admin key override)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / "backend" / ".env")
    secrets_env = PROJECT_ROOT / ".secrets" / "ootb-admin.env"
    if secrets_env.exists():
        load_dotenv(secrets_env, override=True)
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_API = "https://world.openfoodfacts.org/api/v2/search"
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
API_PAGE_SIZE = 100  # OFF API max per page

# Synthetic pricing buckets (simplified from off-extractor pricing_buckets.json)
PRICING_BUCKETS = {
    "default":          {"median_per_kg": 10.00, "default_qty_g": 250, "sigma": 0.60},
    "snacks":           {"median_per_kg": 18.00, "default_qty_g": 85,  "sigma": 0.70},
    "condiments":       {"median_per_kg": 10.00, "default_qty_g": 250, "sigma": 0.60},
    "olive-oils":       {"median_per_kg": 26.00, "default_qty_g": 500, "sigma": 0.65},
    "oils-and-fats":    {"median_per_kg": 12.00, "default_qty_g": 250, "sigma": 0.60},
    "meals":            {"median_per_kg": 12.00, "default_qty_g": 400, "sigma": 0.55},
    "produce":          {"median_per_kg": 4.00,  "default_qty_g": 500, "sigma": 0.50},
    "dairies":          {"median_per_kg": 6.00,  "default_qty_g": 500, "sigma": 0.55},
    "beverages":        {"median_per_kg": 1.80,  "default_qty_g": 500, "sigma": 0.65},
    "coffee-and-tea":   {"median_per_kg": 20.00, "default_qty_g": 100, "sigma": 0.70},
    "bakery":           {"median_per_kg": 7.00,  "default_qty_g": 400, "sigma": 0.55},
    "breakfast-cereals": {"median_per_kg": 8.00, "default_qty_g": 375, "sigma": 0.55},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_json(url: str, timeout: int = 60) -> Any:
    """Fetch JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/ingest"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def parse_quantity_grams(quantity_str: str) -> float | None:
    """Parse a quantity string like '500 ml', '1.5 L', '250g' into grams (approx)."""
    if not quantity_str:
        return None
    q = quantity_str.strip().lower()
    # Remove common suffixes
    for sep in ["x", "*", "×"]:
        if sep in q:
            parts = q.split(sep)
            try:
                multiplier = float(parts[0].strip())
                q = parts[-1].strip()
            except ValueError:
                pass

    # Try to extract number and unit
    num = ""
    unit = ""
    for ch in q:
        if ch.isdigit() or ch in ".,":
            num += ch
        elif ch.isalpha():
            unit += ch
    if not num:
        return None
    try:
        value = float(num.replace(",", "."))
    except ValueError:
        return None

    unit = unit.strip()
    if unit in ("kg", "l", "lt", "liter", "litre"):
        return value * 1000
    elif unit in ("g", "gr", "gram", "grams", "ml", "cl"):
        if unit == "cl":
            return value * 10
        return value
    elif unit in ("oz",):
        return value * 28.35
    elif unit in ("lb", "lbs"):
        return value * 453.6
    return value  # assume grams if no unit recognized


def deterministic_price(code: str, categories: list, quantity_str: str) -> float:
    """Generate a deterministic synthetic price based on product attributes."""
    # Find matching pricing bucket from categories
    bucket = PRICING_BUCKETS["default"]
    cat_tags = [c.lower().replace(" ", "-") for c in categories]
    for cat in cat_tags:
        for bucket_key, bucket_val in PRICING_BUCKETS.items():
            if bucket_key in cat:
                bucket = bucket_val
                break

    # Parse quantity
    qty_g = parse_quantity_grams(quantity_str) or bucket["default_qty_g"]

    # Base price = median per kg * quantity in kg
    base_price = bucket["median_per_kg"] * (qty_g / 1000.0)

    # Use deterministic hash for consistent noise
    seed = int(hashlib.md5(code.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    noise = rng.gauss(0, bucket["sigma"])
    log_price = math.log(max(base_price, 0.50)) + noise
    price = math.exp(log_price)

    # Round to .49 or .99 endings
    price = round(price, 2)
    cents = int(price * 100) % 100
    if cents < 25:
        price = math.floor(price) + 0.49 if price > 1 else round(price, 2)
    elif cents < 75:
        price = math.floor(price) + 0.49
    else:
        price = math.floor(price) + 0.99

    return max(0.49, round(price, 2))


def get_product_name(product: dict) -> str:
    """Extract the best English product name."""
    return (product.get("product_name_en") or product.get("product_name") or "").strip()


def parse_categories(hierarchy: list) -> list:
    """Clean category hierarchy tags."""
    cleaned = []
    for cat in hierarchy:
        name = cat.split(":", 1)[-1] if ":" in cat else cat
        name = name.replace("-", " ").strip().title()
        if name:
            cleaned.append(name)
    return cleaned


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

    grade = product.get("nutriscore_grade") or product.get("nutrition_grades")
    if grade and grade != "unknown":
        attrs["Nutri-Score"] = grade.upper()

    nova = product.get("nova_group")
    if nova:
        attrs["NOVA group"] = str(nova)

    serving = product.get("serving_size")
    if serving:
        attrs["Serving size"] = serving

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
    return [dietary_keywords[l] for l in labels if l in dietary_keywords]


def transform_off(raw: dict) -> dict | None:
    """Transform a raw OFF product to canonical schema. Returns None if unusable."""
    name = get_product_name(raw)
    if not name:
        return None

    brand = (raw.get("brands") or "Unknown").split(",")[0].strip()
    categories_raw = raw.get("categories_hierarchy", [])
    categories = parse_categories(categories_raw)
    attrs = extract_nutrition_attrs(raw)
    dietary = extract_dietary_tags(raw)

    if dietary:
        attrs["Dietary restrictions"] = ", ".join(dietary)

    # Build description
    desc_parts = [name]
    if brand and brand != "Unknown":
        desc_parts.append(f"by {brand}")
    ingredients = (raw.get("ingredients_text_en") or raw.get("ingredients_text") or "").strip()
    if ingredients:
        desc_parts.append(f"Ingredients: {ingredients[:300]}")
    if categories:
        desc_parts.append(f"Category: {' > '.join(categories)}")
    description = ". ".join(desc_parts) + "."

    code = str(raw.get("code", ""))
    quantity_str = raw.get("quantity", "")
    price = deterministic_price(code, categories, quantity_str)

    image_url = raw.get("image_front_url") or raw.get("image_url") or ""

    return {
        "id": code,
        "title": name,
        "brand": brand,
        "description": description,
        "price": price,
        "currency": "EUR",
        "image_url": image_url,
        "categories": categories if categories else ["Uncategorized"],
        "attrs": attrs,
        "attr_keys": list(attrs.keys()),
        "parent_id": code,  # standalone products, no variants
    }


# ---------------------------------------------------------------------------
# Data sources
# ---------------------------------------------------------------------------

def fetch_from_api(limit: int, category: str | None = None) -> Generator[dict, None, None]:
    """Fetch products from the OFF API with pagination."""
    fields_param = ",".join(API_FIELDS)
    page = 1
    fetched = 0

    while fetched < limit:
        page_size = min(API_PAGE_SIZE, limit - fetched)
        url = f"{BASE_API}?fields={fields_param}&page_size={page_size}&page={page}&json=1"
        if category:
            url += f"&categories_tags_en={category}"

        try:
            data = fetch_json(url)
        except Exception as exc:
            print(f"  Warning: API request failed on page {page}: {exc}")
            break

        products = data.get("products", [])
        if not products:
            break

        for p in products:
            yield p
            fetched += 1
            if fetched >= limit:
                break

        page += 1
        # Small delay to be respectful to the API
        time.sleep(0.5)

    print(f"  Fetched {fetched} raw products from OFF API")


def load_from_ndjson(path: str) -> Generator[dict, None, None]:
    """Load products from a local NDJSON/JSONL file (may be gzipped)."""
    open_fn = gzip.open if path.endswith(".gz") else open
    count = 0
    with open_fn(path, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
                count += 1
            except json.JSONDecodeError:
                continue
    print(f"  Loaded {count} raw products from {path}")


# ---------------------------------------------------------------------------
# Elasticsearch bulk indexing
# ---------------------------------------------------------------------------

def bulk_index(es_url: str, index: str, api_key: str | None,
               documents: list[dict], batch_size: int = 500) -> tuple[int, int]:
    """Bulk index documents to Elasticsearch. Returns (success_count, error_count)."""
    total_success = 0
    total_errors = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        bulk_body = ""
        for doc in batch:
            action = json.dumps({"index": {"_index": index, "_id": doc["id"]}})
            source = json.dumps(doc, ensure_ascii=False)
            bulk_body += action + "\n" + source + "\n"

        headers = {
            "Content-Type": "application/x-ndjson",
            "User-Agent": "elastic-agent-starter/ingest",
        }
        if api_key:
            headers["Authorization"] = f"ApiKey {api_key}"

        url = f"{es_url}/_bulk"
        req = urllib.request.Request(url, data=bulk_body.encode("utf-8"),
                                     headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode())
                if result.get("errors"):
                    for item in result.get("items", []):
                        idx = item.get("index", {})
                        if idx.get("error"):
                            total_errors += 1
                            if total_errors <= 3:
                                print(f"  Bulk error: {idx['error'].get('reason', '')[:100]}")
                        else:
                            total_success += 1
                else:
                    total_success += len(batch)
        except Exception as exc:
            print(f"  Bulk request failed: {exc}")
            total_errors += len(batch)

        # Progress
        indexed_so_far = i + len(batch)
        print(f"  Indexed {indexed_so_far}/{len(documents)} "
              f"(success: {total_success}, errors: {total_errors})")

    return total_success, total_errors


def ensure_index(es_url: str, index: str, api_key: str | None):
    """Create the index with canonical mapping if it doesn't exist."""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "elastic-agent-starter/ingest",
    }
    if api_key:
        headers["Authorization"] = f"ApiKey {api_key}"

    # Check if index exists
    check_req = urllib.request.Request(f"{es_url}/{index}", headers=headers, method="HEAD")
    try:
        urllib.request.urlopen(check_req, timeout=10)
        print(f"  Index '{index}' already exists")
        return
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  Warning: could not check index: {e}")
            return
    except Exception:
        pass

    # Load mapping template
    mapping_path = Path(__file__).parent.parent / "hive-mind" / "patterns" / "ecommerce" / "canonical-product-mapping.json"
    if mapping_path.exists():
        with open(mapping_path) as f:
            mapping = json.load(f)
        print(f"  Creating index '{index}' with canonical mapping")
    else:
        # Fallback minimal mapping
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "brand": {"type": "keyword"},
                    "description": {"type": "text"},
                    "price": {"type": "float"},
                    "currency": {"type": "keyword"},
                    "image_url": {"type": "keyword", "index": False},
                    "categories": {"type": "keyword"},
                    "attrs": {"type": "flattened"},
                    "attr_keys": {"type": "keyword"},
                    "parent_id": {"type": "keyword"},
                }
            }
        }
        print(f"  Creating index '{index}' with fallback mapping (canonical mapping file not found)")

    body = json.dumps(mapping).encode("utf-8")
    create_req = urllib.request.Request(f"{es_url}/{index}", data=body,
                                        headers=headers, method="PUT")
    try:
        urllib.request.urlopen(create_req, timeout=30)
        print(f"  Index '{index}' created")
    except Exception as exc:
        print(f"  Warning: could not create index: {exc}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest Open Food Facts data to Elasticsearch")
    parser.add_argument("--limit", type=int, default=500,
                        help="Max products to fetch from API (default: 500)")
    parser.add_argument("--category", type=str, default=None,
                        help="OFF category tag filter (e.g., 'breakfast-cereals', 'olive-oils')")
    parser.add_argument("--source", type=str, default=None,
                        help="Path to local NDJSON/JSONL file (skip API fetch)")
    parser.add_argument("--index", type=str,
                        default=os.environ.get("ES_INDEX", "products-off"),
                        help="Elasticsearch index name (default: products-off)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Transform and report only, no ES indexing")
    parser.add_argument("--output", type=str, default=None,
                        help="Write transformed NDJSON to this file path")
    args = parser.parse_args()

    print("=" * 60)
    print("  Open Food Facts Ingestion")
    print("=" * 60)

    # Read products
    if args.source:
        print(f"\nLoading from local file: {args.source}")
        raw_products = list(load_from_ndjson(args.source))
        if args.limit:
            raw_products = raw_products[:args.limit]
    else:
        print(f"\nFetching up to {args.limit} products from OFF API...")
        if args.category:
            print(f"  Category filter: {args.category}")
        raw_products = list(fetch_from_api(args.limit, args.category))

    if not raw_products:
        print("No products fetched. Exiting.")
        sys.exit(1)

    # Transform
    print(f"\nTransforming {len(raw_products)} raw products...")
    transformed = []
    skipped = 0
    for raw in raw_products:
        doc = transform_off(raw)
        if doc:
            transformed.append(doc)
        else:
            skipped += 1

    print(f"  Transformed: {len(transformed)}")
    print(f"  Skipped (no name): {skipped}")

    if not transformed:
        print("No usable products after transformation. Exiting.")
        sys.exit(1)

    # Quality summary
    with_image = sum(1 for d in transformed if d["image_url"])
    with_brand = sum(1 for d in transformed if d["brand"] != "Unknown")
    with_nutrition = sum(1 for d in transformed if any(k.startswith("Energy") for k in d["attr_keys"]))
    avg_attrs = sum(len(d["attr_keys"]) for d in transformed) / len(transformed)

    print(f"\nQuality summary:")
    print(f"  With image URL:     {with_image}/{len(transformed)} ({with_image/len(transformed)*100:.1f}%)")
    print(f"  With brand:         {with_brand}/{len(transformed)} ({with_brand/len(transformed)*100:.1f}%)")
    print(f"  With nutrition:     {with_nutrition}/{len(transformed)} ({with_nutrition/len(transformed)*100:.1f}%)")
    print(f"  Avg attributes:     {avg_attrs:.1f}")
    print(f"  Price range:        EUR {min(d['price'] for d in transformed):.2f} - {max(d['price'] for d in transformed):.2f}")

    # Output to NDJSON file if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            for doc in transformed:
                f.write(json.dumps(doc, ensure_ascii=False) + "\n")
        print(f"\nWrote {len(transformed)} products to {args.output}")

    # Print samples
    print(f"\nSample product (first):")
    print(json.dumps(transformed[0], indent=2, ensure_ascii=False))
    if len(transformed) > 1:
        print(f"\nSample product (mid):")
        print(json.dumps(transformed[len(transformed) // 2], indent=2, ensure_ascii=False))

    if args.dry_run:
        print("\n[DRY RUN] Skipping Elasticsearch indexing.")
        sys.exit(0)

    # Index to Elasticsearch (prefer ADMIN_API_KEY for write access)
    es_url = os.environ.get("ELASTICSEARCH_URL", "").rstrip("/")
    api_key = os.environ.get("ADMIN_API_KEY") or os.environ.get("ELASTIC_API_KEY")

    if not es_url or not api_key:
        print("\nERROR: ELASTICSEARCH_URL and an API key are required.")
        print("Set ADMIN_API_KEY in .secrets/ootb-admin.env (write access) or")
        print("ELASTIC_API_KEY in backend/.env (read-only, may fail on index creation).")
        sys.exit(1)

    print(f"\nIndexing to Elasticsearch...")
    print(f"  URL: {es_url}")
    print(f"  Index: {args.index}")
    print(f"  Auth: {'API key' if api_key else 'none'}")

    ensure_index(es_url, args.index, api_key)
    success, errors = bulk_index(es_url, args.index, api_key, transformed)

    print(f"\nIndexing complete:")
    print(f"  Success: {success}")
    print(f"  Errors:  {errors}")

    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
