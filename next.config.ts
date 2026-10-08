import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'prod-mercadona.imgix.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    // Security headers on every response, including redirects and API errors. The CSP is per-request
    // (nonce) and lives in src/proxy.ts. HSTS is ignored over plain http, so it is harmless in dev.
    const security = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ]
    return [
      { source: '/:path*', headers: security },
      { source: '/offline-shopping-list.html', headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'" }] },
      // Personal pages must not be stored by the browser/back-forward cache: after logout, "Back"
      // has to re-hit the server (which redirects to /login) instead of replaying a private page.
      { source: '/((?!_next/static|_next/image|.*\\..*).*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
};

export default nextConfig;
