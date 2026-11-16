'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState(false)
  const router = useRouter()
  const isSignup = mode === 'signup'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (isSignup && values.name.trim().length < 3) found.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      found.email = 'Enter an email address like name@example.com.'
    if (values.password.length < 8) found.password = 'Use at least 8 characters.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // Demo: there is no auth backend yet, so a valid form opens the sample account
    setNotice(true)
    router.push('/account')
  }

  const bind = (key: keyof typeof values) => ({
    id: key,
    name: key,
    value: values[key],
    'aria-invalid': !!errors[key],
    className: 'field',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: '' }))
      setNotice(false)
    },
  })

  return (
    <div className="page flex justify-center py-14 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-5xl italic">{isSignup ? 'Create an account' : 'Welcome back'}</h1>
        <p className="mt-3 text-umber">
          {isSignup
            ? 'Save your addresses, see past orders and reorder in two taps.'
            : 'Sign in to see your orders, addresses and wishlist.'}
        </p>

        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          {isSignup && (
            <div>
              <label htmlFor="name" className="field-label">
                Full name
              </label>
              <input {...bind('name')} autoComplete="name" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input {...bind('email')} type="email" autoComplete="email" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              {!isSignup && (
                <Link href="/contact" className="link text-sm">
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              {...bind('password')}
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" className="btn-primary w-full">
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
          {notice && (
            <p role="status" className="rounded-xl border border-hairline bg-linen p-4 text-sm text-umber">
              Opening the demo account…
            </p>
          )}
        </form>

        <p className="mt-8 border-t border-hairline pt-6 text-umber">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link href={isSignup ? '/signin' : '/signup'} className="link text-espresso">
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
          . You can always check out as a guest.
        </p>
      </div>
    </div>
  )
}
