'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { Download, Plus, Search, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useAdmin, type AdminProduct } from '@/components/admin/AdminData'
import {
  card,
  downloadCsv,
  Empty,
  input,
  Loading,
  PageHeader,
  shortDate,
  td,
  th,
  done,
  doneWithUndo,
} from '@/components/admin/ui'
import Modal from '@/components/store/Modal'
import ProductPhoto from '@/components/store/ProductPhoto'
import { adminAdjustStock, adminStockHistory, type StockMovement } from '@/lib/actions/admin'
import BulkProducts from '@/components/admin/BulkProducts'
import { formatPKR, fromPrice, totalStock } from '@/lib/pricing'
import HowItWorks from '@/components/admin/HowItWorks'
import Switch from '@/components/ui/Switch'

const stockFilters = [
  { key: '', label: 'All products' },
  { key: 'low', label: 'Needs restock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'hidden', label: 'Hidden' },
]

const stockState = (p: AdminProduct, low: number) => {
  if (totalStock(p) === 0) return 'out'
  if (p.variants.some(v => v.stock <= low)) return 'low'
  return 'ok'
}

/** Needs restock covers low and sold-out sizes, so it matches the overview's stock alert */
const matchesFilter = (p: AdminProduct, key: string, low: number) => {
  if (key === 'hidden') return !p.active
  if (key === 'low') return stockState(p, low) !== 'ok'
  return stockState(p, low) === key
}

function Products() {
  const { products, categories, setProductActive, settings } = useAdmin()
  const low = settings.lowStockThreshold
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState(useSearchParams().get('stock') ?? '')
  const [editing, setEditing] = useState<string | null>(null)
  const [ticked, setTicked] = useState<string[]>([])

  const q = query.trim().toLowerCase()
  const found = products.filter(
    p =>
      (!q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.sku.toLowerCase().includes(q))) &&
      (!category || p.categories.includes(category)) &&
      (!filter || matchesFilter(p, filter, low)),
  )
  const edited = products.find(p => p.id === editing)

  return (
    <>
      <PageHeader
        title="Products"
        text={`${products.length} candles, ${products.filter(p => p.active).length} visible in the store.`}
      >
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
      <HowItWorks id="products">
        <p>
          Tick products to hide them, move them into a category or change many prices at once. Use{' '}
          <strong>Price and stock</strong> for a quick change, or <strong>Edit</strong> for photos and descriptions.
        </p>
        <p>
          Hidden products stay saved but disappear from the store. Every stock change is written down with its reason.
        </p>
      </HowItWorks>

      <div
        className="no-scroll relative -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter products"
      >
        {stockFilters.map(f => {
          const count = f.key ? products.filter(p => matchesFilter(p, f.key, low)).length : products.length
          return (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={clsx(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                filter === f.key
                  ? 'border-espresso bg-espresso text-ivory'
                  : 'border-hairline bg-linen hover:border-espresso',
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
            placeholder="Product name or code"
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

      <BulkProducts selected={ticked} onClear={() => setTicked([])} />

      <div className={`${card} mt-4 overflow-hidden`}>
        {found.length === 0 ? (
          <Empty title="No products match" text="Try a different search or filter." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[0.95rem]">
              <thead className="border-b border-hairline bg-wax/50">
                <tr>
                  <th className={`${th} w-10`}>
                    <input
                      type="checkbox"
                      aria-label="Tick every product shown"
                      checked={found.length > 0 && found.every(p => ticked.includes(p.id))}
                      onChange={e => setTicked(e.target.checked ? found.map(p => p.id) : [])}
                      className="h-4 w-4 accent-caramel"
                    />
                  </th>
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
                  const state = stockState(p, low)
                  const { original, sale } = fromPrice(p)
                  return (
                    <tr key={p.id} className={clsx(!p.active && 'bg-wax/30', ticked.includes(p.id) && 'bg-ember/10')}>
                      <td className={td}>
                        <input
                          type="checkbox"
                          aria-label={`Tick ${p.name}`}
                          checked={ticked.includes(p.id)}
                          onChange={() =>
                            setTicked(list => (list.includes(p.id) ? list.filter(x => x !== p.id) : [...list, p.id]))
                          }
                          className="h-4 w-4 accent-caramel"
                        />
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-14 w-12 shrink-0 overflow-hidden rounded-lg"
                            style={{ backgroundColor: p.art.bg }}
                          >
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
                          <span
                            className={clsx(
                              'ml-2 rounded-full px-2 py-0.5 text-sm',
                              state === 'out' ? 'bg-wine/10 text-wine' : 'bg-ember/25 text-toffee',
                            )}
                          >
                            {state === 'out' ? 'Out of stock' : 'Low'}
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{p.sold}</td>
                      <td className={td}>
                        <Switch
                          checked={p.active}
                          onChange={() => {
                            const was = p.active
                            setProductActive(p.id, !was)
                            doneWithUndo(was ? `${p.name} hidden from the store` : `${p.name} shown in the store`, () =>
                              setProductActive(p.id, was),
                            )
                          }}
                          label={`Show ${p.name} in the store`}
                        />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <button type="button" onClick={() => setEditing(p.id)} className="link min-h-11 px-2 text-sm">
                          Price and stock
                        </button>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="link ml-2 inline-flex min-h-11 items-center px-2 text-sm"
                        >
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

const stockReasons = [
  'New batch poured',
  'Counted the shelf',
  'Damaged or broken',
  'Gift or sample',
  'Returned by a customer',
  'Other',
]

function StockForm({ product, onDone }: { product: AdminProduct; onDone: () => void }) {
  const { setVariant, live } = useAdmin()
  const [reason, setReason] = useState(stockReasons[0])
  const [history, setHistory] = useState<StockMovement[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState(() =>
    Object.fromEntries(product.variants.map(v => [v.id, { price: String(v.price), stock: String(v.stock) }])),
  )
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
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
    if (live) {
      // Stock changes go through the database with their reason, so the history shows why
      setSaving(true)
      for (const r of parsed) {
        const before = product.variants.find(v => v.id === r.id)!.stock
        if (r.stock === before) continue
        const result = await adminAdjustStock(r.id, r.stock, reason)
        if (!result.ok) {
          setSaving(false)
          return setError(result.error)
        }
      }
      setSaving(false)
    }
    parsed.forEach(r => setVariant(r.id, { price: r.price, stock: r.stock }))
    done(
      `${product.name} updated${parsed.some((r, i) => r.stock !== product.variants[i].stock) ? ` (${reason.toLowerCase()})` : ''}`,
    )
    onDone()
  }

  const stockChanged = product.variants.some(v => Number(rows[v.id].stock) !== v.stock)
  const label = (variantId: string) => product.variants.find(v => v.id === variantId)?.label ?? 'Removed size'

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
      {stockChanged && (
        <label className="field-label mt-5">
          Why did the stock change?
          <select value={reason} onChange={e => setReason(e.target.value)} className="field mt-1.5">
            {stockReasons.map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onDone} className="btn-outline">
          Discard
        </button>
      </div>
      {live && (
        <div className="mt-6 border-t border-hairline pt-4">
          {history === null ? (
            <button
              type="button"
              onClick={() => adminStockHistory(product.id).then(r => setHistory(r.ok ? r.data : []))}
              className="link min-h-11 text-sm"
            >
              See stock history
            </button>
          ) : history.length === 0 ? (
            <p className="text-sm text-umber">No stock changes recorded yet.</p>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto text-sm">
              {history.map((m, i) => (
                <li key={m.at + i} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className={m.change > 0 ? 'text-sage' : 'text-wine'}>
                      {m.change > 0 ? '+' : ''}
                      {m.change}
                    </span>{' '}
                    {label(m.variantId)}, {m.reason}
                    {m.orderNumber && <span className="text-umber"> ({m.orderNumber})</span>}
                  </span>
                  <span className="shrink-0 text-umber">
                    {m.stockAfter} left, {shortDate(m.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
