import { formatPKR } from '@/lib/pricing'
import type { Coupon } from '@/types'

/** Plain words for the discount screens */

export const today = () => new Date().toISOString().slice(0, 10)

export const describe = (c: Coupon) =>
  c.type === 'free_shipping'
    ? 'Free delivery'
    : c.type === 'percent'
      ? `${c.value}% off${c.maxDiscount ? `, up to ${formatPKR(c.maxDiscount)}` : ''}`
      : `${formatPKR(c.value)} off`

/** An empty box means no limit */
export const whole = (text: string) => (text.trim() === '' ? undefined : Number(text))
