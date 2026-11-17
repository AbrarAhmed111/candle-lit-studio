'use server'

import type { AdminOrder } from '@/data/admin'
import { fail, friendly, ok, type ActionResult } from '../result'
import { notifyOrderStatus, notifyPaymentReviewed, resendOrderEmail } from '@/lib/email/notify'
import { guard, refreshStore } from './shared'

// Orders

export async function adminUpdateOrder(
  number: string,
  patch: Partial<AdminOrder>,
  event?: string,
): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const columns: Record<string, unknown> = {}
  if (patch.status) columns.status = patch.status
  if (patch.paymentStatus) columns.payment_status = patch.paymentStatus
  if ('cancelReason' in patch) columns.cancel_reason = patch.cancelReason ?? null
  if (patch.cod) {
    Object.assign(columns, {
      cod_collected: patch.cod.collected ?? null,
      cod_charges: patch.cod.charges ?? 0,
      cod_reference: patch.cod.reference || null,
      cod_settled_at: patch.cod.settledAt || null,
      cod_notes: patch.cod.notes || null,
    })
  }
  if (patch.customer) {
    Object.assign(columns, {
      customer_name: patch.customer.name,
      customer_phone: patch.customer.phone,
      customer_email: patch.customer.email ?? null,
      city: patch.customer.city,
      area: patch.customer.area,
      address: patch.customer.address,
      landmark: patch.customer.landmark ?? null,
      customer_notes: patch.customer.notes ?? null,
    })
  }

  if (patch.shipment) {
    const { error } = await db.from('shipments').upsert({
      order_number: number,
      courier: patch.shipment.courier,
      tracking_id: patch.shipment.trackingId,
      tracking_url: patch.shipment.trackingUrl,
      dispatched_at: patch.shipment.dispatchedAt,
      notes: patch.shipment.notes || null,
    })
    if (error) return fail(friendly(error.message))
  }
  if (Object.keys(columns).length) {
    const { error } = await db.from('orders').update(columns).eq('number', number)
    if (error) return fail(friendly(error.message))
  }
  if (event) {
    await db.from('order_events').insert({ order_number: number, kind: 'history', text: event, actor: g.user.id })
  }
  // Cancelling returns stock to the shelf
  if (patch.status === 'Cancelled') refreshStore()
  // The customer hears about each step (the owner switches steps on and off in Messages)
  if (patch.status) await notifyOrderStatus(number, patch.status)
  return ok(null)
}

/** Approves or rejects an Easypaisa payment. The customer gets an email either way. */
export async function adminReviewPayment(number: string, approve: boolean, reason = ''): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.rpc('admin_review_payment', {
    order_number: number,
    approve,
    reason: reason.trim(),
  })
  if (error) return fail(friendly(error.message))
  await notifyPaymentReviewed(number, approve, reason.trim())
  return ok(null)
}

/** A short-lived link to the payment screenshot (the files are private) */
export async function adminPaymentProof(path: string): Promise<ActionResult<string>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  if (!/^checkout\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/.test(path))
    return fail('There is no screenshot for this order.')
  const { data, error } = await g.supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 10)
  if (error || !data) return fail('The screenshot could not be opened. Try again.')
  return ok(data.signedUrl)
}

/** Replaces the candles in an order. The database moves the stock and recomputes totals. */
export async function adminEditOrder(
  number: string,
  change: {
    lines: { variantId: string; colour?: string; qty: number; unitPrice?: number }[]
    shipping: number
    discount: number
    note: string
  },
): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.rpc('admin_edit_order', {
    order_number: number,
    lines: change.lines,
    shipping: change.shipping,
    discount: change.discount,
    note: change.note,
  })
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

/** Emails sent for one order */
export async function adminOrderMessages(
  number: string,
): Promise<ActionResult<{ at: string; templateId: string; to: string; status: string; error?: string }[]>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data } = await g.supabase
    .from('email_log')
    .select('*')
    .eq('order_number', number)
    .order('created_at', { ascending: false })
  return ok(
    (data ?? []).map((e: any) => ({
      at: e.created_at,
      templateId: e.template_id,
      to: e.to_email,
      status: e.status,
      error: e.error ?? undefined,
    })),
  )
}

export async function adminResendEmail(number: string, templateId: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const result = await resendOrderEmail(number, templateId)
  return result.ok ? ok(null) : fail('error' in result ? result.error : 'Not sent.')
}

export async function adminAddNote(number: string, text: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase
    .from('order_events')
    .insert({ order_number: number, kind: 'note', text: text.trim(), actor: g.user.id })
  return error ? fail(friendly(error.message)) : ok(null)
}

export async function adminCreateOrder(order: AdminOrder): Promise<ActionResult<string>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data, error } = await g.supabase.rpc('admin_create_order', { payload: order })
  if (error) return fail(friendly(error.message))
  refreshStore()
  await notifyOrderStatus(data as string, order.status)
  return ok(data as string)
}
