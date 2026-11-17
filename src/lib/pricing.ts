import { coupons, shippingRates, store } from '@/data/store'
import { getProductById } from '@/data/products'
import type { CartItem, Coupon, Product, Variant } from '@/types'

// Client-side mirror of the pricing rules. With Supabase connected,
// place_order() repeats every calculation and its numbers are final.

export const formatPKR = (amount: number) =>
  // A non-breaking space keeps "Rs." on the same line as the amount
  `Rs. ${Math.round(amount).toLocaleString('en-US')}`

/** Discounted unit price, rounded to the nearest rupee. */
export const salePrice = (product: Product, variant: Variant) =>
  product.discountPercent ? Math.round(variant.price * (1 - product.discountPercent / 100)) : variant.price

export const fromPrice = (product: Product) => {
  const cheapest = product.variants.reduce((a, b) => (a.price <= b.price ? a : b))
  return { original: cheapest.price, sale: salePrice(product, cheapest) }
}

export const totalStock = (product: Product) => product.variants.reduce((sum, v) => sum + v.stock, 0)

export type CartLine = {
  product: Product
  variant: Variant
  /** Chosen colour name, for products that come in colours */
  colour?: string
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
    // A colour the owner has since removed cannot be ordered
    const colours = product.colours ?? []
    if (colours.length ? !colours.some(c => c.name === item.colour) : item.colour) return []
    const unitPrice = salePrice(product, variant)
    return [
      {
        product,
        variant,
        colour: item.colour,
        qty: item.qty,
        unitPrice,
        lineTotal: unitPrice * item.qty,
        lineOriginal: variant.price * item.qty,
      },
    ]
  })

export type CouponCheck = { ok: true; coupon: Coupon } | { ok: false; message: string }

/** The part of the cart a coupon covers: everything, or only its products and categories */
export const couponBase = (coupon: Coupon, lines: CartLine[]) => {
  const products = coupon.productIds ?? []
  const categories = coupon.categories ?? []
  if (!products.length && !categories.length) return lines.reduce((s, l) => s + l.lineTotal, 0)
  return lines
    .filter(l => products.includes(l.product.id) || l.product.categories.some(c => categories.includes(c)))
    .reduce((s, l) => s + l.lineTotal, 0)
}

export const checkCoupon = (code: string, subtotal: number, lines?: CartLine[]): CouponCheck => {
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
  if (lines && couponBase(coupon, lines) === 0) {
    return { ok: false, message: `${coupon.code} does not apply to the candles in your cart.` }
  }
  return { ok: true, coupon }
}

/** Delivery fee for a place: area rule, then city rule, then the store default (same order as the database) */
export const deliveryFor = (cartValue: number, place?: { city?: string; area?: string }) => {
  const city = place?.city?.trim().toLowerCase()
  const area = place?.area?.trim().toLowerCase() ?? ''
  const rule = city
    ? (shippingRates.find(r => r.city.toLowerCase() === city && r.area && r.area.toLowerCase() === area) ??
      shippingRates.find(r => r.city.toLowerCase() === city && !r.area))
    : undefined
  const freeOver = rule?.freeOver ?? store.freeShippingOver
  return {
    fee: freeOver > 0 && cartValue >= freeOver ? 0 : (rule?.fee ?? store.shippingFee),
    freeOver,
  }
}

export const computeTotals = (
  items: CartItem[],
  couponCode?: string | null,
  place?: { city?: string; area?: string },
) => {
  const lines = resolveLines(items)
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const originalSubtotal = lines.reduce((s, l) => s + l.lineOriginal, 0)
  const productSavings = originalSubtotal - subtotal

  let coupon: Coupon | null = null
  let couponError: string | null = null
  if (couponCode) {
    const check = checkCoupon(couponCode, subtotal, lines)
    if (check.ok) coupon = check.coupon
    else couponError = check.message
  }

  let couponDiscount = 0
  const base = coupon ? couponBase(coupon, lines) : 0
  if (coupon?.type === 'percent') {
    couponDiscount = Math.round((base * coupon.value) / 100)
    if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount)
  } else if (coupon?.type === 'fixed') {
    couponDiscount = Math.min(coupon.value, base)
  }

  // A threshold of 0 switches free delivery off
  const delivery = deliveryFor(subtotal - couponDiscount, place)
  const qualifiesFree = delivery.fee === 0
  const shipping = lines.length === 0 || qualifiesFree || coupon?.type === 'free_shipping' ? 0 : delivery.fee
  const total = subtotal - couponDiscount + shipping
  const shippingSaved = coupon?.type === 'free_shipping' && !qualifiesFree ? delivery.fee : 0

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
    toFreeShipping: delivery.freeOver > 0 ? Math.max(0, delivery.freeOver - (subtotal - couponDiscount)) : 0,
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
