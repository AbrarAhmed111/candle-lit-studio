'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useRef, useState } from 'react'
import { Banknote, Lock } from 'lucide-react'
import ProductPhoto from '@/components/store/ProductPhoto'
import OrderSummary from '@/components/store/OrderSummary'
import { cities } from '@/data/store'
import { computeTotals, formatPKR, normalisePkMobile } from '@/lib/pricing'
import { nextOrderNumber, rememberOrderAccess, saveOrder } from '@/lib/orders'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { placeOrder } from '@/lib/actions/store'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { clearCart } from '@/store/cart/CartSlice'
import type { Order } from '@/types'

type Fields = {
  name: string
  phone: string
  email: string
  city: string
  area: string
  address: string
  landmark: string
  notes: string
}

const empty: Fields = {
  name: '',
  phone: '',
  email: '',
  city: '',
  area: '',
  address: '',
  landmark: '',
  notes: '',
}

const validate = (f: Fields) => {
  const e: Partial<Record<keyof Fields, string>> = {}
  if (f.name.trim().length < 3) e.name = 'Enter your full name.'
  if (!normalisePkMobile(f.phone))
    e.phone = 'Enter a Pakistani mobile number, like 0300 1234567.'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Enter an email address like name@example.com, or leave it empty.'
  if (!f.city) e.city = 'Choose your city.'
  if (f.area.trim().length < 2) e.area = 'Enter your area or sector.'
  if (f.address.trim().length < 8)
    e.address = 'Enter your full address with house and street number.'
  return e
}

export default function CheckoutPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { items, couponCode, hydrated } = useAppSelector(s => s.cart)
  const totals = computeTotals(items, couponCode)
  const [fields, setFields] = useState<Fields>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const set = (key: keyof Fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFields(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (placing) return // guards against a double tap
    const found = validate(fields)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    setPlacing(true)
    setPlaceError(null)

    if (isSupabaseConfigured) {
      // The database checks stock, prices and the coupon again before it accepts the order
      const result = await placeOrder({
        customer: {
          name: fields.name.trim(),
          phone: fields.phone,
          email: fields.email.trim() || undefined,
          city: fields.city,
          area: fields.area.trim(),
          address: fields.address.trim(),
          landmark: fields.landmark.trim() || undefined,
          notes: fields.notes.trim() || undefined,
        },
        lines: totals.lines.map(l => ({ variantId: l.variant.id, qty: l.qty })),
        couponCode: totals.coupon?.code ?? null,
      })
      if (!result.ok) {
        setPlacing(false)
        setPlaceError(result.error)
        toast.error(result.error)
        return
      }
      rememberOrderAccess(result.data.number, result.data.accessToken)
      router.push(`/order/${result.data.number}?placed=1&t=${result.data.accessToken}`)
      dispatch(clearCart())
      return
    }

    const order: Order = {
      number: nextOrderNumber(),
      placedAt: new Date().toISOString(),
      status: 'Pending Confirmation',
      customer: {
        name: fields.name.trim(),
        phone: normalisePkMobile(fields.phone)!,
        email: fields.email.trim() || undefined,
        city: fields.city,
        area: fields.area.trim(),
        address: fields.address.trim(),
        landmark: fields.landmark.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
      lines: totals.lines.map(l => ({
        productId: l.product.id,
        name: l.product.name,
        variant: l.variant.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
        originalPrice: l.variant.price,
      })),
      subtotal: totals.subtotal,
      couponCode: totals.coupon?.code,
      couponDiscount: totals.couponDiscount,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending Collection',
    }
    saveOrder(order)
    router.push(`/order/${order.number}?placed=1`)
    dispatch(clearCart())
  }

  if (!hydrated) {
    return <div className="page py-24 text-center text-umber">Loading checkout…</div>
  }

  if (totals.lines.length === 0 && !placing) {
    return (
      <div className="page py-24 text-center">
        <h1 className="text-5xl italic">Nothing to check out yet</h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-umber">
          Add a candle to your cart first.
        </p>
        <Link href="/shop" className="btn-primary mt-8">
          Shop all candles
        </Link>
      </div>
    )
  }

  const field = (
    key: keyof Fields,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { hint?: string; optional?: boolean } = {},
  ) => {
    const { hint, optional, ...input } = props
    return (
      <div>
        <label htmlFor={key} className="field-label">
          {label} {optional && <span className="font-normal text-umber">(optional)</span>}
        </label>
        <input
          id={key}
          name={key}
          value={fields[key]}
          onChange={set(key)}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined}
          className="field"
          {...input}
        />
        {errors[key] ? (
          <p id={`${key}-error`} className="field-error">
            {errors[key]}
          </p>
        ) : (
          hint && (
            <p id={`${key}-hint`} className="mt-1.5 text-sm text-umber">
              {hint}
            </p>
          )
        )}
      </div>
    )
  }

  return (
    <div className="page pt-8 lg:pt-12">
      <h1 className="text-5xl lg:text-6xl">Checkout</h1>
      <p className="mt-3 text-umber">
        No account needed. Have one?{' '}
        <Link href="/signin" className="link">
          Sign in
        </Link>
      </p>

      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16"
      >
        <div className="space-y-12">
          <section aria-labelledby="contact-h">
            <h2 id="contact-h" className="text-3xl">
              Who is this for?
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('phone', 'Mobile number', {
                type: 'tel',
                inputMode: 'tel',
                autoComplete: 'tel',
                placeholder: '0300 1234567',
                hint: 'We call or WhatsApp this number to confirm your order.',
              })}
              <div className="sm:col-span-2">
                {field('email', 'Email', {
                  type: 'email',
                  autoComplete: 'email',
                  optional: true,
                  hint: 'For your order confirmation and tracking number.',
                })}
              </div>
            </div>
          </section>

          <section aria-labelledby="address-h">
            <h2 id="address-h" className="text-3xl">
              Where should we deliver?
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="field-label">
                  City
                </label>
                <select
                  id="city"
                  name="city"
                  value={fields.city}
                  onChange={set('city')}
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                  autoComplete="address-level2"
                  className="field"
                >
                  <option value="">Choose a city</option>
                  {cities.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {errors.city && (
                  <p id="city-error" className="field-error">
                    {errors.city}
                  </p>
                )}
              </div>
              {field('area', 'Area or sector', { placeholder: 'DHA Phase 5' })}
              <div className="sm:col-span-2">
                {field('address', 'Full address', {
                  autoComplete: 'street-address',
                  placeholder: 'House 12, Street 8, Block C',
                })}
              </div>
              <div className="sm:col-span-2">
                {field('landmark', 'Nearest landmark', {
                  optional: true,
                  placeholder: 'Opposite Al-Fatah store',
                })}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="field-label">
                  Order notes <span className="font-normal text-umber">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={fields.notes}
                  onChange={set('notes')}
                  placeholder="A gift message, or delivery instructions for the rider"
                  className="field py-3"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="payment-h">
            <h2 id="payment-h" className="text-3xl">
              Payment
            </h2>
            <div className="mt-6 flex items-start gap-4 rounded-xl border border-espresso bg-linen p-5">
              <Banknote size={24} className="mt-0.5 shrink-0 text-caramel" />
              <div>
                <p className="font-medium">Cash on delivery</p>
                <p className="mt-1 text-[0.95rem] text-umber">
                  Pay {formatPKR(totals.total)} in cash when the courier hands you
                  the parcel. Nothing is charged now.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-36 lg:self-start">
          <ul className="mb-4 divide-y divide-hairline border-y border-hairline">
            {totals.lines.map(l => (
              <li key={l.variant.id} className="flex items-center gap-4 py-3">
                <div
                  className="alcove h-16 w-14 shrink-0 overflow-hidden"
                  style={{ backgroundColor: l.product.art.bg }}
                >
                  <ProductPhoto product={l.product} sizes="56px" decorative />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{l.product.name}</p>
                  <p className="text-umber">
                    {l.variant.label}, qty {l.qty}
                  </p>
                </div>
                <p className="text-sm">{formatPKR(l.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <OrderSummary totals={totals}>
            {placeError && (
              <p role="alert" className="mb-3 rounded-xl border border-wine/30 bg-wine/5 p-3 text-sm text-wine">
                {placeError}
              </p>
            )}
            <button type="submit" disabled={placing} className="btn-primary w-full">
              {placing ? 'Placing your order…' : `Place order, pay ${formatPKR(totals.total)} on delivery`}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-umber">
              <Lock size={13} /> Your details are used only to deliver this order.
            </p>
            <Link href="/cart" className="link mt-3 block text-center text-sm">
              Edit cart
            </Link>
          </OrderSummary>
        </div>
      </form>
    </div>
  )
}
