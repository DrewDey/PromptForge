import type { MetadataRoute } from 'next'
import { getAbsoluteSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/account/',
        '/dashboard/',
        '/suggestion-box/mine',
      ],
    },
    sitemap: getAbsoluteSiteUrl('/sitemap.xml'),
  }
}
