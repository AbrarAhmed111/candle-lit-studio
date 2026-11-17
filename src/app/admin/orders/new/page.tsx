'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdmin } from '@/components/admin/AdminData'
import { card, done, Loading } from '@/components/admin/ui'
import { cities } from '@/data/store'
import { formatPKR, normalisePkMobile, salePrice } from '@/lib/pricing'

type Line = { key: number; variantId: string; qty: string }

/** Enter an order taken by phone, WhatsApp or Instagram. */
export default function NewOrderPage() {
  const router = useRouter()
  const { orders, products, coupons, settings, addOrder } = useAdmin()
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    city: cities[0],
    area: '',
    address: '',
    notes: '',
  })
  const [lines, setLines] = useState<Line[]>([{ key: 1, variantId: '', qty: '1' }])
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!orders) return <Loading />

  // Every size that can be sold right now
  const options = products
    .filter(p => p.active)
    .flatMap(p =>
      p.variants.map(v => ({
        id: v.id,
        product: p,
        variant: v,
        price: salePrice(p, v),
        text: `${p.name}, ${v.label}`,
      })),
    )
  const find = (id: string) => options.find(o => o.id === id)

  const picked = lines
    .map(l => ({ ...l, option: find(l.variantId), count: Number(l.qty) }))
    .filter(l => l.option && Number.isInteger(l.count) && l.count > 0)
  const subtotal = picked.reduce((sum, l) => sum + l.option!.price * l.count, 0)

  const today = new Date().toISOString().slice(0, 10)
  const coupon = coupons.find(c => c.code === code)
  const couponProblem = !coupon
    ? ''
    : !coupon.active
      ? `${coupon.code} is switched off.`
      : coupon.expiresAt && coupon.expiresAt < today
        ? `${coupon.code} has expired.`
        : coupon.minCart && subtotal < coupon.minCart
          ? `${coupon.code} needs a cart of ${formatPKR(coupon.minCart)} or more.`
          : ''
  const usable = coupon && !couponProblem ? coupon : undefined
  const couponDiscount = !usable
    ? 0
    : usable.type === 'percent'
      ? Math.min(usable.maxDiscount ?? Infinity, Math.round((subtotal * usable.value) / 100))
      : usable.type === 'fixed'
        ? Math.min(subtotal, usable.value)
        : 0
  const freeDelivery =
    usable?.type === 'free_shipping' || (settings.freeShippingOver > 0 && subtotal >= settings.freeShippingOver)
  const shipping = picked.length === 0 || freeDelivery ? 0 : settings.shippingFee
  const total = subtotal - couponDiscount + shipping

  const bind = (key: keyof typeof customer) => ({
    id: `o-${key}`,
    value: customer[key],
    'aria-invalid': !!errors[key],
    className: 'field',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setCustomer(c => ({ ...c, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: '' }))
    },
  })

  const setLine = (key: number, patch: Partial<Line>) => {
    setLines(list => list.map(l => (l.key === key ? { ...l, ...patch } : l)))
    setErrors(er => ({ ...er, lines: '' }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    const phone = normalisePkMobile(customer.phone)
    if (customer.name.trim().length < 3) found.name = 'Enter the customer’s full name.'
    if (!phone) found.phone = 'Enter a Pakistani mobile number like 0300 1234567.'
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
      found.email = 'Enter an email address like name@example.com, or leave it empty.'
    if (customer.address.trim().length < 5) found.address = 'Enter the house or flat number and street.'
    if (customer.area.trim().length < 2) found.area = 'Enter the area, sector or town.'

    if (lines.some(l => !l.variantId)) found.lines = 'Choose a candle for every line, or remove the empty line.'
    else if (lines.some(l => !Number.isInteger(Number(l.qty)) || Number(l.qty) < 1))
      found.lines = 'Enter each quantity as a whole number, 1 or more.'
    else if (new Set(lines.map(l => l.variantId)).size < lines.length)
      found.lines = 'The same candle and size is listed twice. Raise the quantity on one line instead.'
    else {
      const short = picked.find(l => l.count > l.option!.variant.stock)
      if (short)
        found.lines = `Only ${short.option!.variant.stock} of ${short.option!.text} in stock. Lower the quantity.`
    }
    if (couponProblem) found.coupon = couponProblem

    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error('Fix the highlighted fields, then save again.')
      return
    }

    const taken = orders.map(o => Number(o.number.replace('CND-', ''))).filter(Number.isFinite)
    const number = `CND-${Math.max(1031, ...taken) + 1}`
    const now = new Date().toISOString()
    addOrder({
      number,
      placedAt: now,
      // The owner has already spoken to the customer
      status: 'Confirmed',
      customer: {
        name: customer.name.trim(),
        phone: phone!,
        email: customer.email.trim() || undefined,
        city: customer.city,
        area: customer.area.trim(),
        address: customer.address.trim(),
        notes: customer.notes.trim() || undefined,
      },
      lines: picked.map(l => ({
        productId: l.option!.product.id,
        name: l.option!.product.name,
        variant: l.option!.variant.label,
        qty: l.count,
        unitPrice: l.option!.price,
        originalPrice: l.option!.variant.price,
      })),
      subtotal,
      couponCode: usable?.code,
      couponDiscount,
      shipping,
      total,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending Collection',
      history: [{ at: now, text: 'Order entered by hand in the dashboard, already confirmed with the customer' }],
      notes: [],
    })
    done(`${number} created for ${customer.name.trim()}`)
    router.push(`/admin/orders/${number}`)
  }

  const section = `${card} p-5 sm:p-6`

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel">
        <ArrowLeft size={16} /> All orders
      </Link>
      <h1 className="mt-2 text-4xl lg:text-5xl">New order</h1>
      <p className="mt-2 text-umber">For orders taken by phone, WhatsApp or Instagram. It starts as confirmed.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className={section} aria-labelledby="items-h">
            <div className="flex items-center justify-between gap-3">
              <h2 id="items-h" className="text-2xl">
                Candles
              </h2>
              <button
                type="button"
                onClick={() => setLines(list => [...list, { key: Date.now(), variantId: '', qty: '1' }])}
                className="btn-outline min-h-11 px-4 text-sm"
              >
                <Plus size={16} /> Add line
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {lines.map((l, i) => {
                const option = find(l.variantId)
                return (
                  <div key={l.key} className="grid grid-cols-[1fr_5rem_auto] items-end gap-3 rounded-xl bg-wax/40 p-3">
                    <label className="text-sm text-umber">
                      Candle and size
                      <select
                        value={l.variantId}
                        onChange={e => setLine(l.key, { variantId: e.target.value })}
                        className="field mt-1"
                      >
                        <option value="">Choose a candle</option>
                        {options.map(o => (
                          <option key={o.id} value={o.id} disabled={o.variant.stock === 0}>
                            {o.text}, {formatPKR(o.price)}
                            {o.variant.stock === 0 ? ' (out of stock)' : ` (${o.variant.stock} left)`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-umber">
                      Qty
                      <input
                        inputMode="numeric"
                        value={l.qty}
                        onChange={e => setLine(l.key, { qty: e.target.value })}
                        className="field mt-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setLines(list => list.filter(x => x.key !== l.key))}
                      disabled={lines.length === 1}
                      aria-label={`Remove line ${i + 1}${option ? `, ${option.text}` : ''}`}
                      className="grid h-12 w-12 place-items-center rounded-xl text-wine hover:bg-wine/10 disabled:opacity-30"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )
              })}
            </div>
            {errors.lines && (
              <p role="alert" className="field-error">
                {errors.lines}
              </p>
            )}
          </section>

          <section className={section} aria-labelledby="cust-h">
            <h2 id="cust-h" className="text-2xl">
              Customer and delivery
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="o-name" label="Full name" error={errors.name}>
                <input {...bind('name')} autoComplete="off" />
              </Field>
              <Field id="o-phone" label="Mobile number" error={errors.phone}>
                <input {...bind('phone')} type="tel" inputMode="tel" autoComplete="off" />
              </Field>
              <Field id="o-email" label="Email, optional" error={errors.email}>
                <input {...bind('email')} type="email" autoComplete="off" />
              </Field>
              <Field id="o-city" label="City">
                <select {...bind('city')}>
                  {cities.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field id="o-address" label="House or flat, street" error={errors.address}>
                  <input {...bind('address')} autoComplete="off" />
                </Field>
              </div>
              <Field id="o-area" label="Area, sector or town" error={errors.area}>
                <input {...bind('area')} autoComplete="off" />
              </Field>
              <Field id="o-notes" label="Delivery note, optional">
                <input {...bind('notes')} autoComplete="off" />
              </Field>
            </div>
          </section>
        </div>

        <section className={`${section} self-start xl:sticky xl:top-6`} aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-2xl">
            Summary
          </h2>
          <label htmlFor="o-coupon" className="field-label mt-5">
            Coupon, optional
          </label>
          <select
            id="o-coupon"
            value={code}
            onChange={e => {
              setCode(e.target.value)
              setErrors(er => ({ ...er, coupon: '' }))
            }}
            className="field"
          >
            <option value="">No coupon</option>
            {coupons.map(c => (
              <option key={c.code} value={c.code}>
                {c.code}, {c.description}
              </option>
            ))}
          </select>
          {couponProblem && <p className="field-error">{couponProblem}</p>}

          <dl className="mt-6 space-y-2">
            <Row label="Subtotal" value={formatPKR(subtotal)} />
            {couponDiscount > 0 && <Row label={`Coupon ${usable!.code}`} value={`− ${formatPKR(couponDiscount)}`} />}
            <Row label="Delivery" value={picked.length === 0 ? 'Add a candle' : shipping === 0 ? 'Free' : formatPKR(shipping)} />
            <div className="flex items-baseline justify-between border-t border-espresso pt-3">
              <dt className="font-medium">Cash on delivery</dt>
              <dd className="font-display text-3xl">{formatPKR(total)}</dd>
            </div>
          </dl>
          <button type="submit" className="btn-primary mt-6 w-full">
            Create order
          </button>
        </section>
      </div>
    </form>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
