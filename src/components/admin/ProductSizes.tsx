'use client'

import { Plus, Trash2 } from 'lucide-react'

/** One size of a product as typed in the form. Numbers stay text until saved. */
export type SizeRow = { id: string; label: string; sku: string; price: string; stock: string }

export const newSizeRow = (): SizeRow => ({
  id: `v${Date.now()}${Math.round(Math.random() * 1000)}`,
  label: '',
  sku: '',
  price: '',
  stock: '0',
})

/** The sizes of a product with their price and stock. A product needs at least one. */
export default function ProductSizes({
  rows,
  onChange,
  error,
}: {
  rows: SizeRow[]
  onChange: (rows: SizeRow[]) => void
  error?: string
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 id="sizes-h" className="text-2xl">
          Sizes, prices and stock
        </h2>
        <button
          type="button"
          onClick={() => onChange([...rows, newSizeRow()])}
          className="btn-outline min-h-11 px-4 text-sm"
        >
          <Plus size={16} /> Add size
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((r, i) => (
          <fieldset
            key={r.id}
            className="grid grid-cols-2 gap-3 rounded-xl bg-wax/40 p-3 sm:grid-cols-[1.2fr_1.4fr_1fr_0.8fr_auto] sm:items-end"
          >
            <legend className="sr-only">Size {i + 1}</legend>
            {(
              [
                ['label', 'Size name', '220 g', 'text'],
                ['sku', 'Product code (optional)', 'Made for you', 'text'],
                ['price', 'Price (Rs.)', '1850', 'numeric'],
                ['stock', 'In stock', '0', 'numeric'],
              ] as const
            ).map(([key, label, hint, mode]) => (
              <label key={key} className="text-sm text-umber">
                {label}
                <input
                  value={r[key]}
                  inputMode={mode}
                  placeholder={hint}
                  onChange={e => onChange(rows.map(x => (x.id === r.id ? { ...x, [key]: e.target.value } : x)))}
                  className="field mt-1"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => onChange(rows.filter(x => x.id !== r.id))}
              disabled={rows.length === 1}
              aria-label={`Remove size ${r.label || i + 1}`}
              className="grid h-12 w-12 place-items-center rounded-xl text-wine hover:bg-wine/10 disabled:opacity-30"
            >
              <Trash2 size={17} />
            </button>
          </fieldset>
        ))}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  )
}
