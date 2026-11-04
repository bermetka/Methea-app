import type { MetadataRoute } from 'next'
import { POSTS, SITE_URL } from '@/lib/blog/posts'

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = POSTS.map(p => p.dateModified).sort().at(-1)
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/start`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/check`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: latest, changeFrequency: 'weekly', priority: 0.8 },
    ...POSTS.map(p => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.dateModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
