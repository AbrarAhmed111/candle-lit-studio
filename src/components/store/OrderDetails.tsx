'use client'

import { Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { formatDate, formatPKR } from '@/lib/pricing'
import type { Order, OrderStatus } from '@/types'

const steps: OrderStatus[] = [
  'Pending Confirmation',
  'Confirmed',
  'Processing',
  'Packed',
  'Dispatched',
  'Delivered',
]

const statusNote: Record<OrderStatus, string> = {
  'Pending Confirmation': 'We will call or WhatsApp you shortly to confirm this order.',
  Confirmed: 'Your order is confirmed and waiting to be prepared.',
  Processing: 'We are preparing your candles.',
  Packed: 'Your order is packed and waiting for the courier.',
  Dispatched: 'Your parcel is with the courier. Check your email for the tracking ID.',
  Delivered: 'Your order has been delivered. Enjoy your candles.',
  Cancelled: 'This order was cancelled.',
}

export default function OrderDetails({ order }: { order: Order }) {
  const current = steps.indexOf(order.status)

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.shipment!.trackingId)
      toast.success('Tracking number copied')
    } catch {
      toast.error('Copy failed. Select the number and copy it manually.')
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-espresso pb-4">
          <h2 className="text-3xl">Order {order.number}</h2>
          <p className="text-sm text-umber">Placed {formatDate(order.placedAt)}</p>
        </div>

        {/* Business-side status only. Parcel location lives on the courier's site. */}
        <div className="mt-6">
          <p className="text-lg font-medium">{order.status}</p>
          <p className="mt-1 text-umber">{statusNote[order.status]}</p>
          {order.status !== 'Cancelled' && (
            <ol className="mt-5 grid grid-cols-6 gap-1.5" aria-label="Order progress">
              {steps.map((s, i) => (
                <li key={s}>
                  <div
                    className={clsx('h-1.5 rounded-full', i <= current ? 'bg-caramel' : 'bg-wax')}
                  />
                  <span
                    className={clsx(
                      'mt-2 hidden text-xs sm:block',
                      i <= current ? 'text-espresso' : 'text-umber/70',
                    )}
                    aria-current={i === current ? 'step' : undefined}
                  >
                    {s === 'Pending Confirmation' ? 'Received' : s}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {order.shipment && (
          <section className="mt-8 bg-wax/60 p-6" aria-labelledby="shipment-h">
            <h3 id="shipment-h" className="text-2xl">
              Shipment
            </h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-umber">Courier</dt>
                <dd className="mt-0.5 font-medium">{order.shipment.courier}</dd>
              </div>
              <div>
                <dt className="text-sm text-umber">Tracking number</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{order.shipment.trackingId}</dd>
              </div>
              <div>
                <dt className="text-sm text-umber">Dispatched</dt>
                <dd className="mt-0.5 font-medium">{formatDate(order.shipment.dispatchedAt)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={copyTracking} className="btn-outline min-h-11 px-4 text-sm">
                <Copy size={15} /> Copy tracking number
              </button>
              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary min-h-11 px-4 text-sm"
              >
                Track on {order.shipment.courier} website <ExternalLink size={15} />
              </a>
            </div>
            <p className="mt-4 text-sm text-umber">
              We also emailed you this tracking ID. Paste it on the{' '}
              {order.shipment.courier} website to see where your parcel is.
            </p>
          </section>
        )}

        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {order.lines.map(l => (
            <li key={l.name + l.variant} className="flex items-baseline justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-umber">
                  {l.variant}, qty {l.qty}
                </p>
              </div>
              <p>
                {l.unitPrice < l.originalPrice && (
                  <s className="mr-2 text-sm text-umber">{formatPKR(l.originalPrice * l.qty)}</s>
                )}
                {formatPKR(l.unitPrice * l.qty)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="ml-auto mt-5 max-w-xs space-y-2 text-[0.95rem]">
          <Row label="Subtotal" value={formatPKR(order.subtotal)} />
          {order.couponDiscount > 0 && (
            <Row label={`Coupon ${order.couponCode}`} value={`− ${formatPKR(order.couponDiscount)}`} />
          )}
          <Row label="Delivery" value={order.shipping === 0 ? 'Free' : formatPKR(order.shipping)} />
          <div className="flex items-baseline justify-between border-t border-espresso pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-display text-2xl">{formatPKR(order.total)}</dd>
          </div>
        </dl>
      </div>

      <aside className="space-y-8 lg:border-l lg:border-hairline lg:pl-10">
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-normal">Payment</h3>
          <p className="mt-2">{order.paymentMethod}</p>
          <p className="text-umber">
            {order.paymentStatus === 'Pending Collection'
              ? `${formatPKR(order.total)} to pay in cash on delivery`
              : `${formatPKR(order.total)} paid to the courier`}
          </p>
        </div>
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-normal">Delivering to</h3>
          <address className="mt-2 not-italic text-umber">
            <span className="text-espresso">{order.customer.name}</span>
            <br />
            {order.customer.address}
            <br />
            {order.customer.area}, {order.customer.city}
            {order.customer.landmark && (
              <>
                <br />
                Near {order.customer.landmark}
              </>
            )}
            <br />
            {order.customer.phone}
          </address>
        </div>
        {order.customer.notes && (
          <div>
            <h3 className="font-sans text-sm font-semibold tracking-normal">Your note</h3>
            <p className="mt-2 text-umber">{order.customer.notes}</p>
          </div>
        )}
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
