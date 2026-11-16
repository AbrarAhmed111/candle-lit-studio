'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import clsx from 'clsx'
import CartDrawer from './CartDrawer'
import { categories } from '@/data/products'
import { store } from '@/data/store'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { setDrawer } from '@/store/cart/CartSlice'

const links = [
  { href: '/collections/gift-sets', label: 'Gift sets' },
  { href: '/about', label: 'Our story' },
  { href: '/candle-care', label: 'Candle care' },
  { href: '/track-order', label: 'Track order' },
]

// Pages that open with a dark full-bleed hero the header floats over
const darkHeroPaths = ['/', '/about']

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const cartCount = useAppSelector(s => s.cart.items.reduce((n, i) => n + i.qty, 0))
  const wishCount = useAppSelector(s => s.wishlist.ids.length)

  // Bump the cart badge whenever the count changes
  const [bump, setBump] = useState(false)
  const lastCount = useRef(cartCount)
  useEffect(() => {
    if (cartCount !== lastCount.current) {
      lastCount.current = cartCount
      setBump(true)
      const t = setTimeout(() => setBump(false), 450)
      return () => clearTimeout(t)
    }
  }, [cartCount])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
    dispatch(setDrawer(false))
  }, [pathname, dispatch])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/shop?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
  }

  const overHero = darkHeroPaths.includes(pathname) && !scrolled && !searchOpen
  const iconBtn =
    'relative grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-caramel/15'

  return (
    <>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-40 transition-[transform,background-color,color,box-shadow] duration-500',
          scrolled && '-translate-y-8',
          overHero
            ? 'bg-transparent text-ivory'
            : 'bg-ivory/80 text-espresso shadow-[0_10px_30px_-22px_rgba(46,31,23,0.6)] backdrop-blur-xl',
        )}
      >
        <p className="flex h-8 items-center justify-center overflow-hidden whitespace-nowrap bg-espresso px-3 text-[0.72rem] text-ivory sm:text-[0.8rem]">
          {store.announcement}
        </p>

        <div
          className={clsx(
            'page flex items-center justify-between gap-4 transition-[height] duration-500',
            scrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-20',
          )}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={clsx(iconBtn, '-ml-2 lg:hidden')}
          >
            <Menu size={22} />
          </button>

          <Link href="/" className="font-display text-[1.45rem] italic leading-none lg:text-[1.7rem]">
            Candle Lit Studio
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 text-[0.95rem] lg:flex">
            <div className="group relative">
              <Link href="/shop" className="flex items-center gap-1 py-5">
                <span className="draw-link">Shop</span>
                <ChevronDown size={15} className="transition-transform duration-300 group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute -left-4 top-full w-72 translate-y-2 rounded-2xl border border-hairline bg-linen p-2 text-espresso opacity-0 shadow-[0_30px_60px_-30px_rgba(46,31,23,0.5)] transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <Link href="/shop" className="block rounded-xl px-3.5 py-2.5 font-medium transition-colors hover:bg-wax">
                  All candles
                </Link>
                {categories.map(c => (
                  <Link
                    key={c.slug}
                    href={`/collections/${c.slug}`}
                    className="block rounded-xl px-3.5 py-2.5 transition-colors hover:bg-wax"
                  >
                    {c.name}
                  </Link>
                ))}
                <Link href="/shop?sale=1" className="block rounded-xl px-3.5 py-2.5 text-wine transition-colors hover:bg-wax">
                  On sale
                </Link>
              </div>
            </div>
            {links.map(l => (
              <Link key={l.href} href={l.href} className="draw-link py-1">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(o => !o)}
              aria-label="Search"
              aria-expanded={searchOpen}
              className={iconBtn}
            >
              <Search size={20} />
            </button>
            <Link href="/account" aria-label="Account" className={clsx(iconBtn, 'hidden sm:grid')}>
              <User size={20} />
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishCount} saved`}
              className={clsx(iconBtn, 'hidden sm:grid')}
            >
              <Heart size={20} />
              {wishCount > 0 && <Count n={wishCount} />}
            </Link>
            <button
              type="button"
              onClick={() => dispatch(setDrawer(true))}
              aria-label={`Open cart, ${cartCount} items`}
              className={clsx(iconBtn, '-mr-2')}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && <Count n={cartCount} bump={bump} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="fade-up border-t border-hairline">
            <div className="page flex items-center gap-3 py-3">
              <Search size={18} className="shrink-0 text-umber" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by candle or fragrance, like rose or oud"
                aria-label="Search candles"
                className="min-h-11 w-full bg-transparent text-base placeholder:text-umber/60 focus:outline-none"
              />
              <button type="submit" className="btn-primary min-h-10 px-5 text-sm">
                Search
              </button>
            </div>
          </form>
        )}
      </header>

      {/* Fixed header needs a spacer everywhere except over a dark hero */}
      {!darkHeroPaths.includes(pathname) && <div aria-hidden className="h-24 lg:h-28" />}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="overlay-in absolute inset-0 bg-soot/55 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="drawer relative flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-ivory p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-2xl italic">Candle Lit Studio</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-wax"
              >
                <X size={22} />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col">
              {[
                { href: '/shop', label: 'All candles' },
                ...categories.map(c => ({ href: `/collections/${c.slug}`, label: c.name })),
              ].map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="fade-up border-b border-hairline py-3 font-display text-[1.6rem]"
                  style={{ '--d': `${120 + i * 50}ms` } as React.CSSProperties}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/shop?sale=1"
                className="fade-up border-b border-hairline py-3 font-display text-[1.6rem] text-wine"
                style={{ '--d': '470ms' } as React.CSSProperties}
              >
                On sale
              </Link>
              <div
                className="fade-up mt-6 flex flex-col gap-3 text-umber"
                style={{ '--d': '540ms' } as React.CSSProperties}
              >
                {links.slice(1).map(l => (
                  <Link key={l.href} href={l.href}>
                    {l.label}
                  </Link>
                ))}
                <Link href="/wishlist">Wishlist{wishCount > 0 && ` (${wishCount})`}</Link>
                <Link href="/account">My account</Link>
                <Link href="/contact">Contact us</Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  )
}

function Count({ n, bump }: { n: number; bump?: boolean }) {
  return (
    <span
      className={clsx(
        'absolute right-0.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-caramel px-1 text-[0.68rem] font-semibold leading-none text-ivory',
        bump && 'pop',
      )}
    >
      {n}
    </span>
  )
}
