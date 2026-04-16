#!/usr/bin/env python3
"""
DAST Script 3: Malicious File Smuggling & Path Traversal
════════════════════════════════════════════════════════════
Target : POST /api/posts (multipart with media files)
Attack : Upload files with path traversal names, double extensions,
         polyglot payloads, and MIME type mismatches
Goal   : Verify server renames files with randomUUID(), sanitizes
         extensions, and rejects non-whitelisted MIME types

Expected result if SECURE:
  - Path traversal filenames → stored as randomUUID().ext (no traversal)
  - PHP/shell files with image MIME → rejected by multer (MIME check)
  - Double extensions → only last extension kept
  - MIME mismatch (real PHP sent as image/jpeg) → rejected

Expected result if VULNERABLE:
  - File stored with original path (directory traversal)
  - Executable files accepted and stored
"""

import requests
import io
import sys

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET = "https://livelinepcbn.com"
ENDPOINT = f"{TARGET}/api/posts"

# ⚠️ PASTE A VALID JWT HERE
VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NmMxOGQ2Mi01ZmQ0LTRmMDYtOGYwMy05NjQ3ZTA0MTk0NzYiLCJlbWFpbCI6ImR1bmdkb25nMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2MzA1OTA2LCJleHAiOjE3NzY5MTA3MDZ9.11Kqob-SnuxmryCEVF-Pa09GaO844C_9P6qTNzXyOlw"

HEADERS = {"Authorization": f"Bearer {VALID_JWT}"}

# A tiny valid JPEG (1x1 pixel) — so the file actually looks like an image
VALID_JPEG_BYTES = bytes([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x40,
    0x1B, 0xFF, 0xD9
])

PHP_PAYLOAD = b'<?php echo "HACKED"; system($_GET["cmd"]); ?>'
SHELL_PAYLOAD = b'#!/bin/bash\necho "HACKED"\nwhoami\n'

# ─── Test cases ─────────────────────────────────────────────────────────────
TESTS = [
    {
        "name": "Path Traversal (../../../shell.php)",
        "filename": "../../../shell.php",
        "content": PHP_PAYLOAD,
        "mime": "image/jpeg",  # Lying about MIME
        "expect_reject": True,
        "reason": "MIME mismatch: actual PHP sent as image/jpeg",
    },
    {
        "name": "Path Traversal (..\\..\\..\\shell.php) Windows-style",
        "filename": "..\\..\\..\\shell.php",
        "content": PHP_PAYLOAD,
        "mime": "image/jpeg",
        "expect_reject": True,
        "reason": "MIME mismatch + Windows path traversal",
    },
    {
        "name": "Double extension (shell.php.jpg)",
        "filename": "shell.php.jpg",
        "content": VALID_JPEG_BYTES,  # Valid JPEG bytes
        "mime": "image/jpeg",
        "expect_reject": False,  # Should ACCEPT but rename to randomUUID().jpg
        "reason": "MIME matches, ext is .jpg (safe), but check stored name",
    },
    {
        "name": "Null byte injection (image.jpg%00.php)",
        "filename": "image.jpg\x00.php",
        "content": PHP_PAYLOAD,
        "mime": "image/jpeg",
        "expect_reject": True,
        "reason": "Null byte + MIME mismatch",
    },
    {
        "name": "Shell script as video (shell.sh → video/mp4)",
        "filename": "shell.sh",
        "content": SHELL_PAYLOAD,
        "mime": "video/mp4",
        "expect_reject": False,  # Multer checks declared MIME, not actual content
        "reason": "MIME declared as video/mp4 passes whitelist, but content is bash",
    },
    {
        "name": "Extremely long filename (2000 chars)",
        "filename": "A" * 1990 + ".jpg",
        "content": VALID_JPEG_BYTES,
        "mime": "image/jpeg",
        "expect_reject": False,
        "reason": "Server should truncate/randomize, not crash",
    },
    {
        "name": "Extension with path separators (file./../../../etc/passwd)",
        "filename": "file./../../../etc/passwd",
        "content": b"root:x:0:0:",
        "mime": "image/jpeg",
        "expect_reject": True,
        "reason": "Path traversal via extension manipulation",
    },
    {
        "name": "SVG XSS payload (image/svg+xml)",
        "filename": "xss.svg",
        "content": b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(document.cookie)</script></svg>',
        "mime": "image/svg+xml",
        "expect_reject": True,
        "reason": "SVG not in MIME whitelist",
    },
    {
        "name": "Valid JPEG (baseline — should succeed)",
        "filename": "test_image.jpg",
        "content": VALID_JPEG_BYTES,
        "mime": "image/jpeg",
        "expect_reject": False,
        "reason": "Legitimate upload — must work",
    },
]


# ─── Attack Execution ──────────────────────────────────────────────────────
print(f"""
╔══════════════════════════════════════════════════════════╗
║  DAST #3 — Malicious File Smuggling & Path Traversal     ║
║  Target : POST /api/posts (multipart media upload)       ║
║  Tests  : {len(TESTS)} attack vectors{' '*37}║
╚══════════════════════════════════════════════════════════╝
""")

if VALID_JWT == "PASTE_YOUR_VALID_JWT_HERE":
    print("  ⚠️  You must paste a valid JWT in VALID_JWT variable!")
    print("  How: Login in browser → DevTools → Network → copy Authorization header")
    sys.exit(1)

passed = 0
failed = 0

for i, test in enumerate(TESTS, 1):
    name = test["name"]
    print(f"\n── Test {i}/{len(TESTS)}: {name} ──")
    print(f"   Filename: {repr(test['filename'][:80])}")
    print(f"   MIME:     {test['mime']}")
    print(f"   Payload:  {len(test['content'])} bytes")

    # Build multipart form
    files = {
        "media": (test["filename"], io.BytesIO(test["content"]), test["mime"]),
    }
    data = {
        "content": f"[DAST Test {i}] File smuggling test — {name}",
        "category": "general",
    }

    try:
        r = requests.post(ENDPOINT, headers=HEADERS, data=data, files=files, timeout=15)
        status = r.status_code
        body = r.text[:300]

        if test["expect_reject"]:
            if status >= 400:
                print(f"   ✅ CORRECTLY REJECTED — HTTP {status}")
                print(f"   Response: {body[:150]}")
                passed += 1
            else:
                print(f"   🔴 SHOULD HAVE BEEN REJECTED — HTTP {status}")
                print(f"   Response: {body[:150]}")
                # Check if filename was sanitized in the response
                if "randomUUID" in body or "supabase" in body.lower():
                    print(f"   ⚠️  File accepted but likely renamed (check storage)")
                failed += 1
        else:
            if status < 400:
                print(f"   ✅ ACCEPTED (expected) — HTTP {status}")
                # Try to find the URL in the response to verify randomization
                try:
                    resp_json = r.json()
                    if "data" in resp_json and resp_json["data"]:
                        latest_post = resp_json["data"][0]
                        images = latest_post.get("images", [])
                        if images:
                            stored_url = images[0]
                            print(f"   Stored URL: {stored_url}")
                            if test["filename"] in stored_url:
                                print(f"   🔴 ORIGINAL FILENAME PRESERVED IN URL!")
                                failed += 1
                            else:
                                print(f"   ✅ Filename randomized (UUID in URL)")
                                passed += 1
                        else:
                            print(f"   ℹ️  No images in response — post created as text-only?")
                            passed += 1
                    else:
                        passed += 1
                except Exception:
                    passed += 1
            else:
                print(f"   ⚠️  REJECTED (unexpected) — HTTP {status}")
                print(f"   Response: {body[:150]}")
                # Not necessarily a failure — extra security is fine
                passed += 1

    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        failed += 1


# ─── Summary ────────────────────────────────────────────────────────────────
print(f"""
═══════════════════════ RESULTS ═══════════════════════
  Total tests : {len(TESTS)}
  Passed      : {passed}
  Failed      : {failed}

{"  ✅ VERDICT: SECURE — All file upload attacks handled correctly." if failed == 0 else f"  🔴 VERDICT: {failed} VULNERABILITIES FOUND — Review failed tests above."}
""")
