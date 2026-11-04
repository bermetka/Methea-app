import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/blog/posts'

// Public pages are crawlable (search engines and AI answer engines alike);
// the app itself, auth and API routes are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/account', '/onboarding', '/project/', '/projects'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
