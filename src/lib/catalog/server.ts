import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createPublicClient } from '@/lib/supabase/server'
import { toCategory, toProduct, toReview } from '@/lib/supabase/mappers'
import { hydrateCatalog, type CatalogSnapshot } from './hydrate'

export const CATALOG_TAG = 'catalog'

const fetchCatalog = unstable_cache(
  async (): Promise<CatalogSnapshot> => {
    const db = createPublicClient()
    const [products, categories, reviews, settings, couriers, campaigns, rates, content] = await Promise.all([
      // effective_discount: the product's own discount or a running campaign, whichever is larger
      db
        .from('products')
        .select('*, effective_discount, variants(*)')
        .eq('active', true)
        .order('created_at', { ascending: false }),
      db.from('categories').select('*').order('sort'),
      db.from('reviews').select('*').eq('status', 'Approved').order('date', { ascending: false }),
      db.from('store_settings').select('*').eq('id', 1).single(),
      db.from('couriers').select('*').eq('active', true).order('sort'),
      db.from('campaigns').select('*').eq('active', true).order('ends_at'),
      db.from('shipping_rates').select('*').eq('active', true),
      db.from('site_content').select('key, value'),
    ])
    const failed = [products, categories, reviews, settings, couriers, campaigns, rates, content].find(r => r.error)
    if (failed?.error) throw new Error(`Catalogue could not load: ${failed.error.message}`)

    const today = new Date().toISOString().slice(0, 10)
    const running = (campaigns.data ?? []).find(c => c.starts_at <= today && c.ends_at >= today)
    const s = settings.data!

    return {
      // The admin flag stays out of the storefront copy
      products: (products.data ?? []).map(row => {
        const { active: _active, ...product } = toProduct({ ...row, discount_percent: row.effective_discount })
        return product
      }),
      // Archived categories leave the store; their products stay in other categories
      categories: (categories.data ?? []).map(toCategory).filter(c => !c.archived),
      reviews: (reviews.data ?? []).map(row => {
        const { status: _status, ...review } = toReview(row)
        return review
      }),
      settings: {
        name: s.name,
        email: s.email,
        phone: s.phone,
        whatsapp: s.whatsapp,
        address: s.address,
        announcement: s.announcement,
        instagram: s.instagram,
        facebook: s.facebook,
        shippingFee: s.shipping_fee,
        freeShippingOver: s.free_shipping_over,
        deliveryEstimate: s.delivery_estimate,
        easypaisaName: s.easypaisa_name ?? '',
        easypaisaNumber: s.easypaisa_number ?? '',
      },
      couriers: (couriers.data ?? []).map(c => ({ name: c.name, trackingUrl: c.tracking_url })),
      campaign: running ? { name: running.name, description: running.description, endsAt: running.ends_at } : null,
      shippingRates: (rates.data ?? []).map(r => ({
        city: r.city,
        area: r.area,
        fee: r.fee,
        freeOver: r.free_over ?? undefined,
      })),
      content: Object.fromEntries((content.data ?? []).map(c => [c.key, c.value])),
      lowStock: s.low_stock_threshold ?? 5,
    }
  },
  ['catalog'],
  // Dashboard edits refresh it at once through the tag. The timer is a fallback.
  { tags: [CATALOG_TAG], revalidate: 300 },
)

/**
 * Loads the live catalogue into the shared data modules before a server
 * component reads them. Returns null in demo mode, where the modules already
 * hold the demo data.
 */
export const loadCatalog = cache(async (): Promise<CatalogSnapshot | null> => {
  if (!isSupabaseConfigured) return null
  try {
    const snapshot = await fetchCatalog()
    hydrateCatalog(snapshot)
    return snapshot
  } catch (error) {
    // Database unreachable or not migrated yet: keep the storefront up on the demo catalogue
    console.warn(`[catalog] ${(error as Error).message}. Showing the demo catalogue.`)
    return null
  }
})
