'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useReorder } from '@/components/account/OrderCard'
import { useAccount, useMyOrders } from '@/components/account/useAccount'
import OrderDetails from '@/components/store/OrderDetails'

export default function AccountOrderPage() {
  const { number } = useParams<{ number: string }>()
  const { account } = useAccount()
  const orders = useMyOrders(account.profile.phone)
  const reorder = useReorder()
  // Only this customer's own orders are searched
  const order = orders?.find(o => o.number === decodeURIComponent(number).toUpperCase())

  return (
    <>
      <Link
        href="/account/orders"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel"
      >
        <ArrowLeft size={16} /> Your orders
      </Link>
      {!orders ? (
        <div role="status" aria-label="Loading" className="mt-4 h-72 animate-pulse rounded-2xl bg-wax/70" />
      ) : !order ? (
        <div className="mt-4 rounded-2xl border border-hairline bg-linen p-10 text-center">
          <p className="font-display text-2xl">Order not found</p>
          <p className="mt-2 text-umber">
            {decodeURIComponent(number)} is not one of your orders. Check the number in your confirmation email.
          </p>
          <Link href="/account/orders" className="btn-primary mt-5">
            See your orders
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <OrderDetails order={order} />
          </div>
          <button type="button" onClick={() => reorder(order)} className="btn-primary mt-8">
            <RotateCcw size={16} /> Order these again
          </button>
        </>
      )}
    </>
  )
}
