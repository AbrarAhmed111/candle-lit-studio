'use client'

import Link from 'next/link'
import { Check, Phone } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useAdmin } from './AdminData'
import { card, dateTime, doneWithUndo, whatsappLink } from './ui'
import { formatPKR } from '@/lib/pricing'
import { awaitingPayment } from '@/lib/payments'
import type { AdminOrder } from '@/data/admin'

/**
 * What needs the owner today, as a list of real orders with the one action
 * each needs, so the day can be run from the Overview page.
 */
export default function TodayList() {
  const { orders, updateOrder, settings } = useAdmin()
  if (!orders) return null

  const toCheck = orders.filter(o => o.paymentStatus === 'Pending Verification' && o.status !== 'Cancelled')
  // Easypaisa orders wait for their payment before they can be confirmed
  const toConfirm = orders.filter(o => o.status === 'Pending Confirmation' && !awaitingPayment(o))
  const cancelAsks = orders.filter(o => o.status === 'Cancellation Requested')
  const toDispatch = orders.filter(o => o.status === 'Packed')
  const failed = orders.filter(o => o.status === 'Failed Delivery')
  const cashToRecord = orders.filter(o => o.status === 'Delivered' && o.paymentStatus === 'Pending Collection')
  const nothing =
    !toCheck.length &&
    !toConfirm.length &&
    !cancelAsks.length &&
    !toDispatch.length &&
    !failed.length &&
    !cashToRecord.length

  const confirm = (o: AdminOrder) => {
    updateOrder(o.number, { status: 'Confirmed' }, 'Order confirmed with the customer')
    doneWithUndo(`${o.number} confirmed`, () =>
      updateOrder(o.number, { status: 'Pending Confirmation' }, 'Confirmation undone'),
    )
  }

  return (
    <section className={`${card} mt-8 p-5 sm:p-6`} aria-labelledby="today-h">
      <h2 id="today-h" className="text-2xl">
        Today
      </h2>
      {nothing ? (
        <p className="mt-2 text-umber">All caught up. New orders will appear here.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {toCheck.length > 0 && (
            <Group
              title={`Easypaisa payments to check (${toCheck.length})`}
              hint="Find each payment in your Easypaisa app, then approve or reject it on the order."
            >
              {toCheck.map(o => (
                <Row key={o.number} order={o} action="Check payment" />
              ))}
            </Group>
          )}

          {toConfirm.length > 0 && (
            <Group
              title={`Call to confirm (${toConfirm.length})`}
              hint="Check the order with the customer, then press Confirmed."
            >
              {toConfirm.map(o => (
                <li key={o.number} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <Who order={o} />
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={whatsappLink(
                        o.customer.phone,
                        `Assalam o alaikum ${o.customer.name.split(' ')[0]}, this is ${settings.name}. We received your order ${o.number} for ${formatPKR(o.total)}${o.paymentMethod === 'Easypaisa' ? ', and your Easypaisa payment has reached us' : ', cash on delivery'}. Shall we send it?`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline min-h-10 px-3 text-sm"
                      aria-label={`WhatsApp ${o.customer.name}`}
                    >
                      <FaWhatsapp size={16} /> WhatsApp
                    </a>
                    <a
                      href={`tel:${o.customer.phone}`}
                      className="btn-outline min-h-10 px-3 text-sm"
                      aria-label={`Call ${o.customer.name}`}
                    >
                      <Phone size={15} /> Call
                    </a>
                    <button type="button" onClick={() => confirm(o)} className="btn-primary min-h-10 px-4 text-sm">
                      <Check size={15} /> Confirmed
                    </button>
                  </div>
                </li>
              ))}
            </Group>
          )}

          {cancelAsks.length > 0 && (
            <Group
              title={`Asked to cancel (${cancelAsks.length})`}
              hint="Open the order to approve the cancellation or keep it."
            >
              {cancelAsks.map(o => (
                <Row key={o.number} order={o} action="Decide" />
              ))}
            </Group>
          )}

          {toDispatch.length > 0 && (
            <Group
              title={`Packed, ready to send (${toDispatch.length})`}
              hint="Book the courier, then add the tracking ID on the order."
            >
              {toDispatch.map(o => (
                <Row key={o.number} order={o} action="Add tracking ID" />
              ))}
            </Group>
          )}

          {failed.length > 0 && (
            <Group
              title={`Delivery failed (${failed.length})`}
              hint="Call the customer, then send it again or mark it returned."
            >
              {failed.map(o => (
                <Row key={o.number} order={o} action="Open" />
              ))}
            </Group>
          )}

          {cashToRecord.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-wax/50 p-4">
              <p>
                <span className="font-medium">
                  {cashToRecord.length} delivered {cashToRecord.length === 1 ? 'order' : 'orders'}
                </span>{' '}
                <span className="text-umber">
                  worth {formatPKR(cashToRecord.reduce((t, o) => t + o.total, 0))} with the cash not recorded yet.
                </span>
              </p>
              <Link href="/admin/payments" className="btn-outline min-h-10 px-4 text-sm">
                Record cash
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-base font-semibold">{title}</h3>
      <p className="text-sm text-umber">{hint}</p>
      <ul className="mt-1 divide-y divide-hairline">{children}</ul>
    </div>
  )
}

function Who({ order }: { order: AdminOrder }) {
  return (
    <Link href={`/admin/orders/${order.number}`} className="min-w-0 flex-1 basis-56 hover:text-caramel">
      <span className="font-medium">{order.customer.name}</span>{' '}
      <span className="text-umber">
        {order.customer.city}, {formatPKR(order.total)}
      </span>
      <span className="block text-sm text-umber">
        {order.number}, {dateTime(order.placedAt)}
      </span>
    </Link>
  )
}

function Row({ order, action }: { order: AdminOrder; action: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Who order={order} />
      <Link href={`/admin/orders/${order.number}`} className="btn-outline min-h-10 px-4 text-sm">
        {action}
      </Link>
    </li>
  )
}
