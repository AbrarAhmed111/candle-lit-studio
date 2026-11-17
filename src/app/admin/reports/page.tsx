'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { card, downloadCsv, input, Kpi, Loading, PageHeader, td, th } from '@/components/admin/ui'
import { formatPKR } from '@/lib/pricing'

const DAY = 86_400_000
const periods = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
]

type Row = { name: string; orders: number; units: number; value: number }

const tally = () => {
  const rows = new Map<string, Row>()
  return {
    add(name: string, units: number, value: number, countOrder = true) {
      const row = rows.get(name) ?? { name, orders: 0, units: 0, value: 0 }
      row.units += units
      row.value += value
      if (countOrder) row.orders += 1
      rows.set(name, row)
    },
    list: () => [...rows.values()].sort((a, b) => b.value - a.value),
  }
}

export default function AdminReportsPage() {
  const { orders, customers, products, categories } = useAdmin()
  const [days, setDays] = useState(30)

  const report = useMemo(() => {
    if (!orders) return null
    const from = days ? Date.now() - days * DAY : 0
    const inRange = orders.filter(o => new Date(o.placedAt).getTime() >= from)
    // Sales figures leave cancelled orders out
    const live = inRange.filter(o => o.status !== 'Cancelled')

    const byProduct = tally()
    const byCategory = tally()
    const byCity = tally()
    const byCoupon = tally()
    live.forEach(o => {
      const units = o.lines.reduce((n, l) => n + l.qty, 0)
      byCity.add(o.customer.city, units, o.total)
      if (o.couponCode) byCoupon.add(o.couponCode, units, o.couponDiscount)
      const seenProducts = new Set<string>()
      const seenCategories = new Set<string>()
      o.lines.forEach(l => {
        const amount = l.unitPrice * l.qty
        byProduct.add(l.name, l.qty, amount, !seenProducts.has(l.productId))
        seenProducts.add(l.productId)
        const slug = products.find(p => p.id === l.productId)?.categories[0]
        const name = categories.find(c => c.slug === slug)?.name ?? 'Uncategorised'
        byCategory.add(name, l.qty, amount, !seenCategories.has(name))
        seenCategories.add(name)
      })
    })

    // Courier performance counts every shipped order, delivered or not
    const couriers = new Map<string, { name: string; shipped: number; delivered: number; value: number }>()
    inRange
      .filter(o => o.shipment)
      .forEach(o => {
        const name = o.shipment!.courier
        const row = couriers.get(name) ?? { name, shipped: 0, delivered: 0, value: 0 }
        row.shipped += 1
        if (o.status === 'Delivered') {
          row.delivered += 1
          row.value += o.total
        }
        couriers.set(name, row)
      })

    const buyers = customers
      .map(c => {
        const theirs = c.orders.filter(o => new Date(o.placedAt).getTime() >= from && o.status !== 'Cancelled')
        return {
          name: c.name,
          city: c.city,
          orders: theirs.length,
          value: theirs.reduce((t, o) => t + o.total, 0),
          isNew: new Date(c.firstOrderAt).getTime() >= from,
        }
      })
      .filter(c => c.orders > 0)
      .sort((a, b) => b.value - a.value)

    const gross = live.reduce((t, o) => t + o.total, 0)
    return {
      orders: inRange.length,
      cancelled: inRange.length - live.length,
      gross,
      average: live.length ? gross / live.length : 0,
      discounts: live.reduce((t, o) => t + o.couponDiscount, 0),
      byProduct: byProduct.list(),
      byCategory: byCategory.list(),
      byCity: byCity.list(),
      byCoupon: byCoupon.list(),
      couriers: [...couriers.values()].sort((a, b) => b.shipped - a.shipped),
      buyers,
      newBuyers: buyers.filter(b => b.isNew).length,
    }
  }, [orders, customers, products, categories, days])

  if (!report) {
    return (
      <>
        <PageHeader title="Reports" />
        <div className="mt-8">
          <Loading />
        </div>
      </>
    )
  }

  const returning = report.buyers.length - report.newBuyers

  return (
    <>
      <PageHeader
        title="Reports"
        text="What sells, where it goes and who buys it. Cancelled orders are left out of sales."
      >
        <label htmlFor="period" className="sr-only">
          Period
        </label>
        <select id="period" value={days} onChange={e => setDays(Number(e.target.value))} className={input}>
          {periods.map(p => (
            <option key={p.label} value={p.days}>
              {p.label}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Orders" value={String(report.orders)} hint={`${report.cancelled} cancelled`} />
        <Kpi label="Gross order value" value={formatPKR(report.gross)} hint="Before COD collection" />
        <Kpi label="Average order" value={formatPKR(report.average)} />
        <Kpi
          label="Customers"
          value={String(report.buyers.length)}
          hint={`${report.newBuyers} new, ${returning} returning`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesTable title="Sales by product" first="Product" rows={report.byProduct} file="sales-by-product.csv" />
        <SalesTable title="Sales by category" first="Category" rows={report.byCategory} file="sales-by-category.csv" />
        <SalesTable title="Sales by city" first="City" rows={report.byCity} file="sales-by-city.csv" hideUnits />

        <Section
          title="Courier performance"
          onExport={() =>
            downloadCsv('courier-performance.csv', [
              ['Courier', 'Shipped', 'Delivered', 'Delivered %', 'Delivered value (PKR)'],
              ...report.couriers.map(c => [
                c.name,
                c.shipped,
                c.delivered,
                Math.round((c.delivered / c.shipped) * 100),
                c.value,
              ]),
            ])
          }
          empty={report.couriers.length === 0}
        >
          <thead className="border-b border-hairline bg-wax/50">
            <tr>
              <th className={th}>Courier</th>
              <th className={`${th} text-right`}>Shipped</th>
              <th className={`${th} text-right`}>Delivered</th>
              <th className={`${th} text-right`}>Delivered value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {report.couriers.map(c => (
              <tr key={c.name}>
                <td className={td}>{c.name}</td>
                <td className={`${td} text-right tabular-nums`}>{c.shipped}</td>
                <td className={`${td} text-right tabular-nums`}>
                  {c.delivered}{' '}
                  <span className="text-sm text-umber">({Math.round((c.delivered / c.shipped) * 100)}%)</span>
                </td>
                <td className={`${td} text-right tabular-nums`}>{formatPKR(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </Section>

        <Section
          title="Top customers"
          onExport={() =>
            downloadCsv('top-customers.csv', [
              ['Customer', 'City', 'Orders', 'Order value (PKR)', 'New in period'],
              ...report.buyers.map(b => [b.name, b.city, b.orders, b.value, b.isNew ? 'Yes' : 'No']),
            ])
          }
          empty={report.buyers.length === 0}
        >
          <thead className="border-b border-hairline bg-wax/50">
            <tr>
              <th className={th}>Customer</th>
              <th className={`${th} text-right`}>Orders</th>
              <th className={`${th} text-right`}>Order value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {report.buyers.slice(0, 8).map(b => (
              <tr key={b.name + b.city}>
                <td className={td}>
                  {b.name}
                  <span className="block text-sm text-umber">
                    {b.city}
                    {b.isNew && ', new this period'}
                  </span>
                </td>
                <td className={`${td} text-right tabular-nums`}>{b.orders}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPKR(b.value)}</td>
              </tr>
            ))}
          </tbody>
        </Section>

        <Section
          title="Coupon use"
          note={`Coupons took ${formatPKR(report.discounts)} off in this period.`}
          onExport={() =>
            downloadCsv('coupon-use.csv', [
              ['Coupon', 'Orders', 'Discount given (PKR)'],
              ...report.byCoupon.map(c => [c.name, c.orders, c.value]),
            ])
          }
          empty={report.byCoupon.length === 0}
        >
          <thead className="border-b border-hairline bg-wax/50">
            <tr>
              <th className={th}>Coupon</th>
              <th className={`${th} text-right`}>Orders</th>
              <th className={`${th} text-right`}>Discount given</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {report.byCoupon.map(c => (
              <tr key={c.name}>
                <td className={`${td} font-medium tracking-wide`}>{c.name}</td>
                <td className={`${td} text-right tabular-nums`}>{c.orders}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPKR(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  note,
  onExport,
  empty,
  children,
}: {
  title: string
  note?: string
  onExport: () => void
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`${card} self-start overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 p-5 pb-3 sm:px-6">
        <div>
          <h2 className="text-2xl">{title}</h2>
          {note && <p className="mt-1 text-sm text-umber">{note}</p>}
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={empty}
          aria-label={`Download ${title} as a spreadsheet`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline hover:border-espresso disabled:opacity-40"
        >
          <Download size={17} />
        </button>
      </div>
      {empty ? (
        <p className="border-t border-hairline px-5 py-8 text-center text-umber sm:px-6">Nothing in this period.</p>
      ) : (
        <div className="relative overflow-x-auto border-t border-hairline">
          <table className="w-full min-w-[26rem] text-[0.95rem]">{children}</table>
        </div>
      )}
    </section>
  )
}

function SalesTable({
  title,
  first,
  rows,
  file,
  hideUnits,
}: {
  title: string
  first: string
  rows: Row[]
  file: string
  hideUnits?: boolean
}) {
  const top = Math.max(...rows.map(r => r.value), 1)
  return (
    <Section
      title={title}
      empty={rows.length === 0}
      onExport={() =>
        downloadCsv(file, [
          [first, 'Orders', 'Units', 'Sales (PKR)'],
          ...rows.map(r => [r.name, r.orders, r.units, r.value]),
        ])
      }
    >
      <thead className="border-b border-hairline bg-wax/50">
        <tr>
          <th className={th}>{first}</th>
          <th className={`${th} text-right`}>Orders</th>
          {!hideUnits && <th className={`${th} text-right`}>Units</th>}
          <th className={`${th} text-right`}>Sales</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {rows.slice(0, 8).map(r => (
          <tr key={r.name}>
            <td className={td}>
              {r.name}
              {/* Bar length compares sales within this table */}
              <span className="mt-1.5 block h-1 rounded-full bg-wax">
                <span className="block h-full rounded-full bg-caramel" style={{ width: `${(r.value / top) * 100}%` }} />
              </span>
            </td>
            <td className={`${td} text-right tabular-nums`}>{r.orders}</td>
            {!hideUnits && <td className={`${td} text-right tabular-nums`}>{r.units}</td>}
            <td className={`${td} text-right tabular-nums`}>{formatPKR(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </Section>
  )
}
