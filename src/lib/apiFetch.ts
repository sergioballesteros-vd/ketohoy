let redirecting = false

/**
 * `fetch` for our own /api routes from client components. On 401 (missing, expired
 * or forged session) it sends the user to /login and never resolves, so callers don't
 * flash a generic "could not load" error. Any other status is returned untouched.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then(res => {
    if (res.status !== 401 || window.location.pathname === '/login') return res
    if (!redirecting) {
      redirecting = true
      window.location.assign('/login')
    }
    return new Promise<Response>(() => {})
  })
}
