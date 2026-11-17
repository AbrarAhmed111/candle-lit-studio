import { createServiceClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, siteUrl } from '@/lib/supabase/config'
import { formatPKR } from '@/lib/pricing'
import { emailConfigured } from './mailer'
import { orderDetails } from './render'
import { loadOrder, loadStore, orderValues, sendTemplate, type Db } from './notify'

// Emails that go out on a schedule (the daily job) or to many people at once.

/** Review requests for orders delivered at least three days ago. Run once a day. */
export async function sendReviewRequests() {
  if (!isSupabaseConfigured || !emailConfigured()) return { sent: 0, skipped: 'Email or Supabase is not configured' }
  const db = createServiceClient()
  if (!db) return { sent: 0, skipped: 'SUPABASE_SERVICE_ROLE_KEY is not set' }

  const store = await loadStore(db)
  const since = new Date(Date.now() - (store.reviewDays + 30) * 86_400_000).toISOString()
  const until = new Date(Date.now() - store.reviewDays * 86_400_000).toISOString()
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
      button: {
        label: 'Write a review',
        href: product ? `${siteUrl}/products/${product.slug}#reviews` : `${siteUrl}/shop`,
      },
    })
    if (result?.ok) sent++
  }
  return { sent }
}

// ---------- Newsletters ----------

type Draft = { id: string; subject: string; body: string; segment: string }

/** Sends a newsletter to these addresses. Only people still subscribed receive it. */
export async function sendNewsletterTo(
  db: Db,
  store: Awaited<ReturnType<typeof loadStore>>,
  draft: Draft,
  emails: string[],
) {
  const wanted = [...new Set(emails.map(e => e.toLowerCase()))]
  const { data: subscribers } = await db
    .from('subscribers')
    .select('email, unsubscribe_token')
    .in('email', wanted.length ? wanted : [''])
    .eq('subscribed', true)
  let sent = 0
  let failed = 0
  // A few at a time keeps most SMTP providers happy
  for (let i = 0; i < (subscribers ?? []).length; i += 5) {
    const batch = subscribers!.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(sub =>
        sendTemplate(db, store, {
          templateId: 'newsletter',
          to: sub.email,
          values: {},
          override: { subject: draft.subject, body: draft.body },
          dedupeKey: `newsletter:${draft.id}:${sub.email}`,
          unsubscribeUrl: `${siteUrl}/unsubscribe?token=${sub.unsubscribe_token}`,
          button: { label: 'Visit the shop', href: `${siteUrl}/shop` },
        }),
      ),
    )
    results.forEach(r => (r?.ok ? sent++ : failed++))
  }
  await db.from('newsletter_drafts').update({ sent_at: new Date().toISOString(), sent_count: sent }).eq('id', draft.id)
  return { sent, failed }
}

/** The subscribed emails in one of the dashboard's newsletter groups */
export async function audienceFor(db: Db, segment: string) {
  const { data: subs } = await db.from('subscribers').select('email').eq('subscribed', true)
  const all = (subs ?? []).map(s => s.email as string)
  if (segment === 'All subscribers') return all
  const { data: orders } = await db.from('orders').select('customer_email, placed_at').not('customer_email', 'is', null)
  const byEmail = new Map<string, string[]>()
  for (const o of orders ?? []) {
    const email = String(o.customer_email).toLowerCase()
    byEmail.set(email, [...(byEmail.get(email) ?? []), o.placed_at as string])
  }
  const recent = (email: string) =>
    (byEmail.get(email) ?? []).some(at => Date.now() - new Date(at).getTime() < 30 * 86_400_000)
  switch (segment) {
    case 'Have ordered before':
      return all.filter(e => byEmail.has(e))
    case 'Ordered more than once':
      return all.filter(e => (byEmail.get(e)?.length ?? 0) > 1)
    case 'No order in the last 30 days':
      return all.filter(e => !recent(e))
    case 'Never ordered':
      return all.filter(e => !byEmail.has(e))
    default:
      return all
  }
}

/** Newsletters scheduled for now or earlier. Run by the daily job. */
export async function sendScheduledNewsletters() {
  if (!isSupabaseConfigured || !emailConfigured()) return { sent: 0 }
  const db = createServiceClient()
  if (!db) return { sent: 0 }
  const store = await loadStore(db)
  const { data: due } = await db
    .from('newsletter_drafts')
    .select('*')
    .is('sent_at', null)
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', new Date().toISOString())
  let sent = 0
  for (const draft of due ?? []) {
    const result = await sendNewsletterTo(db, store, draft as Draft, await audienceFor(db, draft.segment as string))
    sent += result.sent
  }
  return { sent, newsletters: due?.length ?? 0 }
}

// ---------- Abandoned carts ----------

/** One reminder to customers who typed their email at checkout but did not order */
export async function sendCartReminders() {
  if (!isSupabaseConfigured || !emailConfigured()) return { sent: 0 }
  const db = createServiceClient()
  if (!db) return { sent: 0 }
  const store = await loadStore(db)
  const { data: carts } = await db
    .from('carts')
    .select('*')
    .is('recovered_order', null)
    .is('reminded_at', null)
    .lte('updated_at', new Date(Date.now() - store.cartHours * 3_600_000).toISOString())
    .gte('updated_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
  let sent = 0
  for (const cart of carts ?? []) {
    const items = (cart.items ?? []) as { variantId: string; qty: number }[]
    const { data: variants } = await db
      .from('variants')
      .select('id, label, price, products(name, discount_percent, active)')
      .in(
        'id',
        items.map(i => i.variantId),
      )
    const lines = items.flatMap(i => {
      const v = (variants ?? []).find((x: any) => x.id === i.variantId) as any
      if (!v || !v.products?.active) return []
      const unit = v.products.discount_percent ? Math.round(v.price * (1 - v.products.discount_percent / 100)) : v.price
      return [{ name: v.products.name, variant: v.label, qty: i.qty, unitPrice: unit }]
    })
    // Mark it first so a slow send never sends twice
    await db.from('carts').update({ reminded_at: new Date().toISOString() }).eq('id', cart.id)
    if (!lines.length) continue
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    const details = orderDetails(lines, { subtotal, discount: 0, shipping: 0, total: subtotal }, formatPKR)
    const result = await sendTemplate(db, store, {
      templateId: 'e-cart',
      to: cart.email,
      values: {
        customer_name: (cart.name as string)?.split(' ')[0] || 'there',
        order_details: details.text,
        order_details_html: details.html,
        order_total: formatPKR(subtotal),
      },
      dedupeKey: `e-cart:${cart.id}`,
      button: { label: 'Back to my cart', href: `${siteUrl}/cart?restore=${cart.id}` },
    })
    if (result?.ok) sent++
  }
  return { sent }
}
