'use client'

import Link from 'next/link'
import { FormEvent, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import Logo from '@/components/Logo'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/actions/auth'

export default function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googling, startGoogle] = useTransition()
  const router = useRouter()
  const params = useSearchParams()
  const returnUrl = params.get('returnUrl') ?? '/account'
  const isSignup = mode === 'signup'
  const callbackFailed = params.get('error') === 'auth'

  const google = () =>
    startGoogle(async () => {
      if (!isSupabaseConfigured) {
        // Demo: there is no auth backend yet, so open the sample account
        router.push('/account')
        return
      }
      const result = await signInWithGoogle(returnUrl)
      // On success the browser is already on its way to Google
      if (result && !result.ok) setFailure(result.error)
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (isSignup && values.name.trim().length < 3) found.name = 'Enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      found.email = 'Enter an email address like name@example.com.'
    if (values.password.length < 8) found.password = 'Use at least 8 characters.'
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length > 0) return

    if (!isSupabaseConfigured) {
      setNotice('Opening the demo account…')
      router.push('/account')
      return
    }

    setBusy(true)
    if (isSignup) {
      const result = await signUpWithEmail(values.name, values.email, values.password)
      setBusy(false)
      if (!result.ok) return setFailure(result.error)
      if (result.data.confirm) {
        setNotice(`We sent a link to ${values.email}. Open it to finish creating your account.`)
        return
      }
    } else {
      const result = await signInWithEmail(values.email, values.password)
      setBusy(false)
      if (!result.ok) return setFailure(result.error)
    }
    router.replace(returnUrl.startsWith('/') ? returnUrl : '/account')
    router.refresh()
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
      setNotice(null)
      setFailure(null)
    },
  })

  return (
    <div className="page flex justify-center py-14 lg:py-20">
      <div className="w-full max-w-md">
        <Logo size={72} withName={false} className="mb-6" />
        <h1 className="text-5xl italic">{isSignup ? 'Create an account' : 'Welcome back'}</h1>
        <p className="mt-3 text-umber">
          {isSignup
            ? 'Save your addresses, see past orders and reorder in two taps.'
            : 'Sign in to see your orders, addresses and wishlist.'}
        </p>

        {(failure || callbackFailed) && (
          <p role="alert" className="mt-6 rounded-xl border border-wine/30 bg-wine/5 p-4 text-sm text-wine">
            {failure ?? 'Sign-in did not finish. Please try again.'}
          </p>
        )}

        <button
          type="button"
          onClick={google}
          disabled={googling}
          className="btn-outline mt-8 w-full gap-3 bg-linen"
        >
          <FcGoogle size={20} aria-hidden />
          {googling ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <p className="my-6 flex items-center gap-4 text-sm text-umber before:h-px before:flex-1 before:bg-hairline after:h-px after:flex-1 after:bg-hairline">
          or use your email
        </p>

        <form onSubmit={submit} noValidate className="space-y-5">
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

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
          {notice && (
            <p role="status" className="rounded-xl border border-hairline bg-linen p-4 text-sm text-umber">
              {notice}
            </p>
          )}
        </form>

        <p className="mt-8 border-t border-hairline pt-6 text-umber">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link
            href={`${isSignup ? '/signin' : '/signup'}${returnUrl !== '/account' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
            className="link text-espresso"
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
          . You can always check out as a guest.
        </p>
      </div>
    </div>
  )
}
