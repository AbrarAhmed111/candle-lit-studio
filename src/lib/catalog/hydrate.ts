import { categories, products, reviews } from '@/data/products'
import { campaign, coupons, couriers, store } from '@/data/store'
import type { Category, Coupon, Product, Review } from '@/types'

/**
 * Everything the storefront shows that the owner edits in the dashboard.
 * With Supabase connected, the server loads it and both the server and the
 * browser copy it into the data modules every component already reads.
 */
export type CatalogSnapshot = {
  products: Product[]
  categories: Category[]
  reviews: Review[]
  settings: {
    name: string
    email: string
    phone: string
    whatsapp: string
    address: string
    announcement: string
    instagram: string
    facebook: string
    shippingFee: number
    freeShippingOver: number
    deliveryEstimate: string
  }
  couriers: { name: string; trackingUrl: string }[]
  campaign: { name: string; description: string; endsAt: string } | null
}

const replace = <T,>(target: T[], next: T[]) => {
  target.splice(0, target.length, ...next)
}

let applied: CatalogSnapshot | null = null

export function hydrateCatalog(snapshot: CatalogSnapshot) {
  if (applied === snapshot) return
  applied = snapshot
  replace(products, snapshot.products)
  replace(categories, snapshot.categories)
  replace(reviews, snapshot.reviews)
  replace(couriers, snapshot.couriers)
  Object.assign(store, snapshot.settings)
  if (snapshot.campaign) Object.assign(campaign, snapshot.campaign)
  else Object.assign(campaign, { name: '', description: '', endsAt: '' })
  // Coupon codes are private: each one joins the list once checkout has validated it
  replace(coupons, [])
}

/** Adds a coupon the server has just validated, so cart totals can use it */
export function registerCoupon(coupon: Coupon) {
  replace(
    coupons,
    [...coupons.filter(c => c.code !== coupon.code), coupon],
  )
}
