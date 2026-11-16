'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { products as catalogue } from '@/data/products'
import { buildCustomers, buildOrders, withHistory, type AdminCustomer, type AdminOrder } from '@/data/admin'
import { localOrders } from '@/lib/orders'
import type { Product } from '@/types'

const ORDERS_KEY = 'cls_admin_orders' // orders edited in the dashboard
const PRODUCTS_KEY = 'cls_admin_products' // stock, price and visibility edits

type ProductEdits = {
  hidden: string[]
  variants: Record<string, { price?: number; stock?: number }>
}

export type AdminProduct = Product & { active: boolean }

type AdminData = {
  /** null until the browser has loaded the data */
  orders: AdminOrder[] | null
  customers: AdminCustomer[]
  products: AdminProduct[]
  /** Applies a change and records it in the order's history */
  updateOrder: (number: string, patch: Partial<AdminOrder>, event?: string) => void
  addNote: (number: string, text: string) => void
  setProductActive: (id: string, active: boolean) => void
  setVariant: (variantId: string, values: { price: number; stock: number }) => void
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

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [edits, setEdits] = useState<ProductEdits>({ hidden: [], variants: {} })

  useEffect(() => {
    const edited = load<Record<string, AdminOrder>>(ORDERS_KEY, {})
    // Orders placed through this browser's checkout join the seeded ones
    const placedHere = localOrders().map(withHistory)
    const all = [...placedHere, ...buildOrders(Date.now())]
      .map(o => edited[o.number] ?? o)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
    setOrders(all)
    setEdits(load<ProductEdits>(PRODUCTS_KEY, { hidden: [], variants: {} }))
  }, [])

  const change = useCallback((number: string, apply: (o: AdminOrder) => AdminOrder) => {
    setOrders(current => {
      if (!current) return current
      const next = current.map(o => (o.number === number ? apply(o) : o))
      const changed = next.find(o => o.number === number)
      if (changed) save(ORDERS_KEY, { ...load(ORDERS_KEY, {}), [number]: changed })
      return next
    })
  }, [])

  const updateOrder = useCallback<AdminData['updateOrder']>(
    (number, patch, event) =>
      change(number, o => ({
        ...o,
        ...patch,
        history: event ? [...o.history, { at: new Date().toISOString(), text: event }] : o.history,
      })),
    [change],
  )

  const addNote = useCallback<AdminData['addNote']>(
    (number, text) =>
      change(number, o => ({ ...o, notes: [...o.notes, { at: new Date().toISOString(), text }] })),
    [change],
  )

  const editProducts = useCallback((apply: (e: ProductEdits) => ProductEdits) => {
    setEdits(current => {
      const next = apply(current)
      save(PRODUCTS_KEY, next)
      return next
    })
  }, [])

  const value = useMemo<AdminData>(
    () => ({
      orders,
      customers: orders ? buildCustomers(orders) : [],
      products: catalogue.map(p => ({
        ...p,
        active: !edits.hidden.includes(p.id),
        variants: p.variants.map(v => ({ ...v, ...edits.variants[v.id] })),
      })),
      updateOrder,
      addNote,
      setProductActive: (id, active) =>
        editProducts(e => ({
          ...e,
          hidden: active ? e.hidden.filter(h => h !== id) : [...new Set([...e.hidden, id])],
        })),
      setVariant: (variantId, values) =>
        editProducts(e => ({ ...e, variants: { ...e.variants, [variantId]: values } })),
    }),
    [orders, edits, updateOrder, addNote, editProducts],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useAdmin = () => {
  const value = useContext(Context)
  if (!value) throw new Error('useAdmin must be used inside AdminDataProvider')
  return value
}
