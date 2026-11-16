'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink, LayoutDashboard, Menu, Package, ShoppingBag, Users, X } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from './AdminData'

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/customers', label: 'Customers', icon: Users },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { orders } = useAdmin()
  const waiting = orders?.filter(o => o.status === 'Pending Confirmation').length ?? 0

  useEffect(() => setOpen(false), [pathname])

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebar = (
    <div className="flex h-full flex-col bg-soot p-4 text-wax">
      <Link href="/admin" className="px-3 py-3">
        <span className="block font-display text-2xl italic text-ivory">Candle Lit Studio</span>
        <span className="text-sm text-wax/60">Store admin</span>
      </Link>
      <nav aria-label="Admin" className="mt-6 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={clsx(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors',
              isActive(href) ? 'bg-ember text-soot' : 'hover:bg-wax/10 hover:text-ivory',
            )}
          >
            <Icon size={18} />
            {label}
            {href === '/admin/orders' && waiting > 0 && (
              <span
                className={clsx(
                  'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
                  isActive(href) ? 'bg-soot text-ember' : 'bg-ember text-soot',
                )}
                aria-label={`${waiting} orders need confirmation`}
              >
                {waiting}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-3 border-t border-wax/15 pt-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] hover:bg-wax/10 hover:text-ivory"
        >
          <ExternalLink size={18} /> View store
        </Link>
        <div className="flex items-center gap-3 px-3 pb-1">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-wax/15 font-display text-lg text-ivory">
            O
          </span>
          <div className="text-sm">
            <p className="text-ivory">Store owner</p>
            <p className="text-wax/60">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ivory lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Phone and tablet: top bar with a slide-in menu */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-soot px-4 text-ivory lg:hidden">
        <span className="font-display text-xl italic">Candle Lit Studio</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-11 w-11 place-items-center"
        >
          <Menu size={22} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="overlay-in absolute inset-0 bg-soot/60" onClick={() => setOpen(false)} />
          <div className="drawer absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            {sidebar}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 grid h-11 w-11 place-items-center text-ivory"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}

      <p className="bg-wax px-4 py-2 text-center text-sm text-umber">
        Demo data. Changes are saved in this browser only and do not reach the storefront yet.
      </p>
      <main className="mx-auto w-full max-w-[84rem] px-4 pb-20 pt-8 sm:px-8 lg:pt-10">{children}</main>
    </div>
  )
}
