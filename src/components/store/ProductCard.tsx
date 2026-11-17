'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Heart, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import ProductPhoto from './ProductPhoto'
import { formatPKR, fromPrice, totalStock } from '@/lib/pricing'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addItem, setDrawer } from '@/store/cart/CartSlice'
import { toggleWishlist } from '@/store/wishlist/WishlistSlice'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const saved = useAppSelector(s => s.wishlist.ids.includes(product.id))
  const cartEmpty = useAppSelector(s => s.cart.items.length === 0)
  const { original, sale } = fromPrice(product)
  const stock = totalStock(product)
  const soldOut = stock === 0
  const firstAvailable = product.variants.find(v => v.stock > 0)
  const hasChoices = product.variants.length > 1

  // The plus turns into a tick for a moment so the tap feels answered
  const [added, setAdded] = useState(false)
  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1400)
    return () => clearTimeout(t)
  }, [added])

  const quickAdd = () => {
    if (!firstAvailable) return
    setAdded(true)
    dispatch(addItem({ productId: product.id, variantId: firstAvailable.id, qty: 1 }))
    // The drawer greets the first item only. After that a toast is enough.
    if (cartEmpty) dispatch(setDrawer(true))
    else toast.success(`${product.name} added to cart`)
  }

  const toggleSaved = () => {
    dispatch(toggleWishlist(product.id))
    toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist')
  }

  return (
    <article className="group relative flex flex-col">
      <div
        className="alcove card-media relative aspect-[4/5] overflow-hidden"
        style={{ backgroundColor: product.art.bg }}
      >
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0"
          aria-label={product.name}
        >
          <ProductPhoto
            product={product}
            decorative
            className={clsx(
              'transition-transform duration-700 ease-out group-hover:scale-[1.06]',
              soldOut && 'opacity-60 grayscale-[35%]',
            )}
          />
          {/* A second view fades in on hover. Touch screens keep the main photo. */}
          {product.images.length > 1 && !soldOut && (
            <ProductPhoto
              product={product}
              index={1}
              decorative
              className="absolute inset-0 opacity-0 transition-[opacity,transform] duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.06] [@media(hover:hover)]:group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col items-start gap-1.5">
          {product.discountPercent && !soldOut && (
            <span className="rounded-xl bg-espresso px-2 py-1 text-xs font-medium text-ivory">
              {product.discountPercent}% off
            </span>
          )}
          {product.isNew && !soldOut && (
            <span className="rounded-xl bg-linen px-2 py-1 text-xs font-medium text-espresso">
              New
            </span>
          )}
          {soldOut && (
            <span className="rounded-xl bg-linen px-2 py-1 text-xs font-medium text-umber">
              Sold out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-linen/90 text-espresso backdrop-blur transition-transform duration-300 hover:scale-110 active:scale-90"
        >
          <Heart key={String(saved)} size={17} className={saved ? 'pop fill-wine text-wine' : ''} />
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl leading-tight">
            <Link href={`/products/${product.slug}`} className="draw-link pb-0.5">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-sm text-umber">
            {product.fragrance ?? product.tagline}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[0.95rem]">
            {hasChoices && <span className="text-sm text-umber">From</span>}
            <span className="font-medium">{formatPKR(sale)}</span>
            {sale < original && (
              <s className="text-sm text-umber">{formatPKR(original)}</s>
            )}
          </p>
          {!soldOut && stock <= 5 && (
            <p className="mt-1 text-sm text-wine">Only {stock} left</p>
          )}
        </div>

        {!soldOut && (
          <button
            type="button"
            onClick={quickAdd}
            aria-label={`Add ${product.name}${firstAvailable ? `, ${firstAvailable.label},` : ''} to cart`}
            className={clsx(
              'mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-300 active:scale-90',
              added
                ? 'border-sage bg-sage text-ivory'
                : 'border-espresso text-espresso hover:rotate-90 hover:bg-espresso hover:text-ivory',
            )}
          >
            {added ? <Check key="added" size={18} className="pop" /> : <Plus size={18} />}
          </button>
        )}
      </div>
    </article>
  )
}
