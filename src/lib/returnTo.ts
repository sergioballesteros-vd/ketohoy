const AUTH_PATHS = new Set(['/login', '/accept-terms', '/api/auth'])

export function normalizeInternalReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 2048 || value !== value.trim() || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/u.test(value)) return '/'

  let decoded = value
  for (let i = 0; i < 3; i++) {
    try {
      decoded = decodeURIComponent(decoded)
    } catch {
      return '/'
    }
    if (decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u0020\u007f]/u.test(decoded)) return '/'
  }

  const url = new URL(value, 'https://ketohoy.invalid')
  let pathname = url.pathname
  try {
    for (let i = 0; i < 3; i++) pathname = decodeURIComponent(pathname)
  } catch {
    return '/'
  }
  const authPath = pathname.replace(/\/$/, '') || '/'
  if (url.origin !== 'https://ketohoy.invalid' || AUTH_PATHS.has(authPath) || authPath.startsWith('/api/auth/')) return '/'

  return `${url.pathname}${url.search}${url.hash}`
}
