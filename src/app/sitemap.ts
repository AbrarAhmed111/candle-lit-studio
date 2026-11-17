import type { MetadataRoute } from 'next'
import { categories, products } from '@/data/products'
import { policies } from '@/data/store'
import { loadCatalog } from '@/lib/catalog/server'
import { siteUrl } from '@/lib/supabase/config'

// Rebuilt with the catalogue, so new products appear within the hour
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await loadCatalog()
  const now = new Date()
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })

  return [
    page('/', 1, 'daily'),
    page('/shop', 0.9, 'daily'),
    ...categories.map(c => page(`/collections/${c.slug}`, 0.8)),
    ...products.map(p => page(`/products/${p.slug}`, 0.8)),
    page('/about', 0.5, 'monthly'),
    page('/candle-care', 0.5, 'monthly'),
    page('/faq', 0.5, 'monthly'),
    page('/contact', 0.4, 'monthly'),
    page('/track-order', 0.3, 'monthly'),
    ...Object.keys(policies).map(slug => page(`/policies/${slug}`, 0.2, 'monthly')),
  ]
}
