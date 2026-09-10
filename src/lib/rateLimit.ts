// ponytail: in-memory per-process limiter — this app runs a single PM2
// instance with no reverse proxy in front, so a shared store (Redis) or
// per-instance-safe IP detection would be over-building for a single-user
// app. Upgrade to a real IP source + shared store if this goes multi-instance.
//
// Known limitation: the deploy topology (deploy.yml) exposes PM2 directly on
// port 3000 with no trusted reverse proxy in front, so `x-forwarded-for` is
// entirely client-controlled — anyone can bypass this limiter by sending a
// different fake value per request. This is a courtesy throttle against
// accidental request storms (e.g. a buggy retry loop), NOT a defense against
// a deliberate abuser. Real protection requires a trusted proxy (nginx/
// Cloudflare) that sets/strips this header before it reaches the app.

const buckets = new Map<string, { count: number; resetAt: number }>()

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/** Fixed-window rate limit. Returns whether the request is allowed. */
export function rateLimit(
  request: Request,
  { limit, windowMs }: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const key = clientKey(request)
  const now = Date.now()
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
