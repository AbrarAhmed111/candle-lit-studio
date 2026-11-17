'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { orderAccess } from '@/lib/orders'
import { requestCancellation } from '@/lib/actions/store'
import type { Order } from '@/types'

const cancellable = ['Pending Confirmation', 'Confirmed', 'Processing']

/** Lets a customer ask to cancel before the order is packed */
export default function CancelRequest({ order }: { order: Order }) {
  const token = useSearchParams().get('t')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (state === 'sent' || order.status === 'Cancellation Requested') {
    return (
      <p role="status" className="mt-6 rounded-xl border border-hairline bg-linen p-4 text-[0.95rem]">
        Your cancellation request is with us. We will confirm it by phone or WhatsApp.
      </p>
    )
  }
  if (!cancellable.includes(order.status)) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('sending')
    const result = await requestCancellation(
      order.number,
      order.customer.phone,
      reason,
      token ?? orderAccess(order.number),
    )
    if (!result.ok) {
      setState('idle')
      return setError(result.error)
    }
    setState('sent')
  }

  return open ? (
    <form onSubmit={submit} className="mt-6 rounded-xl border border-hairline p-4">
      <label htmlFor="cancel-reason" className="field-label">
        Why do you want to cancel? <span className="font-normal text-umber">(optional)</span>
      </label>
      <textarea
        id="cancel-reason"
        rows={2}
        value={reason}
        onChange={e => setReason(e.target.value)}
        maxLength={400}
        className="field py-3"
      />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={state === 'sending'} className="btn-primary min-h-11 px-5 text-sm">
          {state === 'sending' ? 'Sending…' : 'Ask to cancel'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline min-h-11 px-5 text-sm">
          Keep my order
        </button>
      </div>
    </form>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="link mt-6 min-h-11 text-sm text-umber">
      Need to cancel this order?
    </button>
  )
}
