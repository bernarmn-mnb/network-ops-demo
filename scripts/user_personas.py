#!/usr/bin/env python3
"""
User persona generator using RandomUser.me API.

Fetches realistic user personas with profile photos for demos.

Usage:
    # As a module
    from scripts.user_personas import fetch_personas
    personas = fetch_personas(count=10, locale="us")

    # CLI test mode
    python scripts/user_personas.py                  # 10 US personas
    python scripts/user_personas.py --count 50       # 50 personas
    python scripts/user_personas.py --locale gb      # British personas
    python scripts/user_personas.py --refresh         # Force re-fetch (ignore cache)
    python scripts/user_personas.py --save out.json  # Save to specific file
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any


API_URL = "https://randomuser.me/api/"

# Cache settings
CACHE_DIR = Path(__file__).resolve().parent.parent / "backend" / "data"
CACHE_FILE = CACHE_DIR / "randomuser_cache.json"
CACHE_MAX_AGE_SECONDS = 24 * 60 * 60  # 24 hours


def _fetch_json(url: str, timeout: int = 30) -> Any:
    """Fetch JSON from a URL using urllib."""
    req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/user-personas"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _transform_user(raw: dict) -> dict:
    """Transform a raw RandomUser.me user to a clean persona format."""
    name = raw.get("name", {})
    location = raw.get("location", {})
    dob = raw.get("dob", {})
    picture = raw.get("picture", {})

    return {
        "name": f"{name.get('first', '')} {name.get('last', '')}".strip(),
        "email": raw.get("email", ""),
        "avatar_url": picture.get("large", ""),
        "avatar_medium": picture.get("medium", ""),
        "avatar_thumbnail": picture.get("thumbnail", ""),
        "location": {
            "city": location.get("city", ""),
            "country": location.get("country", ""),
        },
        "phone": raw.get("phone", ""),
        "age": dob.get("age", 0),
        "gender": raw.get("gender", ""),
    }


def _load_cache(locale: str, count: int) -> list[dict] | None:
    """Load cached personas if the cache is fresh and has enough entries."""
    if not CACHE_FILE.exists():
        return None

    try:
        stat = CACHE_FILE.stat()
        age = time.time() - stat.st_mtime
        if age > CACHE_MAX_AGE_SECONDS:
            return None

        with open(CACHE_FILE, "r") as f:
            cache = json.load(f)

        cached_locale = cache.get("locale", "")
        cached_personas = cache.get("personas", [])

        if cached_locale != locale:
            return None
        if len(cached_personas) < count:
            return None

        return cached_personas[:count]
    except (json.JSONDecodeError, KeyError, OSError):
        return None


def _save_cache(personas: list[dict], locale: str) -> None:
    """Save personas to cache file."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = {
        "locale": locale,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "count": len(personas),
        "personas": personas,
    }
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def fetch_personas(count: int = 10, locale: str = "us", refresh: bool = False) -> list[dict]:
    """
    Fetch user personas from RandomUser.me API.

    Args:
        count: Number of personas to fetch (1-5000).
        locale: Nationality code (us, gb, au, de, fr, etc.).
        refresh: If True, bypass cache and fetch fresh data.

    Returns:
        List of persona dicts with keys:
            name, email, avatar_url, avatar_medium, avatar_thumbnail,
            location (city, country), phone, age, gender
    """
    if count < 1:
        return []
    if count > 5000:
        count = 5000

    # Check cache first
    if not refresh:
        cached = _load_cache(locale, count)
        if cached is not None:
            return cached

    # Fetch from API (max 5000 per request per API docs)
    url = f"{API_URL}?results={count}&nat={locale}"
    data = _fetch_json(url)
    raw_users = data.get("results", [])

    personas = [_transform_user(u) for u in raw_users]

    # Save to cache
    _save_cache(personas, locale)

    return personas


def main():
    parser = argparse.ArgumentParser(description="Fetch user personas from RandomUser.me")
    parser.add_argument("--count", type=int, default=10, help="Number of personas (default: 10)")
    parser.add_argument("--locale", type=str, default="us", help="Nationality code (default: us)")
    parser.add_argument("--refresh", action="store_true", help="Force re-fetch, ignoring cache")
    parser.add_argument("--save", type=str, default=None, help="Save output to a specific JSON file")
    args = parser.parse_args()

    print(f"Fetching {args.count} persona(s) with locale={args.locale}...")
    t0 = time.time()
    personas = fetch_personas(count=args.count, locale=args.locale, refresh=args.refresh)
    elapsed = time.time() - t0
    print(f"Got {len(personas)} persona(s) in {elapsed:.2f}s")

    if args.save:
        out_path = Path(args.save)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(personas, f, indent=2)
        print(f"Saved to {out_path}")
    else:
        # Print a few samples
        show = min(5, len(personas))
        for i, p in enumerate(personas[:show]):
            print(f"\n--- Persona {i+1} ---")
            print(json.dumps(p, indent=2))
        if len(personas) > show:
            print(f"\n... and {len(personas) - show} more persona(s)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
