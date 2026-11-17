// Database rows (snake_case) to the app's types (camelCase), and back.
import type { AdminCoupon, AdminProduct, AdminReview, Campaign, MessageTemplate, NewsletterDraft, Settings, Subscriber, TeamMember } from '@/components/admin/AdminData'
import type { Category, Product, Review, Variant } from '@/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const opt = <T,>(v: T | null | undefined) => (v === null ? undefined : v)

export const toVariant = (v: Row): Variant => ({
  id: v.id,
  label: v.label,
  sku: v.sku,
  price: v.price,
  stock: v.stock,
  weight: opt(v.weight),
  burnTime: opt(v.burn_time),
})

export const toProduct = (p: Row): AdminProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  categories: p.categories ?? [],
  tags: p.tags ?? [],
  fragrance: opt(p.fragrance),
  fragranceFamily: p.fragrance_family,
  notes: opt(p.notes),
  waxType: opt(p.wax_type),
  colour: opt(p.colour),
  dimensions: opt(p.dimensions),
  ingredients: opt(p.ingredients),
  art: p.art,
  images: p.images ?? [],
  variants: [...(p.variants ?? [])].sort((a: Row, b: Row) => a.sort - b.sort).map(toVariant),
  discountPercent: opt(p.discount_percent),
  rating: Number(p.rating ?? 0),
  reviewCount: p.review_count ?? 0,
  sold: p.sold ?? 0,
  createdAt: String(p.created_at).slice(0, 10),
  featured: p.featured,
  bestSeller: p.best_seller,
  isNew: p.is_new,
  active: p.active,
})

export const fromProduct = (p: Product & { active?: boolean }) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  categories: p.categories,
  tags: p.tags,
  fragrance: p.fragrance ?? null,
  fragrance_family: p.fragranceFamily,
  notes: p.notes ?? null,
  wax_type: p.waxType ?? null,
  colour: p.colour ?? null,
  dimensions: p.dimensions ?? null,
  ingredients: p.ingredients ?? null,
  art: p.art,
  images: p.images,
  discount_percent: p.discountPercent || null,
  featured: !!p.featured,
  best_seller: !!p.bestSeller,
  is_new: !!p.isNew,
  active: p.active ?? true,
})

export const fromVariant = (productId: string, v: Variant, sort: number) => ({
  id: v.id,
  product_id: productId,
  label: v.label,
  sku: v.sku,
  price: v.price,
  stock: v.stock,
  weight: v.weight ?? null,
  burn_time: v.burnTime ?? null,
  sort,
})

export const toCategory = (c: Row): Category => ({
  slug: c.slug,
  name: c.name,
  description: c.description,
  cover: c.cover,
})
export const fromCategory = (c: Category, sort: number) => ({ ...c, sort })

export const toReview = (r: Row): AdminReview => ({
  id: r.id,
  productId: r.product_id,
  author: r.author,
  city: r.city,
  rating: r.rating,
  title: r.title,
  body: r.body,
  date: String(r.date),
  verified: r.verified,
  status: r.status,
})
export const fromReview = (r: Review & { status?: string }) => ({
  id: r.id,
  product_id: r.productId,
  author: r.author,
  city: r.city,
  rating: r.rating,
  title: r.title,
  body: r.body,
  date: r.date,
  verified: r.verified,
  status: r.status ?? 'Approved',
})

export const toCoupon = (c: Row): AdminCoupon => ({
  code: c.code,
  type: c.type,
  value: c.value,
  minCart: opt(c.min_cart),
  maxDiscount: opt(c.max_discount),
  expiresAt: opt(c.expires_at),
  description: c.description,
  active: c.active,
  used: c.used,
  maxUses: opt(c.max_uses),
})
export const fromCoupon = (c: AdminCoupon) => ({
  code: c.code.toUpperCase(),
  type: c.type,
  value: c.value,
  min_cart: c.minCart ?? null,
  max_discount: c.maxDiscount ?? null,
  expires_at: c.expiresAt || null,
  description: c.description,
  active: c.active,
  used: c.used,
  max_uses: c.maxUses ?? null,
})

export const toCampaign = (c: Row): Campaign => ({
  id: c.id,
  name: c.name,
  description: c.description,
  startsAt: String(c.starts_at),
  endsAt: String(c.ends_at),
  discountPercent: c.discount_percent,
  categories: c.categories ?? [],
  active: c.active,
})
export const fromCampaign = (c: Campaign) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  starts_at: c.startsAt,
  ends_at: c.endsAt,
  discount_percent: c.discountPercent,
  categories: c.categories,
  active: c.active,
})

export const toSettings = (s: Row, couriers: Row[]): Settings => ({
  name: s.name,
  email: s.email,
  phone: s.phone,
  whatsapp: s.whatsapp,
  address: s.address,
  announcement: s.announcement,
  shippingFee: s.shipping_fee,
  freeShippingOver: s.free_shipping_over,
  deliveryEstimate: s.delivery_estimate,
  couriers: [...couriers]
    .sort((a, b) => a.sort - b.sort)
    .map(c => ({ name: c.name, trackingUrl: c.tracking_url, active: c.active })),
})

export const toTemplate = (t: Row): MessageTemplate => ({
  id: t.id,
  channel: t.channel,
  to: t.audience,
  name: t.name,
  trigger: t.trigger,
  subject: opt(t.subject),
  body: t.body,
  active: t.active,
})
export const fromTemplate = (t: MessageTemplate) => ({
  id: t.id,
  channel: t.channel,
  audience: t.to,
  name: t.name,
  trigger: t.trigger,
  subject: t.subject ?? null,
  body: t.body,
  active: t.active,
})

export const toSubscriber = (s: Row): Subscriber => ({
  email: s.email,
  name: opt(s.name),
  source: s.source,
  joinedAt: s.joined_at,
  subscribed: s.subscribed,
})
export const fromSubscriber = (s: Subscriber) => ({
  email: s.email.toLowerCase(),
  name: s.name ?? null,
  source: s.source,
  joined_at: s.joinedAt,
  subscribed: s.subscribed,
})

export const toDraft = (d: Row): NewsletterDraft => ({
  id: d.id,
  subject: d.subject,
  body: d.body,
  segment: d.segment,
  savedAt: d.saved_at,
})
export const fromDraft = (d: NewsletterDraft) => ({
  id: d.id,
  subject: d.subject,
  body: d.body,
  segment: d.segment,
  saved_at: d.savedAt,
})

export const toTeamMember = (t: Row): TeamMember => ({
  id: t.id,
  name: t.name,
  email: t.email,
  role: t.role,
  modules: t.modules ?? [],
  active: t.active,
})
export const fromTeamMember = (t: TeamMember) => ({
  id: t.id,
  name: t.name,
  email: t.email.toLowerCase(),
  role: t.role,
  modules: t.modules,
  active: t.active,
})
