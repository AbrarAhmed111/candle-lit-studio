'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { Download, Plus, Search, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type AdminProduct } from '@/components/admin/AdminData'
import { card, downloadCsv, Empty, input, Loading, PageHeader, td, th, done } from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import ProductPhoto from '@/components/store/ProductPhoto'
import { LOW_STOCK } from '@/data/admin'
import { formatPKR, fromPrice, totalStock } from '@/lib/pricing'

const stockFilters = [
  { key: '', label: 'All products' },
  { key: 'low', label: 'Needs restock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'hidden', label: 'Hidden' },
]

const stockState = (p: AdminProduct) => {
  if (totalStock(p) === 0) return 'out'
  if (p.variants.some(v => v.stock <= LOW_STOCK)) return 'low'
  return 'ok'
}

/** Needs restock covers low and sold-out sizes, so it matches the overview's stock alert */
const matchesFilter = (p: AdminProduct, key: string) => {
  if (key === 'hidden') return !p.active
  if (key === 'low') return stockState(p) !== 'ok'
  return stockState(p) === key
}

function Products() {
  const { products, categories, setProductActive } = useAdmin()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState(useSearchParams().get('stock') ?? '')
  const [editing, setEditing] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const found = products.filter(
    p =>
      (!q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.sku.toLowerCase().includes(q))) &&
      (!category || p.categories.includes(category)) &&
      (!filter || matchesFilter(p, filter)),
  )
  const edited = products.find(p => p.id === editing)

  return (
    <>
      <PageHeader title="Products" text={`${products.length} candles, ${products.filter(p => p.active).length} visible in the store.`}>
        <button
          type="button"
          onClick={() =>
            downloadCsv('products.csv', [
              ['name', 'size', 'sku', 'price', 'stock', 'category', 'in store'],
              ...products.flatMap(p =>
                p.variants.map(v => [
                  p.name,
                  v.label,
                  v.sku,
                  v.price,
                  v.stock,
                  categories.find(c => c.slug === p.categories[0])?.name ?? '',
                  p.active ? 'yes' : 'no',
                ]),
              ),
            ])
          }
          className="btn-outline min-h-11 px-5 text-sm"
        >
          <Download size={16} /> Export
        </button>
        <Link href="/admin/products/import" className="btn-outline min-h-11 px-5 text-sm">
          <Upload size={16} /> Import
        </Link>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus size={17} /> Add product
        </Link>
      </PageHeader>

      <div className="no-scroll relative -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter products">
        {stockFilters.map(f => {
          const count = f.key
            ? products.filter(p => matchesFilter(p, f.key)).length
            : products.length
          return (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={clsx(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                filter === f.key ? 'border-espresso bg-espresso text-ivory' : 'border-hairline bg-linen hover:border-espresso',
              )}
            >
              {f.label}
              <span className={clsx('tabular-nums', filter === f.key ? 'text-wax/80' : 'text-umber')}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-umber" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Product name or SKU"
            aria-label="Search products"
            className={`${input} w-full pl-10`}
          />
        </div>
        <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)} className={input}>
          <option value="">Any category</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`${card} mt-4 overflow-hidden`}>
        {found.length === 0 ? (
          <Empty title="No products match" text="Try a different search or filter." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  <th className={th}>Product</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={th}>Stock</th>
                  <th className={`${th} text-right`}>Sold</th>
                  <th className={th}>In store</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {found.map(p => {
                  const stock = totalStock(p)
                  const state = stockState(p)
                  const { original, sale } = fromPrice(p)
                  return (
                    <tr key={p.id} className={clsx(!p.active && 'bg-wax/30')}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: p.art.bg }}>
                            <ProductPhoto product={p} sizes="48px" decorative />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-caramel">
                              {p.name}
                            </Link>
                            <p className="truncate text-sm text-umber">
                              {p.variants.length} {p.variants.length === 1 ? 'size' : 'sizes'},{' '}
                              {categories.find(c => c.slug === p.categories[0])?.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                        {p.variants.length > 1 && <span className="text-sm text-umber">From </span>}
                        {formatPKR(sale)}
                        {sale < original && <span className="block text-sm text-umber">{p.discountPercent}% off</span>}
                      </td>
                      <td className={td}>
                        <span className="tabular-nums">{stock}</span>
                        {state !== 'ok' && (
                          <span className={clsx('ml-2 rounded-full px-2 py-0.5 text-sm', state === 'out' ? 'bg-wine/10 text-wine' : 'bg-ember/25 text-toffee')}>
                            {state === 'out' ? 'Out of stock' : 'Low'}
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{p.sold}</td>
                      <td className={td}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={p.active}
                          aria-label={`Show ${p.name} in the store`}
                          onClick={() => {
                            setProductActive(p.id, !p.active)
                            done(p.active ? `${p.name} hidden` : `${p.name} visible`)
                          }}
                          className={clsx(
                            'relative h-7 w-12 rounded-full transition-colors',
                            p.active ? 'bg-sage' : 'bg-hairline',
                          )}
                        >
                          <span
                            className={clsx(
                              'absolute left-1 top-1 h-5 w-5 rounded-full bg-linen transition-transform',
                              p.active && 'translate-x-5',
                            )}
                          />
                        </button>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <button type="button" onClick={() => setEditing(p.id)} className="link min-h-11 px-2 text-sm">
                          Price and stock
                        </button>
                        <Link href={`/admin/products/${p.id}`} className="link ml-2 inline-flex min-h-11 items-center px-2 text-sm">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(edited)}
        onClose={() => setEditing(null)}
        label="Edit price and stock"
        className="max-w-lg rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
      >
        {edited && <StockForm key={edited.id} product={edited} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  )
}

function StockForm({ product, onDone }: { product: AdminProduct; onDone: () => void }) {
  const { setVariant } = useAdmin()
  const [rows, setRows] = useState(() =>
    Object.fromEntries(product.variants.map(v => [v.id, { price: String(v.price), stock: String(v.stock) }])),
  )
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = product.variants.map(v => ({
      id: v.id,
      price: Number(rows[v.id].price),
      stock: Number(rows[v.id].stock),
    }))
    if (parsed.some(r => !Number.isInteger(r.price) || r.price < 1))
      return setError('Enter each price as a whole number of rupees, for example 1850.')
    if (parsed.some(r => !Number.isInteger(r.stock) || r.stock < 0))
      return setError('Enter each stock count as a whole number, 0 or more.')
    parsed.forEach(r => setVariant(r.id, { price: r.price, stock: r.stock }))
    done(`${product.name} updated`)
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="pr-10 text-3xl">{product.name}</h2>
      <p className="mt-2 text-umber">Regular price and units in stock for each size.</p>
      <div className="mt-6 space-y-4">
        {product.variants.map(v => (
          <fieldset key={v.id} className="grid grid-cols-2 gap-3">
            <legend className="mb-1.5 text-sm font-medium">
              {v.label} <span className="font-normal text-umber">{v.sku}</span>
            </legend>
            <label className="text-sm text-umber">
              Price (Rs.)
              <input
                inputMode="numeric"
                value={rows[v.id].price}
                onChange={e => {
                  setRows(r => ({ ...r, [v.id]: { ...r[v.id], price: e.target.value } }))
                  setError('')
                }}
                className="field mt-1"
              />
            </label>
            <label className="text-sm text-umber">
              In stock
              <input
                inputMode="numeric"
                value={rows[v.id].stock}
                onChange={e => {
                  setRows(r => ({ ...r, [v.id]: { ...r[v.id], stock: e.target.value } }))
                  setError('')
                }}
                className="field mt-1"
              />
            </label>
          </fieldset>
        ))}
      </div>
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save changes
        </button>
        <button type="button" onClick={onDone} className="btn-outline">
          Discard
        </button>
      </div>
    </form>
  )
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Products />
    </Suspense>
  )
}
