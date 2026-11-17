'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Banknote,
  BarChart3,
  ExternalLink,
  Globe,
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Package,
  Send,
  Settings,
  ShoppingBag,
  Tag,
  Tags,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useAdmin, LIVE_CACHE_KEY } from './AdminData'
import QuickSearch from './QuickSearch'
import { signOut } from '@/lib/actions/auth'
import Logo from '@/components/Logo'

export type AdminViewer = {
  name: string
  email: string
  role: 'Administrator' | 'Manager'
  modules: string[]
} | null

// Module names match the ones ticked for managers in Team
const moduleOf: Record<string, string> = {
  '/admin/orders': 'Orders',
  '/admin/payments': 'Payments',
  '/admin/customers': 'Customers',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/discounts': 'Discounts',
  '/admin/reviews': 'Reviews',
  '/admin/newsletter': 'Newsletter',
  '/admin/messages': 'Messages',
  '/admin/reports': 'Reports',
  '/admin/settings': 'Settings',
  '/admin/website': 'Settings',
  '/admin/team': 'Team',
}

const nav = [
  { items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard }] },
  {
    title: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/payments', label: 'Payments', icon: Banknote },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: Tags },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/discounts', label: 'Discounts', icon: Tag },
      { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Send },
      { href: '/admin/messages', label: 'Messages', icon: Mail },
    ],
  },
  {
    title: 'Store',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/website', label: 'Website', icon: Globe },
      { href: '/admin/team', label: 'Team', icon: UserCog },
      { href: '/admin/activity', label: 'Activity log', icon: History },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function AdminShell({ children, viewer }: { children: ReactNode; viewer: AdminViewer }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // The page someone just clicked, shown as current at once while it loads
  const [pending, setPending] = useState<string | null>(null)
  const { orders, reviews, inbox, loadError, refresh } = useAdmin()
  // Managers see only the modules ticked for them. Administrators see everything.
  const allowed = (href: string) =>
    !viewer || viewer.role === 'Administrator' || !moduleOf[href] || viewer.modules.includes(moduleOf[href])
  const blocked = Object.keys(moduleOf).find(href => pathname.startsWith(href) && !allowed(href))
  // Counts that need the owner's attention
  const badges: Record<string, number> = {
    '/admin/orders':
      orders?.filter(o => o.status === 'Pending Confirmation' || o.status === 'Cancellation Requested').length ?? 0,
    '/admin/reviews': reviews.filter(r => r.status === 'Pending').length,
    '/admin/messages': inbox.filter(m => !m.handled).length,
  }

  const attention = Object.values(badges).reduce((a, b) => a + b, 0)
  const current = nav
    .flatMap(g => g.items)
    .filter(i => (i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.label

  useEffect(() => {
    setOpen(false)
    setPending(null)
  }, [pathname])

  // If a page never arrives (lost connection), stop showing it as loading
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => setPending(null), 12_000)
    return () => clearTimeout(t)
  }, [pending])

  // Escape closes the phone menu, and the page behind it stops scrolling
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const shown = pending ?? pathname
  const isActive = (href: string) => (href === '/admin' ? shown === '/admin' : shown.startsWith(href))

  /** Answers a click straight away: the item lights up and the phone menu closes */
  const go = (href: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    if (href === pathname) return
    setPending(href)
    setOpen(false)
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-soot p-4 text-wax">
      <Link href="/admin" className="flex items-center gap-3 px-2 py-2">
        <Logo size={44} withName={false} />
        <span className="min-w-0">
          <span className="block font-display text-xl italic leading-tight text-ivory">Candle Lit Studio</span>
          <span className="text-sm text-wax/60">Store admin</span>
        </span>
      </Link>
      <nav
        aria-label="Admin"
        className="-mx-1 mt-1 flex flex-1 flex-col overflow-y-auto px-1 [scrollbar-color:rgba(234,223,203,0.18)_transparent] [scrollbar-width:thin]"
      >
        {nav
          .map(group => ({ ...group, items: group.items.filter(i => allowed(i.href)) }))
          .filter(group => group.items.length > 0)
          .map((group, g) => (
            <div key={group.title ?? g} className="flex flex-col gap-0.5">
              {group.title && (
                <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-wax/45">
                  {group.title}
                </p>
              )}
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={go(href)}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={clsx(
                    'flex min-h-10 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors',
                    isActive(href) ? 'bg-ember font-medium text-soot' : 'hover:bg-wax/10 hover:text-ivory',
                  )}
                >
                  {pending === href ? <LoaderCircle size={18} className="animate-spin" /> : <Icon size={18} />}
                  {label}
                  {badges[href] > 0 && (
                    <span
                      className={clsx(
                        'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
                        isActive(href) ? 'bg-soot text-ember' : 'bg-ember text-soot',
                      )}
                      aria-label={`${badges[href]} waiting`}
                    >
                      {badges[href]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
      </nav>
      <div className="mt-3 flex items-center gap-3 border-t border-wax/15 px-3 pt-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wax/15 font-display text-lg uppercase text-ivory">
          {(viewer?.name || 'O').charAt(0)}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate text-ivory">{viewer?.name ?? 'Store owner'}</p>
          <p className="truncate text-wax/60">{viewer?.role ?? 'Administrator'}</p>
        </div>
        <Link
          href="/"
          title="View store"
          aria-label="View store"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-wax/10 hover:text-ivory"
        >
          <ExternalLink size={18} />
        </Link>
        {viewer && (
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={async () => {
              await signOut()
              try {
                sessionStorage.removeItem(LIVE_CACHE_KEY)
              } catch {}
              router.replace('/signin')
              router.refresh()
            }}
            className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-wax/10 hover:text-ivory"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ivory lg:pl-64 print:bg-white print:!pl-0">
      {/* A thin bar across the top while the next page loads */}
      {pending && (
        <div role="progressbar" aria-label="Opening page" className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden">
          <div className="nav-progress h-full bg-ember" />
        </div>
      )}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block print:!hidden">{sidebar}</aside>

      {/* Phone and tablet: top bar with a slide-in menu */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-soot px-4 text-ivory lg:hidden print:hidden">
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <Logo size={34} withName={false} />
          <span className="min-w-0">
            <span className="block font-display text-xl italic leading-tight">Candle Lit Studio</span>
            {current && <span className="block truncate text-xs text-wax/60">{current}</span>}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={attention ? `Open menu, ${attention} items need you` : 'Open menu'}
          aria-expanded={open}
          className="relative -mr-2 grid h-11 w-11 place-items-center"
        >
          <Menu size={22} />
          {attention > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-ember ring-2 ring-soot"
            />
          )}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="overlay-in absolute inset-0 bg-soot/60" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="drawer absolute inset-y-0 left-0 w-72 max-w-[85vw]"
          >
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
      {loadError && (
        <p
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 bg-wine/10 px-4 py-2 text-center text-sm text-wine print:hidden"
        >
          The dashboard could not load: {loadError}
          <button type="button" onClick={refresh} className="font-medium underline underline-offset-4">
            Try again
          </button>
        </p>
      )}
      <main className="mx-auto w-full max-w-[84rem] px-4 pb-20 pt-6 sm:px-8 lg:pt-8 print:!p-0">
        {!pathname.endsWith('/print') && <QuickSearch />}
        {blocked ? (
          <div className="py-20 text-center">
            <h1 className="text-4xl italic">Not part of your access</h1>
            <p className="mx-auto mt-3 max-w-md text-umber">
              Ask the store administrator to add {moduleOf[blocked]} to your modules in Team.
            </p>
            <Link href="/admin" className="btn-primary mt-8">
              Back to overview
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
