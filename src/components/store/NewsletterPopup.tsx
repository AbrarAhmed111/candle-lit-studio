'use client'

import { FormEvent, useEffect, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from './Modal'
import { subscribeToNewsletter } from '@/lib/actions/store'
import { photoUrl } from './ProductPhoto'

const DELAY_MS = 7000
const OFF_KEY = 'cls_newsletter_off' // never again on this device
const SEEN_KEY = 'cls_newsletter_seen' // once per browser session
const CODE = 'WELCOME10'
const PHOTO = '1643122966676-29e8597257f7'

// Nobody wants a popup while they are paying or reading their order
const quietPaths = ['/cart', '/checkout', '/order', '/signin', '/signup']

const interests = ['Scented candles', 'Gift sets', 'New scents', 'I want it all']

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

const read = (storage: 'localStorage' | 'sessionStorage', key: string) => {
  try {
    return window[storage].getItem(key)
  } catch {
    return null
  }
}

const write = (storage: 'localStorage' | 'sessionStorage', key: string) => {
  try {
    window[storage].setItem(key, '1')
  } catch {
    // storage blocked, the popup may show again
  }
}

export default function NewsletterPopup() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [interest, setInterest] = useState(interests[3])
  const [never, setNever] = useState(false)
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle')
  const [copied, setCopied] = useState(false)

  const quiet = quietPaths.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (quiet || read('localStorage', OFF_KEY) || read('sessionStorage', SEEN_KEY)) return
    const t = setTimeout(() => {
      // Wait for a quieter moment if another dialog or drawer is already open
      if (document.querySelector('[aria-modal="true"]')) return
      write('sessionStorage', SEEN_KEY)
      setOpen(true)
    }, DELAY_MS)
    return () => clearTimeout(t)
  }, [quiet, pathname])

  const close = () => {
    if (never || state === 'done') write('localStorage', OFF_KEY)
    setOpen(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState('error')
    const result = await subscribeToNewsletter(email, 'Popup')
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setState('done')
    write('localStorage', OFF_KEY)
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE)
      setCopied(true)
    } catch {
      toast.error(`Copy failed. Your code is ${CODE}.`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      label="Join the newsletter for 10% off"
      className="grid grid-cols-1 max-w-4xl overflow-hidden rounded-[2rem] bg-ivory shadow-2xl md:grid-cols-[0.9fr_1fr]"
    >
      <div className="relative h-32 overflow-hidden bg-wax sm:h-40 md:h-auto md:min-h-[34rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(PHOTO, 900)}
          alt="Three lit soy candles in amber and white jars"
          className="hero-photo absolute inset-0 h-full w-full object-cover"
        />
        <p className="absolute bottom-5 left-6 hidden font-display text-2xl italic text-white drop-shadow md:block">
          Hand-poured in Quetta
        </p>
      </div>

      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        {state === 'done' ? (
          <div className="my-auto" role="status">
            <h2 className="fade-up text-4xl italic lg:text-5xl">You are on the list.</h2>
            <p className="fade-up mt-4 text-umber" style={d(100)}>
              Use this code at checkout for 10% off your first order, up to Rs. 500.
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="fade-up mt-6 flex min-h-14 w-full items-center justify-between rounded-xl border border-dashed border-caramel bg-linen px-5"
              style={d(200)}
              aria-label={`Copy code ${CODE}`}
            >
              <span className="text-xl font-semibold tracking-[0.12em]">{CODE}</span>
              <span className="flex items-center gap-2 text-sm text-caramel">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy code'}
              </span>
            </button>
            <button type="button" onClick={close} className="btn-primary fade-up mt-4 w-full" style={d(300)}>
              Keep shopping
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="my-auto">
            <h2 className="fade-up pr-10 text-4xl italic lg:text-5xl" style={d(150)}>
              Unlock 10% off
            </h2>
            <p className="fade-up mt-4 text-umber" style={d(230)}>
              Join the list and take 10% off your first order. You will hear about new scents, seasonal pours and offers
              before anyone else.
            </p>

            <fieldset className="fade-up mt-6" style={d(310)}>
              <legend className="mb-2.5 text-sm font-medium">What do you want to hear about?</legend>
              <div className="flex flex-wrap gap-2">
                {interests.map(label => (
                  <label
                    key={label}
                    className={clsx(
                      'flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-caramel',
                      interest === label
                        ? 'border-espresso bg-espresso text-ivory'
                        : 'border-hairline hover:border-espresso',
                    )}
                  >
                    <input
                      type="radio"
                      name="interest"
                      className="sr-only"
                      checked={interest === label}
                      onChange={() => setInterest(label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="fade-up mt-6" style={d(390)}>
              <label htmlFor="popup-email" className="field-label">
                Email address
              </label>
              <input
                id="popup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setState('idle')
                }}
                placeholder="name@example.com"
                aria-invalid={state === 'error'}
                aria-describedby={state === 'error' ? 'popup-email-error' : undefined}
                className="field"
              />
              {state === 'error' && (
                <p id="popup-email-error" className="field-error">
                  Enter an email address like name@example.com.
                </p>
              )}
              <button type="submit" className="btn-primary mt-3 w-full">
                Subscribe and get my code
              </button>
            </div>

            <label
              className="fade-up mt-6 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-umber"
              style={d(470)}
            >
              <input
                type="checkbox"
                checked={never}
                onChange={e => setNever(e.target.checked)}
                className="h-5 w-5 accent-caramel"
              />
              Don’t show this again
            </label>
          </form>
        )}
      </div>
    </Modal>
  )
}
