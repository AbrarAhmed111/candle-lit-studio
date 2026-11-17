'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import OrderDetails from '@/components/store/OrderDetails'
import CandleArt from '@/components/store/CandleArt'
import { localOrders, orderAccess } from '@/lib/orders'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { getPlacedOrder } from '@/lib/actions/store'
import type { Order } from '@/types'

// Confirmation page. Only orders placed from this browser open here;
// anyone else must verify their phone number on the Track order page.
export default function OrderPage() {
  const { number } = useParams<{ number: string }>()
  const token = useSearchParams().get('t')
  const [order, setOrder] = useState<Order | null | undefined>(undefined)

  useEffect(() => {
    const wanted = number.toUpperCase()
    if (!isSupabaseConfigured) {
      setOrder(localOrders().find(o => o.number === wanted) ?? null)
      return
    }
    const secret = token ?? orderAccess(wanted)
    if (!secret) return setOrder(null)
    getPlacedOrder(wanted, secret).then(r => setOrder(r.ok ? r.data : null))
  }, [number, token])

  if (order === undefined) {
    return <div className="page py-24 text-center text-umber">Loading your order…</div>
  }

  if (order === null) {
    return (
      <div className="page py-24 text-center">
        <h1 className="text-5xl italic">We need to check it is you</h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-umber">
          To open order {number.toUpperCase()}, enter the order number with the mobile
          number you used at checkout.
        </p>
        <Link href={`/track-order?order=${number.toUpperCase()}`} className="btn-primary mt-8">
          Track this order
        </Link>
      </div>
    )
  }

  return (
    <div className="page pt-8 lg:pt-12">
      <div className="flex items-center gap-6 bg-soot p-6 text-ivory sm:p-10">
        <CandleArt shape="pillar" wax="#EFE3CB" vessel="#EFE3CB" lit className="h-28 w-auto shrink-0 sm:h-36" />
        <div>
          <h1 className="text-4xl italic sm:text-5xl">
            Thank you, {order.customer.name.split(' ')[0]}.
          </h1>
          <p className="mt-3 max-w-lg text-wax/85">
            We have received your order. We will call or WhatsApp{' '}
            {order.customer.phone} to confirm it before we pack.
            {order.customer.email && ` A confirmation is on its way to ${order.customer.email}.`}
          </p>
        </div>
      </div>

      <div className="mt-12">
        <OrderDetails order={order} />
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary">
          Keep shopping
        </Link>
        <Link href="/track-order" className="btn-outline">
          Track an order
        </Link>
      </div>
    </div>
  )
}
