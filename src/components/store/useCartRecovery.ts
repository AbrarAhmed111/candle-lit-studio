'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { saveCart } from '@/lib/actions/store'
import type { computeTotals } from '@/lib/pricing'

const KEY = 'cls_cart_id'

/** A random id for this browser's cart, kept between visits */
export function useCartId() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    try {
      let saved = localStorage.getItem(KEY)
      if (!saved) {
        saved = crypto.randomUUID()
        localStorage.setItem(KEY, saved)
      }
      setId(saved)
    } catch {
      setId(null)
    }
  }, [])
  return id
}

/** Starts a new cart id after an order, so the next cart is separate */
export const resetCartId = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/**
 * Once the customer types an email at checkout, the cart is saved (with a
 * short pause after typing). If they leave without ordering, one reminder
 * email follows after the time set in Settings.
 */
export function useSaveCart(
  id: string | null,
  fields: { email: string; name: string; phone: string },
  totals: ReturnType<typeof computeTotals>,
) {
  const items = totals.lines.map(l => ({
    productId: l.product.id,
    variantId: l.variant.id,
    colour: l.colour,
    qty: l.qty,
  }))
  const signature = JSON.stringify([fields.email.trim().toLowerCase(), fields.name.trim(), fields.phone.trim(), items])

  useEffect(() => {
    if (!isSupabaseConfigured || !id || !items.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) return
    const t = setTimeout(() => {
      saveCart({
        id,
        email: fields.email,
        name: fields.name,
        phone: fields.phone,
        items,
        subtotal: totals.subtotal,
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signature])
}
