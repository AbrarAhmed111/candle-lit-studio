export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

export const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data })
export const fail = (error: string): ActionResult<never> => ({ ok: false, error })

/** Shown when an action runs before Supabase is connected */
export const NOT_CONNECTED = 'The store database is not connected yet.'

/** Turns a database error into a sentence a customer can act on */
export const friendly = (message: string | undefined) => {
  const m = message ?? ''
  if (m.startsWith('OUT_OF_STOCK:')) return `Sorry, ${m.slice(13).trim()} has just sold out in the amount you chose. Lower the quantity and try again.`
  if (m.startsWith('UNAVAILABLE:')) return `${m.slice(12).trim()} is no longer available. Remove it from your cart and try again.`
  if (m.startsWith('COUPON:')) return m.slice(7).trim()
  if (m.startsWith('INVALID:')) return 'Some details are missing or not valid. Check the form and try again.'
  if (m.startsWith('SIGN_IN')) return 'Please sign in first.'
  if (m.startsWith('RATE_LIMIT')) return 'Too many tries in a short time. Please wait a few minutes and try again.'
  if (m.startsWith('DUPLICATE')) return 'You have already reviewed this candle. Thank you!'
  if (m.startsWith('FORBIDDEN') || /row-level security|permission denied/i.test(m))
    return 'Your account is not allowed to do that. Ask the store administrator for access.'
  return 'Something went wrong on our side. Please try again in a moment.'
}
