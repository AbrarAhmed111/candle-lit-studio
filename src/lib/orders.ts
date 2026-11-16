import { sampleOrders } from '@/data/store'
import type { Order } from '@/types'

// Dummy order storage: orders placed in this browser live in localStorage.

const KEY = 'cls_orders'

export const localOrders = (): Order[] => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const saveOrder = (order: Order) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([order, ...localOrders()]))
  } catch {
    // ignore
  }
}

export const nextOrderNumber = () => {
  const taken = [...sampleOrders, ...localOrders()].map(o =>
    Number(o.number.replace('CND-', '')),
  )
  return `CND-${Math.max(1031, ...taken) + 1}`
}

export const findOrder = (number: string, phone?: string) => {
  const wanted = number.trim().toUpperCase()
  const order = [...localOrders(), ...sampleOrders].find(o => o.number === wanted)
  if (!order) return null
  if (phone !== undefined && order.customer.phone !== phone) return null
  return order
}
