'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useAdmin, type CustomerStatus } from './AdminData'
import { done } from './ui'

const statuses: { key: CustomerStatus; label: string; hint: string }[] = [
  { key: 'Active', label: 'Normal', hint: 'No special handling.' },
  { key: 'VIP', label: 'VIP', hint: 'A valued customer. Shown with a star in lists.' },
  { key: 'Blocked', label: 'Blocked', hint: 'Cannot place orders on the website, for example after fake orders.' },
]

/** The team's private note and status for one customer */
export default function CustomerNotes({ phone, name }: { phone: string; name: string }) {
  const { customerNotes, setShop } = useAdmin()
  const saved = customerNotes.find(n => n.phone === phone)
  const [note, setNote] = useState(saved?.note ?? '')
  const status = saved?.status ?? 'Active'

  const save = (next: { note?: string; status?: CustomerStatus }) => {
    const row = { phone, note: next.note ?? saved?.note ?? '', status: next.status ?? status }
    setShop('customerNotes', list =>
      list.some(n => n.phone === phone) ? list.map(n => (n.phone === phone ? row : n)) : [...list, row],
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-hairline p-4">
      <p className="font-sans text-sm font-semibold">Status</p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Customer status">
        {statuses.map(s => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={status === s.key}
            onClick={() => {
              save({ status: s.key })
              done(`${name} marked ${s.label}`)
            }}
            className={clsx(
              'min-h-10 rounded-full border px-4 text-sm',
              status === s.key
                ? s.key === 'Blocked'
                  ? 'border-wine bg-wine text-ivory'
                  : 'border-espresso bg-espresso text-ivory'
                : 'border-hairline hover:border-espresso',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-umber">{statuses.find(s => s.key === status)?.hint}</p>
      <label htmlFor="customer-note" className="mt-4 block font-sans text-sm font-semibold">
        Private note
      </label>
      <textarea
        id="customer-note"
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="For example: prefers a call after 6 pm"
        className="field mt-1.5 py-3"
      />
      <button
        type="button"
        disabled={note === (saved?.note ?? '')}
        onClick={() => {
          save({ note: note.trim() })
          done(`Note saved for ${name}`)
        }}
        className="btn-outline mt-2 min-h-10 px-4 text-sm"
      >
        Save note
      </button>
    </div>
  )
}
