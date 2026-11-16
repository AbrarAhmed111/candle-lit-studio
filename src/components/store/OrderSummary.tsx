'use client'

import { useState } from 'react'
import { Tag, X } from 'lucide-react'
import { checkCoupon, computeTotals, formatPKR } from '@/lib/pricing'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { setCoupon } from '@/store/cart/CartSlice'

type Totals = ReturnType<typeof computeTotals>

export default function OrderSummary({
  totals,
  children,
}: {
  totals: Totals
  children?: React.ReactNode
}) {
  const dispatch = useAppDispatch()
  const couponCode = useAppSelector(s => s.cart.couponCode)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Not a <form>: this sits inside the checkout form, and forms cannot nest
  const apply = () => {
    if (!code.trim()) return setError('Enter a coupon code.')
    const check = checkCoupon(code, totals.subtotal)
    if (!check.ok) return setError(check.message)
    dispatch(setCoupon(check.coupon.code))
    setCode('')
    setError(null)
  }

  return (
    <div className="bg-wax/60 p-6 sm:p-8">
      <h2 className="text-2xl">Order summary</h2>

      {totals.coupon ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-sage/40 bg-linen px-3.5 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <Tag size={15} className="text-sage" />
            <span>
              <span className="font-semibold">{totals.coupon.code}</span> applied.{' '}
              <span className="text-umber">{totals.coupon.description}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => dispatch(setCoupon(null))}
            aria-label={`Remove coupon ${totals.coupon.code}`}
            className="grid h-9 w-9 shrink-0 place-items-center hover:text-wine"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <label htmlFor="coupon" className="field-label">
            Coupon code
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="WELCOME10"
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  apply()
                }
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'coupon-error' : undefined}
              className="field"
            />
            <button type="button" onClick={apply} className="btn-outline shrink-0 px-5">
              Apply
            </button>
          </div>
          {(error || (couponCode && totals.couponError)) && (
            <p id="coupon-error" className="field-error">
              {error ?? totals.couponError}
            </p>
          )}
        </div>
      )}

      <dl className="mt-6 space-y-2.5 text-[0.95rem]">
        <Row label={`Subtotal (${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'})`}>
          {totals.productSavings > 0 && (
            <s className="mr-2 text-umber">{formatPKR(totals.originalSubtotal)}</s>
          )}
          {formatPKR(totals.subtotal)}
        </Row>
        {totals.couponDiscount > 0 && (
          <Row label={`Coupon ${totals.coupon?.code}`}>
            <span className="text-sage">− {formatPKR(totals.couponDiscount)}</span>
          </Row>
        )}
        <Row label="Delivery">
          {totals.shipping === 0 ? <span className="text-sage">Free</span> : formatPKR(totals.shipping)}
        </Row>
      </dl>

      <div className="mt-5 flex items-baseline justify-between border-t border-espresso pt-5">
        <span className="font-medium">Pay on delivery</span>
        <span className="font-display text-3xl">{formatPKR(totals.total)}</span>
      </div>
      {totals.savings > 0 && (
        <p className="mt-1 text-right text-sm text-sage">
          You save {formatPKR(totals.savings)} on this order
        </p>
      )}

      {totals.toFreeShipping > 0 && totals.shipping > 0 && (
        <p className="mt-4 text-sm text-umber">
          Add {formatPKR(totals.toFreeShipping)} more for free delivery.
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
