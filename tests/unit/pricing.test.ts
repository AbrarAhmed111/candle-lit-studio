import { afterEach, describe, expect, it } from 'vitest'
import { checkCoupon, computeTotals, deliveryFor, formatPKR, normalisePkMobile, salePrice } from '@/lib/pricing'
import { getProductById } from '@/data/products'
import { coupons, shippingRates, store } from '@/data/store'

const rose = { productId: 'p01', variantId: 'p01-220', qty: 2 }
const chai = { productId: 'p02', variantId: 'p02-220', qty: 1 }

afterEach(() => {
  shippingRates.splice(0, shippingRates.length)
  coupons.splice(0, coupons.length, ...coupons.filter(c => c.code !== 'GIFTONLY'))
})

describe('prices', () => {
  it('applies the product discount and rounds to the rupee', () => {
    const chaiProduct = getProductById('p02')!
    expect(salePrice(chaiProduct, chaiProduct.variants[0])).toBe(1403)
  })

  it('keeps Rs. and the amount on one line', () => {
    expect(formatPKR(1850)).toBe('Rs. 1,850')
  })

  it('accepts Pakistani mobile numbers in every common form', () => {
    expect(normalisePkMobile('0300 1234567')).toBe('03001234567')
    expect(normalisePkMobile('+92 300 1234567')).toBe('03001234567')
    expect(normalisePkMobile('923001234567')).toBe('03001234567')
    expect(normalisePkMobile('12345')).toBeNull()
  })
})

describe('cart totals', () => {
  it('adds delivery under the free threshold and waives it above', () => {
    const small = computeTotals([{ ...rose, qty: 1 }])
    expect(small.shipping).toBe(store.shippingFee)
    const big = computeTotals([rose, chai])
    expect(big.subtotal).toBe(2 * 1850 + 1403)
    expect(big.shipping).toBe(0)
  })

  it('caps WELCOME10 at its maximum discount', () => {
    const t = computeTotals([{ ...rose, qty: 4 }], 'WELCOME10')
    expect(t.couponDiscount).toBe(500)
  })

  it('discounts only the candles a restricted coupon covers', () => {
    coupons.push({ code: 'GIFTONLY', type: 'percent', value: 50, description: '', categories: ['gift-sets'] })
    expect(checkCoupon('GIFTONLY', 1850, computeTotals([{ ...rose, qty: 1 }]).lines).ok).toBe(false)
  })

  it('uses the city delivery fee, then the area fee', () => {
    shippingRates.push({ city: 'Quetta', area: '', fee: 150 }, { city: 'Quetta', area: 'Cantt', fee: 0 })
    expect(deliveryFor(1000, { city: 'Quetta' }).fee).toBe(150)
    expect(deliveryFor(1000, { city: 'quetta', area: 'cantt' }).fee).toBe(0)
    expect(deliveryFor(1000, { city: 'Lahore' }).fee).toBe(store.shippingFee)
    expect(computeTotals([{ ...rose, qty: 1 }], null, { city: 'Quetta' }).shipping).toBe(150)
  })
})

describe('colours in the cart', () => {
  const pillar = { productId: 'p09', variantId: 'p09-s', qty: 1 }

  it('keeps a line with one of the product colours', () => {
    const { lines } = computeTotals([{ ...pillar, colour: 'Sage' }], null)
    expect(lines).toHaveLength(1)
    expect(lines[0].colour).toBe('Sage')
  })

  it('drops lines whose colour is missing or no longer offered', () => {
    expect(computeTotals([pillar], null).lines).toHaveLength(0)
    expect(computeTotals([{ ...pillar, colour: 'Purple' }], null).lines).toHaveLength(0)
    expect(computeTotals([{ ...rose, colour: 'Ivory' }], null).lines).toHaveLength(0)
  })
})
