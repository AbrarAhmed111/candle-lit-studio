import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { OrderStatus, PaymentStatus } from '@/types'

export const card = 'rounded-2xl border border-hairline bg-linen'
export const input =
  'min-h-11 rounded-xl border border-hairline bg-linen px-3.5 text-[0.95rem] text-espresso placeholder:text-umber/60 focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel'
export const th = 'px-4 py-3 text-left text-sm font-medium text-umber'
export const td = 'px-4 py-3.5 align-middle'

const zone = { timeZone: 'Asia/Karachi' } as const

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...zone })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...zone,
  })

/** Rs. 12,400 becomes Rs. 12.4k on chart axes */
export const compactPKR = (amount: number) =>
  amount >= 1000 ? `Rs. ${+(amount / 1000).toFixed(1)}k` : `Rs. ${Math.round(amount)}`

export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/92${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`

/** Builds a CSV in the browser and downloads it */
export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function PageHeader({
  title,
  text,
  children,
}: {
  title: string
  text?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl lg:text-5xl">{title}</h1>
        {text && <p className="mt-2 text-umber">{text}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

const statusTone: Record<OrderStatus, string> = {
  'Pending Confirmation': 'bg-ember/25 text-toffee',
  Confirmed: 'bg-caramel/15 text-toffee',
  Processing: 'bg-wax text-espresso',
  Packed: 'bg-wax text-espresso',
  Dispatched: 'bg-sage/15 text-sage',
  Delivered: 'bg-sage text-ivory',
  Cancelled: 'bg-wine/10 text-wine',
}

const paymentTone: Record<PaymentStatus, string> = {
  'Pending Collection': 'bg-wax text-umber',
  'Collected by Courier': 'bg-ember/25 text-toffee',
  'Settled to Business': 'bg-sage/15 text-sage',
}

const badge = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx(badge, statusTone[status])}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === 'Pending Confirmation' ? 'Needs confirmation' : status}
    </span>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={clsx(badge, paymentTone[status])}>{status}</span>
}

export function Kpi({
  label,
  value,
  hint,
  strong,
}: {
  label: string
  value: string
  hint?: string
  /** Dark card for the number that needs action */
  strong?: boolean
}) {
  return (
    <div className={clsx('rounded-2xl p-5', strong ? 'bg-espresso text-ivory' : 'border border-hairline bg-linen')}>
      <p className={clsx('text-sm', strong ? 'text-wax/80' : 'text-umber')}>{label}</p>
      <p className="mt-2 whitespace-nowrap font-display text-2xl leading-none sm:text-3xl lg:text-4xl">{value}</p>
      {hint && <p className={clsx('mt-2 text-sm', strong ? 'text-wax/70' : 'text-umber')}>{hint}</p>}
    </div>
  )
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-umber">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

export function Loading({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-wax/70" />
      ))}
    </div>
  )
}
