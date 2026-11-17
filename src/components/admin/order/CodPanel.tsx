'use client'

import { FormEvent, useState } from 'react'
import { useAdmin } from '../AdminData'
import { card, done, doneWithUndo, PaymentBadge } from '../ui'
import { Field } from './parts'
import { paymentFlow, type AdminOrder } from '@/data/admin'
import { formatPKR } from '@/lib/pricing'

const paymentHelp: Record<string, string> = {
  'Pending Collection': 'The courier has not collected the cash yet.',
  'Collected by Courier': 'The courier took the cash from the customer and owes it to you.',
  'Settled to Business': 'The money has reached your account.',
  'Reconciliation Required': 'The amounts do not match. Check with the courier.',
  Disputed: 'You and the courier disagree about this payment.',
  Adjusted: 'Settled with a correction, for example a short payment.',
}

/** Cash on delivery: what was collected and settled for this order */
export default function CodPanel({ order }: { order: AdminOrder }) {
  const { updateOrder } = useAdmin()
  const [more, setMore] = useState(false)
  const [status, setStatus] = useState(order.paymentStatus)
  const [collected, setCollected] = useState(order.cod?.collected !== undefined ? String(order.cod.collected) : '')
  const [charges, setCharges] = useState(order.cod?.charges ? String(order.cod.charges) : '')
  const [reference, setReference] = useState(order.cod?.reference ?? '')
  const [notes, setNotes] = useState(order.cod?.notes ?? '')
  const [error, setError] = useState('')
  const delivered = order.status === 'Delivered'
  const nothing = order.status === 'Cancelled' || order.status === 'Returned'
  const net = (collected === '' ? order.total : Number(collected)) - (Number(charges) || 0)

  const quick = (to: AdminOrder['paymentStatus'], event: string) => {
    const before = order.paymentStatus
    updateOrder(order.number, { paymentStatus: to }, event)
    doneWithUndo(`${order.number}: ${to}`, () =>
      updateOrder(order.number, { paymentStatus: before }, `Undone: payment back to ${before}`),
    )
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    const amount = collected.trim() === '' ? undefined : Number(collected)
    const fee = charges.trim() === '' ? 0 : Number(charges)
    if ((amount !== undefined && (!Number.isInteger(amount) || amount < 0)) || !Number.isInteger(fee) || fee < 0)
      return setError('Enter amounts in whole rupees.')
    const settled = status === 'Settled to Business' || status === 'Adjusted'
    updateOrder(
      order.number,
      {
        paymentStatus: status,
        cod: {
          collected: amount,
          charges: fee,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          settledAt: settled ? (order.cod?.settledAt ?? new Date().toISOString()) : order.cod?.settledAt,
        },
      },
      [
        `Payment updated: ${status}`,
        amount !== undefined && amount !== order.total ? `${formatPKR(amount)} collected` : '',
        fee ? `courier charges ${formatPKR(fee)}` : '',
        reference.trim() ? `reference ${reference.trim()}` : '',
      ]
        .filter(Boolean)
        .join(', '),
    )
    done(`${order.number}: payment details saved`)
    setMore(false)
  }

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="pay-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pay-h" className="text-2xl">
          Cash on delivery
        </h2>
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p className="mt-3 text-umber">
        {nothing
          ? 'Nothing to collect for this order.'
          : !delivered
            ? `The courier collects ${formatPKR(order.total)} at the door. Record it once the order is delivered.`
            : paymentHelp[order.paymentStatus]}
      </p>
      {order.cod && (order.cod.collected !== undefined || order.cod.charges > 0 || order.cod.reference) && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Collected" value={formatPKR(order.cod.collected ?? order.total)} />
          <Field label="Courier charges" value={formatPKR(order.cod.charges)} />
          <Field label="You receive" value={formatPKR((order.cod.collected ?? order.total) - order.cod.charges)} />
          <Field label="Reference" value={order.cod.reference ?? '-'} />
        </dl>
      )}
      {delivered && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.paymentStatus === 'Pending Collection' && (
            <button
              type="button"
              onClick={() => quick('Collected by Courier', 'COD recorded as collected by the courier')}
              className="btn-primary"
            >
              Courier collected the cash
            </button>
          )}
          {order.paymentStatus === 'Collected by Courier' && (
            <button
              type="button"
              onClick={() => quick('Settled to Business', 'COD settlement received from the courier')}
              className="btn-primary"
            >
              Money reached my account
            </button>
          )}
          <button type="button" onClick={() => setMore(m => !m)} className="btn-outline">
            {more ? 'Close' : 'Amounts, charges or a problem'}
          </button>
        </div>
      )}
      {more && (
        <form
          onSubmit={save}
          noValidate
          className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-hairline p-4 sm:grid-cols-2"
        >
          <label className="field-label mb-0 sm:col-span-2">
            Payment status
            <select
              value={status}
              onChange={e => setStatus(e.target.value as AdminOrder['paymentStatus'])}
              className="field mt-1.5"
            >
              {paymentFlow.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <span className="mt-1 block text-sm font-normal text-umber">{paymentHelp[status]}</span>
          </label>
          <label className="field-label mb-0">
            Cash collected (Rs.)
            <input
              inputMode="numeric"
              value={collected}
              onChange={e => {
                setCollected(e.target.value)
                setError('')
              }}
              placeholder={String(order.total)}
              className="field mt-1.5"
            />
          </label>
          <label className="field-label mb-0">
            Courier charges (Rs.)
            <input
              inputMode="numeric"
              value={charges}
              onChange={e => {
                setCharges(e.target.value)
                setError('')
              }}
              placeholder="0"
              className="field mt-1.5"
            />
          </label>
          <label className="field-label mb-0">
            Settlement reference
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Bank or courier reference"
              className="field mt-1.5"
            />
          </label>
          <label className="field-label mb-0">
            Note
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="For example: Rs. 200 short"
              className="field mt-1.5"
            />
          </label>
          <p className="text-sm text-umber sm:col-span-2">You receive {formatPKR(Math.max(0, net))} for this order.</p>
          {error && <p className="field-error sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary sm:col-span-2">
            Save payment details
          </button>
        </form>
      )}
    </section>
  )
}
