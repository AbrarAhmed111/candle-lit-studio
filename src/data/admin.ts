import { products } from './products'
import { couriers, sampleOrders, store } from './store'
import { salePrice } from '@/lib/pricing'
import type { Order, OrderStatus, PaymentStatus } from '@/types'

// Dummy back-office data. Orders are generated from a fixed seed so every
// visit shows the same shop, dated relative to today. Supabase replaces this.

export type OrderEvent = { at: string; text: string }

export type AdminOrder = Order & {
  /** Every important change, oldest first */
  history: OrderEvent[]
  /** Internal notes, never shown to the customer */
  notes: OrderEvent[]
  cancelReason?: string
}

export type AdminCustomer = {
  phone: string
  name: string
  email?: string
  city: string
  area: string
  address: string
  orders: AdminOrder[]
  /** Value of delivered orders only. Pending COD is not money yet. */
  spent: number
  firstOrderAt: string
  lastOrderAt: string
}

export const orderFlow: OrderStatus[] = [
  'Pending Confirmation',
  'Confirmed',
  'Processing',
  'Packed',
  'Dispatched',
  'Delivered',
]

export const paymentFlow: PaymentStatus[] = [
  'Pending Collection',
  'Collected by Courier',
  'Settled to Business',
]

export const LOW_STOCK = 5

const people = [
  ['Ayesha Khan', '03004567812', 'ayesha.k@example.com', 'Lahore', 'Gulberg III', 'House 45, Main Boulevard'],
  ['Bilal Raza', '03214410987', 'bilal.raza@example.com', 'Karachi', 'DHA Phase 6', 'Flat 7C, Khayaban-e-Shahbaz'],
  ['Hira Siddiqui', '03335558214', 'hira.s@example.com', 'Islamabad', 'F-10/2', 'House 9, Street 21'],
  ['Maham Tahir', '03017772043', undefined, 'Faisalabad', 'Peoples Colony', 'House 118, Block D'],
  ['Usman Ali', '03451239876', 'usman.ali@example.com', 'Lahore', 'Johar Town', 'House 301, Block G1'],
  ['Sana Malik', '03122224568', 'sana.malik@example.com', 'Karachi', 'Gulshan-e-Iqbal', 'A-22, Block 13D'],
  ['Zainab Farooq', '03006661290', undefined, 'Multan', 'Gulgasht Colony', 'House 14, Street 3'],
  ['Fatima Noor', '03315550176', 'fatima.noor@example.com', 'Rawalpindi', 'Bahria Town Phase 4', 'House 77, Street 12'],
  ['Omar Javed', '03218884431', 'omar.j@example.com', 'Lahore', 'Model Town', 'House 60, Block B'],
  ['Mariam Baloch', '03337890012', 'mariam.b@example.com', 'Quetta', 'Jinnah Town', 'House 5, Street 2'],
  ['Hassan Sheikh', '03024449183', undefined, 'Sialkot', 'Cantt', 'House 27, Kashmir Road'],
  ['Noor Fatima', '03459993320', 'noor.f@example.com', 'Peshawar', 'Hayatabad Phase 3', 'House 210, Street 9'],
  ['Kiran Abbasi', '03112227745', 'kiran.a@example.com', 'Hyderabad', 'Latifabad Unit 7', 'House C-48'],
  ['Danish Qureshi', '03001118877', 'danish.q@example.com', 'Islamabad', 'G-11/3', 'House 33, Street 110'],
  ['Rabia Anwar', '03336664400', undefined, 'Gujranwala', 'Satellite Town', 'House 88, Block A'],
  ['Taimur Kakar', '03138885566', 'taimur.k@example.com', 'Quetta', 'Satellite Town', 'House 19, Block 3'],
] as const

const DAY = 86_400_000

// Small seeded generator (mulberry32) so the data is the same on every load
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const iso = (ms: number) => new Date(ms).toISOString()

const historyFor = (order: Order, cancelReason?: string): OrderEvent[] => {
  const placed = new Date(order.placedAt).getTime()
  const events: OrderEvent[] = [{ at: order.placedAt, text: 'Order placed on the website' }]
  if (order.status === 'Cancelled') {
    events.push({ at: iso(placed + 5 * 3_600_000), text: `Order cancelled. ${cancelReason ?? ''}`.trim() })
    return events
  }
  const reached = orderFlow.indexOf(order.status)
  const steps: [number, string][] = [
    [0.12, 'Order confirmed with the customer'],
    [1, 'Preparation started'],
    [1.5, 'Order packed'],
    [2, order.shipment ? `Dispatched with ${order.shipment.courier}, tracking ${order.shipment.trackingId}` : 'Dispatched'],
    [4.5, 'Marked as delivered'],
  ]
  steps.slice(0, reached).forEach(([days, text]) => events.push({ at: iso(placed + days * DAY), text }))
  if (order.paymentStatus !== 'Pending Collection')
    events.push({ at: iso(placed + 4.6 * DAY), text: 'COD recorded as collected by the courier' })
  if (order.paymentStatus === 'Settled to Business')
    events.push({ at: iso(placed + 11 * DAY), text: 'COD settlement received from the courier' })
  return events
}

export const withHistory = (order: Order): AdminOrder => ({
  ...order,
  history: historyFor(order),
  notes: [],
})

/** Seeded orders for the last 45 days plus the two sample orders, newest first. */
export const buildOrders = (now: number): AdminOrder[] => {
  const rnd = seeded(20261116)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]
  const sellable = products.filter(p => p.variants.some(v => v.stock > 0))
  const orders: AdminOrder[] = []

  for (let k = 0; k < 46; k++) {
    const age = Math.max(0.06, 45 - k * 0.98 - rnd() * 0.8)
    const placed = now - age * DAY
    const [name, phone, email, city, area, address] = pick(people)

    const lines = Array.from({ length: 1 + Math.floor(rnd() * 2.4) }, () => {
      const product = pick(sellable)
      const variant = pick(product.variants)
      return {
        productId: product.id,
        name: product.name,
        variant: variant.label,
        qty: rnd() < 0.8 ? 1 : 2,
        unitPrice: salePrice(product, variant),
        originalPrice: variant.price,
      }
    }).filter((l, i, all) => all.findIndex(o => o.productId === l.productId && o.variant === l.variant) === i)

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
    const useCoupon = rnd() < 0.18
    const couponDiscount = useCoupon ? Math.min(500, Math.round(subtotal * 0.1)) : 0
    const shipping = subtotal >= store.freeShippingOver ? 0 : store.shippingFee

    let status: OrderStatus
    const roll = rnd()
    if (age < 0.9) status = 'Pending Confirmation'
    else if (age < 1.8) status = roll < 0.5 ? 'Confirmed' : 'Pending Confirmation'
    else if (age < 2.6) status = 'Processing'
    else if (age < 3.4) status = 'Packed'
    else if (age < 6.5) status = 'Dispatched'
    else status = roll < 0.1 ? 'Cancelled' : 'Delivered'

    let paymentStatus: PaymentStatus = 'Pending Collection'
    if (status === 'Delivered') {
      if (age > 14) paymentStatus = 'Settled to Business'
      else if (age > 8 || rnd() < 0.5) paymentStatus = 'Collected by Courier'
    }

    const courier = pick(couriers.slice(0, 4))
    const shipped = status === 'Dispatched' || status === 'Delivered'
    const cancelReason =
      status === 'Cancelled' ? 'Customer did not answer the confirmation calls.' : undefined

    const order: Order = {
      number: `CND-${978 + k}`,
      placedAt: iso(placed),
      status,
      customer: { name, phone, email, city, area, address },
      lines,
      subtotal,
      couponCode: useCoupon ? 'WELCOME10' : undefined,
      couponDiscount,
      shipping,
      total: subtotal - couponDiscount + shipping,
      paymentMethod: 'Cash on Delivery',
      paymentStatus,
      shipment: shipped
        ? {
            courier: courier.name,
            trackingId: String(Math.floor(100000000000 + rnd() * 899999999999)),
            trackingUrl: courier.trackingUrl,
            dispatchedAt: iso(placed + 2 * DAY),
          }
        : undefined,
    }
    orders.push({ ...order, history: historyFor(order, cancelReason), notes: [], cancelReason })
  }

  return [...orders, ...sampleOrders.map(withHistory)].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  )
}

/** One profile per phone number, which is how a COD shop knows its customers. */
export const buildCustomers = (orders: AdminOrder[]): AdminCustomer[] => {
  const byPhone = new Map<string, AdminCustomer>()
  // Oldest first, so the newest order's contact details win
  ;[...orders].reverse().forEach(o => {
    const c = byPhone.get(o.customer.phone)
    const delivered = o.status === 'Delivered' ? o.total : 0
    if (!c) {
      byPhone.set(o.customer.phone, {
        phone: o.customer.phone,
        name: o.customer.name,
        email: o.customer.email,
        city: o.customer.city,
        area: o.customer.area,
        address: o.customer.address,
        orders: [o],
        spent: delivered,
        firstOrderAt: o.placedAt,
        lastOrderAt: o.placedAt,
      })
      return
    }
    c.orders.unshift(o)
    c.spent += delivered
    c.lastOrderAt = o.placedAt
    c.name = o.customer.name
    c.email = o.customer.email ?? c.email
    c.city = o.customer.city
    c.area = o.customer.area
    c.address = o.customer.address
  })
  return [...byPhone.values()].sort(
    (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
  )
}

/**
 * Money definitions used everywhere in the dashboard:
 * - Gross order value: every order that is not cancelled.
 * - Delivered sales: delivered orders only.
 * - COD collected: delivered orders the courier has collected cash for.
 * - Awaiting settlement: collected by the courier, not yet paid to the business.
 */
export const summarise = (orders: AdminOrder[]) => {
  const live = orders.filter(o => o.status !== 'Cancelled')
  const delivered = orders.filter(o => o.status === 'Delivered')
  const sum = (list: AdminOrder[]) => list.reduce((total, o) => total + o.total, 0)
  const gross = sum(live)
  return {
    count: orders.length,
    gross,
    deliveredSales: sum(delivered),
    codCollected: sum(delivered.filter(o => o.paymentStatus !== 'Pending Collection')),
    awaitingSettlement: sum(delivered.filter(o => o.paymentStatus === 'Collected by Courier')),
    average: live.length ? gross / live.length : 0,
    byStatus: [...orderFlow, 'Cancelled' as OrderStatus].map(status => ({
      status,
      count: orders.filter(o => o.status === status).length,
    })),
  }
}
