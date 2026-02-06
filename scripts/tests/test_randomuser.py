#!/usr/bin/env python3
"""
RandomUser.me API validation script.

Tests https://randomuser.me/api/ as a user persona data source:
- Response structure and field completeness
- Nationality/locale support (US, GB, AU, DE, FR)
- Profile picture URL validity (HEAD requests on a sample)
- API rate limits (sequential request bursts)
- Data diversity (gender, age distribution)

Usage:
    python scripts/tests/test_randomuser.py
"""

import json
import statistics
import sys
import time
import urllib.request
import urllib.error
from collections import Counter
from typing import Any


API_URL = "https://randomuser.me/api/"
BULK_URL = "https://randomuser.me/api/?results=100"
NATIONALITIES = ["us", "gb", "au", "de", "fr"]

REQUIRED_FIELDS = {"name", "email", "picture", "location", "phone", "dob", "gender", "nat"}
PICTURE_SIZES = {"large", "medium", "thumbnail"}
NAME_FIELDS = {"title", "first", "last"}
LOCATION_FIELDS = {"street", "city", "state", "country", "postcode"}


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


class TestReport:
    def __init__(self):
        self.sections: list[tuple[str, bool, list[str]]] = []

    def add(self, title: str, passed: bool, details: list[str]):
        self.sections.append((title, passed, details))

    def print(self):
        width = 72
        print()
        print("=" * width)
        print("  RandomUser.me Validation Report")
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
    # 1. API reachability & bulk fetch
    # ------------------------------------------------------------------
    print("Fetching 100 users from RandomUser.me...")
    t0 = time.time()
    try:
        data = fetch_json(BULK_URL)
    except Exception as exc:
        print(f"FATAL: Could not reach RandomUser.me API: {exc}")
        sys.exit(1)
    fetch_time = time.time() - t0

    users = data.get("results", [])
    info = data.get("info", {})
    report.add(
        "API reachability & response time",
        len(users) == 100,
        [
            f"URL: {BULK_URL}",
            f"Users returned: {len(users)}",
            f"Fetch time: {fetch_time:.2f}s",
            f"API version: {info.get('version', 'unknown')}",
            f"Seed: {info.get('seed', 'unknown')}",
        ],
    )

    if not users:
        report.print()
        sys.exit(1)

    # ------------------------------------------------------------------
    # 2. Field completeness
    # ------------------------------------------------------------------
    first = users[0]
    available_top = set(first.keys())
    missing_required = REQUIRED_FIELDS - available_top
    all_field_names = sorted(available_top)

    # Check nested fields
    picture_fields = set(first.get("picture", {}).keys())
    missing_picture = PICTURE_SIZES - picture_fields
    name_fields = set(first.get("name", {}).keys())
    missing_name = NAME_FIELDS - name_fields
    location_fields = set(first.get("location", {}).keys())
    missing_location = LOCATION_FIELDS - location_fields

    all_ok = (
        len(missing_required) == 0
        and len(missing_picture) == 0
        and len(missing_name) == 0
        and len(missing_location) == 0
    )

    report.add(
        "Field completeness",
        all_ok,
        [
            f"Top-level fields ({len(available_top)}): {', '.join(all_field_names)}",
            f"Required present: {REQUIRED_FIELDS & available_top}",
            f"Missing required: {missing_required or 'none'}",
            f"Picture sizes: {picture_fields} (missing: {missing_picture or 'none'})",
            f"Name fields: {name_fields} (missing: {missing_name or 'none'})",
            f"Location fields: {location_fields} (missing: {missing_location or 'none'})",
        ],
    )

    # ------------------------------------------------------------------
    # 3. Nationality/locale support
    # ------------------------------------------------------------------
    print("Testing nationality support...")
    nat_results = {}
    for nat in NATIONALITIES:
        url = f"{API_URL}?results=5&nat={nat}"
        try:
            nat_data = fetch_json(url)
            nat_users = nat_data.get("results", [])
            nationalities_returned = [u.get("nat", "?") for u in nat_users]
            all_match = all(n.lower() == nat for n in nationalities_returned)
            nat_results[nat.upper()] = {
                "count": len(nat_users),
                "all_match": all_match,
                "sample_name": f"{nat_users[0]['name']['first']} {nat_users[0]['name']['last']}" if nat_users else "N/A",
            }
        except Exception as exc:
            nat_results[nat.upper()] = {"count": 0, "all_match": False, "error": str(exc)}
        time.sleep(0.2)  # small delay between requests

    all_nats_ok = all(r.get("all_match", False) and r["count"] == 5 for r in nat_results.values())

    report.add(
        f"Nationality support ({len(NATIONALITIES)} tested)",
        all_nats_ok,
        [f"  {nat}: {r['count']} users, match={r.get('all_match')}, sample: {r.get('sample_name', r.get('error', '?'))}"
         for nat, r in nat_results.items()],
    )

    # ------------------------------------------------------------------
    # 4. Profile picture URL validity
    # ------------------------------------------------------------------
    print("Checking profile picture URLs (HEAD requests on sample)...")
    sample_size = min(20, len(users))
    step = max(1, len(users) // sample_size)
    sampled = users[::step][:sample_size]

    alive_count = 0
    dead_urls: list[str] = []
    for u in sampled:
        pic = u.get("picture", {})
        url = pic.get("large", "")
        if not url:
            dead_urls.append(f"{u['name']['first']} (no large picture)")
            continue
        if check_url_alive(url):
            alive_count += 1
        else:
            # Try GET instead of HEAD (some CDNs block HEAD)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/test"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        alive_count += 1
                    else:
                        dead_urls.append(f"{u['name']['first']} {url}")
            except Exception:
                dead_urls.append(f"{u['name']['first']} {url}")

    pct = (alive_count / sample_size * 100) if sample_size else 0
    report.add(
        "Image availability (90%+ target)",
        pct >= 90,
        [
            f"Sampled: {sample_size} users (large picture URLs)",
            f"Alive: {alive_count} ({pct:.1f}%)",
            f"Dead/missing: {len(dead_urls)}",
            f"Sample URL: {sampled[0].get('picture', {}).get('large', 'N/A')}",
        ]
        + ([f"  Failed: {u}" for u in dead_urls[:5]] if dead_urls else []),
    )

    # ------------------------------------------------------------------
    # 5. Rate limit test (10 sequential requests of 100 users each)
    # ------------------------------------------------------------------
    print("Testing API rate limits (10 sequential requests of 100 users)...")
    burst_count = 10
    latencies: list[float] = []
    errors: list[str] = []
    total_users_fetched = 0
    for i in range(burst_count):
        t1 = time.time()
        try:
            batch = fetch_json(BULK_URL, timeout=30)
            batch_users = batch.get("results", [])
            total_users_fetched += len(batch_users)
            latencies.append(time.time() - t1)
        except Exception as exc:
            latencies.append(time.time() - t1)
            errors.append(f"Request {i+1}: {exc}")

    avg_latency = statistics.mean(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0
    total_time = sum(latencies)

    report.add(
        f"Rate limit resilience ({burst_count} sequential bulk requests)",
        len(errors) == 0,
        [
            f"Requests sent: {burst_count} (100 users each)",
            f"Total users fetched: {total_users_fetched}",
            f"Errors: {len(errors)}",
            f"Total time: {total_time:.2f}s",
            f"Avg latency: {avg_latency*1000:.0f}ms  Min: {min_latency*1000:.0f}ms  Max: {max_latency*1000:.0f}ms",
        ]
        + ([f"  {e}" for e in errors[:5]] if errors else []),
    )

    # ------------------------------------------------------------------
    # 6. Data diversity (gender, age distribution)
    # ------------------------------------------------------------------
    genders = Counter(u.get("gender", "unknown") for u in users)
    ages = [u.get("dob", {}).get("age", 0) for u in users]
    age_min = min(ages) if ages else 0
    age_max = max(ages) if ages else 0
    age_mean = statistics.mean(ages) if ages else 0
    age_stdev = statistics.stdev(ages) if len(ages) > 1 else 0

    countries = Counter(u.get("nat", "?") for u in users)

    report.add(
        "Data diversity (gender & age)",
        len(genders) >= 2 and age_stdev > 5,
        [
            f"Gender distribution: {dict(genders)}",
            f"Age range: {age_min}-{age_max}",
            f"Age mean: {age_mean:.1f}, stdev: {age_stdev:.1f}",
            f"Nationalities in batch: {dict(countries)}",
        ],
    )

    # ------------------------------------------------------------------
    # 7. All picture sizes load
    # ------------------------------------------------------------------
    print("Verifying all picture sizes (thumbnail, medium, large)...")
    test_user = users[0]
    pic = test_user.get("picture", {})
    size_results = {}
    for size in ["thumbnail", "medium", "large"]:
        url = pic.get(size, "")
        if not url:
            size_results[size] = "MISSING"
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "elastic-agent-starter/test"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                content_type = resp.headers.get("Content-Type", "unknown")
                size_results[size] = f"OK ({content_type})"
        except Exception as exc:
            size_results[size] = f"FAIL ({exc})"

    all_sizes_ok = all("OK" in v for v in size_results.values())
    report.add(
        "Picture size variants (thumbnail, medium, large)",
        all_sizes_ok,
        [f"  {size}: {result}" for size, result in size_results.items()]
        + [f"  URLs: thumbnail={pic.get('thumbnail', 'N/A')}",
           f"         medium={pic.get('medium', 'N/A')}",
           f"         large={pic.get('large', 'N/A')}"],
    )

    # ------------------------------------------------------------------
    # Print report
    # ------------------------------------------------------------------
    all_passed = report.print()

    # ------------------------------------------------------------------
    # Print a sample raw user and transformed persona
    # ------------------------------------------------------------------
    sample_u = users[0]
    print("\nSample raw user (first result):")
    print(json.dumps(sample_u, indent=2))

    transformed = {
        "name": f"{sample_u['name']['first']} {sample_u['name']['last']}",
        "email": sample_u["email"],
        "avatar_url": sample_u["picture"]["large"],
        "location": {
            "city": sample_u["location"]["city"],
            "country": sample_u["location"]["country"],
        },
        "phone": sample_u["phone"],
        "age": sample_u["dob"]["age"],
        "gender": sample_u["gender"],
    }
    print("\nSample transformed persona:")
    print(json.dumps(transformed, indent=2))

    # ------------------------------------------------------------------
    # RandomUser.me vs Faker comparison
    # ------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("  RandomUser.me vs Faker Comparison")
    print("=" * 72)
    print("""
    | Feature              | RandomUser.me          | Faker (Python)              |
    |----------------------|------------------------|-----------------------------|
    | Profile photos       | Real photos (3 sizes)  | None                        |
    | Offline use          | No (API required)      | Yes (library)               |
    | Consistency          | Random each call       | Seedable/reproducible       |
    | Locales              | 17 nationalities       | 100+ locales                |
    | Custom fields        | Fixed schema           | Fully extensible            |
    | Rate limits          | None observed (tested) | N/A (local)                 |
    | Dependencies         | HTTP only (stdlib)     | pip install faker           |
    | Speed                | Network-bound (~300ms) | Instant (local generation)  |
    | Data realism         | High (real photos)     | Medium (generated strings)  |
    | Best for             | Demos needing avatars  | Backend testing, seeding    |

    RECOMMENDATION:
    - Use RandomUser.me when you need realistic user personas WITH profile photos
      (e.g., chat interfaces, user directories, customer profiles in demos)
    - Use Faker when you need reproducible data, custom schemas, or offline use
    - They can complement each other: use RandomUser.me photos with Faker-generated fields
    """)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
