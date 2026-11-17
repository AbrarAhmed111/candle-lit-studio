'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin } from './AdminData'
import { card } from './ui'

const KEY = 'cls_getting_started'

/** A short to-do list for a new store, until every step is done or it is closed */
export default function GettingStarted() {
  const { live, orders, team, shippingRates, products } = useAdmin()
  const [ticked, setTicked] = useState<string[]>([])
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      setTicked(saved.ticked ?? [])
      setHidden(!!saved.hidden)
    } catch {
      setHidden(false)
    }
  }, [])

  const store = (next: { ticked?: string[]; hidden?: boolean }) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ticked, hidden, ...next }))
    } catch {
      // ignore
    }
  }

  if (!live || hidden || !orders) return null

  const steps = [
    { id: 'details', label: 'Check your phone, address and delivery fee', href: '/admin/settings' },
    {
      id: 'photos',
      label: 'Upload your own product photos',
      href: '/admin/products',
      done: products.some(p => p.images.some(i => i.includes('supabase'))),
    },
    { id: 'story', label: 'Write your story and FAQ in your own words', href: '/admin/website' },
    {
      id: 'cities',
      label: 'Set delivery fees for your cities (optional)',
      href: '/admin/settings',
      done: shippingRates.length > 0,
    },
    { id: 'team', label: 'Add the people who help you (optional)', href: '/admin/team', done: team.length > 1 },
    { id: 'messages', label: 'Read the automatic emails and adjust the wording', href: '/admin/messages' },
  ].map(s => ({ ...s, done: s.done || ticked.includes(s.id) }))

  const left = steps.filter(s => !s.done).length
  if (left === 0) return null

  const toggle = (id: string) => {
    const next = ticked.includes(id) ? ticked.filter(t => t !== id) : [...ticked, id]
    setTicked(next)
    store({ ticked: next })
  }

  return (
    <section className={`${card} relative mt-8 p-5 sm:p-6`} aria-labelledby="start-h">
      <button
        type="button"
        onClick={() => {
          setHidden(true)
          store({ hidden: true })
        }}
        aria-label="Hide this list"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center text-umber hover:text-espresso"
      >
        <X size={18} />
      </button>
      <h2 id="start-h" className="text-2xl">
        Getting your store ready
      </h2>
      <p className="mt-1 text-umber">
        {left} {left === 1 ? 'step' : 'steps'} left. Tick a step when it is done.
      </p>
      <ul className="mt-4 space-y-1">
        {steps.map(s => (
          <li key={s.id} className="flex items-center gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={s.label}
              onClick={() => toggle(s.id)}
              className={clsx(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors',
                s.done ? 'border-sage bg-sage text-ivory' : 'border-hairline hover:border-espresso',
              )}
            >
              {s.done && <Check size={15} />}
            </button>
            <Link
              href={s.href}
              target={s.href === '/' ? '_blank' : undefined}
              className={clsx('min-h-11 py-2.5', s.done ? 'text-umber line-through' : 'hover:text-caramel')}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
