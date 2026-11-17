'use client'

import { useState } from 'react'
import { useAdmin } from './AdminData'
import { done } from './ui'

type Action = '' | 'hide' | 'show' | 'category' | 'uncategory' | 'price' | 'discount'

/** Bar shown above the products table when some products are ticked */
export default function BulkProducts({ selected, onClear }: { selected: string[]; onClear: () => void }) {
  const { products, categories, setShop } = useAdmin()
  const [action, setAction] = useState<Action>('')
  const [category, setCategory] = useState(categories[0]?.slug ?? '')
  const [percent, setPercent] = useState('')
  const [error, setError] = useState('')
  if (selected.length === 0) return null

  const names = products.filter(p => selected.includes(p.id)).map(p => p.name)
  const label = `${selected.length} ${selected.length === 1 ? 'product' : 'products'}`

  const apply = () => {
    setError('')
    const pick = (fn: (p: (typeof products)[number]) => (typeof products)[number]) =>
      setShop('products', list => list.map(p => (selected.includes(p.id) ? fn(p) : p)))
    const n = Number(percent)
    switch (action) {
      case 'hide':
        pick(p => ({ ...p, active: false }))
        done(`${label} hidden from the store`)
        break
      case 'show':
        pick(p => ({ ...p, active: true }))
        done(`${label} shown in the store`)
        break
      case 'category':
        pick(p => ({ ...p, categories: p.categories.includes(category) ? p.categories : [...p.categories, category] }))
        done(`${label} added to ${categories.find(c => c.slug === category)?.name}`)
        break
      case 'uncategory':
        pick(p => ({ ...p, categories: p.categories.filter(c => c !== category) }))
        done(`${label} taken out of ${categories.find(c => c.slug === category)?.name}`)
        break
      case 'price':
        if (!Number.isFinite(n) || n === 0 || n < -90 || n > 200)
          return setError('Enter a change from -90 to 200 percent, for example 10 or -5.')
        pick(p => ({
          ...p,
          variants: p.variants.map(v => ({ ...v, price: Math.max(1, Math.round((v.price * (100 + n)) / 100)) })),
        }))
        done(`Prices of ${label} ${n > 0 ? 'raised' : 'lowered'} by ${Math.abs(n)}%`)
        break
      case 'discount':
        if (!Number.isInteger(n) || n < 0 || n > 90)
          return setError('Enter a discount from 0 to 90. Use 0 to remove it.')
        pick(p => ({ ...p, discountPercent: n || undefined }))
        done(n ? `${n}% off set on ${label}` : `Discount removed from ${label}`)
        break
      default:
        return setError('Choose what to do.')
    }
    setAction('')
    setPercent('')
    onClear()
  }

  return (
    <div className="sticky top-16 z-20 mt-4 rounded-2xl border border-espresso bg-espresso p-4 text-ivory lg:top-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium">
          {label} ticked
          <span className="block max-w-md truncate text-sm font-normal text-wax/70">{names.join(', ')}</span>
        </p>
        <select
          value={action}
          onChange={e => {
            setAction(e.target.value as Action)
            setError('')
          }}
          aria-label="What to do"
          className="min-h-11 rounded-xl bg-ivory px-3 text-espresso"
        >
          <option value="">What should happen?</option>
          <option value="hide">Hide from the store</option>
          <option value="show">Show in the store</option>
          <option value="category">Add to a category</option>
          <option value="uncategory">Take out of a category</option>
          <option value="price">Raise or lower prices by %</option>
          <option value="discount">Set a discount %</option>
        </select>
        {(action === 'category' || action === 'uncategory') && (
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label="Category"
            className="min-h-11 rounded-xl bg-ivory px-3 text-espresso"
          >
            {categories.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {(action === 'price' || action === 'discount') && (
          <input
            inputMode="numeric"
            value={percent}
            onChange={e => setPercent(e.target.value)}
            placeholder={action === 'price' ? '10 or -5' : '15'}
            aria-label="Percent"
            className="min-h-11 w-28 rounded-xl bg-ivory px-3 text-espresso"
          />
        )}
        <button type="button" onClick={apply} disabled={!action} className="btn-light min-h-11 px-5 text-sm">
          Apply
        </button>
        <button type="button" onClick={onClear} className="min-h-11 px-2 text-sm text-wax underline underline-offset-4">
          Untick all
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-ember">{error}</p>}
    </div>
  )
}
