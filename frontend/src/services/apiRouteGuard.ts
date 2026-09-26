/**
 * Shared server-side hardening for Next.js API routes that spend real
 * quota on every call (Google Routes, Gemini). Used by both
 * app/api/routes/compute and app/api/ai so a new proxy route can't be added
 * later without this same baseline: same-origin check + a best-effort
 * per-source-IP rate limit.
 */

const requestLogsByBucket = new Map<string, Map<string, number[]>>();

/**
 * Best-effort, per-Node-process rate limiter keyed by an arbitrary bucket
 * name (so /api/ai and /api/routes/compute don't share the same counter)
 * plus a client identifier. Not a substitute for a shared store in a
 * multi-instance deployment, but meaningfully raises the cost of casual
 * abuse without adding external infrastructure.
 */
export function isRateLimited(bucket: string, key: string, maxRequests: number, windowMs: number): boolean {
  let bucketLog = requestLogsByBucket.get(bucket);
  if (!bucketLog) {
    bucketLog = new Map<string, number[]>();
    requestLogsByBucket.set(bucket, bucketLog);
  }

  const now = Date.now();
  const timestamps = (bucketLog.get(key) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  bucketLog.set(key, timestamps);

  // Bound memory: drop stale keys occasionally.
  if (bucketLog.size > 5000) {
    for (const [k, v] of bucketLog) {
      if (v.every((t) => now - t >= windowMs)) bucketLog.delete(k);
    }
  }

  return timestamps.length > maxRequests;
}

/** Extracts a best-effort client identifier for rate-limiting from request headers. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
}

/**
 * Rejects a request that explicitly names a different origin via
 * Origin/Referer. A request with neither header is allowed through (some
 * legitimate same-origin fetches omit both), matching the existing
 * behavior in app/api/routes/compute.
 */
export function isCrossOriginRequest(req: Request): boolean {
  const selfOrigin = new URL(req.url).origin;
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");
  const claimedOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : null);
  return !!claimedOrigin && claimedOrigin !== selfOrigin;
}
