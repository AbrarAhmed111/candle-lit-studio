'use client'

import { FormEvent, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type ShippingRate } from './AdminData'
import { card, done } from './ui'
import { cities } from '@/data/store'
import { formatPKR } from '@/lib/pricing'
import Switch from '@/components/ui/Switch'

const section = `${card} p-5 sm:p-6`
const whole = (v: string) => /^[0-9]+$/.test(v.trim())
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `sr${Date.now()}`)

/** Different delivery fees for some cities or areas */
export function ShippingRates() {
  const { shippingRates, settings, setShop } = useAdmin()
  const [city, setCity] = useState(cities[0])
  const [area, setArea] = useState('')
  const [fee, setFee] = useState('')
  const [freeOver, setFreeOver] = useState('')
  const [error, setError] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!whole(fee)) return setError('Enter the delivery fee in whole rupees, 0 for free.')
    if (freeOver.trim() && !whole(freeOver))
      return setError('Enter the free delivery amount in whole rupees, or leave it empty.')
    const clash = shippingRates.find(
      r => r.city.toLowerCase() === city.toLowerCase() && r.area.toLowerCase() === area.trim().toLowerCase(),
    )
    if (clash)
      return setError(`${city}${area.trim() ? `, ${area.trim()}` : ''} already has a fee. Change or remove that one.`)
    const rate: ShippingRate = {
      id: newId(),
      city,
      area: area.trim(),
      fee: Number(fee),
      freeOver: freeOver.trim() ? Number(freeOver) : undefined,
      active: true,
    }
    setShop('shippingRates', list => [...list, rate])
    done(`Delivery fee for ${city}${rate.area ? `, ${rate.area}` : ''} set to ${formatPKR(rate.fee)}`)
    setArea('')
    setFee('')
    setFreeOver('')
    setError('')
  }

  return (
    <section className={section} aria-labelledby="rates-h">
      <h2 id="rates-h" className="text-2xl">
        Delivery fees by city
      </h2>
      <p className="mt-1 text-sm text-umber">
        Everywhere else pays the normal fee of {formatPKR(settings.shippingFee)}. Add a city to charge more or less
        there. Add an area too for a fee that only applies to part of a city.
      </p>
      {shippingRates.length > 0 && (
        <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
          {shippingRates.map(r => (
            <li key={r.id} className={clsx('flex items-center gap-3 py-3', !r.active && 'text-umber')}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.city}
                  {r.area && <span className="font-normal text-umber">, {r.area}</span>}
                </p>
                <p className="text-sm text-umber">
                  {r.fee === 0 ? 'Free delivery' : formatPKR(r.fee)}
                  {r.freeOver !== undefined && `, free over ${formatPKR(r.freeOver)}`}
                </p>
              </div>
              <Switch
                checked={r.active}
                onChange={() =>
                  setShop('shippingRates', list => list.map(x => (x.id === r.id ? { ...x, active: !x.active } : x)))
                }
                label={`Use the ${r.city} fee`}
              />
              <button
                type="button"
                aria-label={`Remove the ${r.city} fee`}
                onClick={() => {
                  setShop('shippingRates', list => list.filter(x => x.id !== r.id))
                  done(`Delivery fee for ${r.city}${r.area ? `, ${r.area}` : ''} removed`)
                }}
                className="grid h-10 w-10 shrink-0 place-items-center text-wine"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="field-label mb-0">
          City
          <select value={city} onChange={e => setCity(e.target.value)} className="field mt-1.5">
            {cities
              .filter(c => c !== 'Other')
              .map(c => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label className="field-label mb-0">
          Area <span className="font-normal text-umber">(optional)</span>
          <input
            value={area}
            onChange={e => setArea(e.target.value)}
            placeholder="For example: DHA"
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Delivery fee (Rs.)
          <input
            inputMode="numeric"
            value={fee}
            onChange={e => {
              setFee(e.target.value)
              setError('')
            }}
            placeholder="150"
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Free over (Rs.) <span className="font-normal text-umber">(optional)</span>
          <input
            inputMode="numeric"
            value={freeOver}
            onChange={e => {
              setFreeOver(e.target.value)
              setError('')
            }}
            placeholder={String(settings.freeShippingOver)}
            className="field mt-1.5"
          />
        </label>
        {error && <p className="field-error sm:col-span-2">{error}</p>}
        <button type="submit" className="btn-outline sm:col-span-2">
          <Plus size={16} /> Add delivery fee
        </button>
      </form>
    </section>
  )
}

/** Thresholds and timings for the automatic parts of the shop */
export function StoreRules() {
  const { settings, setShop } = useAdmin()
  const [values, setValues] = useState({
    lowStockThreshold: String(settings.lowStockThreshold),
    reviewRequestDays: String(settings.reviewRequestDays),
    abandonedCartHours: String(settings.abandonedCartHours),
    invoicePrefix: settings.invoicePrefix,
  })
  const [error, setError] = useState('')
  const changed =
    values.lowStockThreshold !== String(settings.lowStockThreshold) ||
    values.reviewRequestDays !== String(settings.reviewRequestDays) ||
    values.abandonedCartHours !== String(settings.abandonedCartHours) ||
    values.invoicePrefix !== settings.invoicePrefix

  const save = (e: FormEvent) => {
    e.preventDefault()
    const low = Number(values.lowStockThreshold)
    const days = Number(values.reviewRequestDays)
    const hours = Number(values.abandonedCartHours)
    if (!whole(values.lowStockThreshold) || low > 100) return setError('Low stock: enter a number from 0 to 100.')
    if (!whole(values.reviewRequestDays) || days < 1 || days > 60)
      return setError('Review request: enter 1 to 60 days.')
    if (!whole(values.abandonedCartHours) || hours < 1 || hours > 168)
      return setError('Cart reminder: enter 1 to 168 hours.')
    setShop('settings', s => ({
      ...s,
      lowStockThreshold: low,
      reviewRequestDays: days,
      abandonedCartHours: hours,
      invoicePrefix: values.invoicePrefix.trim() || 'INV-',
    }))
    done('Automatic messages and alerts saved')
    setError('')
  }

  const field = (key: keyof typeof values, label: string, hint: string) => (
    <label className="field-label mb-0">
      {label}
      <input
        value={values[key]}
        inputMode={key === 'invoicePrefix' ? undefined : 'numeric'}
        onChange={e => {
          setValues(v => ({ ...v, [key]: e.target.value }))
          setError('')
        }}
        className="field mt-1.5"
      />
      <span className="mt-1 block text-sm font-normal text-umber">{hint}</span>
    </label>
  )

  return (
    <section className={section} aria-labelledby="rules-h">
      <h2 id="rules-h" className="text-2xl">
        Alerts and automatic emails
      </h2>
      <form onSubmit={save} noValidate className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field(
          'lowStockThreshold',
          'Low stock warning at',
          'You get an alert when a size has this many or fewer left.',
        )}
        {field(
          'reviewRequestDays',
          'Ask for a review after (days)',
          'For the optional review reminder. The delivered email already asks for a review.',
        )}
        {field(
          'abandonedCartHours',
          'Cart reminder after (hours)',
          'Customers who leave checkout get one reminder email.',
        )}
        {field('invoicePrefix', 'Invoice number starts with', 'For example INV- gives INV-1001.')}
        {error && <p className="field-error sm:col-span-2">{error}</p>}
        <button type="submit" disabled={!changed} className="btn-primary sm:col-span-2">
          {changed ? 'Save' : 'All saved'}
        </button>
      </form>
    </section>
  )
}
