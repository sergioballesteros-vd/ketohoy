/** Absolute base URL of the site (emailed links, canonical URLs, sitemap). Never derived from the Host header (host-header injection). */
export const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
