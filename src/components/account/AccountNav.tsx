'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'
import { useEffect, useRef } from 'react'
import { Heart, LayoutDashboard, LayoutGrid, LogOut, MapPin, Package, UserRound } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { href: '/account', label: 'Overview', icon: LayoutGrid },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/profile', label: 'Profile and preferences', icon: UserRound },
]

export default function AccountNav({ staff = false }: { staff?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = (href: string) => (href === '/account' ? pathname === href : pathname.startsWith(href))
  const navRef = useRef<HTMLElement>(null)

  // On phones the tabs scroll sideways, so bring the current one into view
  useEffect(() => {
    const nav = navRef.current
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({ left: current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2, behavior: 'smooth' })
  }, [pathname])

  return (
    <nav
      ref={navRef}
      aria-label="Account"
      className="no-scroll relative -mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? 'page' : undefined}
          className={clsx(
            'flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 text-[0.95rem] transition-colors lg:rounded-xl',
            active(href)
              ? 'bg-espresso text-ivory'
              : 'border border-hairline hover:border-espresso lg:border-transparent lg:hover:border-transparent lg:hover:bg-wax/60',
          )}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
      {staff && (
        <Link
          href="/admin"
          className="flex min-h-11 shrink-0 items-center gap-3 rounded-full bg-ember px-4 text-[0.95rem] font-medium text-soot transition-colors hover:bg-caramel hover:text-ivory lg:mt-3 lg:rounded-xl"
        >
          <LayoutDashboard size={17} />
          Store dashboard
        </Link>
      )}
      <button
        type="button"
        onClick={async () => {
          await signOut()
          router.replace('/signin')
          router.refresh()
        }}
        className="flex min-h-11 shrink-0 items-center gap-3 rounded-full border border-hairline px-4 text-[0.95rem] text-umber hover:border-espresso hover:text-espresso lg:mt-3 lg:rounded-xl lg:border-transparent lg:border-t-hairline lg:pt-1 lg:hover:border-transparent lg:hover:border-t-hairline"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </nav>
  )
}
