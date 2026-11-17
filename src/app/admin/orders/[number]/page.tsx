'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Copy, Download, ExternalLink, Pencil, Printer, RotateCcw, Truck } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import {
  card,
  dateTime,
  Empty,
  input,
  Loading,
  PaymentBadge,
  StatusBadge,
  whatsappLink,
  done,
  doneWithUndo,
} from '@/components/admin/ui'
import CancelDialog from '@/components/admin/order/CancelDialog'
import CodPanel from '@/components/admin/order/CodPanel'
import DispatchDialog from '@/components/admin/order/DispatchDialog'
import EasypaisaPanel from '@/components/admin/order/EasypaisaPanel'
import EditItemsDialog from '@/components/admin/order/EditItemsDialog'
import OrderMessages from '@/components/admin/order/OrderMessages'
import { Field, Row } from '@/components/admin/order/parts'
import { orderFlow, type AdminOrder } from '@/data/admin'
import { formatPKR } from '@/lib/pricing'
import { awaitingPayment } from '@/lib/payments'
import type { OrderStatus } from '@/types'

// The one obvious next step for each status
const nextStep: Partial<Record<OrderStatus, { to: OrderStatus; label: string; event: string }>> = {
  'Pending Confirmation': { to: 'Confirmed', label: 'Confirm order', event: 'Order confirmed with the customer' },
  Confirmed: { to: 'Processing', label: 'Start preparing', event: 'Preparation started' },
  Processing: { to: 'Packed', label: 'Mark as packed', event: 'Order packed' },
  Dispatched: { to: 'Delivered', label: 'Mark as delivered', event: 'Marked as delivered' },
  'Failed Delivery': { to: 'Dispatched', label: 'Send out again', event: 'Sent out for delivery again' },
}

// Statuses where the candles can still be changed
const editable: OrderStatus[] = ['Pending Confirmation', 'Confirmed', 'Processing', 'Packed', 'Cancellation Requested']
const closed: OrderStatus[] = ['Delivered', 'Cancelled', 'Returned']

export default function AdminOrderPage() {
  const { number } = useParams<{ number: string }>()
  const { orders, updateOrder, addNote, settings } = useAdmin()
  const [dialog, setDialog] = useState<'dispatch' | 'cancel' | 'edit' | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [note, setNote] = useState('')

  if (!orders) return <Loading />
  const order = orders.find(o => o.number === decodeURIComponent(number).toUpperCase())

  if (!order) {
    return (
      <div className={card}>
        <Empty title="Order not found" text={`There is no order numbered ${decodeURIComponent(number)}.`}>
          <Link href="/admin/orders" className="btn-primary">
            Back to orders
          </Link>
        </Empty>
      </div>
    )
  }

  // An Easypaisa order moves forward only once its payment is approved
  const unpaid = awaitingPayment(order) && order.status !== 'Cancelled'
  const step = unpaid ? undefined : nextStep[order.status]
  const reached =
    order.status === 'Failed Delivery'
      ? orderFlow.indexOf('Dispatched')
      : order.status === 'Cancellation Requested'
        ? -1
        : orderFlow.indexOf(order.status)
  const open = !closed.includes(order.status)
  const firstName = order.customer.name.split(' ')[0]

  const advance = () => {
    if (!step) return
    const before = order.status
    updateOrder(order.number, { status: step.to }, step.event)
    doneWithUndo(`${order.number}: ${step.to}`, () =>
      updateOrder(order.number, { status: before }, `Undone: back to ${before}`),
    )
  }

  const setStatus = (status: OrderStatus, event: string, extra: Partial<AdminOrder> = {}) => {
    const before = order.status
    updateOrder(order.number, { status, ...extra }, event)
    // Cancelling and returning put stock back, so they are confirmed first and not undone here
    if (status === 'Cancelled' || status === 'Returned') done(`${order.number}: ${status}`)
    else
      doneWithUndo(`${order.number}: ${status}`, () =>
        updateOrder(order.number, { status: before }, `Undone: back to ${before}`),
      )
  }

  const pdf = async (kind: 'invoice' | 'slip') => {
    setPdfBusy(true)
    try {
      // The PDF maker is large, so it loads only when someone asks for a PDF
      const { downloadInvoice } = await import('@/lib/invoice')
      await downloadInvoice(order, settings, kind)
    } catch {
      toast.error('The PDF could not be made. Use Print instead.')
    }
    setPdfBusy(false)
  }

  const saveNote = (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addNote(order.number, note.trim())
    setNote('')
    toast.success('Note saved')
  }

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.shipment!.trackingId)
      toast.success('Tracking ID copied')
    } catch {
      toast.error('Copy failed. Select the number and copy it manually.')
    }
  }

  return (
    <>
      <Link
        href="/admin/orders"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel"
      >
        <ArrowLeft size={16} /> All orders
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl lg:text-5xl">{order.number}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-umber">
            Placed {dateTime(order.placedAt)}
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {step && (
            <button type="button" onClick={advance} className="btn-primary">
              {step.label}
            </button>
          )}
          {order.status === 'Packed' && (
            <button type="button" onClick={() => setDialog('dispatch')} className="btn-primary">
              <Truck size={17} /> Dispatch order
            </button>
          )}
          {order.status === 'Dispatched' && (
            <button
              type="button"
              onClick={() => setStatus('Failed Delivery', 'Courier could not deliver')}
              className="btn-outline"
            >
              Delivery failed
            </button>
          )}
          {(order.status === 'Failed Delivery' || order.status === 'Delivered') && (
            <button
              type="button"
              onClick={() => setStatus('Returned', 'Parcel returned to the studio. Stock put back.')}
              className="btn-outline"
            >
              <RotateCcw size={16} /> Mark as returned
            </button>
          )}
          {editable.includes(order.status) && (
            <button type="button" onClick={() => setDialog('edit')} className="btn-outline">
              <Pencil size={16} /> Edit items
            </button>
          )}
          <button type="button" disabled={pdfBusy} onClick={() => pdf('invoice')} className="btn-outline">
            <Download size={17} /> Invoice PDF
          </button>
          <button type="button" disabled={pdfBusy} onClick={() => pdf('slip')} className="btn-outline">
            <Download size={17} /> Packing slip PDF
          </button>
          <Link href={`/admin/orders/${order.number}/print`} className="btn-outline" title="Print the invoice">
            <Printer size={17} /> Print
          </Link>
          {open && order.status !== 'Cancellation Requested' && (
            <button type="button" onClick={() => setDialog('cancel')} className="btn-outline">
              Cancel order
            </button>
          )}
        </div>
      </div>

      {order.status === 'Cancellation Requested' && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-wine/30 bg-wine/5 p-5"
        >
          <div>
            <p className="font-medium text-wine">The customer asked to cancel this order</p>
            <p className="mt-1 text-umber">
              {order.cancelRequest?.reason ?? 'No reason given'}
              {order.cancelRequest?.at && `. Asked ${dateTime(order.cancelRequest.at)}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setStatus('Cancelled', 'Cancellation approved. Stock put back.', {
                  cancelReason: `Customer asked to cancel: ${order.cancelRequest?.reason ?? 'no reason given'}.`,
                })
              }
              className="btn bg-wine text-ivory before:bg-espresso"
            >
              Approve cancellation
            </button>
            <button
              type="button"
              onClick={() =>
                setStatus(unpaid ? 'Pending Confirmation' : 'Confirmed', 'Cancellation refused, order kept')
              }
              className="btn-outline"
            >
              Keep the order
            </button>
          </div>
        </div>
      )}

      {unpaid && order.status !== 'Cancellation Requested' && (
        <p role="status" className="mt-6 rounded-2xl bg-ember/20 p-4 text-toffee">
          {order.paymentStatus === 'Payment Rejected'
            ? 'Waiting for the customer to send new Easypaisa details. The order stays on hold until then.'
            : 'Check the Easypaisa payment below first. Once you approve it, you can confirm the order.'}{' '}
          <a href="#pay-h" className="link">
            Go to the payment
          </a>
        </p>
      )}

      {order.status === 'Failed Delivery' && (
        <p className="mt-6 rounded-2xl bg-ember/20 p-4 text-toffee">
          The courier could not deliver this order. Call the customer, then send it out again or mark it as returned.
        </p>
      )}

      {order.status === 'Returned' ? (
        <p className="mt-6 rounded-2xl bg-wine/10 p-4 text-wine">
          Returned to the studio. The candles are back in stock.
        </p>
      ) : order.status === 'Cancellation Requested' ? null : order.status !== 'Cancelled' ? (
        <>
          {/* Phones hide the step names, so name the current one here */}
          <p className="mt-6 text-sm text-umber sm:hidden">
            Step {reached + 1} of {orderFlow.length}:{' '}
            <span className="font-medium text-espresso">
              {order.status === 'Pending Confirmation' ? 'Received' : order.status}
            </span>
          </p>
          <ol className="mt-2 grid grid-cols-6 gap-1.5 sm:mt-6" aria-label="Order progress">
            {orderFlow.map((s, i) => (
              <li key={s}>
                <div className={clsx('h-1.5 rounded-full', i <= reached ? 'bg-caramel' : 'bg-wax')} />
                <span
                  className={clsx('mt-2 hidden text-xs sm:block', i <= reached ? 'text-espresso' : 'text-umber/70')}
                  aria-current={i === reached ? 'step' : undefined}
                >
                  {s === 'Pending Confirmation' ? 'Received' : s}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-6 rounded-2xl bg-wine/10 p-4 text-wine">
          Cancelled. {order.cancelReason ?? 'No reason recorded.'}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className={`${card} overflow-hidden`} aria-labelledby="items-h">
            <h2 id="items-h" className="p-5 pb-3 text-2xl sm:px-6">
              Items
            </h2>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {order.lines.map(l => (
                <li
                  key={l.productId + l.variant + (l.colour ?? '')}
                  className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6"
                >
                  <span>
                    <span className="font-medium">{l.name}</span>
                    <span className="block text-sm text-umber">
                      {l.variant}
                      {l.colour && `, ${l.colour}`}, {l.qty} × {formatPKR(l.unitPrice)}
                      {l.unitPrice < l.originalPrice && <s className="ml-2">{formatPKR(l.originalPrice)}</s>}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatPKR(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto max-w-xs space-y-2 p-5 sm:px-6">
              <Row label="Subtotal" value={formatPKR(order.subtotal)} />
              {order.couponDiscount > 0 && (
                <Row label={`Coupon ${order.couponCode}`} value={`− ${formatPKR(order.couponDiscount)}`} />
              )}
              <Row label="Delivery" value={order.shipping === 0 ? 'Free' : formatPKR(order.shipping)} />
              <div className="flex items-baseline justify-between border-t border-espresso pt-3">
                <dt className="font-medium">
                  {order.paymentMethod === 'Easypaisa' ? 'Total' : 'COD amount to collect'}
                </dt>
                <dd className="font-display text-2xl">{formatPKR(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="ship-h">
            <div className="flex items-center justify-between gap-3">
              <h2 id="ship-h" className="text-2xl">
                Shipment
              </h2>
              {order.shipment && open && (
                <button type="button" onClick={() => setDialog('dispatch')} className="link min-h-11 text-sm">
                  Edit details
                </button>
              )}
            </div>
            {order.shipment ? (
              <>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Courier" value={order.shipment.courier} />
                  <Field label="Tracking ID" value={order.shipment.trackingId} />
                  <Field label="Dispatched" value={dateTime(order.shipment.dispatchedAt)} />
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={copyTracking} className="btn-outline min-h-11 px-4 text-sm">
                    <Copy size={15} /> Copy tracking ID
                  </button>
                  <a
                    href={order.shipment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline min-h-11 px-4 text-sm"
                  >
                    Open {order.shipment.courier} tracking <ExternalLink size={15} />
                  </a>
                </div>
              </>
            ) : (
              <p className="mt-3 text-umber">
                No courier yet. Pack the order, then dispatch it to add the courier and tracking ID.
              </p>
            )}
          </section>

          {order.paymentMethod === 'Easypaisa' ? <EasypaisaPanel order={order} /> : <CodPanel order={order} />}
        </div>

        <div className="space-y-6">
          <section className={`${card} p-5 sm:p-6`} aria-labelledby="cust-h">
            <h2 id="cust-h" className="text-2xl">
              Customer
            </h2>
            <address className="mt-3 not-italic text-umber">
              <span className="text-espresso">{order.customer.name}</span>
              <br />
              {order.customer.phone}
              {order.customer.email && (
                <>
                  <br />
                  {order.customer.email}
                </>
              )}
              <br />
              {order.customer.address}
              <br />
              {order.customer.area}, {order.customer.city}
              {order.customer.postalCode && ` ${order.customer.postalCode}`}
              {order.customer.landmark && (
                <>
                  <br />
                  Near {order.customer.landmark}
                </>
              )}
            </address>
            {order.customer.notes && (
              <p className="mt-3 rounded-xl bg-wax/60 p-3 text-sm">
                <span className="font-medium">Customer note:</span> {order.customer.notes}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={whatsappLink(
                  order.customer.phone,
                  `Assalam o alaikum ${firstName}, this is Candle Lit Studio about your order ${order.number}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn-outline min-h-11 px-4 text-sm"
              >
                <FaWhatsapp size={17} /> WhatsApp
              </a>
              <a href={`tel:${order.customer.phone}`} className="btn-outline min-h-11 px-4 text-sm">
                Call
              </a>
            </div>
          </section>

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="notes-h">
            <h2 id="notes-h" className="text-2xl">
              Internal notes
            </h2>
            <p className="mt-1 text-sm text-umber">Only your team sees these.</p>
            {order.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {order.notes.map(n => (
                  <li key={n.at} className="rounded-xl bg-wax/60 p-3">
                    <p>{n.text}</p>
                    <p className="mt-1 text-sm text-umber">{dateTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={saveNote} className="mt-4">
              <label htmlFor="note" className="sr-only">
                Add a note
              </label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="For example: customer asked for delivery after 5 pm"
                className={`${input} w-full py-2.5`}
              />
              <button type="submit" disabled={!note.trim()} className="btn-outline mt-2 min-h-11 px-5 text-sm">
                Save note
              </button>
            </form>
          </section>

          <OrderMessages number={order.number} hasEmail={!!order.customer.email} />

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-2xl">
              History
            </h2>
            <ol className="mt-4 space-y-4 border-l border-hairline pl-5">
              {[...order.history].reverse().map((e, i) => (
                <li key={e.at + i} className="relative">
                  <span
                    aria-hidden
                    className={clsx(
                      'absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full',
                      i === 0 ? 'bg-caramel' : 'bg-hairline',
                    )}
                  />
                  <p>{e.text}</p>
                  <p className="text-sm text-umber">{dateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <DispatchDialog order={order} open={dialog === 'dispatch'} onClose={() => setDialog(null)} />
      <CancelDialog order={order} open={dialog === 'cancel'} onClose={() => setDialog(null)} />
      {dialog === 'edit' && <EditItemsDialog order={order} onClose={() => setDialog(null)} />}
    </>
  )
}
