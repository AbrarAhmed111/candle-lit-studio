'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import {
  card,
  dateTime,
  downloadCsv,
  Empty,
  input,
  Loading,
  PageHeader,
  PaymentBadge,
  StatusBadge,
  td,
  th,
} from '@/components/admin/ui'
import { orderFlow, paymentFlow } from '@/data/admin'
import { formatPKR } from '@/lib/pricing'
import type { OrderStatus } from '@/types'
import HowItWorks from '@/components/admin/HowItWorks'

const PAGE = 12
const statuses: OrderStatus[] = [...orderFlow, 'Cancellation Requested', 'Failed Delivery', 'Returned', 'Cancelled']
// A chip that groups the steps between confirming and dispatching
const TO_DISPATCH = 'To dispatch'
const toDispatch: OrderStatus[] = ['Confirmed', 'Processing', 'Packed']
const matchesStatus = (s: OrderStatus, filter: string) =>
  filter === TO_DISPATCH ? toDispatch.includes(s) : s === filter

function Orders() {
  const { orders } = useAdmin()
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get('status') ?? ''
  const [query, setQuery] = useState('')
  const [payment, setPayment] = useState('')
  const [city, setCity] = useState('')
  const [courier, setCourier] = useState('')
  const [page, setPage] = useState(1)

  const setStatus = (next: string) => {
    setPage(1)
    router.replace(next ? `/admin/orders?status=${encodeURIComponent(next)}` : '/admin/orders', {
      scroll: false,
    })
  }

  const cities = useMemo(() => [...new Set(orders?.map(o => o.customer.city))].sort(), [orders])
  const couriers = useMemo(
    () => [...new Set(orders?.flatMap(o => (o.shipment ? [o.shipment.courier] : [])))].sort(),
    [orders],
  )

  if (!orders) {
    return (
      <>
        <PageHeader title="Orders" />
        <div className="mt-8">
          <Loading rows={8} />
        </div>
      </>
    )
  }

  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  // Everything except the status chip, so each chip can show its own count
  const base = orders.filter(
    o =>
      (!q ||
        o.number.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        (digits.length > 2 && o.customer.phone.includes(digits)) ||
        o.shipment?.trackingId.includes(q) ||
        o.lines.some(l => l.name.toLowerCase().includes(q))) &&
      (!payment || o.paymentStatus === payment) &&
      (!city || o.customer.city === city) &&
      (!courier || o.shipment?.courier === courier),
  )
  const found = status ? base.filter(o => matchesStatus(o.status, status)) : base
  const pages = Math.max(1, Math.ceil(found.length / PAGE))
  const current = Math.min(page, pages)
  const shown = found.slice((current - 1) * PAGE, current * PAGE)
  const filtered = Boolean(q || payment || city || courier || status)

  const clear = () => {
    setQuery('')
    setPayment('')
    setCity('')
    setCourier('')
    setStatus('')
  }

  const exportCsv = () =>
    downloadCsv('orders.csv', [
      [
        'Order',
        'Placed',
        'Customer',
        'Phone',
        'City',
        'Items',
        'Total (PKR)',
        'Payment',
        'Status',
        'Courier',
        'Tracking ID',
      ],
      ...found.map(o => [
        o.number,
        dateTime(o.placedAt),
        o.customer.name,
        o.customer.phone,
        o.customer.city,
        o.lines.reduce((n, l) => n + l.qty, 0),
        o.total,
        o.paymentStatus,
        o.status,
        o.shipment?.courier ?? '',
        o.shipment?.trackingId ?? '',
      ]),
    ])

  return (
    <>
      <PageHeader
        title="Orders"
        text="Every order is paid by Easypaisa. Check the payment, confirm, pack, then dispatch."
      >
        <button
          type="button"
          onClick={exportCsv}
          disabled={found.length === 0}
          className="btn-outline min-h-11 px-5 text-sm"
        >
          <Download size={16} /> Export {found.length} as a spreadsheet
        </button>
        <Link href="/admin/orders/new" className="btn-primary">
          <Plus size={17} /> New order
        </Link>
      </PageHeader>
      <HowItWorks id="orders">
        <p>
          Every new order starts as <strong>Needs confirmation</strong>. Call or WhatsApp the customer, then open the
          order and press <strong>Confirm order</strong>.
        </p>
        <p>
          After that, each order has one big button for its next step: start preparing, mark as packed, dispatch (add
          the courier and tracking ID), and mark as delivered. The customer is emailed at each step you have switched on
          in Messages.
        </p>
        <p>
          If a customer asks to cancel, the order shows <strong>Cancellation requested</strong> with buttons to approve
          or keep it.
        </p>
      </HowItWorks>

      <div
        className="no-scroll relative -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter by status"
      >
        {['', statuses[0], TO_DISPATCH, ...statuses.slice(1)].map(s => {
          const count = s ? base.filter(o => matchesStatus(o.status, s)).length : base.length
          return (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={clsx(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                status === s
                  ? 'border-espresso bg-espresso text-ivory'
                  : 'border-hairline bg-linen hover:border-espresso',
              )}
            >
              {s === 'Pending Confirmation' ? 'Needs confirmation' : s || 'All'}
              <span className={clsx('tabular-nums', status === s ? 'text-wax/80' : 'text-umber')}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-umber" />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Order number, name, phone, product or tracking ID"
            aria-label="Search orders"
            className={`${input} w-full pl-10`}
          />
        </div>
        <select
          aria-label="Payment status"
          value={payment}
          onChange={e => {
            setPayment(e.target.value)
            setPage(1)
          }}
          className={`${input} min-w-0`}
        >
          <option value="">Any payment status</option>
          {paymentFlow.map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="City"
          value={city}
          onChange={e => {
            setCity(e.target.value)
            setPage(1)
          }}
          className={`${input} min-w-0`}
        >
          <option value="">Any city</option>
          {cities.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Courier"
          value={courier}
          onChange={e => {
            setCourier(e.target.value)
            setPage(1)
          }}
          className={`${input} col-span-2 min-w-0 sm:col-span-1`}
        >
          <option value="">Any courier</option>
          {couriers.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered && found.length > 0 && (
        <p className="mt-4 flex items-center justify-between gap-3 text-sm text-umber" aria-live="polite">
          <span>
            {found.length} {found.length === 1 ? 'order matches' : 'orders match'}
          </span>
          <button type="button" onClick={clear} className="link min-h-11">
            Clear filters
          </button>
        </p>
      )}

      <div className={`${card} mt-4 overflow-hidden`}>
        {found.length === 0 ? (
          <Empty title="No orders match" text="Try a different search or remove a filter.">
            {filtered && (
              <button type="button" onClick={clear} className="btn-outline min-h-11 px-5 text-sm">
                Clear all filters
              </button>
            )}
          </Empty>
        ) : (
          <>
            {/* Table from tablet up, cards on phones */}
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[60rem] text-[0.95rem]">
                <thead className="border-b border-hairline bg-wax/50">
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Items</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={th}>Payment</th>
                    <th className={th}>Status</th>
                    <th className={th}>Courier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {shown.map(o => (
                    <tr
                      key={o.number}
                      onClick={() => router.push(`/admin/orders/${o.number}`)}
                      className="cursor-pointer transition-colors hover:bg-wax/40"
                    >
                      <td className={td}>
                        <Link
                          href={`/admin/orders/${o.number}`}
                          className="font-medium hover:text-caramel"
                          onClick={e => e.stopPropagation()}
                        >
                          {o.number}
                        </Link>
                        <span className="block text-sm text-umber">{dateTime(o.placedAt)}</span>
                      </td>
                      <td className={td}>
                        {o.customer.name}
                        <span className="block text-sm text-umber">
                          {o.customer.phone}, {o.customer.city}
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>{o.lines.reduce((n, l) => n + l.qty, 0)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatPKR(o.total)}</td>
                      <td className={td}>
                        <PaymentBadge status={o.paymentStatus} />
                      </td>
                      <td className={td}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td className={td}>
                        {o.shipment ? (
                          <>
                            {o.shipment.courier}
                            <span className="block text-sm tabular-nums text-umber">{o.shipment.trackingId}</span>
                          </>
                        ) : (
                          <span className="text-umber">Not dispatched</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-hairline md:hidden">
              {shown.map(o => (
                <li key={o.number}>
                  <Link href={`/admin/orders/${o.number}`} className="block p-4 transition-colors active:bg-wax/50">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{o.number}</span>
                      <span className="tabular-nums">{formatPKR(o.total)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-umber">
                      {o.customer.name}, {o.customer.city}. {dateTime(o.placedAt)}
                    </span>
                    <span className="mt-2.5 flex flex-wrap gap-2">
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.paymentStatus} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-umber">
            {(current - 1) * PAGE + 1} to {Math.min(current * PAGE, found.length)} of {found.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              className="btn-outline min-h-11 px-5 text-sm"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              className="btn-outline min-h-11 px-5 text-sm"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Loading rows={8} />}>
      <Orders />
    </Suspense>
  )
}
