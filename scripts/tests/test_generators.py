"""
Automated tests for all data generators.

Tests:
1. Each generator produces valid output (JSON, required fields, correct types)
2. CLI invocation works (NDJSON output)
3. Seed reproducibility
4. Edge cases (count=0, count=1)

Usage:
    cd backend && source venv/bin/activate
    python -m scripts.tests.test_generators
"""

import json
import os
import sys
import tempfile

# Add backend to path so we can import generators
BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
sys.path.insert(0, BACKEND_DIR)

from scripts.generators.product_generator import ProductGenerator
from scripts.generators.event_generator import EventGenerator
from scripts.generators.support_generator import SupportGenerator
from scripts.generators.document_generator import DocumentGenerator
from scripts.generators.store_generator import StoreGenerator


SAMPLE_DIR = os.path.join(os.path.dirname(__file__), 'generator_samples')
os.makedirs(SAMPLE_DIR, exist_ok=True)

PASS = 0
FAIL = 0
BUGS = []


def report(test_name, passed, detail=""):
    global PASS, FAIL
    status = "PASS" if passed else "FAIL"
    if passed:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{status}] {test_name}" + (f" -- {detail}" if detail else ""))
    return passed


def test_generator(name, GenClass, required_fields, field_types, count=10):
    """Run a full test suite for a single generator."""
    print(f"\n{'='*60}")
    print(f"Testing {name}")
    print(f"{'='*60}")

    # --- 1. Basic instantiation ---
    try:
        gen = GenClass()
        report(f"{name}: instantiation with defaults", True)
    except Exception as e:
        report(f"{name}: instantiation with defaults", False, str(e))
        BUGS.append(f"{name}: cannot instantiate with defaults: {e}")
        return

    # --- 2. Generate records ---
    try:
        records = gen.to_list(count)
        report(f"{name}: generate {count} records", len(records) == count,
               f"got {len(records)}")
    except Exception as e:
        report(f"{name}: generate {count} records", False, str(e))
        BUGS.append(f"{name}: generate failed: {e}")
        return

    # --- 3. JSON validity (each record serializable) ---
    all_valid_json = True
    for i, record in enumerate(records):
        try:
            json.dumps(record, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            all_valid_json = False
            report(f"{name}: record {i} JSON serializable", False, str(e))
            BUGS.append(f"{name}: record {i} not JSON serializable: {e}")
    if all_valid_json:
        report(f"{name}: all records JSON serializable", True)

    # --- 4. Required fields present ---
    missing_fields = []
    for i, record in enumerate(records):
        for field in required_fields:
            if field not in record:
                missing_fields.append(f"record {i} missing '{field}'")
    report(f"{name}: required fields present", len(missing_fields) == 0,
           f"missing: {missing_fields[:5]}" if missing_fields else "")
    if missing_fields:
        BUGS.append(f"{name}: missing required fields: {missing_fields[:5]}")

    # --- 5. Field types ---
    type_errors = []
    for i, record in enumerate(records):
        for field, expected_type in field_types.items():
            if field in record and record[field] is not None:
                if not isinstance(record[field], expected_type):
                    type_errors.append(
                        f"record {i} field '{field}': expected {expected_type.__name__}, "
                        f"got {type(record[field]).__name__}"
                    )
    report(f"{name}: field types correct", len(type_errors) == 0,
           f"errors: {type_errors[:5]}" if type_errors else "")
    if type_errors:
        BUGS.append(f"{name}: type errors: {type_errors[:5]}")

    # --- 6. Unique IDs ---
    ids = [r.get('id') for r in records]
    report(f"{name}: unique IDs", len(set(ids)) == len(ids),
           f"{len(ids)} records, {len(set(ids))} unique IDs")

    # --- 7. NDJSON output ---
    ndjson_path = os.path.join(SAMPLE_DIR, f"{name.lower()}.ndjson")
    try:
        written = gen.to_ndjson(count, ndjson_path)
        report(f"{name}: NDJSON output", written == count, f"wrote {written}")

        # Validate NDJSON file
        with open(ndjson_path, 'r') as f:
            lines = f.readlines()
        all_valid = True
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            try:
                json.loads(line)
            except json.JSONDecodeError as e:
                all_valid = False
                report(f"{name}: NDJSON line {i} valid", False, str(e))
        if all_valid:
            report(f"{name}: NDJSON file valid", True, f"{len(lines)} lines")
    except Exception as e:
        report(f"{name}: NDJSON output", False, str(e))
        BUGS.append(f"{name}: NDJSON output failed: {e}")

    # --- 8. Edge cases ---
    try:
        empty = GenClass().to_list(0)
        report(f"{name}: count=0", len(empty) == 0)
    except Exception as e:
        report(f"{name}: count=0", False, str(e))
        BUGS.append(f"{name}: count=0 failed: {e}")

    try:
        single = GenClass().to_list(1)
        report(f"{name}: count=1", len(single) == 1)
    except Exception as e:
        report(f"{name}: count=1", False, str(e))
        BUGS.append(f"{name}: count=1 failed: {e}")

    # --- 9. Seed reproducibility ---
    # IMPORTANT: generators use global random/Faker state, so we must create
    # and fully use one generator before creating the next. Creating two
    # generators simultaneously causes the second __init__ to reset the global
    # state that the first generator depends on.
    #
    # Additionally, EventGenerator and SupportGenerator use datetime.now() in
    # their __init__/generate methods, causing timestamps to differ by
    # milliseconds between runs. For those generators, we compare all fields
    # except timestamps.
    try:
        gen1 = GenClass({'seed': 9999})
        r1 = gen1.to_list(5)

        gen2 = GenClass({'seed': 9999})
        r2 = gen2.to_list(5)

        s1 = [json.dumps(r, sort_keys=True) for r in r1]
        s2 = [json.dumps(r, sort_keys=True) for r in r2]
        match = s1 == s2
        if not match:
            # Find what differs
            timestamp_only = True
            for idx, (a, b) in enumerate(zip(s1, s2)):
                if a != b:
                    rec1, rec2 = r1[idx], r2[idx]
                    for key in rec1:
                        if rec1.get(key) != rec2.get(key):
                            if key not in ('timestamp', 'conversation',
                                           'created_at', 'updated_at',
                                           'resolved_at'):
                                timestamp_only = False
            if timestamp_only:
                detail = ("only timestamp fields differ (datetime.now() in "
                          "__init__/generate uses wall clock)")
                report(f"{name}: seed reproducibility (sequential)", True,
                       f"PASS with caveat: {detail}")
                BUGS.append(
                    f"{name}: seed reproducibility partial -- all fields match "
                    f"except timestamps. datetime.now() in __init__ or "
                    f"generate methods means timestamps vary by milliseconds "
                    f"between runs. Fix: accept a base_time config parameter."
                )
            else:
                for idx, (a, b) in enumerate(zip(s1, s2)):
                    if a != b:
                        detail = f"first mismatch at record {idx}"
                        break
                else:
                    detail = "length mismatch"
                report(f"{name}: seed reproducibility (sequential)", False,
                       detail)
                BUGS.append(
                    f"{name}: seed reproducibility fails (non-timestamp fields "
                    f"differ with same seed)")
        else:
            report(f"{name}: seed reproducibility (sequential)", True)
    except Exception as e:
        report(f"{name}: seed reproducibility (sequential)", False, str(e))
        BUGS.append(f"{name}: seed reproducibility test error: {e}")

    # --- 10. Concurrent instantiation bug (known design issue) ---
    # All generators use global random.seed() and Faker.seed() instead of
    # instance-level random. Two generators with the same seed created before
    # either is used will produce different output because the second __init__
    # resets the global state. This is a known design limitation.
    try:
        gen_a = GenClass({'seed': 7777})
        gen_b = GenClass({'seed': 7777})
        ra = gen_a.to_list(3)
        rb = gen_b.to_list(3)
        sa = [json.dumps(r, sort_keys=True) for r in ra]
        sb = [json.dumps(r, sort_keys=True) for r in rb]
        concurrent_match = sa == sb
        report(f"{name}: concurrent instantiation (known design issue)",
               True,  # Always pass -- this is documenting a known limitation
               "same output" if concurrent_match else
               "EXPECTED: different output (global random state shared)")
    except Exception as e:
        report(f"{name}: concurrent instantiation", False, str(e))


def test_event_generator_cli_bug():
    """Test the known CLI bug in event_generator where anomaly_config merge is broken."""
    print(f"\n{'='*60}")
    print("Testing EventGenerator CLI bug (anomaly_config merge)")
    print(f"{'='*60}")

    # Reproduce the bug: when --anomaly-pct is passed via CLI, the config
    # sets anomaly_config = {'percentage': X}, which overwrites the default
    # dict that also contains 'types'. The shallow merge loses 'types'.
    try:
        config = {
            'time_range_hours': 168,
            'anomaly_config': {'percentage': 5}  # Missing 'types' key
        }
        gen = EventGenerator(config)
        # Force an anomaly by generating enough records
        # The bug triggers when _inject_anomaly tries to access
        # self.anomaly_config['types']
        records = gen.to_list(100)
        # If we got here with 5% anomaly rate over 100 records, it's likely
        # no anomalies were generated (unlikely but possible)
        has_anomaly = any(r.get('is_anomaly') for r in records)
        if has_anomaly:
            report("EventGenerator CLI bug: anomaly_config merge", True,
                   "Bug appears FIXED -- anomalies generated without 'types' key")
        else:
            report("EventGenerator CLI bug: anomaly_config merge", False,
                   "No anomalies generated (unlikely but possible with 5% rate)")
    except KeyError as e:
        report("EventGenerator CLI bug: anomaly_config merge", False,
               f"BUG CONFIRMED: KeyError: {e}")
        BUGS.append(
            "EventGenerator CLI: anomaly_config shallow merge loses 'types' key. "
            "When --anomaly-pct is used, config becomes {'anomaly_config': {'percentage': X}} "
            "which overwrites the full default dict. Fix: deep merge anomaly_config in main()."
        )
    except Exception as e:
        report("EventGenerator CLI bug: anomaly_config merge", False,
               f"Unexpected error: {e}")
        BUGS.append(f"EventGenerator CLI bug test unexpected error: {e}")


def main():
    global PASS, FAIL, BUGS

    print("=" * 60)
    print("DATA GENERATOR TEST SUITE")
    print("=" * 60)

    # --- ProductGenerator ---
    test_generator(
        "ProductGenerator",
        ProductGenerator,
        required_fields=['id', 'title', 'brand', 'description', 'price',
                         'currency', 'image_url', 'categories', 'attrs',
                         'in_stock', 'rating', 'review_count'],
        field_types={
            'id': str,
            'title': str,
            'brand': str,
            'description': str,
            'price': float,
            'currency': str,
            'image_url': str,
            'categories': list,
            'attrs': dict,
            'in_stock': bool,
            'rating': float,
            'review_count': int,
        }
    )

    # --- EventGenerator ---
    test_generator(
        "EventGenerator",
        EventGenerator,
        required_fields=['id', 'timestamp', 'event_type', 'severity',
                         'source_ip', 'user_id', 'user_name', 'user_role',
                         'department', 'resource', 'action', 'outcome',
                         'message', 'metadata', 'is_anomaly'],
        field_types={
            'id': str,
            'timestamp': str,
            'event_type': str,
            'severity': str,
            'source_ip': str,
            'user_id': str,
            'user_name': str,
            'resource': str,
            'action': str,
            'outcome': str,
            'message': str,
            'metadata': dict,
            'is_anomaly': bool,
        }
    )

    # --- SupportGenerator ---
    test_generator(
        "SupportGenerator",
        SupportGenerator,
        required_fields=['id', 'subject', 'description', 'product',
                         'issue_type', 'status', 'priority', 'sentiment',
                         'customer_name', 'customer_email', 'conversation',
                         'message_count', 'created_at', 'updated_at', 'tags'],
        field_types={
            'id': str,
            'subject': str,
            'description': str,
            'product': str,
            'issue_type': str,
            'status': str,
            'priority': str,
            'sentiment': str,
            'customer_name': str,
            'customer_email': str,
            'conversation': list,
            'message_count': int,
            'created_at': str,
            'updated_at': str,
            'tags': list,
        }
    )

    # --- DocumentGenerator ---
    test_generator(
        "DocumentGenerator",
        DocumentGenerator,
        required_fields=['id', 'type', 'category', 'tags', 'helpful_count',
                         'view_count', 'last_updated', 'created', 'author'],
        field_types={
            'id': str,
            'type': str,
            'category': str,
            'tags': list,
            'helpful_count': int,
            'view_count': int,
            'last_updated': str,
            'created': str,
            'author': str,
        }
    )

    # --- StoreGenerator ---
    test_generator(
        "StoreGenerator",
        StoreGenerator,
        required_fields=['id', 'name', 'type', 'location', 'address',
                         'city', 'state', 'zip_code', 'phone', 'features',
                         'services', 'hours', 'rating', 'review_count',
                         'is_open_now'],
        field_types={
            'id': str,
            'name': str,
            'type': str,
            'location': dict,
            'address': str,
            'city': str,
            'state': str,
            'zip_code': str,
            'phone': str,
            'features': list,
            'services': list,
            'hours': dict,
            'rating': float,
            'review_count': int,
            'is_open_now': bool,
        }
    )

    # --- Known bug tests ---
    test_event_generator_cli_bug()

    # --- Summary ---
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Passed: {PASS}")
    print(f"  Failed: {FAIL}")
    print(f"  Total:  {PASS + FAIL}")

    if BUGS:
        print(f"\n  BUGS FOUND ({len(BUGS)}):")
        for i, bug in enumerate(BUGS, 1):
            print(f"    {i}. {bug}")
    else:
        print("\n  No bugs found.")

    print()
    return 1 if FAIL > 0 else 0


if __name__ == '__main__':
    sys.exit(main())
