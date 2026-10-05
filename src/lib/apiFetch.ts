let redirecting = false

/**
 * `fetch` for our own /api routes from client components. Expired sessions go to /login;
 * users who need to accept the current terms go to /accept-terms. Both redirects never
 * resolve, so callers don't flash a generic "could not load" error.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then(async res => {
    const path = window.location.pathname
    if (res.status === 403 && path !== '/accept-terms' && (await res.clone().json().catch(() => null))?.code === 'TERMS_REQUIRED') {
      if (!redirecting) {
        redirecting = true
        window.location.assign('/accept-terms')
      }
      return new Promise<Response>(() => {})
    }
    if (res.status !== 401 || path === '/login') return res
    if (!redirecting) {
      redirecting = true
      window.location.assign('/login')
    }
    return new Promise<Response>(() => {})
  })
}
