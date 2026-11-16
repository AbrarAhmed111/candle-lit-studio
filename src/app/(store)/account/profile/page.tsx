'use client'

import { FormEvent, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAccount } from '@/components/account/useAccount'
import { normalisePkMobile } from '@/lib/pricing'

export default function AccountProfile() {
  const { account, update, ready } = useAccount()
  const [values, setValues] = useState(account.profile)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})

  // Saved details arrive after the first render
  useEffect(() => {
    if (ready) setValues(account.profile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: typeof errors = {}
    const phone = normalisePkMobile(values.phone)
    if (values.name.trim().length < 3) found.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) found.email = 'Enter an email address like name@example.com.'
    if (!phone) found.phone = 'Enter a Pakistani mobile number like 0300 1234567.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    update(a => ({ ...a, profile: { name: values.name.trim(), email: values.email.trim(), phone: phone! } }))
    toast.success('Profile saved')
  }

  const bind = (key: keyof typeof values) => ({
    id: `profile-${key}`,
    value: values[key],
    'aria-invalid': !!errors[key],
    className: 'field',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined }))
    },
  })

  const setPref = (key: 'newsletter' | 'whatsapp', on: boolean) => {
    update(a => ({ ...a, prefs: { ...a.prefs, [key]: on } }))
    toast.success(on ? 'Turned on' : 'Turned off')
  }

  const prefs = [
    {
      key: 'newsletter' as const,
      title: 'Email newsletter',
      text: 'New scents, seasonal pours and offers. About twice a month.',
    },
    {
      key: 'whatsapp' as const,
      title: 'WhatsApp order updates',
      text: 'Confirmation, dispatch and delivery messages for your orders.',
    },
  ]

  return (
    <>
      <h1 className="text-5xl lg:text-6xl">Profile and preferences</h1>
      <p className="mt-3 text-lg text-umber">The details we use to reach you about your orders.</p>

      <form onSubmit={submit} noValidate className="mt-8 max-w-xl rounded-2xl border border-hairline bg-linen p-6 sm:p-8">
        <h2 className="text-2xl">Your details</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="profile-name" className="field-label">
              Full name
            </label>
            <input {...bind('name')} autoComplete="name" />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="profile-email" className="field-label">
              Email
            </label>
            <input {...bind('email')} type="email" autoComplete="email" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="profile-phone" className="field-label">
              Mobile number
            </label>
            <input {...bind('phone')} type="tel" inputMode="tel" autoComplete="tel" />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
        </div>
        <button type="submit" className="btn-primary mt-6">
          Save profile
        </button>
      </form>

      <section className="mt-6 max-w-xl rounded-2xl border border-hairline bg-linen p-6 sm:p-8" aria-labelledby="prefs-h">
        <h2 id="prefs-h" className="text-2xl">
          Messages from us
        </h2>
        <ul className="mt-3 divide-y divide-hairline">
          {prefs.map(p => {
            const on = account.prefs[p.key]
            return (
              <li key={p.key} className="flex items-center justify-between gap-6 py-4">
                <div>
                  <p id={`pref-${p.key}`} className="font-medium">
                    {p.title}
                  </p>
                  <p className="text-sm text-umber">{p.text}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`pref-${p.key}`}
                  onClick={() => setPref(p.key, !on)}
                  className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-sage' : 'bg-hairline')}
                >
                  <span
                    className={clsx(
                      'absolute left-1 top-1 h-5 w-5 rounded-full bg-linen transition-transform',
                      on && 'translate-x-5',
                    )}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
