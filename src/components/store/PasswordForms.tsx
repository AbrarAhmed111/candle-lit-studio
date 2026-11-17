'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { requestPasswordReset, updatePassword } from '@/lib/actions/auth'

function Shell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="page flex justify-center py-14 lg:py-20">
      <div className="w-full max-w-md">
        <Logo size={72} withName={false} className="mb-6" />
        <h1 className="text-5xl italic">{title}</h1>
        <p className="mt-3 text-umber">{text}</p>
        {children}
      </div>
    </div>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('sending')
    const result = await requestPasswordReset(email)
    if (!result.ok) {
      setState('idle')
      return setError(result.error)
    }
    setState('sent')
  }

  return (
    <Shell title="Forgot your password?" text="Enter the email you signed up with and we will send you a link to choose a new one.">
      {state === 'sent' ? (
        <p role="status" className="mt-8 rounded-xl border border-sage/40 bg-linen p-4">
          If {email} has an account, a reset link is on its way. Check spam or promotions if it does not arrive in a
          few minutes.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              className="field"
            />
            {error && <p className="field-error">{error}</p>}
          </div>
          <button type="submit" disabled={state === 'sending'} className="btn-primary w-full">
            {state === 'sending' ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-8 border-t border-hairline pt-6 text-umber">
        Remembered it?{' '}
        <Link href="/signin" className="link text-espresso">
          Sign in
        </Link>
        . Signed up with Google? Use Continue with Google instead.
      </p>
    </Shell>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    const result = await updatePassword(password)
    setBusy(false)
    if (!result.ok) return setError(result.error)
    router.replace('/account')
    router.refresh()
  }

  return (
    <Shell title="Choose a new password" text="Use at least 8 characters. You will stay signed in on this device.">
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="field-label">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              setError(null)
            }}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="field-label">
            Type it again
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => {
              setConfirm(e.target.value)
              setError(null)
            }}
            aria-invalid={!!error}
            className="field"
          />
          {error && (
            <p role="alert" className="field-error">
              {error}{' '}
              {error.includes('expired') && (
                <Link href="/forgot-password" className="link">
                  Get a new link
                </Link>
              )}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </Shell>
  )
}
