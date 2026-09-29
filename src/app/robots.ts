import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/appUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    // Private screens are noindex by default (root layout); only /api/ needs blocking here.
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${appUrl()}/sitemap.xml`,
  }
}
