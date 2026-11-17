'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import SalesChart, { type ChartPoint } from '@/components/admin/SalesChart'
import { card, dateTime, Empty, input, Kpi, Loading, PageHeader, shortDate, StatusBadge } from '@/components/admin/ui'
import { LOW_STOCK, summarise } from '@/data/admin'
import { formatPKR } from '@/lib/pricing'

const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const dayInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ranges = [
  'Today',
  'Yesterday',
  'Last 7 days',
  'Last 30 days',
  'This month',
  'Previous month',
  'This year',
  'Custom range',
] as const
type Range = (typeof ranges)[number]

/** Start (inclusive) and end (exclusive) of a preset, in the viewer's time */
const bounds = (range: Range, custom: { from: string; to: string }): [number, number] => {
  const now = new Date()
  const today = startOfDay(now)
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (range) {
    case 'Today':
      return [today, today + DAY]
    case 'Yesterday':
      return [today - DAY, today]
    case 'Last 7 days':
      return [today - 6 * DAY, today + DAY]
    case 'Last 30 days':
      return [today - 29 * DAY, today + DAY]
    case 'This month':
      return [new Date(y, m, 1).getTime(), today + DAY]
    case 'Previous month':
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]
    case 'This year':
      return [new Date(y, 0, 1).getTime(), today + DAY]
    case 'Custom range': {
      const from = startOfDay(new Date(`${custom.from}T00:00`))
      const to = startOfDay(new Date(`${custom.to}T00:00`)) + DAY
      return to > from ? [from, to] : [from, from + DAY]
    }
  }
}

export default function AdminOverview() {
  const { orders, customers, products } = useAdmin()
  const [range, setRange] = useState<Range>('Last 30 days')
  const [custom, setCustom] = useState(() => ({
    from: dayInput(Date.now() - 13 * DAY),
    to: dayInput(Date.now()),
  }))

  const view = useMemo(() => {
    if (!orders) return null
    const [from, to] = bounds(range, custom)
    const inRange = orders.filter(o => {
      const t = new Date(o.placedAt).getTime()
      return t >= from && t < to
    })
    const live = inRange.filter(o => o.status !== 'Cancelled')

    // Daily bars up to two months, monthly beyond that
    const days = Math.round((to - from) / DAY)
    const monthly = days > 62
    const buckets = new Map<string, ChartPoint>()
    if (monthly) {
      for (let d = new Date(from); d.getTime() < to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const label = d.toLocaleDateString('en-GB', { month: 'short' })
        buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { label, value: 0, orders: 0 })
      }
    } else {
      for (let t = from; t < to; t += DAY)
        buckets.set(dayInput(t), {
          label: new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          value: 0,
          orders: 0,
        })
    }
    live.forEach(o => {
      const d = new Date(o.placedAt)
      const bucket = buckets.get(monthly ? `${d.getFullYear()}-${d.getMonth()}` : dayInput(d.getTime()))
      if (!bucket) return
      bucket.value += o.total
      bucket.orders += 1
    })

    const sold = new Map<string, { name: string; qty: number; value: number }>()
    live.forEach(o =>
      o.lines.forEach(l => {
        const row = sold.get(l.productId) ?? { name: l.name, qty: 0, value: 0 }
        row.qty += l.qty
        row.value += l.unitPrice * l.qty
        sold.set(l.productId, row)
      }),
    )

    return {
      totals: summarise(inRange),
      points: [...buckets.values()],
      top: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
      newCustomers: customers.filter(c => {
        const t = new Date(c.firstOrderAt).getTime()
        return t >= from && t < to
      }).length,
    }
  }, [orders, customers, range, custom])

  const lowStock = products
    .flatMap(p => p.variants.map(v => ({ id: v.id, name: p.name, label: v.label, stock: v.stock })))
    .filter(v => v.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock)

  if (!orders || !view) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="mt-8">
          <Loading />
        </div>
      </>
    )
  }

  const { totals } = view
  // What needs the owner today does not depend on the date filter
  const waiting = orders.filter(o => o.status === 'Pending Confirmation')
  const toPack = orders.filter(o => ['Confirmed', 'Processing', 'Packed'].includes(o.status))
  const maxStatus = Math.max(...totals.byStatus.map(s => s.count), 1)

  return (
    <>
      <PageHeader title="Overview" text="How the shop is doing, and what needs you today.">
        <label className="sr-only" htmlFor="range">
          Date range
        </label>
        <select id="range" value={range} onChange={e => setRange(e.target.value as Range)} className={input}>
          {ranges.map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {range === 'Custom range' && (
          <>
            <input
              type="date"
              aria-label="From"
              value={custom.from}
              max={custom.to}
              onChange={e => e.target.value && setCustom(c => ({ ...c, from: e.target.value }))}
              className={input}
            />
            <input
              type="date"
              aria-label="To"
              value={custom.to}
              min={custom.from}
              onChange={e => e.target.value && setCustom(c => ({ ...c, to: e.target.value }))}
              className={input}
            />
          </>
        )}
      </PageHeader>

      {/* To do: always current */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          strong
          href="/admin/orders?status=Pending+Confirmation"
          label="Need confirmation"
          value={String(waiting.length)}
          hint={waiting.length ? 'Call or WhatsApp these customers' : 'Nothing waiting'}
        />
        <Kpi
          href="/admin/orders?status=To+dispatch"
          label="To prepare and dispatch"
          value={String(toPack.length)}
          hint="Confirmed, processing or packed"
        />
        <Kpi
          href="/admin/products?stock=low"
          label="Low or out of stock"
          value={String(lowStock.length)}
          hint={`Sizes with ${LOW_STOCK} or fewer left`}
        />
      </div>

      <h2 className="mt-10 font-sans text-sm font-semibold tracking-normal text-umber">{range}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Orders" value={String(totals.count)} hint={`${view.newCustomers} new customers`} />
        <Kpi label="Gross order value" value={formatPKR(totals.gross)} hint="Excludes cancelled" />
        <Kpi label="Average order" value={formatPKR(totals.average)} />
        <Kpi label="Delivered sales" value={formatPKR(totals.deliveredSales)} hint="Delivered orders only" />
        <Kpi label="COD collected" value={formatPKR(totals.codCollected)} hint="Cash the courier has taken" />
        <Kpi label="Awaiting settlement" value={formatPKR(totals.awaitingSettlement)} hint="Courier still owes you" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className={`${card} p-5 sm:p-6`} aria-labelledby="chart-h">
          <h2 id="chart-h" className="text-2xl">
            Order value
          </h2>
          <p className="mb-4 mt-1 text-sm text-umber">
            Value of orders placed, cancelled orders left out. Not all of it is collected yet.
          </p>
          {totals.count === 0 ? (
            <Empty title="No orders in this period" text="Pick a wider date range to see order value." />
          ) : (
            <SalesChart points={view.points} />
          )}
        </section>

        <section className={`${card} p-5 sm:p-6`} aria-labelledby="status-h">
          <h2 id="status-h" className="text-2xl">
            Orders by status
          </h2>
          <ul className="mt-5 space-y-3.5">
            {totals.byStatus.map(s => (
              <li key={s.status}>
                <Link
                  href={`/admin/orders?status=${encodeURIComponent(s.status)}`}
                  className="group block"
                >
                  <span className="flex justify-between text-[0.95rem]">
                    <span className="group-hover:text-caramel">{s.status}</span>
                    <span className="tabular-nums">{s.count}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-wax">
                    <span
                      className="block h-full rounded-full bg-caramel"
                      style={{ width: `${(s.count / maxStatus) * 100}%` }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className={card} aria-labelledby="recent-orders-h">
          <div className="flex items-center justify-between p-5 pb-3 sm:px-6">
            <h2 id="recent-orders-h" className="text-2xl">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="link flex min-h-11 items-center gap-1 text-sm">
              All orders <ArrowUpRight size={15} />
            </Link>
          </div>
          <ul className="divide-y divide-hairline border-t border-hairline">
            {orders.slice(0, 6).map(o => (
              <li key={o.number}>
                <Link
                  href={`/admin/orders/${o.number}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-wax/40 sm:px-6"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{o.number}</span>
                    <span className="ml-2 text-umber">{o.customer.name}</span>
                    <span className="block text-sm text-umber">
                      {dateTime(o.placedAt)}, {o.customer.city}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="w-24 text-right tabular-nums">{formatPKR(o.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={`${card} p-5 sm:p-6`} aria-labelledby="top-h">
            <h2 id="top-h" className="text-2xl">
              Top sellers
            </h2>
            {view.top.length === 0 ? (
              <p className="mt-3 text-umber">No sales in this period.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {view.top.map(t => (
                  <li key={t.name} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{t.name}</span>
                    <span className="shrink-0 text-sm text-umber">
                      <span className="tabular-nums text-espresso">{t.qty} sold</span>, {formatPKR(t.value)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="stock-h">
            <div className="flex items-center justify-between">
              <h2 id="stock-h" className="text-2xl">
                Stock alerts
              </h2>
              <Link href="/admin/products?stock=low" className="link text-sm">
                Manage
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="mt-3 text-umber">Every size is well stocked.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lowStock.slice(0, 6).map(v => (
                  <li key={v.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {v.name} <span className="text-sm text-umber">{v.label}</span>
                    </span>
                    <span className={v.stock === 0 ? 'shrink-0 text-sm text-wine' : 'shrink-0 text-sm text-toffee'}>
                      {v.stock === 0 ? 'Out of stock' : `${v.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="new-cust-h">
            <h2 id="new-cust-h" className="text-2xl">
              Newest customers
            </h2>
            <ul className="mt-4 space-y-3">
              {[...customers]
                .sort((a, b) => new Date(b.firstOrderAt).getTime() - new Date(a.firstOrderAt).getTime())
                .slice(0, 4)
                .map(c => (
                  <li key={c.phone} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {c.name} <span className="text-sm text-umber">{c.city}</span>
                    </span>
                    <span className="shrink-0 text-sm text-umber">{shortDate(c.firstOrderAt)}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
