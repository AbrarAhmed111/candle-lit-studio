'use client'

import { FormEvent, useState } from 'react'
import { useAdmin } from './AdminData'
import { card, done } from './ui'
import { normalisePkMobile } from '@/lib/pricing'

/** The Easypaisa account customers pay into. Checkout stays closed until it is filled in. */
export default function EasypaisaAccount() {
  const { settings, setShop } = useAdmin()
  const [name, setName] = useState(settings.easypaisaName)
  const [number, setNumber] = useState(settings.easypaisaNumber)
  const [error, setError] = useState('')
  const changed = name !== settings.easypaisaName || number !== settings.easypaisaNumber

  const save = (e: FormEvent) => {
    e.preventDefault()
    const mobile = normalisePkMobile(number)
    if (name.trim().length < 3) return setError('Enter the account holder name exactly as Easypaisa shows it.')
    if (!mobile) return setError('Enter the Easypaisa mobile number, like 0300 1234567.')
    setShop('settings', s => ({ ...s, easypaisaName: name.trim(), easypaisaNumber: mobile }))
    setNumber(mobile)
    done('Easypaisa account saved')
    setError('')
  }

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="easypaisa-h">
      <h2 id="easypaisa-h" className="text-2xl">
        Easypaisa account
      </h2>
      <p className="mt-1 text-umber">
        Customers send their payment here. They see this name and number at checkout, with the exact amount to send.
      </p>
      {!settings.easypaisaNumber && (
        <p role="alert" className="mt-3 rounded-xl bg-wine/5 p-3 text-sm text-wine">
          Customers cannot place orders until you add your Easypaisa number.
        </p>
      )}
      <form onSubmit={save} noValidate className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label mb-0">
          Account holder name
          <input
            value={name}
            onChange={e => {
              setName(e.target.value)
              setError('')
            }}
            autoComplete="off"
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Easypaisa mobile number
          <input
            value={number}
            inputMode="tel"
            placeholder="0300 1234567"
            onChange={e => {
              setNumber(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
        {error && <p className="field-error sm:col-span-2">{error}</p>}
        <button type="submit" disabled={!changed} className="btn-primary sm:col-span-2">
          {changed ? 'Save' : 'All saved'}
        </button>
      </form>
    </section>
  )
}
