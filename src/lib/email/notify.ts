import { createServiceClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, siteUrl } from '@/lib/supabase/config'
import { formatPKR } from '@/lib/pricing'
import { deliver, emailConfigured, fromAddress } from './mailer'
import { orderDetails, renderEmail, type EmailValues } from './render'

/*
 * Every automatic email goes through here. Sending never throws: a failed
 * email is written to email_log and the order or action carries on.
 */

const ready = () => isSupabaseConfigured && emailConfigured()

export type Db = NonNullable<ReturnType<typeof createServiceClient>>

export const loadStore = async (db: Db) => {
  const { data } = await db.from('store_settings').select('*').eq('id', 1).single()
  return {
    name: (data?.name as string) ?? 'Candle Lit Studio',
    email: (data?.email as string) ?? '',
    footer: `${data?.name ?? 'Candle Lit Studio'}, ${data?.address ?? ''}. ${data?.phone ?? ''}`.trim(),
    lowStock: (data?.low_stock_threshold as number) ?? 5,
    reviewDays: (data?.review_request_days as number) ?? 3,
    cartHours: (data?.abandoned_cart_hours as number) ?? 24,
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
  /** Use this wording instead of the saved template (newsletters) */
  override?: { subject: string; body: string }
}

/** Renders a template, sends it and records the result */
export async function sendTemplate(db: Db, store: Awaited<ReturnType<typeof loadStore>>, options: SendOptions) {
  const { templateId, to, values, orderNumber, dedupeKey } = options
  // Without SMTP settings emails are skipped quietly, so the log only shows real attempts
  if (!emailConfigured()) return
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

export const loadOrder = async (db: Db, number: string) => {
  const [{ data: order }, { data: lines }, { data: shipment }] = await Promise.all([
    db.from('orders').select('*').eq('number', number).single(),
    db.from('order_lines').select('*').eq('order_number', number).order('id'),
    db.from('shipments').select('*').eq('order_number', number).maybeSingle(),
  ])
  return order ? { order, lines: lines ?? [], shipment } : null
}

/** How the order is paid, in words for {{payment_note}} and {{cancel_payment_note}} */
const paymentWords = (o: any) => {
  const total = formatPKR(o.total)
  if (o.payment_method !== 'Easypaisa')
    return { note: `Total to pay on delivery: ${total}.`, cancel: 'Nothing was charged.', method: 'cash on delivery' }
  const method = `Easypaisa${o.payment_reference ? `, transaction ID ${o.payment_reference}` : ''}`
  const cancel =
    o.payment_status === 'Paid'
      ? 'We will contact you to return your Easypaisa payment.'
      : 'If your Easypaisa payment reached us, we will contact you to return it.'
  const note =
    o.payment_status === 'Paid'
      ? `Total ${total}, paid by Easypaisa. Thank you.`
      : o.payment_status === 'Payment Rejected'
        ? `Total ${total}. We could not confirm your Easypaisa payment yet.`
        : `Total ${total}, paid by Easypaisa. We are checking your payment and will confirm it shortly.`
  return { note, cancel, method }
}

export const orderValues = (o: any, lines: any[], shipment: any): EmailValues => {
  const details = orderDetails(
    lines.map(l => ({
      name: l.name,
      variant: l.colour ? `${l.variant_label}, ${l.colour}` : l.variant_label,
      qty: l.qty,
      unitPrice: l.unit_price,
    })),
    { subtotal: o.subtotal, discount: o.coupon_discount, shipping: o.shipping, total: o.total },
    formatPKR,
    o.payment_method === 'Easypaisa' ? 'Total' : 'Pay on delivery',
  )
  const payment = paymentWords(o)
  return {
    payment_method: payment.method,
    payment_note: payment.note,
    cancel_payment_note: payment.cancel,
    transaction_id: o.payment_reference ?? '',
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

/** Sends one order email again from the dashboard, even if it went out before */
export async function resendOrderEmail(number: string, templateId: string) {
  if (!ready())
    return {
      ok: false as const,
      error: 'Email sending is not set up yet. Ask your website developer to finish the email setup.',
    }
  const db = createServiceClient()
  if (!db)
    return {
      ok: false as const,
      error: 'Email sending is not set up yet. Ask your website developer to finish the email setup.',
    }
  const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
  if (!data) return { ok: false as const, error: 'Order not found.' }
  if (!data.order.customer_email) return { ok: false as const, error: 'This customer gave no email address.' }
  const values = orderValues(data.order, data.lines, data.shipment)
  if (templateId === 'e-order-delivered' || templateId === 'e-delivered')
    values.review_links = reviewText(await reviewLinks(db, data.lines))
  const result = await sendTemplate(db, store, {
    templateId,
    to: data.order.customer_email,
    values,
    orderNumber: number,
    button: values.tracking_url
      ? { label: 'Track with the courier', href: values.tracking_url }
      : { label: 'View your order', href: `${siteUrl}/track-order?order=${number}` },
  })
  return result ?? { ok: false as const, error: 'That email is switched off in Messages.' }
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
    // The delivered email asks for a review of each candle in the order
    const reviews = status === 'Delivered' ? await reviewLinks(db, data.lines) : []
    if (status === 'Delivered') values.review_links = reviewText(reviews)
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
              : reviews.length
                ? { label: 'Write a review', href: reviews[0].href }
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

/** Each candle with its review link, one per line (the shop when none is found) */
const reviewText = (reviews: { name: string; href: string }[]) =>
  reviews.length ? reviews.map(r => `${r.name}: ${r.href}`).join('\n') : `${siteUrl}/shop`

/** A link to the review form of each different candle in an order */
async function reviewLinks(db: Db, lines: any[]) {
  const ids = [...new Set(lines.map(l => l.product_id).filter(Boolean))] as string[]
  if (!ids.length) return []
  const { data } = await db.from('products').select('id, name, slug').in('id', ids)
  return ids.flatMap(id => {
    const p = (data ?? []).find((row: any) => row.id === id)
    return p ? [{ name: p.name as string, href: `${siteUrl}/products/${p.slug}#reviews` }] : []
  })
}

async function notifyLowStock(db: Db, store: Awaited<ReturnType<typeof loadStore>>, variantIds: string[]) {
  if (!variantIds.length) return
  const { data } = await db
    .from('variants')
    .select('id, label, stock, products(name)')
    .in('id', variantIds)
    .lte('stock', store.lowStock)
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

// ---------- Easypaisa payments ----------

/** The owner approved or rejected a payment: the customer hears either way */
export async function notifyPaymentReviewed(number: string, approved: boolean, reason?: string) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
    if (!data?.order.customer_email) return
    const templateId = approved ? 'e-payment-approved' : 'e-payment-rejected'
    await sendTemplate(db, store, {
      templateId,
      to: data.order.customer_email,
      values: { ...orderValues(data.order, data.lines, data.shipment), message: reason ?? '' },
      orderNumber: number,
      // A second rejection (after new details) must reach the customer too
      dedupeKey: approved ? `${templateId}:${number}` : undefined,
      button: approved
        ? { label: 'View your order', href: `${siteUrl}/track-order?order=${number}` }
        : { label: 'Send payment details', href: `${siteUrl}/track-order?order=${number}` },
    })
  } catch (error) {
    console.error('[email] payment reviewed', number, error)
  }
}

/** A customer sent new payment details after a rejection */
export async function notifyPaymentResubmitted(number: string) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
    if (!data) return
    await sendTemplate(db, store, {
      templateId: 'e-owner-payment',
      to: store.email,
      values: orderValues(data.order, data.lines, data.shipment),
      orderNumber: number,
      button: { label: 'Check the payment', href: `${siteUrl}/admin/orders/${number}` },
    })
  } catch (error) {
    console.error('[email] payment resubmitted', number, error)
  }
}

// ---------- Other events ----------

/** Tells the owner a customer asked to cancel */
export async function notifyCancelRequest(number: string, reason: string) {
  if (!ready()) return
  const db = createServiceClient()
  if (!db) return
  try {
    const [store, data] = await Promise.all([loadStore(db), loadOrder(db, number)])
    if (!data) return
    await sendTemplate(db, store, {
      templateId: 'e-cancel-request',
      to: store.email,
      values: { ...orderValues(data.order, data.lines, data.shipment), message: reason || 'No reason given' },
      orderNumber: number,
      dedupeKey: `e-cancel-request:${number}`,
      button: { label: 'Open the order', href: `${siteUrl}/admin/orders/${number}` },
    })
  } catch (error) {
    console.error('[email] cancel request', error)
  }
}

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
    const { data } = await db
      .from('subscribers')
      .select('unsubscribe_token')
      .eq('email', email.toLowerCase())
      .maybeSingle()
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
