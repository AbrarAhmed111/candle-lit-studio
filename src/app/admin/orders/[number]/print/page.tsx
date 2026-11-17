'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { card, Empty, Loading } from '@/components/admin/ui'
import { formatDate, formatPKR } from '@/lib/pricing'
import Logo from '@/components/Logo'

function Document() {
  const { number } = useParams<{ number: string }>()
  const slip = useSearchParams().get('type') === 'slip'
  const { orders, settings } = useAdmin()

  if (!orders) return <Loading />
  const order = orders.find(o => o.number === decodeURIComponent(number).toUpperCase())
  if (!order) {
    return (
      <div className={card}>
        <Empty title="Order not found" text="Check the order number and try again." />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/orders/${order.number}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel"
        >
          <ArrowLeft size={16} /> Back to {order.number}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/orders/${order.number}/print${slip ? '' : '?type=slip'}`} className="btn-outline">
            Show {slip ? 'invoice' : 'packing slip'}
          </Link>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            <Printer size={17} /> Print
          </button>
        </div>
      </div>

      <article className="mx-auto mt-6 max-w-3xl rounded-2xl bg-white p-8 text-black shadow-sm sm:p-12 print:mt-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-black pb-6">
          <div>
            <Logo size={56} name={settings.name} nameClassName="text-3xl" />
            <p className="mt-2 text-sm">
              {settings.address}
              <br />
              {settings.phone}, {settings.email}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-sans text-xl font-semibold tracking-normal">{slip ? 'Packing slip' : 'Invoice'}</h1>
            <p className="mt-2 text-sm">
              Order {order.number}
              <br />
              {formatDate(order.placedAt)}
            </p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-sans text-sm font-semibold tracking-normal">Deliver to</h2>
            <address className="mt-1 not-italic">
              {order.customer.name}
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
          <div>
            <h2 className="font-sans text-sm font-semibold tracking-normal">Shipment</h2>
            <p className="mt-1">
              {order.shipment ? (
                <>
                  {order.shipment.courier}
                  <br />
                  Tracking ID {order.shipment.trackingId}
                </>
              ) : (
                'Not dispatched yet'
              )}
              <br />
              Payment: {order.paymentMethod}
            </p>
          </div>
        </section>

        <table className="mt-8 w-full text-left">
          <thead>
            <tr className="border-b border-black text-sm">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              {slip ? (
                <th className="py-2 text-right font-semibold">Packed</th>
              ) : (
                <>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.lines.map(l => (
              <tr key={l.productId + l.variant + (l.colour ?? '')} className="border-b border-neutral-300">
                <td className="py-3">
                  {l.name}
                  <span className="block text-sm text-neutral-600">
                    {l.variant}
                    {l.colour && `, ${l.colour}`}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">{l.qty}</td>
                {slip ? (
                  <td className="py-3 text-right">
                    <span className="inline-block h-5 w-5 border border-black" aria-label="Tick when packed" />
                  </td>
                ) : (
                  <>
                    <td className="py-3 text-right tabular-nums">{formatPKR(l.unitPrice)}</td>
                    <td className="py-3 text-right tabular-nums">{formatPKR(l.unitPrice * l.qty)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {slip ? (
          <p className="mt-6 text-lg font-semibold">
            {order.paymentMethod === 'Easypaisa'
              ? `Paid by Easypaisa: ${formatPKR(order.total)}. Collect nothing.`
              : `Cash to collect on delivery: ${formatPKR(order.total)}`}
          </p>
        ) : (
          <dl className="ml-auto mt-6 max-w-xs space-y-1.5">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPKR(order.subtotal)}</dd>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt>Coupon {order.couponCode}</dt>
                <dd className="tabular-nums">− {formatPKR(order.couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{order.shipping === 0 ? 'Free' : formatPKR(order.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-black pt-2 text-lg font-semibold">
              <dt>{order.paymentMethod === 'Easypaisa' ? 'Total, paid by Easypaisa' : 'Cash to collect'}</dt>
              <dd className="tabular-nums">{formatPKR(order.total)}</dd>
            </div>
          </dl>
        )}

        {order.customer.notes && (
          <p className="mt-6 border border-neutral-400 p-3 text-sm">
            <span className="font-semibold">Customer note:</span> {order.customer.notes}
          </p>
        )}
        <p className="mt-10 text-center text-sm text-neutral-600">
          Thank you for your order. Questions? WhatsApp us on +{settings.whatsapp}.
        </p>
      </article>
    </>
  )
}

export default function PrintOrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Document />
    </Suspense>
  )
}
