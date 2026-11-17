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
  adminSaveSettings,
  adminSyncList,
  adminUpdateOrder,
  loadAdminData,
} from '@/lib/actions/admin'
import { buildCustomers, buildOrders, withHistory, type AdminCustomer, type AdminOrder } from '@/data/admin'
import { localOrders } from '@/lib/orders'
import { seedShop } from '@/data/admin-seed'

export { seedShop }
import type { Category, Coupon, Product, Review } from '@/types'

const ORDERS_KEY = 'cls_admin_orders' // orders edited in the dashboard
const SHOP_KEY = 'cls_admin_shop' // catalogue, promotions, reviews and settings
const CREATED_KEY = 'cls_admin_created' // orders entered by hand in the dashboard

export type AdminProduct = Product & { active: boolean }
export type AdminCoupon = Coupon & { active: boolean; used: number; maxUses?: number }
export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected'
export type AdminReview = Review & { status: ReviewStatus }

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
}

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
const keyOf: Record<Exclude<keyof Shop, 'settings' | 'activity'>, string> = {
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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

  const fetchLive = useCallback(async () => {
    const result = await loadAdminData()
    if (!result.ok) {
      setLoadError(result.error)
      setOrders([])
      return
    }
    setLoadError(null)
    shopRef.current = result.data.shop
    setShopState(result.data.shop)
    ordersRef.current = result.data.orders
    setOrders(result.data.orders)
  }, [])

  useEffect(() => {
    if (live) {
      fetchLive()
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
  }, [live, fetchLive])

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

  const change = useCallback((number: string, apply: (o: AdminOrder) => AdminOrder) => {
    const current = ordersRef.current
    if (!current) return
    const next = current.map(o => (o.number === number ? apply(o) : o))
    ordersRef.current = next
    setOrders(next)
    const changed = next.find(o => o.number === number)
    if (changed && !live) save(ORDERS_KEY, { ...load(ORDERS_KEY, {}), [number]: changed })
  }, [live])

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
        const listKey = key as Exclude<keyof Shop, 'settings' | 'activity' | 'products'>
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
      refresh: fetchLive,
      updateOrder,
      addNote,
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
          list.some(p => p.id === product.id)
            ? list.map(p => (p.id === product.id ? product : p))
            : [product, ...list],
        ),
      deleteProduct: id => setShop('products', list => list.filter(p => p.id !== id)),
    }),
    [shop, orders, live, loadError, fetchLive, updateOrder, addNote, addOrder, setShop],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

/** Live mode starts empty and fills from the database */
const emptyShop = (): Shop => ({
  ...seedShop(),
  inbox: [],
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
