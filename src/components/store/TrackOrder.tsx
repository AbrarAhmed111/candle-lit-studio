'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OrderDetails from './OrderDetails'
import { findOrder } from '@/lib/orders'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { trackOrder } from '@/lib/actions/store'
import { normalisePkMobile } from '@/lib/pricing'
import type { Order } from '@/types'

export default function TrackOrder() {
  const params = useSearchParams()
  const [number, setNumber] = useState(params.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setOrder(null)
    const mobile = normalisePkMobile(phone)
    if (!number.trim()) return setError('Enter your order number. It looks like CND-1024.')
    if (!mobile) return setError('Enter the mobile number you used at checkout, like 0300 1234567.')
    let found: Order | null
    if (isSupabaseConfigured) {
      setBusy(true)
      const result = await trackOrder(number, mobile)
      setBusy(false)
      if (!result.ok) return setError(result.error)
      found = result.data
    } else {
      found = findOrder(number, mobile)
    }
    if (!found)
      return setError('No order matches that number and mobile. Check both against your confirmation message.')
    setError(null)
    setOrder(found)
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="max-w-2xl">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
        <button type="submit" disabled={busy} className="btn-primary mt-6">
          {busy ? 'Looking…' : 'Find my order'}
        </button>
      </form>

      {order && (
        <div className="mt-14">
          <OrderDetails order={order} />
        </div>
      )}
    </>
  )
}
