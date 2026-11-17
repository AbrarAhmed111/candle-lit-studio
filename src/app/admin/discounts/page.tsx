'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type AdminCoupon, type Campaign } from '@/components/admin/AdminData'
import { card, Empty, PageHeader, shortDate, td, th } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import { formatPKR } from '@/lib/pricing'
import HowItWorks from '@/components/admin/HowItWorks'
import Switch from '@/components/ui/Switch'
import CouponForm from '@/components/admin/discounts/CouponForm'
import { describe, today } from '@/components/admin/discounts/helpers'
import SaleForm from '@/components/admin/discounts/SaleForm'

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
  return (
    <span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium', tone[value])}>{value}</span>
  )
}

export default function AdminDiscountsPage() {
  const { coupons, campaigns, categories, setShop } = useAdmin()
  const [coupon, setCoupon] = useState<string | null>(null) // 'new' or a code
  const [campaign, setCampaign] = useState<string | null>(null) // 'new' or an id

  return (
    <>
      <PageHeader title="Discounts" text="Coupon codes customers type at checkout, and sales that run on a schedule." />
      <HowItWorks id="discounts">
        <p>
          <strong>Coupons</strong> are codes customers type at checkout, like WELCOME10. You can limit a coupon to first
          orders, to certain candles, or to a number of uses.
        </p>
        <p>
          <strong>Sales</strong> lower prices on their own between two dates, for a few categories or the whole store. A
          candle never gets a sale and its own discount together: it gets whichever is bigger.
        </p>
      </HowItWorks>

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
                          c.firstOrderOnly && 'First order only',
                          c.perCustomerLimit && `${c.perCustomerLimit} per customer`,
                          (c.categories?.length || c.productIds?.length) && 'Selected candles only',
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
                          checked={c.active}
                          label={`${c.code} can be used`}
                          onChange={active =>
                            setShop('coupons', list => list.map(x => (x.code === c.code ? { ...x, active } : x)))
                          }
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
          One coupon per order. A coupon applies after product and sale discounts, never on the delivery fee unless it
          is a free delivery coupon.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="campaigns-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="campaigns-h" className="text-3xl">
            Sales campaigns
          </h2>
          <button type="button" onClick={() => setCampaign('new')} className="btn-primary">
            <Plus size={17} /> Add a sale
          </button>
        </div>
        {campaigns.length === 0 ? (
          <div className={`${card} mt-4`}>
            <Empty
              title="No campaigns yet"
              text="Plan an Eid, 11.11 or winter sale and it will start and end on its own."
            />
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
                      checked={c.active}
                      label={`${c.name} is allowed to run`}
                      onChange={active =>
                        setShop('campaigns', list => list.map(x => (x.id === c.id ? { ...x, active } : x)))
                      }
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
          If a product has its own discount and is also in a campaign, the customer gets the bigger of the two, not
          both.
        </p>
      </section>

      <Modal
        open={coupon !== null}
        onClose={() => setCoupon(null)}
        label="Coupon"
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {coupon !== null && (
          <CouponForm key={coupon} initial={coupons.find(c => c.code === coupon)} onDone={() => setCoupon(null)} />
        )}
      </Modal>
      <Modal
        open={campaign !== null}
        onClose={() => setCampaign(null)}
        label="Sale"
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {campaign !== null && (
          <SaleForm key={campaign} initial={campaigns.find(c => c.id === campaign)} onDone={() => setCampaign(null)} />
        )}
      </Modal>
    </>
  )
}
