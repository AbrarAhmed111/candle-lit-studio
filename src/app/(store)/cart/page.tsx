'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import ProductPhoto from '@/components/store/ProductPhoto'
import OrderSummary from '@/components/store/OrderSummary'
import { computeTotals, formatPKR } from '@/lib/pricing'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { removeItem, setQty } from '@/store/cart/CartSlice'

export default function CartPage() {
  const dispatch = useAppDispatch()
  const { items, couponCode, hydrated } = useAppSelector(s => s.cart)
  const totals = computeTotals(items, couponCode)

  if (!hydrated) {
    return <div className="page py-24 text-center text-umber">Loading your cart…</div>
  }

  if (totals.lines.length === 0) {
    return (
      <div className="page py-24 text-center">
        <h1 className="text-5xl italic">Your cart is empty</h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-umber">
          Find a candle you like and it will wait for you here.
        </p>
        <Link href="/shop" className="btn-primary mt-8">
          Shop all candles
        </Link>
      </div>
    )
  }

  return (
    <div className="page pt-8 lg:pt-12">
      <h1 className="text-5xl lg:text-6xl">Your cart</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <ul className="divide-y divide-hairline border-y border-hairline">
          {totals.lines.map(({ product, variant, qty, unitPrice, lineTotal, lineOriginal }) => (
            <li key={variant.id} className="flex gap-4 py-6 sm:gap-6">
              <Link
                href={`/products/${product.slug}`}
                className="alcove h-28 w-24 shrink-0 overflow-hidden sm:h-36 sm:w-28"
                style={{ backgroundColor: product.art.bg }}
                aria-label={product.name}
              >
                <ProductPhoto product={product} sizes="112px" decorative />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl leading-tight sm:text-2xl">
                      <Link href={`/products/${product.slug}`} className="hover:text-caramel">
                        {product.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-umber">{variant.label}</p>
                    <p className="mt-1 text-sm">
                      {formatPKR(unitPrice)}
                      {unitPrice < variant.price && (
                        <s className="ml-2 text-umber">{formatPKR(variant.price)}</s>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-medium">
                    {formatPKR(lineTotal)}
                    {lineTotal < lineOriginal && (
                      <s className="block text-sm font-normal text-umber">
                        {formatPKR(lineOriginal)}
                      </s>
                    )}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex h-11 items-center rounded-xl border border-hairline">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(setQty({ productId: product.id, variantId: variant.id, qty: qty - 1 }))
                      }
                      disabled={qty <= 1}
                      aria-label={`Decrease quantity of ${product.name}`}
                      className="grid h-11 w-10 place-items-center disabled:opacity-40"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-7 text-center text-sm" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(setQty({ productId: product.id, variantId: variant.id, qty: qty + 1 }))
                      }
                      disabled={qty >= variant.stock}
                      aria-label={`Increase quantity of ${product.name}`}
                      className="grid h-11 w-10 place-items-center disabled:opacity-40"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(removeItem({ productId: product.id, variantId: variant.id }))
                    }
                    className="flex min-h-11 items-center gap-1.5 text-sm text-umber hover:text-wine"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
                {qty >= variant.stock && (
                  <p className="mt-2 text-sm text-wine">
                    That is all {variant.stock} we have in stock.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="lg:sticky lg:top-36 lg:self-start">
          <OrderSummary totals={totals}>
            <Link href="/checkout" className="btn-primary w-full">
              Go to checkout
            </Link>
            <Link href="/shop" className="link mt-4 block text-center text-sm">
              Keep shopping
            </Link>
          </OrderSummary>
        </div>
      </div>
    </div>
  )
}
