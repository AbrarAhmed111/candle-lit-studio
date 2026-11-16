'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OrderDetails from './OrderDetails'
import { findOrder } from '@/lib/orders'
import { normalisePkMobile } from '@/lib/pricing'
import type { Order } from '@/types'

export default function TrackOrder() {
  const params = useSearchParams()
  const [number, setNumber] = useState(params.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setOrder(null)
    const mobile = normalisePkMobile(phone)
    if (!number.trim()) return setError('Enter your order number. It looks like CND-1024.')
    if (!mobile) return setError('Enter the mobile number you used at checkout, like 0300 1234567.')
    const found = findOrder(number, mobile)
    if (!found)
      return setError(
        'No order matches that number and mobile. Check both against your confirmation message.',
      )
    setError(null)
    setOrder(found)
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="max-w-2xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="order-number" className="field-label">
              Order number
            </label>
            <input
              id="order-number"
              value={number}
              onChange={e => setNumber(e.target.value.toUpperCase())}
              placeholder="CND-1024"
              autoComplete="off"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="order-phone" className="field-label">
              Mobile number
            </label>
            <input
              id="order-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0300 1234567"
              autoComplete="tel"
              className="field"
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary mt-6">
          Find my order
        </button>
        <p className="mt-4 text-sm text-umber">
          Demo order: CND-1024 with 0300 1234567.
        </p>
      </form>

      {order && (
        <div className="mt-14">
          <OrderDetails order={order} />
        </div>
      )}
    </>
  )
}
