import { coupons, store } from '@/data/store'
import { getProductById } from '@/data/products'
import type { CartItem, Coupon, Product, Variant } from '@/types'

// Client-side mirror of the pricing rules. With Supabase connected,
// place_order() repeats every calculation and its numbers are final.

export const formatPKR = (amount: number) =>
  // A non-breaking space keeps "Rs." on the same line as the amount
  `Rs. ${Math.round(amount).toLocaleString('en-US')}`

/** Discounted unit price, rounded to the nearest rupee. */
export const salePrice = (product: Product, variant: Variant) =>
  product.discountPercent
    ? Math.round(variant.price * (1 - product.discountPercent / 100))
    : variant.price

export const fromPrice = (product: Product) => {
  const cheapest = product.variants.reduce((a, b) => (a.price <= b.price ? a : b))
  return { original: cheapest.price, sale: salePrice(product, cheapest) }
}

export const totalStock = (product: Product) =>
  product.variants.reduce((sum, v) => sum + v.stock, 0)

export type CartLine = {
  product: Product
  variant: Variant
  qty: number
  unitPrice: number
  lineTotal: number
  lineOriginal: number
}

export const resolveLines = (items: CartItem[]): CartLine[] =>
  items.flatMap(item => {
    const product = getProductById(item.productId)
    const variant = product?.variants.find(v => v.id === item.variantId)
    if (!product || !variant) return []
    const unitPrice = salePrice(product, variant)
    return [
      {
        product,
        variant,
        qty: item.qty,
        unitPrice,
        lineTotal: unitPrice * item.qty,
        lineOriginal: variant.price * item.qty,
      },
    ]
  })

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; message: string }

export const checkCoupon = (code: string, subtotal: number): CouponCheck => {
  const coupon = coupons.find(c => c.code === code.trim().toUpperCase())
  if (!coupon) return { ok: false, message: 'That code does not exist. Check the spelling and try again.' }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { ok: false, message: `${coupon.code} expired on ${formatDate(coupon.expiresAt)}.` }
  }
  if (coupon.minCart && subtotal < coupon.minCart) {
    return {
      ok: false,
      message: `${coupon.code} needs a cart of ${formatPKR(coupon.minCart)} or more. Add ${formatPKR(coupon.minCart - subtotal)} to use it.`,
    }
  }
  return { ok: true, coupon }
}

export const computeTotals = (items: CartItem[], couponCode?: string | null) => {
  const lines = resolveLines(items)
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const originalSubtotal = lines.reduce((s, l) => s + l.lineOriginal, 0)
  const productSavings = originalSubtotal - subtotal

  let coupon: Coupon | null = null
  let couponError: string | null = null
  if (couponCode) {
    const check = checkCoupon(couponCode, subtotal)
    if (check.ok) coupon = check.coupon
    else couponError = check.message
  }

  let couponDiscount = 0
  if (coupon?.type === 'percent') {
    couponDiscount = Math.round((subtotal * coupon.value) / 100)
    if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount)
  } else if (coupon?.type === 'fixed') {
    couponDiscount = Math.min(coupon.value, subtotal)
  }

  // A threshold of 0 switches free delivery off
  const qualifiesFree = store.freeShippingOver > 0 && subtotal - couponDiscount >= store.freeShippingOver
  const shipping =
    lines.length === 0 || qualifiesFree || coupon?.type === 'free_shipping'
      ? 0
      : store.shippingFee
  const total = subtotal - couponDiscount + shipping
  const shippingSaved = coupon?.type === 'free_shipping' && !qualifiesFree ? store.shippingFee : 0

  return {
    lines,
    subtotal,
    originalSubtotal,
    productSavings,
    coupon,
    couponError,
    couponDiscount,
    shipping,
    total,
    savings: productSavings + couponDiscount + shippingSaved,
    toFreeShipping: store.freeShippingOver > 0 ? Math.max(0, store.freeShippingOver - (subtotal - couponDiscount)) : 0,
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
  }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  })

/** Accepts 03XXXXXXXXX, +923XXXXXXXXX and 923XXXXXXXXX. Returns 03XXXXXXXXX or null. */
export const normalisePkMobile = (input: string) => {
  const digits = input.replace(/[\s\-()]/g, '')
  const match = digits.match(/^(?:\+92|0092|92|0)(3\d{9})$/)
  return match ? `0${match[1]}` : null
}
