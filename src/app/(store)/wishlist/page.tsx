'use client'

import Link from 'next/link'
import ProductCard from '@/components/store/ProductCard'
import PopularPicks from '@/components/store/PopularPicks'
import { products } from '@/data/products'
import { useAppSelector } from '@/store/store'

export default function WishlistPage() {
  const ids = useAppSelector(s => s.wishlist.ids)
  const hydrated = useAppSelector(s => s.cart.hydrated)
  const saved = products.filter(p => ids.includes(p.id))

  if (!hydrated) {
    return (
      <div className="page pt-8 lg:pt-12" role="status" aria-label="Loading your wishlist">
        <div className="h-14 w-72 animate-pulse rounded-xl bg-wax/70" />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="alcove aspect-[4/5] animate-pulse bg-wax/70" />
          ))}
        </div>
      </div>
    )
  }

  if (saved.length === 0) {
    return (
      <div className="page py-20">
        <div className="text-center">
          <h1 className="text-5xl italic">Nothing saved yet</h1>
          <p className="mx-auto mt-4 max-w-sm text-lg text-umber">
            Tap the heart on any candle to keep it here for later.
          </p>
          <Link href="/shop" className="btn-primary mt-8">
            Shop all candles
          </Link>
        </div>
        <PopularPicks />
      </div>
    )
  }

  return (
    <div className="page pt-8 lg:pt-12">
      <h1 className="text-5xl lg:text-6xl">Your wishlist</h1>
      <p className="mt-4 text-umber">{saved.length} saved. Tap the plus to move a candle to your cart.</p>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {saved.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
