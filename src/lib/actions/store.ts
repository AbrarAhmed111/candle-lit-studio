'use server'

import { revalidateTag } from 'next/cache'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { CATALOG_TAG } from '@/lib/catalog/server'
import { normalisePkMobile } from '@/lib/pricing'
import type { Coupon, Order } from '@/types'
import { fail, friendly, ok, NOT_CONNECTED, type ActionResult } from './result'
import {
  notifyCancelRequest,
  notifyInquiry,
  notifyNewSubscriber,
  notifyOrderPlaced,
  notifyPaymentResubmitted,
} from '@/lib/email/notify'
import { cleanReference } from '@/lib/payments'

export type CheckoutInput = {
  customer: {
    name: string
    phone: string
    email: string
    city: string
    area: string
    address: string
    landmark?: string
    postalCode?: string
    notes?: string
  }
  lines: { variantId: string; colour?: string; qty: number }[]
  couponCode?: string | null
  /** The Easypaisa transfer: transaction ID and the uploaded screenshot's path */
  payment: { reference: string; proof: string }
  /** The browser's cart id, so a saved cart is marked as recovered */
  cartId?: string | null
  /** Join the newsletter with the checkout email */
  subscribe?: boolean
}

export type PlacedOrder = { number: string; accessToken: string; total: number }

/** Places an Easypaisa order. Prices, stock, the coupon and the payment details are checked again in the database. */
export async function placeOrder(input: CheckoutInput): Promise<ActionResult<PlacedOrder>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const phone = normalisePkMobile(input.customer.phone)
  if (!phone) return fail('Enter a Pakistani mobile number like 0300 1234567.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email?.trim() ?? ''))
    return fail('Enter your email address, like name@example.com.')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('place_order', {
    payload: {
      ...input,
      customer: { ...input.customer, phone },
      payment: { reference: cleanReference(input.payment.reference), proof: input.payment.proof },
    },
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

/** A customer asks to cancel an order that has not left the studio */
export async function requestCancellation(
  number: string,
  phone: string,
  reason: string,
  token?: string | null,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.rpc('request_cancellation', {
    order_number: number,
    phone: normalisePkMobile(phone) ?? '',
    token: token && /^[0-9a-f-]{36}$/i.test(token) ? token : null,
    reason: reason.trim(),
  })
  if (error) {
    if (error.message.includes('TOO_LATE'))
      return fail(
        'This order has already left the studio, so it can no longer be cancelled online. Please call or WhatsApp us.',
      )
    return fail(friendly(error.message))
  }
  await notifyCancelRequest(number, reason.trim())
  return ok(null)
}

/** After a rejected payment the customer sends a new transaction ID and screenshot */
export async function resubmitPayment(values: {
  number: string
  phone?: string
  token?: string | null
  reference: string
  proof: string
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { error } = await supabase.rpc('resubmit_payment', {
    order_number: values.number,
    phone: (values.phone && normalisePkMobile(values.phone)) || '',
    token: values.token && /^[0-9a-f-]{36}$/i.test(values.token) ? values.token : null,
    reference: cleanReference(values.reference),
    proof: values.proof,
  })
  if (error) return fail(friendly(error.message))
  await notifyPaymentResubmitted(values.number)
  return ok(null)
}

/** Remembers a checkout cart so a reminder email can bring the customer back */
export async function saveCart(cart: {
  id: string
  email: string
  name?: string
  phone?: string
  items: { productId: string; variantId: string; colour?: string; qty: number }[]
  subtotal: number
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  if (!/^[0-9a-f-]{36}$/i.test(cart.id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cart.email.trim())) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_cart', {
    cart: cart.id,
    email: cart.email.trim(),
    name: cart.name?.trim() || null,
    phone: cart.phone ? normalisePkMobile(cart.phone) : null,
    items: cart.items,
    subtotal: Math.round(cart.subtotal),
  })
  return error ? fail(friendly(error.message)) : ok(null)
}

/** The items of a saved cart, for the link in the reminder email */
export async function getSavedCart(
  id: string,
): Promise<ActionResult<{ productId: string; variantId: string; colour?: string; qty: number }[] | null>> {
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return ok(null)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_cart', { cart: id })
  if (error) return fail(friendly(error.message))
  return ok((data as { productId: string; variantId: string; colour?: string; qty: number }[] | null) ?? null)
}

export async function reportReview(id: string, reason: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.rpc('report_review', { review: id, reason: reason.trim() })
  return error ? fail(friendly(error.message)) : ok(null)
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

export async function sendContactMessage(values: {
  name: string
  contact: string
  message: string
}): Promise<ActionResult> {
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
  images?: string[]
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_review', {
    product: values.productId,
    rating: values.rating,
    title: values.title,
    body: values.body,
    city: values.city ?? '',
    images: (values.images ?? []).filter(u => u.startsWith('https://')).slice(0, 4),
  })
  return error ? fail(friendly(error.message)) : ok(null)
}
