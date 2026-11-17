'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  adminAddNote,
  adminCreateOrder,
  adminDeleteProduct,
  adminLog,
  adminSaveProduct,
  adminSaveContent,
  adminSaveSettings,
  adminSyncList,
  adminReviewPayment,
  adminUpdateOrder,
  loadAdminData,
  type AdminSnapshot,
} from '@/lib/actions/admin'
import { buildCustomers, buildOrders, withHistory, type AdminCustomer, type AdminOrder } from '@/data/admin'
import { localOrders } from '@/lib/orders'
import { seedShop } from '@/data/admin-seed'
import { useLiveUpdates } from './useLiveUpdates'
import type { SiteContent } from '@/data/content'

export { seedShop }
import type { Category, Coupon, Product, Review } from '@/types'

const ORDERS_KEY = 'cls_admin_orders' // orders edited in the dashboard
const SHOP_KEY = 'cls_admin_shop' // catalogue, promotions, reviews and settings
const CREATED_KEY = 'cls_admin_created' // orders entered by hand in the dashboard

export type AdminProduct = Product & { active: boolean }
export type AdminCoupon = Coupon & { active: boolean; used: number; maxUses?: number }
export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected'
export type AdminReview = Review & { status: ReviewStatus; reports?: number }

export type Campaign = {
  id: string
  name: string
  description: string
  /** yyyy-mm-dd, both days included */
  startsAt: string
  endsAt: string
  discountPercent: number
  /** Category slugs the discount applies to. Empty means the whole store. */
  categories: string[]
  active: boolean
}

export type Settings = {
  name: string
  email: string
  phone: string
  whatsapp: string
  address: string
  announcement: string
  shippingFee: number
  freeShippingOver: number
  deliveryEstimate: string
  couriers: { name: string; trackingUrl: string; active: boolean }[]
  /** A size counts as low with this many or fewer left */
  lowStockThreshold: number
  /** Days after delivery before the review request email */
  reviewRequestDays: number
  /** Hours a cart waits before the reminder email */
  abandonedCartHours: number
  invoicePrefix: string
  /** Easypaisa account customers outside Quetta pay into */
  easypaisaName: string
  easypaisaNumber: string
  /** Not used: kept so saved settings load */
  whatsappEnabled: boolean
}

/** Delivery fee for one city, or one area of a city */
export type ShippingRate = {
  id: string
  city: string
  /** Empty means the whole city */
  area: string
  fee: number
  /** Free delivery above this cart value here. Empty uses the store setting. */
  freeOver?: number
  active: boolean
}

export type CustomerStatus = 'Active' | 'VIP' | 'Blocked'

/** The team's notes about one customer, keyed by mobile number */
export type CustomerNote = { phone: string; note: string; status: CustomerStatus }

export type ActivityEntry = { at: string; text: string }

export { modules } from '@/data/modules'

export type TeamMember = {
  id: string
  name: string
  email: string
  role: 'Administrator' | 'Manager'
  /** Modules a manager may open. Administrators always have all of them. */
  modules: string[]
  active: boolean
  /** True once they have signed in to the dashboard */
  joined?: boolean
}

export type MessageTemplate = {
  id: string
  channel: 'email' | 'whatsapp'
  /** Who receives it */
  to: 'Customer' | 'Owner'
  name: string
  /** The moment it is sent */
  trigger: string
  subject?: string
  body: string
  active: boolean
  /** WhatsApp only: the template approved in WhatsApp Manager */
  waTemplate?: string
  waLanguage?: string
}

export type Subscriber = {
  email: string
  name?: string
  source: 'Popup' | 'Footer' | 'Checkout'
  joinedAt: string
  subscribed: boolean
}

export type NewsletterDraft = {
  id: string
  subject: string
  body: string
  segment: string
  savedAt: string
  /** Send automatically at this time (checked once a day) */
  scheduledFor?: string
  /** Set once the newsletter has gone out */
  sentAt?: string
  sentCount?: number
}

/** Messages sent through the storefront contact form */
export type ContactMessage = {
  id: string
  name: string
  contact: string
  message: string
  createdAt: string
  handled: boolean
}

export type Shop = {
  shippingRates: ShippingRate[]
  customerNotes: CustomerNote[]
  /** Website text: homepage slides, About, FAQ, policies, social links, SEO */
  content: SiteContent
  activity: ActivityEntry[]
  inbox: ContactMessage[]
  team: TeamMember[]
  templates: MessageTemplate[]
  subscribers: Subscriber[]
  drafts: NewsletterDraft[]
  products: AdminProduct[]
  categories: Category[]
  coupons: AdminCoupon[]
  campaigns: Campaign[]
  reviews: AdminReview[]
  settings: Settings
}

type AdminData = Shop & {
  /** null until the data has loaded */
  orders: AdminOrder[] | null
  customers: AdminCustomer[]
  /** True when the dashboard reads and writes the Supabase database */
  live: boolean
  /** Set when the live data could not be loaded */
  loadError: string | null
  /** Reloads everything from the database */
  refresh: () => void
  /** Applies a change and records it in the order's history */
  updateOrder: (number: string, patch: Partial<AdminOrder>, event?: string) => void
  addNote: (number: string, text: string) => void
  /** Approves or rejects an Easypaisa payment. The customer is emailed. */
  reviewPayment: (number: string, approve: boolean, reason?: string) => void
  /** Adds an order entered by hand, for phone and WhatsApp orders */
  addOrder: (order: AdminOrder) => void
  setProductActive: (id: string, active: boolean) => void
  setVariant: (variantId: string, values: { price: number; stock: number }) => void
  /** Adds the product, or replaces the one with the same id */
  saveProduct: (product: AdminProduct) => void
  deleteProduct: (id: string) => void
  /** Replaces one part of the shop: categories, coupons, campaigns, reviews or settings */
  setShop: <K extends keyof Shop>(key: K, apply: (current: Shop[K]) => Shop[K]) => void
}

const Context = createContext<AdminData | null>(null)

const load = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked: edits last until the page reloads
  }
}

// The field that identifies an item in each list
const keyOf: Record<Exclude<keyof Shop, 'settings' | 'activity' | 'content'>, string> = {
  shippingRates: 'id',
  customerNotes: 'phone',
  inbox: 'id',
  team: 'id',
  templates: 'id',
  subscribers: 'email',
  drafts: 'id',
  products: 'id',
  categories: 'slug',
  coupons: 'code',
  campaigns: 'id',
  reviews: 'id',
}

// The last dashboard data, kept for this browser tab only, so reopening the
// dashboard shows it instantly while fresh data loads. Cleared on sign-out.
export const LIVE_CACHE_KEY = 'cls_admin_live'

const readCache = (): AdminSnapshot | null => {
  try {
    const text = sessionStorage.getItem(LIVE_CACHE_KEY)
    return text ? (JSON.parse(text) as AdminSnapshot) : null
  } catch {
    return null
  }
}

const writeCache = (data: AdminSnapshot) => {
  try {
    sessionStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(data))
  } catch {
    // Full or blocked storage: the dashboard simply loads without the head start
  }
}

/** What changed between two versions of a list */
const diff = (prev: any[], next: any[], field: string) => {
  const before = new Map(prev.map(item => [item[field], JSON.stringify(item)]))
  const after = new Set(next.map(item => item[field]))
  const order = next.map(item => item[field])
  const reordered =
    JSON.stringify(prev.map(item => item[field]).filter(k => after.has(k))) !==
    JSON.stringify(order.filter(k => before.has(k)))
  return {
    upsert: next.filter(item => reordered || before.get(item[field]) !== JSON.stringify(item)),
    remove: prev.map(item => item[field]).filter(k => !after.has(k)),
    order,
  }
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const live = isSupabaseConfigured
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [shop, setShopState] = useState<Shop>(() => (live ? emptyShop() : seedShop()))
  const [loadError, setLoadError] = useState<string | null>(null)
  // Always the latest shop, so several changes in one tick build on each other
  const shopRef = useRef(shop)
  const ordersRef = useRef(orders)

  const apply = useCallback((data: AdminSnapshot) => {
    shopRef.current = data.shop
    setShopState(data.shop)
    ordersRef.current = data.orders
    setOrders(data.orders)
  }, [])

  /** Loads everything. A quiet reload (after a live change) keeps the current data if it fails. */
  const fetchLive = useCallback(
    async (quiet = false) => {
      const result = await loadAdminData()
      if (!result.ok) {
        if (quiet) return
        setLoadError(result.error)
        setOrders([])
        return
      }
      setLoadError(null)
      apply(result.data)
      writeCache(result.data)
    },
    [apply],
  )

  // New orders, payments and messages appear without a page refresh
  useLiveUpdates(live, () => fetchLive(true))

  useEffect(() => {
    if (live) {
      // Show the last copy at once, then bring it up to date in the background
      const cached = readCache()
      if (cached) apply(cached)
      fetchLive(Boolean(cached))
      return
    }
    const edited = load<Record<string, AdminOrder>>(ORDERS_KEY, {})
    // Orders placed through this browser's checkout join the seeded ones
    const placedHere = localOrders().map(withHistory)
    const created = load<AdminOrder[]>(CREATED_KEY, [])
    const all = [...created, ...placedHere, ...buildOrders(Date.now())]
      .map(o => edited[o.number] ?? o)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
    ordersRef.current = all
    setOrders(all)
    const saved = load<Partial<Shop> | null>(SHOP_KEY, null)
    if (saved) {
      const merged = { ...shopRef.current, ...saved }
      shopRef.current = merged
      setShopState(merged)
    }
  }, [live, fetchLive, apply])

  /** Runs a database write. A failure tells the owner and reloads the true state. */
  const persist = useCallback(
    (write: () => Promise<{ ok: boolean; error?: string }>) => {
      write()
        .then(result => {
          if (!result.ok) throw new Error(result.error)
        })
        .catch((e: Error) => {
          toast.error(e.message || 'That change could not be saved. Reloading.')
          fetchLive()
        })
    },
    [fetchLive],
  )

  const change = useCallback(
    (number: string, apply: (o: AdminOrder) => AdminOrder) => {
      const current = ordersRef.current
      if (!current) return
      const next = current.map(o => (o.number === number ? apply(o) : o))
      ordersRef.current = next
      setOrders(next)
      const changed = next.find(o => o.number === number)
      if (changed && !live) save(ORDERS_KEY, { ...load(ORDERS_KEY, {}), [number]: changed })
    },
    [live],
  )

  const updateOrder = useCallback<AdminData['updateOrder']>(
    (number, patch, event) => {
      change(number, o => ({
        ...o,
        ...patch,
        history: event ? [...o.history, { at: new Date().toISOString(), text: event }] : o.history,
      }))
      if (live) persist(() => adminUpdateOrder(number, patch, event))
    },
    [change, live, persist],
  )

  const addNote = useCallback<AdminData['addNote']>(
    (number, text) => {
      change(number, o => ({ ...o, notes: [...o.notes, { at: new Date().toISOString(), text }] }))
      if (live) persist(() => adminAddNote(number, text))
    },
    [change, live, persist],
  )

  const reviewPayment = useCallback<AdminData['reviewPayment']>(
    (number, approve, reason = '') => {
      const now = new Date().toISOString()
      change(number, o => ({
        ...o,
        paymentStatus: approve ? 'Paid' : 'Payment Rejected',
        payment: {
          ...o.payment,
          verifiedAt: approve ? now : undefined,
          rejectionReason: approve ? undefined : reason,
        },
        history: [
          ...o.history,
          { at: now, text: approve ? 'Easypaisa payment approved' : `Easypaisa payment rejected: ${reason}` },
        ],
      }))
      if (live) persist(() => adminReviewPayment(number, approve, reason))
    },
    [change, live, persist],
  )

  const setShop = useCallback<AdminData['setShop']>(
    (key, apply) => {
      const prev = shopRef.current
      const next = { ...prev, [key]: apply(prev[key]) }
      shopRef.current = next
      setShopState(next)
      if (!live) {
        save(SHOP_KEY, next)
        return
      }
      if (key === 'settings') {
        persist(() => adminSaveSettings(next.settings))
      } else if (key === 'content') {
        const changed = (Object.keys(next.content) as (keyof SiteContent)[]).filter(
          k => JSON.stringify(next.content[k]) !== JSON.stringify(prev.content[k]),
        )
        if (changed.length) persist(() => adminSaveContent(Object.fromEntries(changed.map(k => [k, next.content[k]]))))
      } else if (key === 'activity') {
        const known = new Set(prev.activity.map(a => a.at + a.text))
        const added = next.activity.filter(a => !known.has(a.at + a.text))
        persist(() => adminLog(added))
      } else if (key === 'products') {
        const changes = diff(prev.products, next.products, 'id')
        persist(async () => {
          for (const id of changes.remove) {
            const r = await adminDeleteProduct(id)
            if (!r.ok) return r
          }
          for (const product of changes.upsert as AdminProduct[]) {
            const r = await adminSaveProduct(product)
            if (!r.ok) return r
          }
          return { ok: true }
        })
      } else {
        const listKey = key as Exclude<keyof Shop, 'settings' | 'activity' | 'products' | 'content'>
        const changes = diff(prev[listKey] as any[], next[listKey] as any[], keyOf[listKey])
        if (changes.upsert.length || changes.remove.length) persist(() => adminSyncList(listKey, changes))
      }
    },
    [live, persist],
  )

  // Every confirmed action in the dashboard lands in the activity log.
  // Pages announce them through done() in ui.tsx.
  useEffect(() => {
    const record = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setShop('activity', list => [{ at: new Date().toISOString(), text }, ...list].slice(0, 300))
    }
    window.addEventListener('admin-log', record)
    return () => window.removeEventListener('admin-log', record)
  }, [setShop])

  const addOrder = useCallback<AdminData['addOrder']>(
    order => {
      const next = ordersRef.current ? [order, ...ordersRef.current] : ordersRef.current
      ordersRef.current = next
      setOrders(next)
      if (live) persist(() => adminCreateOrder(order))
      else save(CREATED_KEY, [order, ...load<AdminOrder[]>(CREATED_KEY, [])])
    },
    [live, persist],
  )

  const value = useMemo<AdminData>(
    () => ({
      ...shop,
      orders,
      customers: orders ? buildCustomers(orders) : [],
      live,
      loadError,
      refresh: () => fetchLive(),
      updateOrder,
      addNote,
      reviewPayment,
      addOrder,
      setShop,
      setProductActive: (id, active) =>
        setShop('products', list => list.map(p => (p.id === id ? { ...p, active } : p))),
      setVariant: (variantId, values) =>
        setShop('products', list =>
          list.map(p => ({
            ...p,
            variants: p.variants.map(v => (v.id === variantId ? { ...v, ...values } : v)),
          })),
        ),
      saveProduct: product =>
        setShop('products', list =>
          list.some(p => p.id === product.id) ? list.map(p => (p.id === product.id ? product : p)) : [product, ...list],
        ),
      deleteProduct: id => setShop('products', list => list.filter(p => p.id !== id)),
    }),
    [shop, orders, live, loadError, fetchLive, updateOrder, addNote, reviewPayment, addOrder, setShop],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

/** Live mode starts empty and fills from the database */
const emptyShop = (): Shop => ({
  ...seedShop(),
  inbox: [],
  shippingRates: [],
  customerNotes: [],
  activity: [],
  team: [],
  templates: [],
  subscribers: [],
  drafts: [],
  products: [],
  categories: [],
  coupons: [],
  campaigns: [],
  reviews: [],
})

export const useAdmin = () => {
  const value = useContext(Context)
  if (!value) throw new Error('useAdmin must be used inside AdminDataProvider')
  return value
}
