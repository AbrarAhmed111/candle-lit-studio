'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Minus, Plus, Share2 } from 'lucide-react'
import ShareDialog from './ShareDialog'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { formatPKR, salePrice } from '@/lib/pricing'
import { store } from '@/data/store'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addItem, setDrawer } from '@/store/cart/CartSlice'
import { toggleWishlist } from '@/store/wishlist/WishlistSlice'
import type { Product } from '@/types'

export default function ProductPurchase({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const saved = useAppSelector(s => s.wishlist.ids.includes(product.id))
  const [variantId, setVariantId] = useState(
    (product.variants.find(v => v.stock > 0) ?? product.variants[0]).id,
  )
  const [qty, setQty] = useState(1)
  const [sharing, setSharing] = useState(false)
  const cartEmpty = useAppSelector(s => s.cart.items.length === 0)

  const variant = product.variants.find(v => v.id === variantId)!
  const inCart = useAppSelector(
    s =>
      s.cart.items.find(i => i.productId === product.id && i.variantId === variantId)
        ?.qty ?? 0,
  )
  const available = Math.max(0, variant.stock - inCart)
  const price = salePrice(product, variant)
  const soldOut = variant.stock === 0

  // Phones: once the buy buttons scroll away, a slim bar keeps them in reach
  const buttonsRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const el = buttonsRef.current
    if (!el) return
    // Pinned once the buttons have scrolled up past the top of the screen
    const check = () => setPinned(el.getBoundingClientRect().bottom < 0)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])
  useEffect(() => {
    if (pinned) document.body.dataset.buybar = 'on'
    else delete document.body.dataset.buybar
    return () => {
      delete document.body.dataset.buybar
    }
  }, [pinned])

  const addAndGreet = () => {
    const first = cartEmpty
    if (!add()) return
    // The drawer greets the first item only. After that a toast is enough.
    if (first) dispatch(setDrawer(true))
    else toast.success(`${product.name} added to cart`)
  }

  const add = () => {
    if (available === 0) {
      toast.error(`You already have all ${variant.stock} in your cart`)
      return false
    }
    dispatch(addItem({ productId: product.id, variantId, qty: Math.min(qty, available) }))
    return true
  }

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-medium">{formatPKR(price)}</span>
        {price < variant.price && (
          <>
            <s className="text-lg text-umber">{formatPKR(variant.price)}</s>
            <span className="rounded-xl bg-espresso px-2 py-1 text-sm text-ivory">
              {product.discountPercent}% off, you save {formatPKR(variant.price - price)}
            </span>
          </>
        )}
      </p>

      {product.variants.length > 1 && (
        <fieldset className="mt-7">
          <legend className="mb-2.5 text-sm font-medium">
            Size: <span className="font-normal text-umber">{variant.label}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map(v => (
              <label
                key={v.id}
                className={clsx(
                  'flex min-h-12 cursor-pointer items-center rounded-xl border px-4 text-[0.95rem] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-caramel',
                  v.id === variantId
                    ? 'border-espresso bg-espresso text-ivory'
                    : 'border-hairline hover:border-espresso',
                  v.stock === 0 && 'text-umber line-through decoration-umber/60',
                )}
              >
                <input
                  type="radio"
                  name="variant"
                  className="sr-only"
                  checked={v.id === variantId}
                  onChange={() => {
                    setVariantId(v.id)
                    setQty(1)
                  }}
                />
                {v.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p className="mt-6 text-sm" role="status">
        {soldOut ? (
          <span className="text-wine">Sold out in this size</span>
        ) : variant.stock <= 5 ? (
          <span className="text-wine">Only {variant.stock} left in stock</span>
        ) : (
          <span className="text-sage">In stock, ready to dispatch</span>
        )}
      </p>

      <div ref={buttonsRef} className="mt-4 flex flex-wrap gap-3">
        <div className="flex h-12 items-center rounded-xl border border-hairline">
          <button
            type="button"
            onClick={() => setQty(q => Math.max(1, q - 1))}
            disabled={qty <= 1 || soldOut}
            aria-label="Decrease quantity"
            className="grid h-12 w-11 place-items-center disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center" aria-live="polite" aria-label={`Quantity ${qty}`}>
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty(q => Math.min(Math.max(available, 1), q + 1))}
            disabled={qty >= available || soldOut}
            aria-label="Increase quantity"
            className="grid h-12 w-11 place-items-center disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          disabled={soldOut}
          onClick={addAndGreet}
          className="btn-outline flex-1"
        >
          {soldOut ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
      <button
        type="button"
        disabled={soldOut}
        onClick={() => add() && router.push('/checkout')}
        className="btn-primary mt-3 w-full"
      >
        Buy now, pay on delivery
      </button>

      <div className="mt-5 flex gap-6 text-sm">
        <button
          type="button"
          onClick={() => {
            dispatch(toggleWishlist(product.id))
            toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist')
          }}
          aria-pressed={saved}
          className="flex min-h-11 items-center gap-2 hover:text-caramel"
        >
          <Heart size={17} className={saved ? 'fill-wine text-wine' : ''} />
          {saved ? 'Saved to wishlist' : 'Save to wishlist'}
        </button>
        <button
          type="button"
          onClick={() => setSharing(true)}
          className="flex min-h-11 items-center gap-2 hover:text-caramel"
        >
          <Share2 size={17} /> Share
        </button>
      </div>
      <ShareDialog product={product} open={sharing} onClose={() => setSharing(false)} />

      {pinned && (
        <div className="sheet-up fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ivory/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(46,31,23,0.5)] backdrop-blur lg:hidden">
          <div className="page flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg leading-tight">{product.name}</p>
              <p className="text-sm text-umber">
                {product.variants.length > 1 && `${variant.label}, `}
                <span className="font-medium text-espresso">{formatPKR(price)}</span>
              </p>
            </div>
            <button type="button" disabled={soldOut} onClick={addAndGreet} className="btn-primary min-h-11 shrink-0 px-6 text-sm">
              {soldOut ? 'Sold out' : 'Add to cart'}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-2 border-t border-hairline pt-6 text-[0.95rem] text-umber">
        <li>Cash on delivery, anywhere in Pakistan.</li>
        <li>
          Delivery {formatPKR(store.shippingFee)}, free over {formatPKR(store.freeShippingOver)}.
          Arrives in {store.deliveryEstimate}.
        </li>
        <li>Damaged in transit? We replace it.</li>
      </ul>
    </div>
  )
}
