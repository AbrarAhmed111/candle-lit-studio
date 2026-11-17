'use client'

import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type ReviewStatus } from '@/components/admin/AdminData'
import { card, Empty, PageHeader, shortDate, doneWithUndo } from '@/components/admin/ui'
import Stars from '@/components/store/Stars'
import HowItWorks from '@/components/admin/HowItWorks'

const tabs: ReviewStatus[] = ['Pending', 'Approved', 'Rejected']

export default function AdminReviewsPage() {
  const { reviews, products, setShop } = useAdmin()
  const [tab, setTab] = useState<ReviewStatus>('Pending')
  const shown = reviews.filter(r => r.status === tab)

  const setStatus = (id: string, status: ReviewStatus) => {
    const before = reviews.find(r => r.id === id)?.status ?? 'Pending'
    setShop('reviews', list => list.map(r => (r.id === id ? { ...r, status } : r)))
    doneWithUndo(
      status === 'Approved'
        ? 'Review approved, now on the website'
        : status === 'Rejected'
          ? 'Review rejected'
          : 'Moved back to waiting',
      () => setShop('reviews', list => list.map(r => (r.id === id ? { ...r, status: before } : r))),
    )
  }

  return (
    <>
      <PageHeader title="Reviews" text="Only approved reviews appear on product pages." />
      <HowItWorks id="reviews">
        <p>
          New reviews wait here until you approve them. Only approved reviews show on the website. Reviews that visitors
          report three times come back here to be checked again.
        </p>
      </HowItWorks>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter reviews">
        {tabs.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={clsx(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
              tab === t ? 'border-espresso bg-espresso text-ivory' : 'border-hairline bg-linen hover:border-espresso',
            )}
          >
            {t === 'Pending' ? 'Waiting for you' : t}
            <span className={clsx('tabular-nums', tab === t ? 'text-wax/80' : 'text-umber')}>
              {reviews.filter(r => r.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className={`${card} mt-4`}>
          <Empty
            title={tab === 'Pending' ? 'All caught up' : `No ${tab.toLowerCase()} reviews`}
            text={tab === 'Pending' ? 'New reviews will wait here for your approval.' : 'Nothing here yet.'}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map(r => (
            <li key={r.id} className={`${card} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-umber">
                    {products.find(p => p.id === r.productId)?.name ?? 'Deleted product'}
                  </p>
                  <h2 className="mt-1 flex flex-wrap items-center gap-3 font-sans text-base font-semibold tracking-normal">
                    <Stars rating={r.rating} /> {r.title}
                  </h2>
                </div>
                <p className="text-sm text-umber">{shortDate(r.date)}</p>
              </div>
              <p className="mt-3 max-w-prose">{r.body}</p>
              {r.images && r.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map(url => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Customer photo" className="h-20 w-20 rounded-xl object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {(r.reports ?? 0) > 0 && (
                <p className="mt-3 inline-block rounded-full bg-wine/10 px-3 py-1 text-sm text-wine">
                  Reported {r.reports} {r.reports === 1 ? 'time' : 'times'} by visitors
                </p>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-umber">
                {r.author}, {r.city}
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 text-sage">
                    <BadgeCheck size={15} /> Verified purchase
                  </span>
                ) : (
                  <span>No matching order found</span>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, 'Approved')}
                    className="btn-primary min-h-11 px-5 text-sm"
                  >
                    Approve
                  </button>
                )}
                {r.status !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, 'Rejected')}
                    className="btn-outline min-h-11 px-5 text-sm"
                  >
                    {r.status === 'Approved' ? 'Take down' : 'Reject'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
