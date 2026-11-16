'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, LayoutGrid, LogOut, MapPin, Package, UserRound } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { href: '/account', label: 'Overview', icon: LayoutGrid },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/profile', label: 'Profile and preferences', icon: UserRound },
]

export default function AccountNav() {
  const pathname = usePathname()
  const active = (href: string) => (href === '/account' ? pathname === href : pathname.startsWith(href))

  return (
    <nav
      aria-label="Account"
      className="no-scroll -mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
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
      <Link
        href="/signin"
        className="flex min-h-11 shrink-0 items-center gap-3 rounded-full border border-hairline px-4 text-[0.95rem] text-umber hover:border-espresso hover:text-espresso lg:mt-3 lg:rounded-xl lg:border-transparent lg:border-t-hairline lg:pt-1 lg:hover:border-transparent lg:hover:border-t-hairline"
      >
        <LogOut size={17} />
        Sign out
      </Link>
    </nav>
  )
}
