'use server'

import {
  fromCampaign,
  fromCategory,
  fromCoupon,
  fromDraft,
  fromReview,
  fromSubscriber,
  fromTeamMember,
  fromTemplate,
  fromCustomerNote,
  fromShippingRate,
} from '@/lib/supabase/mappers'
import type { ContactMessage, Settings, Shop } from '@/components/admin/AdminData'
import { type SiteContent } from '@/data/content'
import { fail, friendly, ok, type ActionResult } from '../result'
import { guard, refreshStore } from './shared'

// Everything else in the shop

type ListKey = Exclude<keyof Shop, 'settings' | 'products' | 'activity' | 'content'>

const tables: Record<
  ListKey,
  { table: string; key: string; toRow: (item: any, index: number) => Record<string, unknown>; storefront?: boolean }
> = {
  categories: { table: 'categories', key: 'slug', toRow: fromCategory, storefront: true },
  shippingRates: { table: 'shipping_rates', key: 'id', toRow: fromShippingRate, storefront: true },
  customerNotes: { table: 'customer_notes', key: 'phone', toRow: fromCustomerNote },
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
    toRow: (m: ContactMessage) => ({
      id: m.id,
      name: m.name,
      contact: m.contact,
      message: m.message,
      handled: m.handled,
    }),
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

/** Saves the parts of the website text that changed */
export async function adminSaveContent(changes: Partial<SiteContent>): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const rows = Object.entries(changes).map(([key, value]) => ({ key, value }))
  if (!rows.length) return ok(null)
  const { error } = await g.supabase.from('site_content').upsert(rows)
  if (error) return fail(friendly(error.message))
  refreshStore()
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
      low_stock_threshold: settings.lowStockThreshold,
      review_request_days: settings.reviewRequestDays,
      abandoned_cart_hours: settings.abandonedCartHours,
      invoice_prefix: settings.invoicePrefix,
      easypaisa_name: settings.easypaisaName.trim(),
      easypaisa_number: settings.easypaisaNumber.replace(/\s/g, ''),
      whatsapp_enabled: settings.whatsappEnabled,
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
