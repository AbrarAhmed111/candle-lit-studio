'use server'

import { revalidateTag } from 'next/cache'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { CATALOG_TAG } from '@/lib/catalog/server'
import { normalisePkMobile } from '@/lib/pricing'
import type { Coupon, Order } from '@/types'
import { fail, friendly, ok, NOT_CONNECTED, type ActionResult } from './result'
import { notifyInquiry, notifyNewSubscriber, notifyOrderPlaced } from '@/lib/email/notify'

export type CheckoutInput = {
  customer: {
    name: string
    phone: string
    email?: string
    city: string
    area: string
    address: string
    landmark?: string
    notes?: string
  }
  lines: { variantId: string; qty: number }[]
  couponCode?: string | null
  /** Join the newsletter with the checkout email */
  subscribe?: boolean
}

export type PlacedOrder = { number: string; accessToken: string; total: number }

/** Places a COD order. Prices, stock and the coupon are checked again in the database. */
export async function placeOrder(input: CheckoutInput): Promise<ActionResult<PlacedOrder>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const phone = normalisePkMobile(input.customer.phone)
  if (!phone) return fail('Enter a Pakistani mobile number like 0300 1234567.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('place_order', {
    payload: { ...input, customer: { ...input.customer, phone } },
  })
  if (error) return fail(friendly(error.message))

  if (input.subscribe && input.customer.email) {
    await supabase.rpc('subscribe', { email: input.customer.email, name: input.customer.name, source: 'Checkout' })
  }
  // Stock and sold counts changed
  revalidateTag(CATALOG_TAG)
  const placed = data as PlacedOrder
  // Confirmation, owner alert and low-stock alerts. A failed email never fails the order.
  await notifyOrderPlaced(placed.number)
  return ok(placed)
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  lines?: { variantId: string; qty: number }[],
  customer?: { phone?: string; email?: string },
): Promise<ActionResult<Coupon>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('validate_coupon', {
    code,
    subtotal: Math.round(subtotal),
    lines: lines ?? null,
    phone: (customer?.phone && normalisePkMobile(customer.phone)) || null,
    email: customer?.email?.trim() || null,
  })
  if (error) return fail(friendly(error.message))
  const result = data as { ok: boolean; coupon?: Coupon; message?: string }
  return result.ok && result.coupon ? ok(result.coupon) : fail(result.message ?? 'That code cannot be used.')
}

/** Confirmation page: needs the secret the browser got when it placed the order */
export async function getPlacedOrder(number: string, token: string): Promise<ActionResult<Order | null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  if (!/^[0-9a-f-]{36}$/i.test(token)) return ok(null)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_order', { order_number: number, token })
  if (error) return fail(friendly(error.message))
  return ok((data as Order) ?? null)
}

export async function trackOrder(number: string, phone: string): Promise<ActionResult<Order | null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const mobile = normalisePkMobile(phone)
  if (!mobile) return ok(null)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('track_order', { order_number: number, phone: mobile })
  if (error) return fail(friendly(error.message))
  return ok((data as Order) ?? null)
}

export async function subscribeToNewsletter(
  email: string,
  source: 'Popup' | 'Footer' | 'Checkout',
  name?: string,
): Promise<ActionResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail('Enter an email address like name@example.com.')
  if (!isSupabaseConfigured) return ok(null) // demo: nothing to store
  const supabase = await createClient()
  const { error } = await supabase.rpc('subscribe', { email: email.trim(), name: name ?? null, source })
  if (error) return fail(friendly(error.message))
  await notifyNewSubscriber(email.trim())
  return ok(null)
}

export async function sendContactMessage(values: { name: string; contact: string; message: string }): Promise<ActionResult> {
  const name = values.name.trim()
  const contact = values.contact.trim()
  const message = values.message.trim()
  if (name.length < 2 || contact.length < 6 || message.length < 10) return fail('Fill in every field, then send again.')
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').insert({ name, contact, message })
  if (error) return fail(friendly(error.message))
  await notifyInquiry({ name, contact, message })
  return ok(null)
}

export async function submitReview(values: {
  productId: string
  rating: number
  title: string
  body: string
  city?: string
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_review', {
    product: values.productId,
    rating: values.rating,
    title: values.title,
    body: values.body,
    city: values.city ?? '',
  })
  return error ? fail(friendly(error.message)) : ok(null)
}
