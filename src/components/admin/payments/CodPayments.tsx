'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Download } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import { card, downloadCsv, Empty, Kpi, shortDate, td, th, doneWithUndo } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import { formatPKR } from '@/lib/pricing'
import HowItWorks from '@/components/admin/HowItWorks'

const tabs = [
  { key: 'Collected by Courier', label: 'Courier holds the cash' },
  { key: 'Pending Collection', label: 'Delivered, cash not recorded' },
  { key: 'Settled to Business', label: 'Settled' },
  { key: 'Reconciliation Required', label: 'Amounts do not match' },
  { key: 'Disputed', label: 'Disputed' },
  { key: 'Adjusted', label: 'Settled with a correction' },
] as const

/** Cash on delivery orders placed before Easypaisa: follow the cash to your account */
export default function CodPayments() {
  const { orders, updateOrder } = useAdmin()
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('Collected by Courier')
  const [picked, setPicked] = useState<string[]>([])
  const [settling, setSettling] = useState(false)
  const [reference, setReference] = useState('')

  if (!orders) return null

  // Only delivered orders carry cash. Nothing is assumed collected.
  const delivered = orders.filter(o => o.status === 'Delivered' && o.paymentMethod !== 'Easypaisa')
  const sum = (status: string) => delivered.filter(o => o.paymentStatus === status).reduce((t, o) => t + o.total, 0)
  const shown = delivered.filter(o => o.paymentStatus === tab)
  const chosen = shown.filter(o => picked.includes(o.number))
  const chosenTotal = chosen.reduce((t, o) => t + o.total, 0)

  const held = new Map<string, { count: number; total: number }>()
  delivered
    .filter(o => o.paymentStatus === 'Collected by Courier')
    .forEach(o => {
      const name = o.shipment?.courier ?? 'Unknown courier'
      const row = held.get(name) ?? { count: 0, total: 0 }
      held.set(name, { count: row.count + 1, total: row.total + o.total })
    })

  // Shown only while older cash orders still need recording
  if (!orders.some(o => o.paymentMethod !== 'Easypaisa')) return null

  const switchTab = (key: typeof tab) => {
    setTab(key)
    setPicked([])
  }

  const markCollected = () => {
    const batch = chosen.map(o => ({ number: o.number, before: o.paymentStatus }))
    chosen.forEach(o =>
      updateOrder(o.number, { paymentStatus: 'Collected by Courier' }, 'COD recorded as collected by the courier'),
    )
    doneWithUndo(`${batch.length} recorded as collected`, () =>
      batch.forEach(b => updateOrder(b.number, { paymentStatus: b.before }, `Undone: payment back to ${b.before}`)),
    )
    setPicked([])
  }

  const settle = (e: FormEvent) => {
    e.preventDefault()
    const ref = reference.trim()
    chosen.forEach(o =>
      updateOrder(
        o.number,
        { paymentStatus: 'Settled to Business' },
        `COD settlement received from the courier${ref ? `, reference ${ref}` : ''}`,
      ),
    )
    const batch = chosen.map(o => ({ number: o.number, before: o.paymentStatus }))
    doneWithUndo(`${formatPKR(chosenTotal)} recorded as settled`, () =>
      batch.forEach(b => updateOrder(b.number, { paymentStatus: b.before }, `Undone: payment back to ${b.before}`)),
    )
    setPicked([])
    setReference('')
    setSettling(false)
  }

  const exportCsv = () =>
    downloadCsv('cod-payments.csv', [
      [
        'Order',
        'Customer',
        'Courier',
        'Tracking ID',
        'Dispatched',
        'COD amount (PKR)',
        'Collected (PKR)',
        'Courier charges (PKR)',
        'Reference',
        'Payment status',
      ],
      ...shown.map(o => [
        o.number,
        o.customer.name,
        o.shipment?.courier ?? '',
        o.shipment?.trackingId ?? '',
        o.shipment ? shortDate(o.shipment.dispatchedAt) : '',
        o.total,
        o.cod?.collected ?? o.total,
        o.cod?.charges ?? 0,
        o.cod?.reference ?? '',
        o.paymentStatus,
      ]),
    ])

  return (
    <>
      <div className="mt-14 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-10">
        <div>
          <h2 className="text-3xl">Older cash on delivery orders</h2>
          <p className="mt-2 text-umber">
            Orders placed before Easypaisa. Follow the cash from the courier to your account.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={shown.length === 0}
          className="btn-outline min-h-11 px-5 text-sm"
        >
          <Download size={16} /> Export {shown.length} as a spreadsheet
        </button>
      </div>
      <HowItWorks id="cod-payments">
        <p>
          With cash on delivery the money moves in steps: the customer pays the courier, the courier holds the cash,
          then the courier sends it to your account.
        </p>
        <p>
          When a courier confirms they collected, tick those orders and press <strong>Record as collected</strong>. When
          the money reaches your bank, tick them again and record the settlement with its reference.
        </p>
        <p>
          If an amount is short or wrong, open the order and use <strong>Amounts, charges or a problem</strong>.
        </p>
      </HowItWorks>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          strong
          label="Couriers owe you"
          value={formatPKR(sum('Collected by Courier'))}
          hint="Collected, not yet settled"
        />
        <Kpi
          label="Delivered, cash not recorded"
          value={formatPKR(sum('Pending Collection'))}
          hint="Confirm with the courier"
        />
        <Kpi label="Settled to you" value={formatPKR(sum('Settled to Business'))} hint="All time" />
      </div>

      {held.size > 0 && (
        <section className={`${card} mt-6 p-5 sm:p-6`} aria-labelledby="held-h">
          <h2 id="held-h" className="text-2xl">
            Held by each courier
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...held.entries()].map(([name, row]) => (
              <li key={name} className="rounded-xl bg-wax/50 p-4">
                <p className="text-sm text-umber">
                  {name}, {row.count} {row.count === 1 ? 'order' : 'orders'}
                </p>
                <p className="mt-1 font-display text-2xl">{formatPKR(row.total)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Payment status">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            aria-pressed={tab === t.key}
            className={clsx(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
              tab === t.key
                ? 'border-espresso bg-espresso text-ivory'
                : 'border-hairline bg-linen hover:border-espresso',
            )}
          >
            {t.label}
            <span className={clsx('tabular-nums', tab === t.key ? 'text-wax/80' : 'text-umber')}>
              {delivered.filter(o => o.paymentStatus === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {tab !== 'Settled to Business' && shown.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wax/60 px-4 py-3">
          <p className="text-[0.95rem]">
            {chosen.length === 0
              ? 'Tick the orders the courier has paid for.'
              : `${chosen.length} selected, ${formatPKR(chosenTotal)}`}
          </p>
          {tab === 'Collected by Courier' ? (
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => setSettling(true)}
              className="btn-primary min-h-11 px-5 text-sm"
            >
              Record settlement
            </button>
          ) : (
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={markCollected}
              className="btn-primary min-h-11 px-5 text-sm"
            >
              Record as collected by courier
            </button>
          )}
        </div>
      )}

      <div className={`${card} mt-4 overflow-hidden`}>
        {shown.length === 0 ? (
          <Empty title="Nothing here" text="No delivered orders are in this state." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[40rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  {tab !== 'Settled to Business' && (
                    <th className={th}>
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={chosen.length === shown.length}
                        onChange={e => setPicked(e.target.checked ? shown.map(o => o.number) : [])}
                        className="h-5 w-5 accent-caramel"
                      />
                    </th>
                  )}
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Courier</th>
                  <th className={`${th} text-right`}>COD amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {shown.map(o => (
                  <tr key={o.number}>
                    {tab !== 'Settled to Business' && (
                      <td className={td}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${o.number}`}
                          checked={picked.includes(o.number)}
                          onChange={e =>
                            setPicked(list =>
                              e.target.checked ? [...list, o.number] : list.filter(n => n !== o.number),
                            )
                          }
                          className="h-5 w-5 accent-caramel"
                        />
                      </td>
                    )}
                    <td className={td}>
                      <Link href={`/admin/orders/${o.number}`} className="font-medium hover:text-caramel">
                        {o.number}
                      </Link>
                      <span className="block text-sm text-umber">{shortDate(o.placedAt)}</span>
                    </td>
                    <td className={td}>
                      {o.customer.name}
                      <span className="block text-sm text-umber">{o.customer.city}</span>
                    </td>
                    <td className={td}>
                      {o.shipment?.courier ?? 'Unknown'}
                      <span className="block text-sm tabular-nums text-umber">{o.shipment?.trackingId}</span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{formatPKR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={settling}
        onClose={() => setSettling(false)}
        label="Record settlement"
        className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        <form onSubmit={settle}>
          <h2 className="pr-10 text-3xl">Record settlement</h2>
          <p className="mt-2 text-umber">
            {chosen.length} {chosen.length === 1 ? 'order' : 'orders'}, {formatPKR(chosenTotal)} received from the
            courier.
          </p>
          <label htmlFor="ref" className="field-label mt-6">
            Bank or courier reference, optional
          </label>
          <input id="ref" value={reference} onChange={e => setReference(e.target.value)} className="field" />
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary flex-1">
              Record {formatPKR(chosenTotal)} as settled
            </button>
            <button type="button" onClick={() => setSettling(false)} className="btn-outline">
              Not now
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
