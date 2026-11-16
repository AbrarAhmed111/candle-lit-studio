'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import CandleArt from './CandleArt'
import ProductPhoto from './ProductPhoto'
import { store } from '@/data/store'
import { computeTotals, formatPKR } from '@/lib/pricing'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { removeItem, setDrawer, setQty } from '@/store/cart/CartSlice'

export default function CartDrawer() {
  const dispatch = useAppDispatch()
  const { items, couponCode, drawerOpen } = useAppSelector(s => s.cart)
  const totals = computeTotals(items, couponCode)
  const close = () => dispatch(setDrawer(false))

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch(setDrawer(false))
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen, dispatch])

  if (!drawerOpen) return null

  const progress = Math.min(
    100,
    ((store.freeShippingOver - totals.toFreeShipping) / store.freeShippingOver) * 100,
  )

  return (
    <div className="fixed inset-0 z-[60] text-espresso" role="dialog" aria-modal="true" aria-label="Cart">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="overlay-in absolute inset-0 bg-soot/55 backdrop-blur-[2px]"
      />
      <div className="drawer-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-ivory shadow-[-30px_0_60px_-30px_rgba(30,20,16,0.5)]">
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 className="text-3xl italic">
            Your cart{' '}
            <span className="font-sans text-base not-italic text-umber">({totals.itemCount})</span>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-wax"
          >
            <X size={20} />
          </button>
        </div>

        {totals.lines.length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-sm text-umber">
              {totals.toFreeShipping > 0
                ? `Add ${formatPKR(totals.toFreeShipping)} more for free delivery`
                : 'You have free delivery on this order'}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wax">
              <div
                className="h-full rounded-full bg-gradient-to-r from-caramel to-ember transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {totals.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <CandleArt shape="pillar" wax="#EADFCB" vessel="#EADFCB" className="h-32 w-auto" />
            <p className="mt-4 font-display text-2xl italic">Your cart is empty</p>
            <p className="mt-2 text-umber">Find a candle you like and it will wait here.</p>
            <Link href="/shop" onClick={close} className="btn-primary mt-6">
              Shop all candles
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-hairline overflow-y-auto border-y border-hairline px-6">
              {totals.lines.map((l, i) => (
                <li
                  key={l.variant.id}
                  className="fade-up flex gap-4 py-4"
                  style={{ '--d': `${120 + i * 60}ms` } as React.CSSProperties}
                >
                  <Link
                    href={`/products/${l.product.slug}`}
                    onClick={close}
                    className="alcove h-24 w-20 shrink-0 overflow-hidden"
                    style={{ backgroundColor: l.product.art.bg }}
                    aria-label={l.product.name}
                  >
                    <ProductPhoto product={l.product} sizes="80px" decorative />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl leading-tight">{l.product.name}</p>
                        <p className="text-sm text-umber">{l.variant.label}</p>
                      </div>
                      <p className="shrink-0 text-[0.95rem] font-medium">{formatPKR(l.lineTotal)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex h-9 items-center rounded-full border border-hairline">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(setQty({ productId: l.product.id, variantId: l.variant.id, qty: l.qty - 1 }))
                          }
                          disabled={l.qty <= 1}
                          aria-label={`Decrease quantity of ${l.product.name}`}
                          className="grid h-9 w-9 place-items-center disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(setQty({ productId: l.product.id, variantId: l.variant.id, qty: l.qty + 1 }))
                          }
                          disabled={l.qty >= l.variant.stock}
                          aria-label={`Increase quantity of ${l.product.name}`}
                          className="grid h-9 w-9 place-items-center disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(removeItem({ productId: l.product.id, variantId: l.variant.id }))
                        }
                        className="min-h-9 text-sm text-umber underline-offset-4 hover:text-wine hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-6 pt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-umber">Subtotal</span>
                <span className="font-display text-3xl">{formatPKR(totals.subtotal)}</span>
              </div>
              <p className="mt-1 text-sm text-umber">
                Delivery and coupons are worked out at checkout. Pay in cash on delivery.
              </p>
              <Link href="/checkout" onClick={close} className="btn-primary mt-5 w-full">
                Go to checkout
              </Link>
              <Link href="/cart" onClick={close} className="link mt-4 block text-center text-sm">
                View full cart
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
