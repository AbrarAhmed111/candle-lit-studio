'use server'

import {
  toCampaign,
  toCustomerNote,
  toShippingRate,
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
import type { ContactMessage, Shop } from '@/components/admin/AdminData'
import type { AdminOrder } from '@/data/admin'
import { currentContent } from '@/data/content'
import { fail, friendly, ok, type ActionResult } from '../result'
import { guard } from './shared'

// Loading

export type AdminSnapshot = { orders: AdminOrder[]; shop: Omit<Shop, never> }

export async function loadAdminData(): Promise<ActionResult<AdminSnapshot>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const db = g.supabase

  const [
    orders,
    products,
    categories,
    coupons,
    campaigns,
    reviews,
    settings,
    couriers,
    team,
    templates,
    subscribers,
    drafts,
    activity,
    inbox,
    rates,
    notes,
    content,
  ] = await Promise.all([
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
    db.from('shipping_rates').select('*').order('city'),
    db.from('customer_notes').select('*'),
    db.from('site_content').select('key, value'),
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
      shippingRates: rows(rates).map(toShippingRate),
      customerNotes: rows(notes).map(toCustomerNote),
      // Saved content over the starting text, so new keys always have a value
      content: { ...currentContent(), ...Object.fromEntries(rows(content).map((c: any) => [c.key, c.value])) },
      inbox: rows(inbox).map((m: any): ContactMessage => ({
        id: m.id,
        name: m.name,
        contact: m.contact,
        message: m.message,
        createdAt: m.created_at,
        handled: m.handled,
      })),
    },
  })
}
