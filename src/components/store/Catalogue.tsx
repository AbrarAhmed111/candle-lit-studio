'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'
import ProductCard from './ProductCard'
import Reveal from './Reveal'
import { categories, inCategory, products } from '@/data/products'
import { fromPrice, totalStock } from '@/lib/pricing'
import type { FragranceFamily } from '@/types'

const PAGE_SIZE = 8

const sorts = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'popular', label: 'Highest rated' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
] as const

const priceBands = [
  { value: 'all', label: 'Any price', min: 0, max: Infinity },
  { value: 'u1500', label: 'Under Rs. 1,500', min: 0, max: 1499 },
  { value: '1500-3000', label: 'Rs. 1,500 to 3,000', min: 1500, max: 3000 },
  { value: 'o3000', label: 'Over Rs. 3,000', min: 3001, max: Infinity },
]

const families: FragranceFamily[] = ['Floral', 'Woody', 'Gourmand', 'Fresh', 'Earthy', 'Unscented']

type Props = {
  /** Locks the catalogue to one category on collection pages */
  fixedCategory?: string
}

export default function Catalogue({ fixedCategory }: Props) {
  const params = useSearchParams()
  const q = params.get('q')?.trim() ?? ''

  const [category, setCategory] = useState(params.get('category') ?? 'all')
  const [family, setFamily] = useState<string>('all')
  const [band, setBand] = useState('all')
  const [inStock, setInStock] = useState(false)
  const [onSale, setOnSale] = useState(params.get('sale') === '1')
  const [sort, setSort] = useState<string>(params.get('sort') ?? 'featured')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Header links such as "On sale" change the URL while this page is mounted
  useEffect(() => {
    setOnSale(params.get('sale') === '1')
    setSort(params.get('sort') ?? 'featured')
    setCategory(params.get('category') ?? 'all')
  }, [params])

  useEffect(() => setShown(PAGE_SIZE), [category, family, band, inStock, onSale, sort, q])

  // Infinite scroll: load the next page when the sentinel nears the viewport
  const sentinel = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const range = priceBands.find(b => b.value === band)!
    const needle = q.toLowerCase()
    const list = products.filter(p => {
      const cat = fixedCategory ?? category
      if (cat !== 'all' && !inCategory(p, cat)) return false
      if (family !== 'all' && p.fragranceFamily !== family) return false
      const price = fromPrice(p).sale
      if (price < range.min || price > range.max) return false
      if (inStock && totalStock(p) === 0) return false
      if (onSale && !p.discountPercent) return false
      if (needle) {
        const haystack = [p.name, p.fragrance, p.fragranceFamily, p.tagline, ...p.tags].join(' ').toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })

    const by: Record<string, (a: (typeof list)[0], b: (typeof list)[0]) => number> = {
      featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.sold - a.sold,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      'best-selling': (a, b) => b.sold - a.sold,
      popular: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      'price-asc': (a, b) => fromPrice(a).sale - fromPrice(b).sale,
      'price-desc': (a, b) => fromPrice(b).sale - fromPrice(a).sale,
    }
    return list.sort(by[sort] ?? by.featured)
  }, [category, family, band, inStock, onSale, sort, q, fixedCategory])

  const hasMore = shown < results.length
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown(n => n + PAGE_SIZE), {
      rootMargin: '0px 0px 300px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, shown])

  const activeCount =
    Number(!fixedCategory && category !== 'all') +
    Number(family !== 'all') +
    Number(band !== 'all') +
    Number(inStock) +
    Number(onSale)

  const clearAll = () => {
    setCategory('all')
    setFamily('all')
    setBand('all')
    setInStock(false)
    setOnSale(false)
  }

  const filters = (
    <div className="flex flex-col gap-8">
      {!fixedCategory && (
        <FilterGroup title="Collection">
          <Choice
            label="All candles"
            checked={category === 'all'}
            onChange={() => setCategory('all')}
            name="category"
          />
          {categories
            .filter(c => !c.archived)
            .map(c => (
              <Choice
                key={c.slug}
                label={c.name}
                checked={category === c.slug}
                onChange={() => setCategory(c.slug)}
                name="category"
              />
            ))}
        </FilterGroup>
      )}
      <FilterGroup title="Fragrance">
        <Choice label="Any fragrance" checked={family === 'all'} onChange={() => setFamily('all')} name="family" />
        {families.map(f => (
          <Choice key={f} label={f} checked={family === f} onChange={() => setFamily(f)} name="family" />
        ))}
      </FilterGroup>
      <FilterGroup title="Price">
        {priceBands.map(b => (
          <Choice
            key={b.value}
            label={b.label}
            checked={band === b.value}
            onChange={() => setBand(b.value)}
            name="price"
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Show only">
        <Choice type="checkbox" label="In stock" checked={inStock} onChange={() => setInStock(v => !v)} name="stock" />
        <Choice type="checkbox" label="On sale" checked={onSale} onChange={() => setOnSale(v => !v)} name="sale" />
      </FilterGroup>
      {activeCount > 0 && (
        <button type="button" onClick={clearAll} className="link self-start text-sm">
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
      <aside
        className="no-scroll hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-4"
        aria-label="Filters"
      >
        {filters}
      </aside>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
          <p className="text-sm text-umber" role="status">
            {results.length} {results.length === 1 ? 'candle' : 'candles'}
            {q && (
              <>
                {' '}
                for “<span className="text-espresso">{q}</span>”
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-hairline px-3.5 text-sm lg:hidden"
            >
              <SlidersHorizontal size={15} /> Filters{activeCount > 0 && ` (${activeCount})`}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-umber sm:inline">Sort by</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                aria-label="Sort candles"
                className="min-h-11 rounded-xl border border-hairline bg-linen px-3 text-sm focus:border-caramel focus:outline-none"
              >
                {sorts.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-3xl">No candles match those filters</h2>
            <p className="mx-auto mt-3 max-w-sm text-umber">
              {q
                ? 'Try a shorter search, like “rose” or “oud”, or remove a filter.'
                : 'Remove a filter to see more of the collection.'}
            </p>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="btn-outline mt-6">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
              {results.slice(0, shown).map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            {hasMore ? (
              <div ref={sentinel} className="mt-14 text-center text-sm text-umber" role="status">
                Loading more candles…
              </div>
            ) : (
              results.length > PAGE_SIZE && (
                <p className="mt-14 text-center text-sm text-umber">That is all {results.length} candles.</p>
              )
            )}
          </>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            aria-label="Close filters"
            className="overlay-in absolute inset-0 bg-soot/55 backdrop-blur-[2px]"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 sheet-up flex max-h-[85vh] flex-col rounded-t-[2rem] bg-ivory">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <h2 className="font-sans text-base font-semibold tracking-normal">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="-mr-2 grid h-11 w-11 place-items-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-6">{filters}</div>
            <div className="border-t border-hairline p-4">
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary w-full">
                Show {results.length} {results.length === 1 ? 'candle' : 'candles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  )
}

function Choice({
  label,
  checked,
  onChange,
  name,
  type = 'radio',
}: {
  label: string
  checked: boolean
  onChange: () => void
  name: string
  type?: 'radio' | 'checkbox'
}) {
  return (
    <label
      className={clsx(
        'flex min-h-9 cursor-pointer items-center gap-2.5 text-[0.95rem]',
        checked ? 'text-espresso' : 'text-umber hover:text-espresso',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-[#A9692F]" />
      {label}
    </label>
  )
}
