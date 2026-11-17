'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Copy, ExternalLink, Printer, Truck } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAdmin } from '@/components/admin/AdminData'
import { card, dateTime, Empty, input, Loading, PaymentBadge, StatusBadge, whatsappLink, done } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import { orderFlow, type AdminOrder } from '@/data/admin'
import { formatPKR } from '@/lib/pricing'
import type { OrderStatus } from '@/types'

// The one obvious next step for each status
const nextStep: Partial<Record<OrderStatus, { to: OrderStatus; label: string; event: string }>> = {
  'Pending Confirmation': { to: 'Confirmed', label: 'Confirm order', event: 'Order confirmed with the customer' },
  Confirmed: { to: 'Processing', label: 'Start preparing', event: 'Preparation started' },
  Processing: { to: 'Packed', label: 'Mark as packed', event: 'Order packed' },
  Dispatched: { to: 'Delivered', label: 'Mark as delivered', event: 'Marked as delivered' },
}

export default function AdminOrderPage() {
  const { number } = useParams<{ number: string }>()
  const { orders, updateOrder, addNote } = useAdmin()
  const [dialog, setDialog] = useState<'dispatch' | 'cancel' | null>(null)
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

  const step = nextStep[order.status]
  const reached = orderFlow.indexOf(order.status)
  const open = order.status !== 'Delivered' && order.status !== 'Cancelled'
  const firstName = order.customer.name.split(' ')[0]

  const advance = () => {
    if (!step) return
    updateOrder(order.number, { status: step.to }, step.event)
    done(`${order.number}: ${step.to}`)
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
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 text-sm text-umber hover:text-caramel">
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
          <Link href={`/admin/orders/${order.number}/print`} className="btn-outline">
            <Printer size={17} /> Invoice
          </Link>
          <Link href={`/admin/orders/${order.number}/print?type=slip`} className="btn-outline">
            Packing slip
          </Link>
          {open && (
            <button type="button" onClick={() => setDialog('cancel')} className="btn-outline">
              Cancel order
            </button>
          )}
        </div>
      </div>

      {order.status !== 'Cancelled' ? (
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
                <li key={l.productId + l.variant} className="flex items-baseline justify-between gap-4 px-5 py-3.5 sm:px-6">
                  <span>
                    <span className="font-medium">{l.name}</span>
                    <span className="block text-sm text-umber">
                      {l.variant}, {l.qty} × {formatPKR(l.unitPrice)}
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
                <dt className="font-medium">COD amount to collect</dt>
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
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="btn-outline min-h-11 px-4 text-sm">
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

          <section className={`${card} p-5 sm:p-6`} aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-2xl">
              COD payment
            </h2>
            <p className="mt-3 text-umber">
              {order.status === 'Cancelled'
                ? 'Nothing to collect for a cancelled order.'
                : order.status !== 'Delivered'
                  ? `${formatPKR(order.total)} will be collected by the courier at the door. You can record it once the order is delivered.`
                  : order.paymentStatus === 'Pending Collection'
                    ? `Delivered, but the cash is not recorded yet. Record it when the courier confirms they collected ${formatPKR(order.total)}.`
                    : order.paymentStatus === 'Collected by Courier'
                      ? `The courier holds ${formatPKR(order.total)}. Record the settlement when it reaches your account.`
                      : `${formatPKR(order.total)} has been settled to the business.`}
            </p>
            {order.status === 'Delivered' && order.paymentStatus === 'Pending Collection' && (
              <button
                type="button"
                onClick={() => updateOrder(order.number, { paymentStatus: 'Collected by Courier' }, 'COD recorded as collected by the courier')}
                className="btn-primary mt-4"
              >
                Record cash collected by courier
              </button>
            )}
            {order.status === 'Delivered' && order.paymentStatus === 'Collected by Courier' && (
              <button
                type="button"
                onClick={() => updateOrder(order.number, { paymentStatus: 'Settled to Business' }, 'COD settlement received from the courier')}
                className="btn-primary mt-4"
              >
                Record settlement received
              </button>
            )}
          </section>
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
    </>
  )
}

function DispatchDialog({ order, open, onClose }: { order: AdminOrder; open: boolean; onClose: () => void }) {
  const { updateOrder, settings } = useAdmin()
  // Couriers switched on in Settings, plus the one already on this order
  const couriers = settings.couriers.filter(c => c.active || c.name === order.shipment?.courier)
  const [courier, setCourier] = useState(order.shipment?.courier ?? couriers[0]?.name ?? '')
  const [trackingId, setTrackingId] = useState(order.shipment?.trackingId ?? '')
  const [error, setError] = useState('')
  const editing = Boolean(order.shipment)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const id = trackingId.trim()
    if (!courier) return setError('Switch on at least one courier in Settings first.')
    if (id.length < 6) return setError('Enter the tracking ID from the courier slip, at least 6 characters.')
    const trackingUrl = couriers.find(c => c.name === courier)?.trackingUrl ?? ''
    updateOrder(
      order.number,
      {
        status: editing ? order.status : 'Dispatched',
        shipment: {
          courier,
          trackingId: id,
          trackingUrl,
          dispatchedAt: order.shipment?.dispatchedAt ?? new Date().toISOString(),
        },
      },
      editing ? `Shipment updated: ${courier}, tracking ${id}` : `Dispatched with ${courier}, tracking ${id}`,
    )
    done(editing ? 'Shipment updated' : `${order.number} dispatched`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} label={editing ? 'Edit shipment' : 'Dispatch order'} className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
      <form onSubmit={submit} noValidate>
        <h2 className="pr-10 text-3xl">{editing ? 'Edit shipment' : `Dispatch ${order.number}`}</h2>
        <p className="mt-2 text-umber">
          {editing
            ? 'Correct the courier or tracking ID. The change is recorded in the order history.'
            : 'The customer sees the courier and tracking ID on their order page.'}
        </p>
        <label htmlFor="courier" className="field-label mt-6">
          Courier
        </label>
        <select id="courier" value={courier} onChange={e => setCourier(e.target.value)} className="field">
          {couriers.map(c => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <label htmlFor="tracking" className="field-label mt-4">
          Tracking ID
        </label>
        <input
          id="tracking"
          value={trackingId}
          onChange={e => {
            setTrackingId(e.target.value)
            setError('')
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'tracking-error' : undefined}
          className="field"
        />
        {error && (
          <p id="tracking-error" className="field-error">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary flex-1">
            {editing ? 'Save shipment' : 'Dispatch order'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            Not now
          </button>
        </div>
      </form>
    </Modal>
  )
}

const reasons = [
  'Customer asked to cancel',
  'Customer did not answer the confirmation calls',
  'Out of stock',
  'Duplicate order',
  'Address outside delivery area',
]

function CancelDialog({ order, open, onClose }: { order: AdminOrder; open: boolean; onClose: () => void }) {
  const { updateOrder } = useAdmin()
  const [reason, setReason] = useState(reasons[0])

  const confirm = () => {
    updateOrder(order.number, { status: 'Cancelled', cancelReason: `${reason}.` }, `Order cancelled. ${reason}.`)
    done(`${order.number} cancelled`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} label="Cancel order" className="max-w-md rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8">
      <h2 className="pr-10 text-3xl">Cancel {order.number}?</h2>
      <p className="mt-2 text-umber">
        The order for {order.customer.name}, worth {formatPKR(order.total)}, will be marked cancelled. This
        cannot be undone here.
      </p>
      <label htmlFor="reason" className="field-label mt-6">
        Reason
      </label>
      <select id="reason" value={reason} onChange={e => setReason(e.target.value)} className="field">
        {reasons.map(r => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={confirm} className="btn flex-1 bg-wine text-ivory before:bg-espresso">
          Cancel order
        </button>
        <button type="button" onClick={onClose} className="btn-outline">
          Keep order
        </button>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-umber">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
