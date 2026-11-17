'use client'

import { FormEvent, useState } from 'react'
import clsx from 'clsx'
import { useAdmin, type Campaign } from '@/components/admin/AdminData'
import { done } from '@/components/admin/ui'
import { today } from './helpers'

export default function SaleForm({ initial, onDone }: { initial?: Campaign; onDone: () => void }) {
  const { categories, setShop } = useAdmin()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? today())
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? today())
  const [percent, setPercent] = useState(initial ? String(initial.discountPercent) : '')
  const [chosen, setChosen] = useState<string[]>(initial?.categories ?? [])
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const pct = Number(percent)
    if (name.trim().length < 3) return setError('Give the sale a name, for example Eid Sale.')
    if (!Number.isInteger(pct) || pct < 1 || pct > 90) return setError('Enter a discount from 1 to 90 percent.')
    if (!startsAt || !endsAt || endsAt < startsAt) return setError('The end date must be on or after the start date.')
    const next: Campaign = {
      id: initial?.id ?? `c${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      startsAt,
      endsAt,
      discountPercent: pct,
      categories: chosen,
      active: initial?.active ?? true,
    }
    setShop('campaigns', list => (initial ? list.map(c => (c.id === initial.id ? next : c)) : [next, ...list]))
    done(initial ? `${next.name} saved` : `${next.name} added`)
    onDone()
  }

  const remove = () => {
    setShop('campaigns', list => list.filter(c => c.id !== initial!.id))
    done(`${initial!.name} deleted`)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{initial ? 'Edit sale' : 'Add a sale'}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="field-label mb-0 sm:col-span-2">
          Name
          <input
            value={name}
            onChange={e => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Eid Sale"
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0 sm:col-span-2">
          Message shown on the store banner
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="field mt-1.5 py-3"
          />
        </label>
        <label className="field-label mb-0">
          First day
          <input
            type="date"
            value={startsAt}
            onChange={e => {
              setStartsAt(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Last day
          <input
            type="date"
            value={endsAt}
            min={startsAt}
            onChange={e => {
              setEndsAt(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Percent off
          <input
            inputMode="numeric"
            value={percent}
            onChange={e => {
              setPercent(e.target.value)
              setError('')
            }}
            className="field mt-1.5"
          />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="field-label">Applies to. Choose none for the whole store.</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => {
            const on = chosen.includes(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen(list => (on ? list.filter(s => s !== c.slug) : [...list, c.slug]))}
                className={clsx(
                  'min-h-11 rounded-full border px-4 text-sm transition-colors',
                  on ? 'border-espresso bg-espresso text-ivory' : 'border-hairline hover:border-espresso',
                )}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save campaign
        </button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            className="btn border border-wine text-wine before:bg-wine hover:text-ivory"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
