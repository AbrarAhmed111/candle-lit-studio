'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ProductColour } from '@/types'

/** Ready-made wax colours, so most products need no typing */
const suggestions: ProductColour[] = [
  { name: 'Ivory', hex: '#F4EEE1' },
  { name: 'Blush', hex: '#E8C4C0' },
  { name: 'Sage', hex: '#A8B59A' },
  { name: 'Terracotta', hex: '#C46A4A' },
  { name: 'Charcoal', hex: '#3A3534' },
  { name: 'Marigold', hex: '#E3A33B' },
  { name: 'Sky', hex: '#A9C6D9' },
  { name: 'Lilac', hex: '#C3B1D4' },
]

/** True when every colour has a name and the names do not repeat */
export const coloursProblem = (colours: ProductColour[]) => {
  const names = colours.map(c => c.name.trim().toLowerCase())
  if (names.some(n => !n)) return 'Give every colour a name, for example Ivory.'
  if (names.some((n, i) => names.indexOf(n) !== i)) return 'Each colour needs a different name.'
  if (colours.some(c => !/^#[0-9a-f]{6}$/i.test(c.hex))) return 'Pick a swatch for every colour.'
  return ''
}

/**
 * The colours customers choose from on the product page. Leave it empty for
 * a product that comes in one look. Stock is shared by all colours of a size.
 */
export default function ProductColours({
  colours,
  onChange,
  error,
}: {
  colours: ProductColour[]
  onChange: (colours: ProductColour[]) => void
  error?: string
}) {
  const set = (i: number, patch: Partial<ProductColour>) =>
    onChange(colours.map((c, n) => (n === i ? { ...c, ...patch } : c)))
  const unused = suggestions.filter(s => !colours.some(c => c.name.toLowerCase() === s.name.toLowerCase()))

  return (
    <>
      <h2 id="colours-h" className="text-2xl">
        Colours
      </h2>
      <p className="mt-1 text-sm text-umber">
        Customers pick one of these on the product page. Leave empty if the candle comes in one colour. Stock is shared
        by every colour of a size.
      </p>

      {colours.length > 0 && (
        <ul className="mt-4 space-y-2">
          {colours.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-hairline">
                <span className="absolute inset-0" style={{ backgroundColor: c.hex }} aria-hidden />
                <input
                  type="color"
                  value={c.hex}
                  onChange={e => set(i, { hex: e.target.value })}
                  aria-label={`Swatch for ${c.name || `colour ${i + 1}`}`}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <input
                value={c.name}
                onChange={e => set(i, { name: e.target.value })}
                placeholder="Colour name"
                aria-label={`Name of colour ${i + 1}`}
                className="field flex-1"
              />
              <button
                type="button"
                onClick={() => onChange(colours.filter((_, n) => n !== i))}
                aria-label={`Remove ${c.name || `colour ${i + 1}`}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-wine hover:bg-wine/10"
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {unused.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Quick add a colour">
          {unused.map(s => (
            <button
              key={s.name}
              type="button"
              onClick={() => onChange([...colours, s])}
              className="flex min-h-10 items-center gap-2 rounded-full border border-hairline px-3 text-sm hover:border-espresso"
            >
              <span className="h-4 w-4 rounded-full border border-hairline" style={{ backgroundColor: s.hex }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...colours, { name: '', hex: '#EADFCB' }])}
        className="btn-outline mt-3 min-h-11 px-4 text-sm"
      >
        <Plus size={16} /> Add your own colour
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  )
}
