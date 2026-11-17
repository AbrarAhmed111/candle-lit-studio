'use client'

import { FormEvent, useState } from 'react'
import { ExternalLink, ImageIcon } from 'lucide-react'
import { useAdmin } from '../AdminData'
import { card, dateTime, done, PaymentBadge } from '../ui'
import { Field } from './parts'
import { adminPaymentProof } from '@/lib/actions/admin'
import { formatPKR } from '@/lib/pricing'
import type { AdminOrder } from '@/data/admin'

// Ready-made reasons, so a rejection takes one tap
const reasons = [
  'We have not received this payment in our Easypaisa account.',
  'The amount received is less than the order total.',
  'The transaction ID does not match the screenshot.',
  'The screenshot is not clear enough to read.',
]

const help: Record<string, string> = {
  'Pending Verification':
    'Open your Easypaisa app and look for this transaction ID and amount. Approve it once you see the money.',
  Paid: 'The payment reached your account. You can confirm and prepare the order.',
  'Payment Rejected': 'The customer was emailed the reason and can send new details from their order page.',
}

/** Easypaisa: check the transfer against your account, then approve or reject it */
export default function EasypaisaPanel({ order }: { order: AdminOrder }) {
  const { reviewPayment, live } = useAdmin()
  const [shot, setShot] = useState<string | null>(null)
  const [shotError, setShotError] = useState('')
  const [loadingShot, setLoadingShot] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const closed = ['Dispatched', 'Delivered', 'Failed Delivery', 'Returned', 'Cancelled'].includes(order.status)

  const openShot = async () => {
    if (!order.payment?.proof || !live) return setShotError('There is no screenshot for this order.')
    setLoadingShot(true)
    const result = await adminPaymentProof(order.payment.proof)
    setLoadingShot(false)
    if (!result.ok) return setShotError(result.error)
    setShot(result.data)
  }

  const approve = () => {
    reviewPayment(order.number, true)
    done(`${order.number}: payment approved`)
  }

  const reject = (e: FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 5) return setError('Tell the customer what went wrong, so they can fix it.')
    reviewPayment(order.number, false, reason.trim())
    done(`${order.number}: payment rejected, customer told why`)
    setRejecting(false)
    setReason('')
  }

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="pay-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pay-h" className="text-2xl">
          Easypaisa payment
        </h2>
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p className="mt-3 text-umber">{help[order.paymentStatus]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Field label="Amount due" value={formatPKR(order.total)} />
        <Field label="Transaction ID" value={order.payment?.reference ?? '-'} />
        <Field label="Sent" value={order.payment?.submittedAt ? dateTime(order.payment.submittedAt) : '-'} />
      </dl>
      {order.paymentStatus === 'Payment Rejected' && order.payment?.rejectionReason && (
        <p className="mt-3 rounded-xl bg-wine/5 p-3 text-sm text-wine">Reason given: {order.payment.rejectionReason}</p>
      )}

      <div className="mt-4">
        {shot ? (
          <a href={shot} target="_blank" rel="noreferrer" className="block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private link */}
            <img
              src={shot}
              alt={`Payment screenshot for ${order.number}`}
              className="max-h-96 rounded-xl border border-hairline"
            />
            <span className="mt-1 inline-flex items-center gap-1 text-sm text-umber">
              Open full size <ExternalLink size={13} />
            </span>
          </a>
        ) : (
          <button type="button" onClick={openShot} disabled={loadingShot} className="btn-outline min-h-11 px-4 text-sm">
            <ImageIcon size={16} /> {loadingShot ? 'Opening…' : 'View payment screenshot'}
          </button>
        )}
        {shotError && <p className="field-error">{shotError}</p>}
      </div>

      {!closed && (
        <div className="mt-5 flex flex-wrap gap-2">
          {order.paymentStatus !== 'Paid' && (
            <button type="button" onClick={approve} className="btn-primary">
              Money received, approve
            </button>
          )}
          {order.paymentStatus !== 'Payment Rejected' && (
            <button type="button" onClick={() => setRejecting(r => !r)} className="btn-outline">
              {rejecting ? 'Close' : 'Reject payment'}
            </button>
          )}
        </div>
      )}

      {rejecting && (
        <form onSubmit={reject} noValidate className="mt-4 rounded-2xl border border-hairline p-4">
          <fieldset>
            <legend className="field-label">Why? The customer sees this in their email.</legend>
            <div className="flex flex-wrap gap-2">
              {reasons.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r)
                    setError('')
                  }}
                  className="rounded-full border border-hairline px-3 py-2 text-left text-sm hover:border-espresso"
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="reject-reason" className="sr-only">
            Reason
          </label>
          <textarea
            id="reject-reason"
            rows={2}
            value={reason}
            onChange={e => {
              setReason(e.target.value)
              setError('')
            }}
            placeholder="Or write your own reason"
            className="field mt-3 py-3"
          />
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn mt-3 bg-wine text-ivory before:bg-espresso">
            Reject and tell the customer
          </button>
        </form>
      )}
    </section>
  )
}
