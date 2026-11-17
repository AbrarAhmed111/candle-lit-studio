'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { submitReview } from '@/lib/actions/store'

/** Signed-in customers write a review. It waits for the owner's approval. */
export default function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'signin'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rating) return setError('Choose a star rating.')
    if (title.trim().length < 3) return setError('Give your review a short title.')
    if (body.trim().length < 10) return setError('Tell other customers a little more, at least 10 characters.')
    setError(null)
    setState('sending')
    const result = await submitReview({ productId, rating, title, body, city })
    if (!result.ok) {
      if (result.error === 'Please sign in first.') return setState('signin')
      setState('idle')
      return setError(result.error)
    }
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <p role="status" className="mt-6 rounded-xl border border-sage/40 bg-linen p-4 text-sm">
        Thank you. Your review is with us and appears here once it is approved.
      </p>
    )
  }

  if (state === 'signin') {
    return (
      <p role="status" className="mt-6 text-sm text-umber">
        Please{' '}
        <Link href={`/signin?returnUrl=${encodeURIComponent(`${location.pathname}#reviews`)}`} className="link text-espresso">
          sign in
        </Link>{' '}
        to review {productName}.
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline mt-6 min-h-11 px-5 text-sm">
        Write a review
      </button>
    )
  }

  const shown = hover || rating
  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-4">
      <fieldset>
        <legend className="field-label">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className="grid h-10 w-10 place-items-center"
            >
              <Star size={24} className={clsx(n <= shown ? 'fill-ember text-ember' : 'text-hairline')} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-title" className="field-label">
          Title
        </label>
        <input id="review-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} className="field" />
      </div>
      <div>
        <label htmlFor="review-body" className="field-label">
          Review
        </label>
        <textarea id="review-body" rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={1500} className="field py-3" />
      </div>
      <div>
        <label htmlFor="review-city" className="field-label">
          City <span className="font-normal text-umber">(optional)</span>
        </label>
        <input id="review-city" value={city} onChange={e => setCity(e.target.value)} maxLength={40} className="field" />
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state === 'sending'} className="btn-primary">
          {state === 'sending' ? 'Sending…' : 'Send review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          Cancel
        </button>
      </div>
      {!isSupabaseConfigured && <p className="text-sm text-umber">Demo: reviews are not saved yet.</p>}
    </form>
  )
}
