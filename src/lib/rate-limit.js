// Tiny in-memory fixed-window rate limiter for Next route handlers.
// Single Node process (PM2 fork mode) so process-local state is sufficient.
const buckets = new Map();

export function getClientIp(req) {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf && cf !== '127.0.0.1') return cf;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return 'unknown';
}

export function isRateLimited(key, limit = 20, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    if (b.count >= limit) return true;
    b.count++;
  }

  // Opportunistic sweep so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }
  return false;
}
