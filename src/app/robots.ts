import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/supabase/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private or per-visitor pages
      disallow: ['/admin', '/account', '/cart', '/checkout', '/order/', '/wishlist', '/auth/', '/api/', '/unsubscribe', '/reset-password'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
