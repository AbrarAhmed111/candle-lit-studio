'use client'

import { FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type AdminCoupon, type Campaign } from '@/components/admin/AdminData'
import { card, Empty, PageHeader, shortDate, td, th, done } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import { formatPKR } from '@/lib/pricing'
import type { Coupon } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

const describe = (c: Coupon) =>
  c.type === 'free_shipping'
    ? 'Free delivery'
    : c.type === 'percent'
      ? `${c.value}% off${c.maxDiscount ? `, up to ${formatPKR(c.maxDiscount)}` : ''}`
      : `${formatPKR(c.value)} off`

const couponState = (c: AdminCoupon) => {
  if (!c.active) return 'Off'
  if (c.expiresAt && c.expiresAt < today()) return 'Expired'
  if (c.maxUses && c.used >= c.maxUses) return 'Used up'
  return 'Live'
}

// Campaigns switch on and off by date, as long as they are not paused
const campaignState = (c: Campaign) => {
  if (!c.active) return 'Paused'
  if (c.endsAt < today()) return 'Ended'
  if (c.startsAt > today()) return 'Scheduled'
  return 'Running'
}

const tone: Record<string, string> = {
  Live: 'bg-sage/15 text-sage',
  Running: 'bg-sage/15 text-sage',
  Scheduled: 'bg-ember/25 text-toffee',
  Off: 'bg-wax text-umber',
  Paused: 'bg-wax text-umber',
  Expired: 'bg-wine/10 text-wine',
  Ended: 'bg-wine/10 text-wine',
  'Used up': 'bg-wine/10 text-wine',
}

function State({ value }: { value: string }) {
  return <span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium', tone[value])}>{value}</span>
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-sage' : 'bg-hairline')}
    >
      <span className={clsx('absolute left-1 top-1 h-5 w-5 rounded-full bg-linen transition-transform', on && 'translate-x-5')} />
    </button>
  )
}

export default function AdminDiscountsPage() {
  const { coupons, campaigns, categories, setShop } = useAdmin()
  const [coupon, setCoupon] = useState<string | null>(null) // 'new' or a code
  const [campaign, setCampaign] = useState<string | null>(null) // 'new' or an id

  return (
    <>
      <PageHeader title="Discounts" text="Coupon codes customers type at checkout, and sales that run on a schedule." />

      <section className="mt-8" aria-labelledby="coupons-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="coupons-h" className="text-3xl">
            Coupons
          </h2>
          <button type="button" onClick={() => setCoupon('new')} className="btn-primary">
            <Plus size={17} /> Add coupon
          </button>
        </div>
        <div className={`${card} mt-4 overflow-hidden`}>
          {coupons.length === 0 ? (
            <Empty title="No coupons yet" text="Add a code such as WELCOME10 for first orders." />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[46rem] text-[0.95rem]">
                <thead className="border-b border-hairline bg-wax/50">
                  <tr>
                    <th className={th}>Code</th>
                    <th className={th}>Discount</th>
                    <th className={th}>Conditions</th>
                    <th className={`${th} text-right`}>Used</th>
                    <th className={th}>Status</th>
                    <th className={th}>On</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {coupons.map(c => (
                    <tr key={c.code}>
                      <td className={`${td} font-medium tracking-wide`}>{c.code}</td>
                      <td className={td}>{describe(c)}</td>
                      <td className={`${td} text-sm text-umber`}>
                        {[
                          c.minCart && `Cart over ${formatPKR(c.minCart)}`,
                          c.expiresAt && `Until ${shortDate(c.expiresAt)}`,
                          c.maxUses && `${c.maxUses} uses max`,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'No conditions'}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{c.used}</td>
                      <td className={td}>
                        <State value={couponState(c)} />
                      </td>
                      <td className={td}>
                        <Switch
                          on={c.active}
                          label={`${c.code} can be used`}
                          onChange={active => setShop('coupons', list => list.map(x => (x.code === c.code ? { ...x, active } : x)))}
                        />
                      </td>
                      <td className={`${td} text-right`}>
                        <button type="button" onClick={() => setCoupon(c.code)} className="link min-h-11 px-2 text-sm">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-sm text-umber">
          One coupon per order. A coupon applies after product and sale discounts, never on the delivery fee unless it is a free delivery coupon.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="campaigns-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="campaigns-h" className="text-3xl">
            Sales campaigns
          </h2>
          <button type="button" onClick={() => setCampaign('new')} className="btn-primary">
            <Plus size={17} /> Add campaign
          </button>
        </div>
        {campaigns.length === 0 ? (
          <div className={`${card} mt-4`}>
            <Empty title="No campaigns yet" text="Plan an Eid, 11.11 or winter sale and it will start and end on its own." />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {campaigns.map(c => (
              <li key={c.id} className={`${card} flex flex-col p-5 sm:p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl">{c.name}</h3>
                  <State value={campaignState(c)} />
                </div>
                <p className="mt-2 flex-1 text-umber">{c.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-umber">Discount</dt>
                    <dd className="font-medium">{c.discountPercent}% off</dd>
                  </div>
                  <div>
                    <dt className="text-umber">Runs</dt>
                    <dd className="font-medium">
                      {shortDate(c.startsAt)} to {shortDate(c.endsAt)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-umber">Applies to</dt>
                    <dd className="font-medium">
                      {c.categories.length === 0
                        ? 'Whole store'
                        : c.categories.map(s => categories.find(x => x.slug === s)?.name ?? s).join(', ')}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                  <label className="flex items-center gap-3 text-sm">
                    <Switch
                      on={c.active}
                      label={`${c.name} is allowed to run`}
                      onChange={active => setShop('campaigns', list => list.map(x => (x.id === c.id ? { ...x, active } : x)))}
                    />
                    {c.active ? 'Allowed to run' : 'Paused'}
                  </label>
                  <button type="button" onClick={() => setCampaign(c.id)} className="link min-h-11 text-sm">
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-umber">
          If a product has its own discount and is also in a campaign, the customer gets the bigger of the two, not both.
        </p>
      </section>

      <Modal open={coupon !== null} onClose={() => setCoupon(null)} label="Coupon" className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
        {coupon !== null && (
          <CouponForm key={coupon} initial={coupons.find(c => c.code === coupon)} onDone={() => setCoupon(null)} />
        )}
      </Modal>
      <Modal open={campaign !== null} onClose={() => setCampaign(null)} label="Campaign" className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
        {campaign !== null && (
          <CampaignForm key={campaign} initial={campaigns.find(c => c.id === campaign)} onDone={() => setCampaign(null)} />
        )}
      </Modal>
    </>
  )
}

const whole = (text: string) => (text.trim() === '' ? undefined : Number(text))

function CouponForm({ initial, onDone }: { initial?: AdminCoupon; onDone: () => void }) {
  const { coupons, setShop } = useAdmin()
  const [code, setCode] = useState(initial?.code ?? '')
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
    const optional = [whole(minCart), whole(maxDiscount), whole(maxUses)]
    if (!/^[A-Z0-9]{3,20}$/.test(clean)) return setError('Use 3 to 20 letters and numbers for the code, no spaces.')
    if (!initial && coupons.some(c => c.code === clean)) return setError(`${clean} already exists. Choose another code.`)
    if (type === 'percent' && (!Number.isInteger(amount) || amount < 1 || amount > 90))
      return setError('Enter a percentage from 1 to 90.')
    if (type === 'fixed' && (!Number.isInteger(amount) || amount < 1)) return setError('Enter the amount off in whole rupees.')
    if (optional.some(n => n !== undefined && (!Number.isInteger(n) || n < 1)))
      return setError('Minimum cart, maximum discount and maximum uses must be whole numbers above 0, or left empty.')

    const next: AdminCoupon = {
      code: clean,
      type,
      value: type === 'free_shipping' ? 0 : amount,
      minCart: optional[0],
      maxDiscount: type === 'percent' ? optional[1] : undefined,
      maxUses: optional[2],
      expiresAt: expiresAt || undefined,
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
          <input value={code} disabled={!!initial} onChange={e => { setCode(e.target.value.toUpperCase()); clear() }} placeholder="WELCOME10" className="field mt-1.5 disabled:opacity-60" />
        </label>
        <label className="field-label mb-0">
          Type
          <select value={type} onChange={e => { setType(e.target.value as Coupon['type']); clear() }} className="field mt-1.5">
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="free_shipping">Free delivery</option>
          </select>
        </label>
        {type !== 'free_shipping' && (
          <label className="field-label mb-0">
            {type === 'percent' ? 'Percent off' : 'Amount off (Rs.)'}
            <input inputMode="numeric" value={value} onChange={e => { setValue(e.target.value); clear() }} className="field mt-1.5" />
          </label>
        )}
        {type === 'percent' && (
          <label className="field-label mb-0">
            Most it can take off (Rs.), optional
            <input inputMode="numeric" value={maxDiscount} onChange={e => { setMaxDiscount(e.target.value); clear() }} className="field mt-1.5" />
          </label>
        )}
        <label className="field-label mb-0">
          Minimum cart (Rs.), optional
          <input inputMode="numeric" value={minCart} onChange={e => { setMinCart(e.target.value); clear() }} className="field mt-1.5" />
        </label>
        <label className="field-label mb-0">
          Total uses allowed, optional
          <input inputMode="numeric" value={maxUses} onChange={e => { setMaxUses(e.target.value); clear() }} className="field mt-1.5" />
        </label>
        <label className="field-label mb-0">
          Last day it works, optional
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="field mt-1.5" />
        </label>
      </div>
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
          <button type="button" onClick={remove} className="btn border border-wine text-wine before:bg-wine hover:text-ivory">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function CampaignForm({ initial, onDone }: { initial?: Campaign; onDone: () => void }) {
  const { categories, setShop } = useAdmin()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? today())
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? today())
  const [percent, setPercent] = useState(initial ? String(initial.discountPercent) : '')
  const [chosen, setChosen] = useState<string[]>(initial?.categories ?? [])
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const pct = Number(percent)
    if (name.trim().length < 3) return setError('Enter a campaign name, for example Eid Sale.')
    if (!Number.isInteger(pct) || pct < 1 || pct > 90) return setError('Enter a discount from 1 to 90 percent.')
    if (!startsAt || !endsAt || endsAt < startsAt) return setError('The end date must be on or after the start date.')
    const next: Campaign = {
      id: initial?.id ?? `c${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      startsAt,
      endsAt,
      discountPercent: pct,
      categories: chosen,
      active: initial?.active ?? true,
    }
    setShop('campaigns', list => (initial ? list.map(c => (c.id === initial.id ? next : c)) : [next, ...list]))
    done(initial ? `${next.name} saved` : `${next.name} added`)
    onDone()
  }

  const remove = () => {
    setShop('campaigns', list => list.filter(c => c.id !== initial!.id))
    done(`${initial!.name} deleted`)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{initial ? 'Edit campaign' : 'Add campaign'}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label mb-0 sm:col-span-2">
          Name
          <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Eid Sale" className="field mt-1.5" />
        </label>
        <label className="field-label mb-0 sm:col-span-2">
          Message shown on the store banner
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="field mt-1.5 py-3" />
        </label>
        <label className="field-label mb-0">
          First day
          <input type="date" value={startsAt} onChange={e => { setStartsAt(e.target.value); setError('') }} className="field mt-1.5" />
        </label>
        <label className="field-label mb-0">
          Last day
          <input type="date" value={endsAt} min={startsAt} onChange={e => { setEndsAt(e.target.value); setError('') }} className="field mt-1.5" />
        </label>
        <label className="field-label mb-0">
          Percent off
          <input inputMode="numeric" value={percent} onChange={e => { setPercent(e.target.value); setError('') }} className="field mt-1.5" />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="field-label">Applies to. Choose none for the whole store.</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => {
            const on = chosen.includes(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen(list => (on ? list.filter(s => s !== c.slug) : [...list, c.slug]))}
                className={clsx(
                  'min-h-11 rounded-full border px-4 text-sm transition-colors',
                  on ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso',
                )}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save campaign
        </button>
        {initial && (
          <button type="button" onClick={remove} className="btn border border-wine text-wine before:bg-wine hover:text-ivory">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
