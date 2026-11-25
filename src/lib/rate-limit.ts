// src/lib/rate-limit.ts — REQ-106 Rate limiting on API key endpoints
// Per-API-key fixed-window limiter. In-memory Map — no Redis / DB table yet.
// Note: on serverless / multi-instance deploys each instance has its own
// bucket. That's enough for REQ-106 (429 + Retry-After per key per instance).
// If you later need a shared bucket, swap this store for Redis / Supabase.

export const API_KEY_RATE_LIMIT = 60;
export const API_KEY_RATE_WINDOW_MS = 60_000; // 60 seconds

type RateLimitEntry = { count: number; windowStart: number };

const store = new Map<string, RateLimitEntry>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. 0 when allowed. */
  retryAfter: number;
};

function pruneExpired(now: number, windowMs: number) {
  if (store.size < 5000) return;
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= windowMs) store.delete(key);
  }
}

/**
 * Generic fixed-window check. `key` must already be scoped by the caller,
 * e.g. `test-runs:POST:<apiKeyId>` so different endpoints don't share a bucket.
 */
export function checkRateLimit(
  key: string,
  limit: number = API_KEY_RATE_LIMIT,
  windowMs: number = API_KEY_RATE_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now, windowMs);
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const existing = store.get(key);

  if (!existing || existing.windowStart !== windowStart) {
    store.set(key, { count: 1, windowStart });
    return { allowed: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
    return { allowed: false, limit, remaining: 0, retryAfter };
  }
  return { allowed: true, limit, remaining: limit - existing.count, retryAfter: 0 };
}

/**
 * REQ-106 convenience wrapper: bucket is per API key + per endpoint.
 * Pass `auth.apiKey?.id` — falls back to organization_id so a key without
 * an id still gets limited, never unlimited.
 */
export function checkApiKeyRateLimit(
  apiKeyId: string | null | undefined,
  organizationId: string | null | undefined,
  endpoint: string,
  limit: number = API_KEY_RATE_LIMIT,
  windowMs: number = API_KEY_RATE_WINDOW_MS
): RateLimitResult {
  const keyPart = apiKeyId || organizationId || 'unknown';
  return checkRateLimit(`${endpoint}:${keyPart}`, limit, windowMs);
}