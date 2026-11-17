'use client'

import Link from 'next/link'
import { useState } from 'react'
import clsx from 'clsx'
import OrderCard from '@/components/account/OrderCard'
import { useAccount, useMyOrders } from '@/components/account/useAccount'

const filters = ['All', 'On the way', 'Delivered', 'Cancelled'] as const

export default function AccountOrders() {
  const { account } = useAccount()
  const orders = useMyOrders(account.profile.phone)
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')

  const match = (status: string, f: (typeof filters)[number]) =>
    f === 'All' || (f === 'On the way' ? status !== 'Delivered' && status !== 'Cancelled' : status === f)
  const shown = orders?.filter(o => match(o.status, filter)) ?? []

  return (
    <>
      <h1 className="text-5xl lg:text-6xl">Your orders</h1>
      <p className="mt-3 text-lg text-umber">Follow an order, find its tracking ID, or order the same candles again.</p>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {filters.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={clsx(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
              filter === f ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso',
            )}
          >
            {f}
            {orders && (
              <span className={filter === f ? 'text-wax/80' : 'text-umber'}>
                {orders.filter(o => match(o.status, f)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {!orders ? (
          <div role="status" aria-label="Loading" className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl bg-wax/70" />
            <div className="h-44 animate-pulse rounded-2xl bg-wax/70" />
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-linen p-10 text-center">
            <p className="font-display text-2xl">
              {orders.length === 0 ? 'No orders yet' : `No ${filter.toLowerCase()} orders`}
            </p>
            <p className="mt-2 text-umber">
              {orders.length === 0 ? 'Your first candle is one tap away.' : 'Choose another filter to see the rest.'}
            </p>
            {orders.length === 0 && (
              <Link href="/shop" className="btn-primary mt-5">
                Shop all candles
              </Link>
            )}
          </div>
        ) : (
          shown.map(o => <OrderCard key={o.number} order={o} />)
        )}
      </div>
    </>
  )
}
