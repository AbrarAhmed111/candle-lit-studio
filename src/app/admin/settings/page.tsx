'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { card, PageHeader, done, SaveBar, useLeaveWarning } from '@/components/admin/ui'
import { ShippingRates, StoreRules } from '@/components/admin/SettingsExtras'
import EasypaisaAccount from '@/components/admin/EasypaisaAccount'
import HowItWorks from '@/components/admin/HowItWorks'
import Switch from '@/components/ui/Switch'

type TextKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'address'
  | 'announcement'
  | 'shippingFee'
  | 'freeShippingOver'
  | 'deliveryEstimate'

export default function AdminSettingsPage() {
  const { settings, orders, setShop } = useAdmin()
  const [values, setValues] = useState(() => ({
    ...settings,
    shippingFee: String(settings.shippingFee),
    freeShippingOver: String(settings.freeShippingOver),
  }))
  const [error, setError] = useState('')
  const [courier, setCourier] = useState({ name: '', trackingUrl: '' })
  const [courierError, setCourierError] = useState('')
  const loaded = orders !== null

  // Saved settings arrive after the first render
  useEffect(() => {
    if (!loaded) return
    setValues(v => ({
      ...v,
      ...settings,
      shippingFee: String(settings.shippingFee),
      freeShippingOver: String(settings.freeShippingOver),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  const fromSettings = () => ({
    ...settings,
    shippingFee: String(settings.shippingFee),
    freeShippingOver: String(settings.freeShippingOver),
  })
  const textKeys: TextKey[] = [
    'name',
    'email',
    'phone',
    'whatsapp',
    'address',
    'announcement',
    'shippingFee',
    'freeShippingOver',
    'deliveryEstimate',
  ]
  const saved = fromSettings()
  const dirty = loaded && textKeys.some(k => String(values[k] ?? '') !== String(saved[k] ?? ''))
  useLeaveWarning(dirty)

  const bind = (key: TextKey) => ({
    id: `set-${key}`,
    value: values[key],
    className: 'field',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }))
      setError('')
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const fee = Number(values.shippingFee)
    const free = Number(values.freeShippingOver)
    const whatsapp = values.whatsapp.replace(/\D/g, '')
    if (values.name.trim().length < 2) return setError('Enter the store name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      return setError('Enter an email address like name@example.com.')
    if (!/^92\d{10}$/.test(whatsapp))
      return setError('Enter the WhatsApp number with country code, for example 923001234567.')
    if (!Number.isInteger(fee) || fee < 0) return setError('Enter the delivery fee in whole rupees, 0 or more.')
    if (!Number.isInteger(free) || free < 0)
      return setError('Enter the free delivery amount in whole rupees, or 0 to switch it off.')
    setShop('settings', s => ({
      ...s,
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      whatsapp,
      address: values.address.trim(),
      announcement: values.announcement.trim(),
      deliveryEstimate: values.deliveryEstimate.trim(),
      shippingFee: fee,
      freeShippingOver: free,
    }))
    done('Settings saved')
  }

  const addCourier = (e: FormEvent) => {
    e.preventDefault()
    const name = courier.name.trim()
    const trackingUrl = courier.trackingUrl.trim()
    if (name.length < 2) return setCourierError('Enter the courier name.')
    if (settings.couriers.some(c => c.name.toLowerCase() === name.toLowerCase()))
      return setCourierError(`${name} is already in the list.`)
    if (!/^https:\/\/\S+\.\S+/.test(trackingUrl))
      return setCourierError('Enter the courier tracking page link, starting with https://')
    setShop('settings', s => ({ ...s, couriers: [...s.couriers, { name, trackingUrl, active: true }] }))
    setCourier({ name: '', trackingUrl: '' })
    done(`${name} added`)
  }

  const section = `${card} p-5 sm:p-6`
  const details: [TextKey, string][] = [
    ['name', 'Store name'],
    ['email', 'Contact email'],
    ['phone', 'Phone shown on the site'],
    ['whatsapp', 'WhatsApp number, with 92'],
  ]

  return (
    <>
      <PageHeader title="Settings" text="Store details, delivery charges and the couriers you ship with." />
      <HowItWorks id="settings">
        <p>
          Store details appear in the footer, on invoices and in emails. Delivery fees can be different for some cities.
          Couriers you switch off disappear from the dispatch form.
        </p>
      </HowItWorks>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form onSubmit={submit} noValidate className="space-y-6">
          <section className={section} aria-labelledby="store-h">
            <h2 id="store-h" className="text-2xl">
              Store details
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {details.map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`set-${key}`} className="field-label">
                    {label}
                  </label>
                  <input {...bind(key)} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label htmlFor="set-address" className="field-label">
                  Studio address
                </label>
                <input {...bind('address')} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="set-announcement" className="field-label">
                  Announcement bar at the top of the store
                </label>
                <input {...bind('announcement')} />
              </div>
            </div>
          </section>

          <section className={section} aria-labelledby="delivery-h">
            <h2 id="delivery-h" className="text-2xl">
              Delivery
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="set-shippingFee" className="field-label">
                  Delivery fee (Rs.)
                </label>
                <input {...bind('shippingFee')} inputMode="numeric" />
              </div>
              <div>
                <label htmlFor="set-freeShippingOver" className="field-label">
                  Free delivery on carts over (Rs.)
                </label>
                <input {...bind('freeShippingOver')} inputMode="numeric" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="set-deliveryEstimate" className="field-label">
                  Delivery time shown to customers
                </label>
                <input {...bind('deliveryEstimate')} />
              </div>
            </div>
            <p className="mt-4 text-sm text-umber">
              Payment: Easypaisa for every order. Delivery fees for single cities, like Quetta, are set below.
            </p>
          </section>

          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={!dirty} className="btn-primary">
            {dirty ? 'Save settings' : 'All changes saved'}
          </button>
          <SaveBar
            show={dirty}
            label="Save settings"
            onDiscard={() => {
              setValues(fromSettings())
              setError('')
            }}
          />
        </form>

        <section className={`${section} self-start`} aria-labelledby="couriers-h">
          <h2 id="couriers-h" className="text-2xl">
            Couriers
          </h2>
          <p className="mt-1 text-sm text-umber">
            Customers get a link to the courier&rsquo;s own tracking page. Switch off the ones you do not use.
          </p>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {settings.couriers.map(c => (
              <li key={c.name} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="truncate text-sm text-umber">{c.trackingUrl}</p>
                </div>
                <Switch
                  checked={c.active}
                  onChange={() =>
                    setShop('settings', s => ({
                      ...s,
                      couriers: s.couriers.map(x => (x.name === c.name ? { ...x, active: !x.active } : x)),
                    }))
                  }
                  label={`Ship with ${c.name}`}
                />
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => {
                    setShop('settings', s => ({ ...s, couriers: s.couriers.filter(x => x.name !== c.name) }))
                    done(`${c.name} removed`)
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-wine hover:bg-wine/10"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCourier} noValidate className="mt-5">
            <h3 className="font-sans text-sm font-semibold tracking-normal">Add a courier</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input
                aria-label="Courier name"
                placeholder="Courier name"
                value={courier.name}
                onChange={e => {
                  setCourier(c => ({ ...c, name: e.target.value }))
                  setCourierError('')
                }}
                className="field"
              />
              <input
                aria-label="Tracking page link"
                placeholder="https://…/tracking"
                value={courier.trackingUrl}
                onChange={e => {
                  setCourier(c => ({ ...c, trackingUrl: e.target.value }))
                  setCourierError('')
                }}
                className="field"
              />
              <button type="submit" className="btn-outline">
                <Plus size={16} /> Add
              </button>
            </div>
            {courierError && <p className="field-error">{courierError}</p>}
          </form>
        </section>

        <EasypaisaAccount />
        <ShippingRates />
        <StoreRules />
      </div>
    </>
  )
}
