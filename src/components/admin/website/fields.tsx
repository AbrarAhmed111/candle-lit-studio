'use client'

import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import { useAdmin } from '@/components/admin/AdminData'
import { adminUploadImage } from '@/lib/actions/admin'
import { photoUrl } from '@/components/store/ProductPhoto'

// Form pieces for the Website page

export function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="field-label mb-0 block">
      {label}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field mt-1.5"
      />
      {hint && <span className="mt-1 block text-sm font-normal text-umber">{hint}</span>}
    </label>
  )
}

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <label className="field-label mb-0 mt-3 block">
      {label}
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} className="field mt-1.5 py-3" />
      {hint && <span className="mt-1 block text-sm font-normal text-umber">{hint}</span>}
    </label>
  )
}

/** A list of items the owner can add to, remove from and reorder */
export function ListEditor<T>({
  items,
  onChange,
  blank,
  addLabel,
  title,
  render,
}: {
  items: T[]
  onChange: (items: T[]) => void
  blank: T
  addLabel: string
  title: (item: T, index: number) => string
  render: (item: T, set: (item: T) => void) => ReactNode
}) {
  const [open, setOpen] = useState(0)
  const move = (i: number, by: number) => {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
    setOpen(i + by)
  }
  return (
    <div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-2xl border border-hairline">
            <div className="flex items-center gap-1 p-2 pl-4">
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                className="min-h-11 min-w-0 flex-1 truncate text-left font-medium"
                aria-expanded={open === i}
              >
                {title(item, i)}
              </button>
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Move up"
                className="grid h-10 w-9 place-items-center disabled:opacity-30"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
                className="grid h-10 w-9 place-items-center disabled:opacity-30"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Remove this? It disappears from the website when you save.'))
                    onChange(items.filter((_, j) => j !== i))
                }}
                aria-label="Remove"
                className="grid h-10 w-9 place-items-center text-wine"
              >
                <Trash2 size={15} />
              </button>
            </div>
            {open === i && (
              <div className="border-t border-hairline p-4">
                {render(item, next => onChange(items.map((x, j) => (j === i ? next : x))))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          onChange([...items, structuredClone(blank)])
          setOpen(items.length)
        }}
        className="btn-outline mt-4 min-h-11 px-5 text-sm"
      >
        <Plus size={16} /> {addLabel}
      </button>
    </div>
  )
}

export function Picture({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { live } = useAdmin()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="mt-3">
      <p className="field-label">{label}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(value, 800)} alt="" className="mb-2 aspect-[16/7] w-full rounded-xl object-cover" />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://…"
          aria-label={`${label} link`}
          className="field min-w-0 flex-1"
        />
        {live && (
          <label className="btn-outline shrink-0 cursor-pointer px-4 text-sm">
            <Upload size={15} /> {busy ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                setBusy(true)
                const form = new FormData()
                form.set('file', file)
                const result = await adminUploadImage(form)
                setBusy(false)
                if (result.ok) onChange(result.data)
                else setError(result.error)
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
