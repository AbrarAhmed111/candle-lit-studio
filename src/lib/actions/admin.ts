'use server'

import { revalidateTag } from 'next/cache'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { CATALOG_TAG } from '@/lib/catalog/server'
import {
  fromCampaign,
  fromCategory,
  fromCoupon,
  fromDraft,
  fromProduct,
  fromReview,
  fromSubscriber,
  fromTeamMember,
  fromTemplate,
  fromVariant,
  toCampaign,
  toCategory,
  toCoupon,
  toDraft,
  toProduct,
  toReview,
  toSettings,
  toSubscriber,
  toTeamMember,
  toTemplate,
} from '@/lib/supabase/mappers'
import type { AdminProduct, ContactMessage, Settings, Shop } from '@/components/admin/AdminData'
import type { AdminOrder } from '@/data/admin'
import { fail, friendly, ok, NOT_CONNECTED, type ActionResult } from './result'
import { notifyOrderStatus, sendTemplate } from '@/lib/email/notify'
import { emailConfigured } from '@/lib/email/mailer'
import { createServiceClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/supabase/config'

/* eslint-disable @typescript-eslint/no-explicit-any */

const staffClient = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

const guard = async () => {
  if (!isSupabaseConfigured) return { error: NOT_CONNECTED } as const
  const { supabase, user } = await staffClient()
  if (!user) return { error: 'Please sign in again.' } as const
  return { supabase, user } as const
}

const refreshStore = () => revalidateTag(CATALOG_TAG)

// ---------- Loading ----------

export type AdminSnapshot = { orders: AdminOrder[]; shop: Omit<Shop, never> }

export async function loadAdminData(): Promise<ActionResult<AdminSnapshot>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const [orders, products, categories, coupons, campaigns, reviews, settings, couriers, team, templates, subscribers, drafts, activity, inbox] =
    await Promise.all([
      db.rpc('admin_orders'),
      db.from('products').select('*, variants(*)').order('created_at', { ascending: false }),
      db.from('categories').select('*').order('sort'),
      db.from('coupons').select('*').order('created_at'),
      db.from('campaigns').select('*').order('starts_at', { ascending: false }),
      db.from('reviews').select('*').order('created_at', { ascending: false }),
      db.from('store_settings').select('*').eq('id', 1).single(),
      db.from('couriers').select('*').order('sort'),
      db.from('team_members').select('*').order('name'),
      db.from('message_templates').select('*').order('id'),
      db.from('subscribers').select('*').order('joined_at', { ascending: false }),
      db.from('newsletter_drafts').select('*').order('saved_at', { ascending: false }),
      db.from('activity_log').select('*').order('at', { ascending: false }).limit(300),
      db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500),
    ])

  // A manager without access to a module gets an empty list there, not an error
  const rows = (r: { data: any; error: any }) => (r.error ? [] : (r.data ?? []))
  if (settings.error) return fail(friendly(settings.error.message))

  return ok({
    orders: orders.error ? [] : ((orders.data as AdminOrder[]) ?? []),
    shop: {
      products: rows(products).map(toProduct),
      categories: rows(categories).map(toCategory),
      coupons: rows(coupons).map(toCoupon),
      campaigns: rows(campaigns).map(toCampaign),
      reviews: rows(reviews).map(toReview),
      settings: toSettings(settings.data, rows(couriers)),
      team: rows(team).map(toTeamMember),
      templates: rows(templates).map(toTemplate),
      subscribers: rows(subscribers).map(toSubscriber),
      drafts: rows(drafts).map(toDraft),
      activity: rows(activity).map((a: any) => ({ at: a.at, text: a.text })),
      inbox: rows(inbox).map(
        (m: any): ContactMessage => ({
          id: m.id,
          name: m.name,
          contact: m.contact,
          message: m.message,
          createdAt: m.created_at,
          handled: m.handled,
        }),
      ),
    },
  })
}

// ---------- Orders ----------

export async function adminUpdateOrder(number: string, patch: Partial<AdminOrder>, event?: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const columns: Record<string, unknown> = {}
  if (patch.status) columns.status = patch.status
  if (patch.paymentStatus) columns.payment_status = patch.paymentStatus
  if ('cancelReason' in patch) columns.cancel_reason = patch.cancelReason ?? null
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

// ---------- Products ----------

export async function adminSaveProduct(product: AdminProduct): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const { error } = await db.from('products').upsert(fromProduct(product))
  if (error) return fail(friendly(error.message))

  const keep = product.variants.map(v => v.id)
  const { data: existing } = await db.from('variants').select('id').eq('product_id', product.id)
  const gone = (existing ?? []).map(v => v.id).filter(id => !keep.includes(id))
  if (gone.length) {
    const { error: removeError } = await db.from('variants').delete().in('id', gone)
    if (removeError) return fail(friendly(removeError.message))
  }
  const { error: variantError } = await db
    .from('variants')
    .upsert(product.variants.map((v, i) => fromVariant(product.id, v, i)))
  if (variantError) return fail(friendly(variantError.message))

  refreshStore()
  return ok(null)
}

export async function adminDeleteProduct(id: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.from('products').delete().eq('id', id)
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

export async function adminSetProductActive(id: string, active: boolean): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.from('products').update({ active }).eq('id', id)
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

export async function adminSetVariant(variantId: string, values: { price: number; stock: number }): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { error } = await g.supabase.from('variants').update(values).eq('id', variantId)
  if (error) return fail(friendly(error.message))
  refreshStore()
  return ok(null)
}

/** Uploads a product photo to storage and returns its public address */
export async function adminUploadImage(form: FormData): Promise<ActionResult<string>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a photo first.')
  if (file.size > 5 * 1024 * 1024) return fail('That photo is over 5 MB. Choose a smaller one.')
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return fail('Use a JPG, PNG, WebP or AVIF photo.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
  const { error } = await g.supabase.storage.from('product-images').upload(path, file, { contentType: file.type })
  if (error) return fail(friendly(error.message))
  return ok(g.supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
}

// ---------- Everything else in the shop ----------

type ListKey = Exclude<keyof Shop, 'settings' | 'products' | 'activity'>

const tables: Record<ListKey, { table: string; key: string; toRow: (item: any, index: number) => Record<string, unknown>; storefront?: boolean }> = {
  categories: { table: 'categories', key: 'slug', toRow: fromCategory, storefront: true },
  coupons: { table: 'coupons', key: 'code', toRow: fromCoupon },
  campaigns: { table: 'campaigns', key: 'id', toRow: fromCampaign, storefront: true },
  reviews: { table: 'reviews', key: 'id', toRow: fromReview, storefront: true },
  team: { table: 'team_members', key: 'id', toRow: fromTeamMember },
  templates: { table: 'message_templates', key: 'id', toRow: fromTemplate },
  subscribers: { table: 'subscribers', key: 'email', toRow: fromSubscriber },
  drafts: { table: 'newsletter_drafts', key: 'id', toRow: fromDraft },
  inbox: {
    table: 'contact_messages',
    key: 'id',
    toRow: (m: ContactMessage) => ({ id: m.id, name: m.name, contact: m.contact, message: m.message, handled: m.handled }),
  },
}

/**
 * Saves the rows of one list that changed in the dashboard.
 * `upsert` holds new and edited items (whole items, in the app's shape),
 * `remove` the keys of deleted ones, `order` every key in display order.
 */
export async function adminSyncList(
  key: ListKey,
  changes: { upsert: any[]; remove: string[]; order?: string[] },
): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const spec = tables[key]
  if (!spec) return fail('Unknown list.')
  const db = g.supabase

  if (changes.remove.length) {
    const { error } = await db.from(spec.table).delete().in(spec.key, changes.remove)
    if (error) return fail(friendly(error.message))
  }
  if (changes.upsert.length) {
    const rows = changes.upsert.map(item => {
      // Only categories keep a display order
      const index = key === 'categories' && changes.order ? changes.order.indexOf(item.slug) : 0
      return spec.toRow(item, Math.max(0, index))
    })
    const { error } = await db.from(spec.table).upsert(rows)
    if (error) return fail(friendly(error.message))
  }
  if (spec.storefront) refreshStore()
  return ok(null)
}

export async function adminSaveSettings(settings: Settings): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const { error } = await db
    .from('store_settings')
    .update({
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      address: settings.address,
      announcement: settings.announcement,
      shipping_fee: settings.shippingFee,
      free_shipping_over: settings.freeShippingOver,
      delivery_estimate: settings.deliveryEstimate,
    })
    .eq('id', 1)
  if (error) return fail(friendly(error.message))

  const names = settings.couriers.map(c => c.name)
  const { data: existing } = await db.from('couriers').select('name')
  const gone = (existing ?? []).map(c => c.name).filter(n => !names.includes(n))
  if (gone.length) await db.from('couriers').delete().in('name', gone)
  const { error: courierError } = await db
    .from('couriers')
    .upsert(settings.couriers.map((c, i) => ({ name: c.name, tracking_url: c.trackingUrl, active: c.active, sort: i })))
  if (courierError) return fail(friendly(courierError.message))

  refreshStore()
  return ok(null)
}

export async function adminLog(entries: { at: string; text: string }[]): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  if (!entries.length) return ok(null)
  const { error } = await g.supabase
    .from('activity_log')
    .insert(entries.map(e => ({ at: e.at, text: e.text, actor: g.user.id })))
  return error ? fail(friendly(error.message)) : ok(null)
}

/** Products saved from the bulk import page */
export async function adminImportProducts(products: AdminProduct[]): Promise<ActionResult> {
  for (const product of products) {
    const result = await adminSaveProduct(product)
    if (!result.ok) return fail(`${product.name}: ${result.error}`)
  }
  return ok(null)
}

// ---------- Email ----------

export type EmailLogEntry = {
  id: number
  at: string
  templateId: string
  to: string
  subject: string
  orderNumber?: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
  attempts: number
}

export type EmailOverview = {
  /** SMTP settings are present */
  smtp: boolean
  /** The service role key is present, needed to send from checkout and the daily job */
  serviceKey: boolean
  log: EmailLogEntry[]
}

export async function adminEmailOverview(): Promise<ActionResult<EmailOverview>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data, error } = await g.supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) return fail(friendly(error.message))
  return ok({
    smtp: emailConfigured(),
    serviceKey: !!createServiceClient(),
    log: (data ?? []).map((e: any) => ({
      id: e.id,
      at: e.created_at,
      templateId: e.template_id,
      to: e.to_email,
      subject: e.subject,
      orderNumber: e.order_number ?? undefined,
      status: e.status,
      error: e.error ?? undefined,
      attempts: e.attempts,
    })),
  })
}

const sample = {
  customer_name: 'Sarah',
  customer_phone: '03001234567',
  order_number: 'CND-1024',
  order_total: 'Rs. 3,503',
  discount: 'Rs. 0',
  order_details: 'Desi Gulab, 220 g x 1: Rs. 1,850\nChai & Cardamom, 220 g x 1: Rs. 1,403\nDelivery: Rs. 250\nPay on delivery: Rs. 3,503',
  delivery_address: 'House 12, Street 8, DHA Phase 5, Lahore',
  courier: 'TCS',
  tracking_id: '779812345601',
  tracking_url: 'https://www.tcsexpress.com/track/',
  product_name: 'Desi Gulab, 220 g',
  stock_left: '3',
  customer_contact: '0300 1234567',
  message: 'Do you make custom scents for weddings?',
}

/** Sends the wording on screen to one address, filled with a sample order */
export async function adminSendTestEmail(templateId: string, wording: { subject: string; body: string }, to: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  if (!emailConfigured()) return fail('Email is not set up yet. Add the SMTP settings to the environment first.')
  const db = createServiceClient()
  if (!db) return fail('Add SUPABASE_SERVICE_ROLE_KEY to the environment to send emails.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) return fail('Enter an email address like name@example.com.')

  const { data: s } = await db.from('store_settings').select('*').eq('id', 1).single()
  const store = { name: s?.name ?? 'Candle Lit Studio', email: s?.email ?? '', footer: `${s?.name ?? ''}, ${s?.address ?? ''}. ${s?.phone ?? ''}` }
  const result = await sendTemplate(db, store, {
    templateId: `test:${templateId}`,
    to: to.trim(),
    values: sample,
    override: { subject: `[Test] ${wording.subject || store.name}`, body: wording.body },
  })
  return result?.ok ? ok(null) : fail(result && !result.ok ? `Not sent: ${result.error}` : 'Not sent.')
}

/** Sends a newsletter draft to the chosen subscribers, each with their own unsubscribe link */
export async function adminSendNewsletter(draftId: string, emails: string[]): Promise<ActionResult<{ sent: number; failed: number }>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  if (!emailConfigured()) return fail('Email is not set up yet. Add the SMTP settings to the environment first.')
  const db = createServiceClient()
  if (!db) return fail('Add SUPABASE_SERVICE_ROLE_KEY to the environment to send emails.')

  // Read through the signed-in session: only Newsletter staff can see drafts
  const { data: draft, error } = await g.supabase.from('newsletter_drafts').select('*').eq('id', draftId).single()
  if (error || !draft) return fail('That draft no longer exists.')
  if (draft.sent_at) return fail('This newsletter has already been sent.')

  // Only people who are still subscribed, whatever the page sent
  const wanted = [...new Set(emails.map(e => e.toLowerCase()))]
  const { data: subscribers } = await db
    .from('subscribers')
    .select('email, unsubscribe_token')
    .in('email', wanted.length ? wanted : [''])
    .eq('subscribed', true)
  if (!subscribers?.length) return fail('Nobody in this group is subscribed.')

  const { data: s } = await db.from('store_settings').select('*').eq('id', 1).single()
  const store = { name: s?.name ?? 'Candle Lit Studio', email: s?.email ?? '', footer: `${s?.name ?? ''}, ${s?.address ?? ''}. ${s?.phone ?? ''}` }
  let sent = 0
  let failed = 0
  // A few at a time keeps most SMTP providers happy
  for (let i = 0; i < subscribers.length; i += 5) {
    const batch = subscribers.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(sub =>
        sendTemplate(db, store, {
          templateId: 'newsletter',
          to: sub.email,
          values: {},
          override: { subject: draft.subject, body: draft.body },
          dedupeKey: `newsletter:${draftId}:${sub.email}`,
          unsubscribeUrl: `${siteUrl}/unsubscribe?token=${sub.unsubscribe_token}`,
          button: { label: 'Visit the shop', href: `${siteUrl}/shop` },
        }),
      ),
    )
    results.forEach(r => (r?.ok ? sent++ : failed++))
  }
  await g.supabase.from('newsletter_drafts').update({ sent_at: new Date().toISOString(), sent_count: sent }).eq('id', draftId)
  return ok({ sent, failed })
}
