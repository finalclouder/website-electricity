#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# DAST Advanced #4: Origin IP Protection — Cloudflare-Only Firewall
# ══════════════════════════════════════════════════════════════════════════════
#
# Purpose: Lock down the server so ONLY Cloudflare edge IPs can reach
#          ports 80, 443, and 6666. All other traffic is DROPPED.
#          This prevents attackers who discover the origin IP from
#          bypassing Cloudflare (WAF, DDoS, rate limiting).
#
# Run as root on the Debian 12 server:
#   sudo bash dast_7_cloudflare_firewall.sh
#
# To undo everything:
#   sudo ufw reset
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Cloudflare-Only Firewall Setup (Debian 12 / UFW)"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Step 0: Check we're root ──
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Must run as root (sudo)"
    exit 1
fi

# ── Step 1: Install ufw if not present ──
if ! command -v ufw &> /dev/null; then
    echo "[1/6] Installing ufw..."
    apt update && apt install -y ufw
else
    echo "[1/6] ufw already installed."
fi

# ── Step 2: Reset to clean state ──
echo "[2/6] Resetting firewall to defaults..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# ── Step 3: Always allow SSH (don't lock yourself out!) ──
echo "[3/6] Allowing SSH on port 2122..."
ufw allow 2122/tcp comment "SSH"

# ── Step 4: Fetch Cloudflare IP ranges and whitelist them ──
echo "[4/6] Fetching Cloudflare IP ranges..."

# Cloudflare publishes their IP ranges at these URLs
CF_IPV4_URL="https://www.cloudflare.com/ips-v4"
CF_IPV6_URL="https://www.cloudflare.com/ips-v6"

CF_IPV4=$(curl -sf "$CF_IPV4_URL" 2>/dev/null)
CF_IPV6=$(curl -sf "$CF_IPV6_URL" 2>/dev/null)

if [ -z "$CF_IPV4" ]; then
    echo "WARNING: Could not fetch Cloudflare IPv4 ranges. Using hardcoded fallback."
    CF_IPV4="173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22"
fi

echo ""
echo "  Cloudflare IPv4 ranges to whitelist:"
echo "$CF_IPV4" | while read -r cidr; do
    [ -z "$cidr" ] && continue
    echo "    $cidr"
done

echo ""
echo "[5/6] Adding Cloudflare rules for ports 80, 443, 6666..."

# Whitelist each Cloudflare IPv4 range for HTTP/HTTPS/app port
echo "$CF_IPV4" | while read -r cidr; do
    [ -z "$cidr" ] && continue
    ufw allow from "$cidr" to any port 80 proto tcp comment "CF-HTTP" 2>/dev/null
    ufw allow from "$cidr" to any port 443 proto tcp comment "CF-HTTPS" 2>/dev/null
    ufw allow from "$cidr" to any port 6666 proto tcp comment "CF-App" 2>/dev/null
done

# Also whitelist IPv6 ranges
if [ -n "$CF_IPV6" ]; then
    echo "$CF_IPV6" | while read -r cidr; do
        [ -z "$cidr" ] && continue
        ufw allow from "$cidr" to any port 80 proto tcp comment "CF-HTTP-v6" 2>/dev/null
        ufw allow from "$cidr" to any port 443 proto tcp comment "CF-HTTPS-v6" 2>/dev/null
        ufw allow from "$cidr" to any port 6666 proto tcp comment "CF-App-v6" 2>/dev/null
    done
fi

# Also allow localhost (for PM2 health checks, internal tools)
ufw allow from 127.0.0.1 to any port 6666 proto tcp comment "Localhost-App"

# ── Step 5: Enable firewall ──
echo ""
echo "[6/6] Enabling firewall..."
ufw --force enable

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  FIREWALL ACTIVE"
echo "═══════════════════════════════════════════════════════"
echo ""
ufw status numbered
echo ""
echo "  VERIFY: From your local machine, try:"
echo "    curl -v https://YOUR_SERVER_REAL_IP:6666/api/health"
echo "  Expected: Connection refused/timeout (BLOCKED)"
echo ""
echo "    curl -v https://livelinepcbn.com/api/health"
echo "  Expected: {\"status\":\"ok\"} (via Cloudflare — ALLOWED)"
echo ""
echo "  To undo: sudo ufw reset"
echo ""
