'use client'

import { FormEvent, useState } from 'react'
import clsx from 'clsx'
import { subscribeToNewsletter } from '@/lib/actions/store'

export default function NewsletterForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState('error')
    const result = await subscribeToNewsletter(email, 'Footer')
    if (!result.ok) return setState('error')
    setState('done')
  }

  if (state === 'done') {
    return (
      <p role="status" className={tone === 'dark' ? 'text-ember' : 'text-sage'}>
        Subscribed. New scents and offers will reach {email}.
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value)
            setState('idle')
          }}
          placeholder="Your email address"
          aria-label="Email address"
          aria-invalid={state === 'error'}
          className={clsx(
            'min-h-12 w-full min-w-0 rounded-xl border px-3.5 text-base focus:outline-none focus:ring-1 focus:ring-ember',
            tone === 'dark'
              ? 'border-wax/30 bg-transparent text-ivory placeholder:text-wax/50'
              : 'border-hairline bg-linen text-espresso placeholder:text-umber/60',
          )}
        />
        <button type="submit" className={tone === 'dark' ? 'btn-light shrink-0' : 'btn-primary shrink-0'}>
          Subscribe
        </button>
      </div>
      {state === 'error' && (
        <p className={clsx('mt-2 text-sm', tone === 'dark' ? 'text-ember' : 'text-wine')}>
          Enter an email address like name@example.com.
        </p>
      )}
    </form>
  )
}
