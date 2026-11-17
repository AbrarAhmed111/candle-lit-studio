'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { orderAccess } from '@/lib/orders'
import { resubmitPayment } from '@/lib/actions/store'
import { validReference } from '@/lib/payments'
import EasypaisaPayment, { type PaymentErrors } from './EasypaisaPayment'
import type { Order } from '@/types'

/**
 * What is happening with an Easypaisa payment. After a rejection the
 * customer reads why and sends a new transaction ID and screenshot here.
 */
export default function PaymentStatus({ order }: { order: Order }) {
  const token = useSearchParams().get('t')
  const [reference, setReference] = useState('')
  const [proof, setProof] = useState<string | null>(null)
  const [errors, setErrors] = useState<PaymentErrors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (order.paymentMethod !== 'Easypaisa' || order.status === 'Cancelled') return null

  if (state === 'sent' || order.paymentStatus === 'Pending Verification') {
    return (
      <p role="status" className="mt-6 rounded-xl border border-hairline bg-linen p-4 text-[0.95rem]">
        {state === 'sent' ? 'Thank you. ' : ''}We are checking your Easypaisa payment
        {order.payment?.reference && state !== 'sent' ? ` (transaction ID ${order.payment.reference})` : ''}. We will
        confirm your order as soon as it reaches us, usually within a few hours.
      </p>
    )
  }
  if (order.paymentStatus !== 'Payment Rejected') return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found: PaymentErrors = {}
    if (!validReference(reference)) found.reference = 'Enter the transaction ID from your Easypaisa receipt.'
    if (!proof) found.proof = 'Add a screenshot of your payment.'
    setErrors(found)
    if (found.reference || found.proof) return
    setState('sending')
    setError(null)
    const result = await resubmitPayment({
      number: order.number,
      phone: order.customer.phone,
      token: token ?? orderAccess(order.number),
      reference,
      proof: proof!,
    })
    if (!result.ok) {
      setState('idle')
      return setError(result.error)
    }
    setState('sent')
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 rounded-xl border border-wine/30 bg-wine/5 p-5">
      <p className="font-medium text-wine">We could not confirm your Easypaisa payment</p>
      <p className="mt-1 text-umber">
        {order.payment?.rejectionReason ?? 'The payment did not match our account.'} Your order is on hold until the
        payment is confirmed. Send the correct details below. If you have not paid yet, send the amount first.
      </p>
      <div className="mt-5">
        <EasypaisaPayment
          amount={order.total}
          reference={reference}
          onReference={value => {
            setReference(value)
            setErrors(e => ({ ...e, reference: undefined }))
          }}
          proof={proof}
          onProof={path => {
            setProof(path)
            if (path) setErrors(e => ({ ...e, proof: undefined }))
          }}
          errors={errors}
        />
      </div>
      {error && (
        <p role="alert" className="field-error mt-3">
          {error}
        </p>
      )}
      <button type="submit" disabled={state === 'sending'} className="btn-primary mt-4">
        {state === 'sending' ? 'Sending…' : 'Send payment details'}
      </button>
    </form>
  )
}
