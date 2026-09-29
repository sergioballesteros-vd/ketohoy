// ponytail: in-memory per-process limiter — one PM2 instance, so a shared store (Redis) would be
// over-building. Upgrade to a shared store if this ever runs on several instances.
//
// Client IP: production runs behind Caddy (scripts/provision.sh), which overwrites X-Forwarded-For
// with the real peer address, and the app only listens on 127.0.0.1 — nothing else can reach it.
// We still read the LAST entry: that is the one appended by the nearest trusted proxy, whereas the
// first entries are whatever the client sent. Do not expose the app port directly (see
// docs/deployment-proxy.md): without the proxy this header is client-controlled.

const buckets = new Map<string, { count: number; resetAt: number }>()

// Buckets are per route family (e.g. /api/auth, /api/mercadona) so browsing the
// catalog can't exhaust the login/register allowance, and vice versa.
function clientKey(request: Request, name?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'
  const scope = name ?? new URL(request.url).pathname.split('/').slice(0, 3).join('/')
  return `${scope}|${ip}`
}

/** Fixed-window rate limit. Returns whether the request is allowed. `bucket` overrides the per-route-family key. */
export function rateLimit(
  request: Request,
  { limit, windowMs, bucket: name }: { limit: number; windowMs: number; bucket?: string }
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const key = clientKey(request, name)
  const now = Date.now()
  // Keep the map bounded: drop expired windows once it grows (a flood of distinct keys can't leak memory).
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count++
  return { ok: true }
}
