'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Search, ShoppingBag, User } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from './AdminData'
import { formatPKR } from '@/lib/pricing'

type Result = { href: string; title: string; detail: string; kind: 'order' | 'customer' | 'product' }

const icons = { order: ShoppingBag, customer: User, product: Package }

/** One box to find any order, customer or candle. Press / to jump to it. */
export default function QuickSearch() {
  const router = useRouter()
  const { orders, customers, products } = useAdmin()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const digits = q.replace(/\D/g, '')
    const phone = (p: string) => digits.length >= 4 && p.includes(digits)
    return [
      ...(orders ?? [])
        .filter(
          o =>
            o.number.toLowerCase().includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            phone(o.customer.phone) ||
            o.shipment?.trackingId.includes(q),
        )
        .slice(0, 5)
        .map(o => ({
          href: `/admin/orders/${o.number}`,
          title: `${o.number}, ${o.customer.name}`,
          detail: `${o.status === 'Pending Confirmation' ? 'Needs confirmation' : o.status}, ${formatPKR(o.total)}`,
          kind: 'order' as const,
        })),
      ...customers
        .filter(c => c.name.toLowerCase().includes(q) || phone(c.phone) || c.email?.toLowerCase().includes(q))
        .slice(0, 3)
        .map(c => ({
          href: `/admin/customers?q=${encodeURIComponent(c.phone)}`,
          title: c.name,
          detail: `${c.phone}, ${c.orders.length} ${c.orders.length === 1 ? 'order' : 'orders'}`,
          kind: 'customer' as const,
        })),
      ...products
        .filter(p => p.name.toLowerCase().includes(q) || p.variants.some(v => v.sku.toLowerCase().includes(q)))
        .slice(0, 4)
        .map(p => ({
          href: `/admin/products/${p.id}`,
          title: p.name,
          detail: `${p.variants.reduce((n, v) => n + v.stock, 0)} in stock${p.active ? '' : ', hidden'}`,
          kind: 'product' as const,
        })),
    ]
  }, [query, orders, customers, products])

  const go = (r: Result) => {
    setOpen(false)
    setQuery('')
    router.push(r.href)
  }

  return (
    <div className="relative mb-6 print:hidden">
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-umber" />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive(a => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive(a => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            go(results[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
            input.current?.blur()
          }
        }}
        placeholder="Find an order, customer or candle: type a name, phone or order number"
        aria-label="Find an order, customer or candle"
        className="min-h-12 w-full rounded-2xl border border-hairline bg-linen pl-11 pr-4 text-[0.95rem] placeholder:text-umber/70 focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-hairline bg-linen shadow-[0_24px_50px_-24px_rgba(46,31,23,0.5)]">
          {results.length === 0 ? (
            <p className="p-4 text-umber">Nothing found for “{query.trim()}”.</p>
          ) : (
            <ul role="listbox" aria-label="Search results">
              {results.map((r, i) => {
                const Icon = icons[r.kind]
                return (
                  <li key={r.href + i} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => go(r)}
                      onMouseEnter={() => setActive(i)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-left',
                        i === active && 'bg-wax/60',
                      )}
                    >
                      <Icon size={17} className="shrink-0 text-caramel" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate text-sm text-umber">{r.detail}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
