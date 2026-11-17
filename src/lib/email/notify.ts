import { createServiceClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, siteUrl } from '@/lib/supabase/config'
import { formatPKR } from '@/lib/pricing'
import { deliver, emailConfigured, fromAddress } from './mailer'
import { orderDetails, renderEmail, type EmailValues } from './render'

/*
 * Every automatic email goes through here. Sending never throws: a failed
 * email is written to email_log and the order or action carries on.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const LOW_STOCK = 5

const ready = () => isSupabaseConfigured && emailConfigured()

type Db = NonNullable<ReturnType<typeof createServiceClient>>

const loadStore = async (db: Db) => {
  const { data } = await db.from('store_settings').select('*').eq('id', 1).single()
  return {
    name: (data?.name as string) ?? 'Candle Lit Studio',
    email: (data?.email as string) ?? '',
    footer: `${data?.name ?? 'Candle Lit Studio'}, ${data?.address ?? ''}. ${data?.phone ?? ''}`.trim(),
  }
}

const loadTemplate = async (db: Db, id: string) => {
  const { data } = await db.from('message_templates').select('*').eq('id', id).maybeSingle()
  return data as { subject: string | null; body: string; active: boolean } | null
}

type SendOptions = {
  templateId: string
  to: string
  values: EmailValues
  orderNumber?: string
  dedupeKey?: string
  unsubscribeUrl?: string
  button?: { label: string; href: string }
  /** Use this wording instead of the saved template (test sends, newsletters) */
  override?: { subject: string; body: string }
}

/** Renders a template, sends it and records the result */
export async function sendTemplate(db: Db, store: Awaited<ReturnType<typeof loadStore>>, options: SendOptions) {
  const { templateId, to, values, orderNumber, dedupeKey } = options
  const template = options.override ?? (await loadTemplate(db, templateId))
  if (!template || ('active' in template && !template.active) || !to) return

  if (dedupeKey) {
    const { count } = await db
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('dedupe_key', dedupeKey)
      .eq('status', 'sent')
    if (count) return
  }

  const email = renderEmail({
    subject: template.subject ?? store.name,
    body: template.body,
    values: { store_name: store.name, ...values },
    storeName: store.name,
    footer: store.footer,
    unsubscribeUrl: options.unsubscribeUrl,
    button: options.button,
  })
  const result = await deliver({
    from: fromAddress(store.name),
    replyTo: store.email || undefined,
    to,
    ...email,
  })
  await db.from('email_log').insert({
    template_id: templateId,
    to_email: to,
    subject: email.subject,
    order_number: orderNumber ?? null,
    dedupe_key: result.ok ? (dedupeKey ?? null) : null,
    status: result.ok ? 'sent' : 'failed',
    error: result.ok ? null : result.error.slice(0, 500),
    attempts: result.attempts,
  })
  return result
}

// ---------- Orders ----------

const loadOrder = async (db: Db, number: string) => {
  const [{ data: order }, { data: lines }, { data: shipment }] = await Promise.all([
    db.from('orders').select('*').eq('number', number).single(),
    db.from('order_lines').select('*').eq('order_number', number).order('id'),
    db.from('shipments').select('*').eq('order_number', number).maybeSingle(),
  ])
  return order ? { order, lines: lines ?? [], shipment } : null
}

const orderValues = (o: any, lines: any[], shipment: any): EmailValues => {
  const details = orderDetails(
    lines.map(l => ({ name: l.name, variant: l.variant_label, qty: l.qty, unitPrice: l.unit_price })),
    { subtotal: o.subtotal, discount: o.coupon_discount, shipping: o.shipping, total: o.total },
    formatPKR,
  )
  return {
    customer_name: String(o.customer_name).split(' ')[0],
    customer_phone: o.customer_phone,
    order_number: o.number,
    order_total: formatPKR(o.total),
    discount: formatPKR(o.coupon_discount),
    order_details: details.text,
    order_details_html: details.html,
    delivery_address: [o.address, o.area, o.city].filter(Boolean).join(', '),
    courier: shipment?.courier ?? '',
    tracking_id: shipment?.tracking_id ?? '',
    tracking_url: shipment?.tracking_url ?? '',
  }
}

// Which customer email each status sends
const statusTemplate: Record<string, string> = {
  Confirmed: 'e-confirmed',
  Processing: 'e-processing',
  Packed: 'e-packed',
  Dispatched: 'e-dispatch',
  Delivered: 'e-order-delivered',
  Cancelled: 'e-cancel',
}

/** A new order: confirmation to the customer, alert to the owner, low-stock alerts */
export async function notifyOrderPlaced(number: string) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
    if (!data) return
    const values = orderValues(data.order, data.lines, data.shipment)
    const track = { label: 'Track your order', href: `${siteUrl}/track-order?order=${number}` }
    await Promise.allSettled([
      data.order.customer_email &&
        sendTemplate(db, store, {
          templateId: 'e-confirm',
          to: data.order.customer_email,
          values,
          orderNumber: number,
          dedupeKey: `e-confirm:${number}`,
          button: track,
        }),
      sendTemplate(db, store, {
        templateId: 'e-owner-order',
        to: store.email,
        values,
        orderNumber: number,
        dedupeKey: `e-owner-order:${number}`,
        button: { label: 'Open the order', href: `${siteUrl}/admin/orders/${number}` },
      }),
      notifyLowStock(db, store, data.lines.map(l => l.variant_id).filter(Boolean)),
    ])
  } catch (error) {
    console.error('[email] order placed', number, error)
  }
}

/** A status change made in the dashboard */
export async function notifyOrderStatus(number: string, status: string) {
  if (!ready()) return
  const templateId = statusTemplate[status]
  if (!templateId) return
  const db = createServiceClient()
  if (!db) return
  try {
    const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
    if (!data) return
    const values = orderValues(data.order, data.lines, data.shipment)
    const jobs: Promise<unknown>[] = []
    if (data.order.customer_email) {
      jobs.push(
        sendTemplate(db, store, {
          templateId,
          to: data.order.customer_email,
          values,
          orderNumber: number,
          // A dispatch email may repeat when the tracking ID is corrected
          dedupeKey: status === 'Dispatched' ? undefined : `${templateId}:${number}`,
          button:
            status === 'Dispatched' && values.tracking_url
              ? { label: 'Track with the courier', href: values.tracking_url }
              : { label: 'View your order', href: `${siteUrl}/track-order?order=${number}` },
        }),
      )
    }
    if (status === 'Cancelled') {
      jobs.push(
        sendTemplate(db, store, {
          templateId: 'e-owner-cancel',
          to: store.email,
          values,
          orderNumber: number,
          dedupeKey: `e-owner-cancel:${number}`,
        }),
      )
    }
    await Promise.allSettled(jobs)
  } catch (error) {
    console.error('[email] order status', number, status, error)
  }
}

async function notifyLowStock(db: Db, store: Awaited<ReturnType<typeof loadStore>>, variantIds: string[]) {
  if (!variantIds.length) return
  const { data } = await db
    .from('variants')
    .select('id, label, stock, products(name)')
    .in('id', variantIds)
    .lte('stock', LOW_STOCK)
  const today = new Date().toISOString().slice(0, 10)
  await Promise.allSettled(
    (data ?? []).map((v: any) =>
      sendTemplate(db, store, {
        templateId: 'e-owner-stock',
        to: store.email,
        values: {
          product_name: `${v.products?.name ?? 'A candle'}, ${v.label}`,
          stock_left: v.stock === 0 ? 'none' : String(v.stock),
        },
        // One alert per size per day
        dedupeKey: `e-owner-stock:${v.id}:${today}`,
        button: { label: 'Open products', href: `${siteUrl}/admin/products?stock=low` },
      }),
    ),
  )
}

// ---------- Other events ----------

export async function notifyInquiry(message: { name: string; contact: string; message: string }) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const store = await loadStore(db)
    await sendTemplate(db, store, {
      templateId: 'e-owner-inquiry',
      to: store.email,
      values: { customer_name: message.name, customer_contact: message.contact, message: message.message },
      button: { label: 'Open the inbox', href: `${siteUrl}/admin/messages` },
    })
  } catch (error) {
    console.error('[email] inquiry', error)
  }
}

export async function notifyNewSubscriber(email: string) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const store = await loadStore(db)
    const { data } = await db.from('subscribers').select('unsubscribe_token').eq('email', email.toLowerCase()).maybeSingle()
    await sendTemplate(db, store, {
      templateId: 'e-welcome',
      to: email,
      values: {},
      dedupeKey: `e-welcome:${email.toLowerCase()}`,
      unsubscribeUrl: data ? `${siteUrl}/unsubscribe?token=${data.unsubscribe_token}` : undefined,
      button: { label: 'Shop all candles', href: `${siteUrl}/shop` },
    })
  } catch (error) {
    console.error('[email] welcome', error)
  }
}

/** Review requests for orders delivered at least three days ago. Run once a day. */
export async function sendReviewRequests() {
  if (!ready()) return { sent: 0, skipped: 'Email or Supabase is not configured' }
  const db = createServiceClient()
  if (!db) return { sent: 0, skipped: 'SUPABASE_SERVICE_ROLE_KEY is not set' }

  const store = await loadStore(db)
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const until = new Date(Date.now() - 3 * 86_400_000).toISOString()
  // When each order was marked delivered comes from its history
  const { data: delivered } = await db
    .from('order_events')
    .select('order_number, at')
    .ilike('text', 'Marked as delivered%')
    .gte('at', since)
    .lte('at', until)
  let sent = 0
  for (const number of [...new Set((delivered ?? []).map(e => e.order_number as string))]) {
    const data = await loadOrder(db, number)
    if (!data?.order.customer_email || data.order.status !== 'Delivered') continue
    const first = data.lines.find(l => l.product_id)
    const { data: product } = first
      ? await db.from('products').select('slug').eq('id', first.product_id).maybeSingle()
      : { data: null }
    const result = await sendTemplate(db, store, {
      templateId: 'e-delivered',
      to: data.order.customer_email,
      values: orderValues(data.order, data.lines, data.shipment),
      orderNumber: number,
      dedupeKey: `e-delivered:${number}`,
      button: { label: 'Write a review', href: product ? `${siteUrl}/products/${product.slug}#reviews` : `${siteUrl}/shop` },
    })
    if (result?.ok) sent++
  }
  return { sent }
}
