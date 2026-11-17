import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import type { OrderStatus, PaymentStatus } from '@/types'

export const card = 'rounded-2xl border border-hairline bg-linen'
export const input =
  'min-h-11 rounded-xl border border-hairline bg-linen px-3.5 text-[0.95rem] text-espresso placeholder:text-umber/60 focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel aria-[invalid=true]:border-wine disabled:cursor-not-allowed disabled:opacity-60'
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

/** Confirms an action to the owner and records it in the activity log */
export const done = (text: string) => {
  toast.success(text)
  window.dispatchEvent(new CustomEvent('admin-log', { detail: text }))
}

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
  href,
}: {
  label: string
  value: string
  hint?: string
  /** Dark card for the number that needs action */
  strong?: boolean
  /** Makes the whole card a link to the list behind the number */
  href?: string
}) {
  const body = (
    <>
      <p className={clsx('flex items-center justify-between gap-2 text-sm', strong ? 'text-wax/80' : 'text-umber')}>
        {label}
        {href && (
          <ArrowUpRight
            size={16}
            aria-hidden
            className="shrink-0 opacity-60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        )}
      </p>
      <p className="mt-2 whitespace-nowrap font-display text-2xl leading-none tabular-nums sm:text-3xl lg:text-4xl">
        {value}
      </p>
      {hint && <p className={clsx('mt-2 text-sm', strong ? 'text-wax/70' : 'text-umber')}>{hint}</p>}
    </>
  )
  const box = clsx(
    'block rounded-2xl p-5',
    strong ? 'bg-espresso text-ivory' : 'border border-hairline bg-linen',
    href &&
      clsx(
        'group transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(46,31,23,0.55)]',
        !strong && 'hover:border-caramel/60',
      ),
  )
  return href ? (
    <Link href={href} className={box}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
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

/** Warns before the tab closes or reloads while a form has unsaved edits */
export function useLeaveWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}

/** Bar pinned to the bottom of the screen while a long form has unsaved edits */
export function SaveBar({
  show,
  label = 'Save changes',
  onDiscard,
}: {
  show: boolean
  label?: string
  onDiscard?: () => void
}) {
  if (!show) return null
  return (
    <div className="fade-up fixed inset-x-0 bottom-0 z-30 border-t border-wax/15 bg-soot/95 text-ivory backdrop-blur lg:left-64 print:hidden">
      <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <p className="flex items-center gap-2 text-sm text-wax">
          <span aria-hidden className="h-2 w-2 rounded-full bg-ember" />
          Unsaved changes
        </p>
        <div className="flex gap-2">
          {onDiscard && (
            <button type="button" onClick={onDiscard} className="btn-ghost-light min-h-11 px-5 text-sm">
              Discard
            </button>
          )}
          <button type="submit" className="btn-light min-h-11 px-5 text-sm">
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}
