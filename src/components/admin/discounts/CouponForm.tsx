'use client'

import { FormEvent, useState } from 'react'
import { useAdmin, type AdminCoupon } from '@/components/admin/AdminData'
import { done } from '@/components/admin/ui'
import type { Coupon } from '@/types'
import { describe, whole } from './helpers'

export default function CouponForm({ initial, onDone }: { initial?: AdminCoupon; onDone: () => void }) {
  const { coupons, products, categories, setShop } = useAdmin()
  const [code, setCode] = useState(initial?.code ?? '')
  const [firstOrderOnly, setFirstOrderOnly] = useState(initial?.firstOrderOnly ?? false)
  const [perCustomer, setPerCustomer] = useState(initial?.perCustomerLimit ? String(initial.perCustomerLimit) : '')
  const [limitTo, setLimitTo] = useState<string[]>(initial?.categories ?? [])
  const [limitProducts, setLimitProducts] = useState<string[]>(initial?.productIds ?? [])
  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value]
  const [type, setType] = useState<Coupon['type']>(initial?.type ?? 'percent')
  const [value, setValue] = useState(initial?.value ? String(initial.value) : '')
  const [minCart, setMinCart] = useState(initial?.minCart ? String(initial.minCart) : '')
  const [maxDiscount, setMaxDiscount] = useState(initial?.maxDiscount ? String(initial.maxDiscount) : '')
  const [maxUses, setMaxUses] = useState(initial?.maxUses ? String(initial.maxUses) : '')
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ?? '')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    const amount = Number(value)
    const optional = [whole(minCart), whole(maxDiscount), whole(maxUses), whole(perCustomer)]
    if (!/^[A-Z0-9]{3,20}$/.test(clean)) return setError('Use 3 to 20 letters and numbers for the code, no spaces.')
    if (!initial && coupons.some(c => c.code === clean))
      return setError(`${clean} already exists. Choose another code.`)
    if (type === 'percent' && (!Number.isInteger(amount) || amount < 1 || amount > 90))
      return setError('Enter a percentage from 1 to 90.')
    if (type === 'fixed' && (!Number.isInteger(amount) || amount < 1))
      return setError('Enter the amount off in whole rupees.')
    if (optional.some(n => n !== undefined && (!Number.isInteger(n) || n < 1)))
      return setError('Minimum cart, maximum discount and the use limits must be whole numbers above 0, or left empty.')

    const next: AdminCoupon = {
      code: clean,
      type,
      value: type === 'free_shipping' ? 0 : amount,
      minCart: optional[0],
      maxDiscount: type === 'percent' ? optional[1] : undefined,
      maxUses: optional[2],
      expiresAt: expiresAt || undefined,
      firstOrderOnly,
      perCustomerLimit: optional[3],
      categories: limitTo,
      productIds: limitProducts,
      description: '',
      active: initial?.active ?? true,
      used: initial?.used ?? 0,
    }
    next.description = describe(next)
    setShop('coupons', list => (initial ? list.map(c => (c.code === initial.code ? next : c)) : [next, ...list]))
    done(initial ? `${clean} saved` : `${clean} added`)
    onDone()
  }

  const remove = () => {
    setShop('coupons', list => list.filter(c => c.code !== initial!.code))
    done(`${initial!.code} deleted`)
    onDone()
  }

  const clear = () => setError('')

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{initial ? `Edit ${initial.code}` : 'Add coupon'}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label mb-0">
          Code
          <input
            value={code}
            disabled={!!initial}
            onChange={e => {
              setCode(e.target.value.toUpperCase())
              clear()
            }}
            placeholder="WELCOME10"
            className="field mt-1.5 disabled:opacity-60"
          />
        </label>
        <label className="field-label mb-0">
          Type
          <select
            value={type}
            onChange={e => {
              setType(e.target.value as Coupon['type'])
              clear()
            }}
            className="field mt-1.5"
          >
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="free_shipping">Free delivery</option>
          </select>
        </label>
        {type !== 'free_shipping' && (
          <label className="field-label mb-0">
            {type === 'percent' ? 'Percent off' : 'Amount off (Rs.)'}
            <input
              inputMode="numeric"
              value={value}
              onChange={e => {
                setValue(e.target.value)
                clear()
              }}
              className="field mt-1.5"
            />
          </label>
        )}
        {type === 'percent' && (
          <label className="field-label mb-0">
            Most it can take off (Rs.), optional
            <input
              inputMode="numeric"
              value={maxDiscount}
              onChange={e => {
                setMaxDiscount(e.target.value)
                clear()
              }}
              className="field mt-1.5"
            />
          </label>
        )}
        <label className="field-label mb-0">
          Minimum cart (Rs.), optional
          <input
            inputMode="numeric"
            value={minCart}
            onChange={e => {
              setMinCart(e.target.value)
              clear()
            }}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Total uses allowed, optional
          <input
            inputMode="numeric"
            value={maxUses}
            onChange={e => {
              setMaxUses(e.target.value)
              clear()
            }}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Last day it works, optional
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="field mt-1.5" />
        </label>
        <label className="field-label mb-0">
          Uses per customer, optional
          <input
            inputMode="numeric"
            value={perCustomer}
            onChange={e => {
              setPerCustomer(e.target.value)
              clear()
            }}
            placeholder="1"
            className="field mt-1.5"
          />
        </label>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-xl border border-hairline bg-linen px-4 text-[0.95rem]">
          <input
            type="checkbox"
            checked={firstOrderOnly}
            onChange={e => setFirstOrderOnly(e.target.checked)}
            className="h-4 w-4 accent-caramel"
          />
          First order only
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="field-label">Works on, optional</legend>
        <p className="-mt-1 mb-2 text-sm text-umber">
          Leave everything unticked for the whole store. The discount then applies only to the ticked candles.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={limitTo.includes(c.slug)}
              onClick={() => setLimitTo(list => toggleIn(list, c.slug))}
              className={`min-h-9 rounded-full border px-3 text-sm ${limitTo.includes(c.slug) ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-umber">
            Or pick single candles{limitProducts.length ? ` (${limitProducts.length} picked)` : ''}
          </summary>
          <div className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-hairline p-2 sm:grid-cols-2">
            {products.map(p => (
              <label
                key={p.id}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-wax/50"
              >
                <input
                  type="checkbox"
                  checked={limitProducts.includes(p.id)}
                  onChange={() => setLimitProducts(list => toggleIn(list, p.id))}
                  className="h-4 w-4 accent-caramel"
                />
                {p.name}
              </label>
            ))}
          </div>
        </details>
      </fieldset>
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save coupon
        </button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            className="btn border border-wine text-wine before:bg-wine hover:text-ivory"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
