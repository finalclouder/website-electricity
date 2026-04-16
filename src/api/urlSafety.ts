/**
 * URL Safety Scanner — Google Safe Browsing API v4
 *
 * Extracts URLs from text content and checks them against Google's threat
 * lists (malware, social engineering, unwanted software, potentially harmful).
 *
 * This module is server-only — never imported by frontend code.
 */

const SAFE_BROWSING_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/** Regex to extract URLs from free-text content. */
const URL_REGEX = /https?:\/\/[^\s<>"')\]},;]+/gi;

export interface UrlScanResult {
  /** true if at least one URL was flagged as a threat */
  isMalicious: boolean;
  /** Human-readable list of flagged URLs (empty if safe) */
  threats: string[];
}

/**
 * Extract all http/https URLs from a text string.
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

/**
 * Check a list of URLs against Google Safe Browsing.
 *
 * If the API key is not configured, the check is skipped (returns safe)
 * so the feature degrades gracefully in dev environments.
 *
 * If the API call fails (network error, quota exceeded, etc.), the content
 * is allowed through — we don't want a third-party outage to block all
 * posts. The error is logged for monitoring.
 */
export async function scanUrlsForThreats(urls: string[]): Promise<UrlScanResult> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;

  if (!apiKey) {
    console.warn('[SafeBrowsing] GOOGLE_SAFE_BROWSING_KEY not set — skipping URL scan');
    return { isMalicious: false, threats: [] };
  }

  if (urls.length === 0) {
    return { isMalicious: false, threats: [] };
  }

  const body = {
    client: {
      clientId: 'patctc-generator',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: [
        'MALWARE',
        'SOCIAL_ENGINEERING',
        'UNWANTED_SOFTWARE',
        'POTENTIALLY_HARMFUL_APPLICATION',
      ],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: urls.map(url => ({ url })),
    },
  };

  try {
    const res = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // 5-second timeout — don't let a slow API block post creation
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[SafeBrowsing] API returned ${res.status}: ${await res.text()}`);
      // Fail open — don't block posts when the API is down
      return { isMalicious: false, threats: [] };
    }

    const data = await res.json();

    if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
      const threats = data.matches.map(
        (m: any) => `${m.threat?.url || 'unknown'} (${m.threatType})`
      );
      console.warn('[SafeBrowsing] Threats detected:', threats);
      return { isMalicious: true, threats };
    }

    return { isMalicious: false, threats: [] };
  } catch (error: any) {
    console.error('[SafeBrowsing] Scan failed:', error.message);
    // Fail open — don't block posts on network errors
    return { isMalicious: false, threats: [] };
  }
}

/**
 * Convenience: extract URLs from text and scan them in one call.
 */
export async function scanContentForThreats(content: string): Promise<UrlScanResult> {
  const urls = extractUrls(content);
  if (urls.length === 0) {
    return { isMalicious: false, threats: [] };
  }
  return scanUrlsForThreats(urls);
}
