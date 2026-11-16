'use client'

import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import { getProductById } from '@/data/products'
import type { Product } from '@/types'

const KEY = 'cls_recent'
const KEEP = 9
const SHOW = 4

const readIds = (): string[] => {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []
  } catch {
    return []
  }
}

type Props = {
  /** On a product page: records this product and leaves it out of the list */
  currentId?: string
  className?: string
}

/**
 * Candles this visitor opened most recently, newest first. Kept in the
 * browser only, so it works for guests and shows nothing on a first visit.
 */
export default function RecentlyViewed({ currentId, className }: Props) {
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    const ids = readIds()
    setItems(
      ids
        .filter(id => id !== currentId)
        .map(getProductById)
        .filter((p): p is Product => Boolean(p))
        .slice(0, SHOW),
    )
    if (!currentId) return
    try {
      const next = [currentId, ...ids.filter(id => id !== currentId)].slice(0, KEEP)
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // storage blocked, nothing to remember
    }
  }, [currentId])

  if (items.length === 0) return null

  const clear = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(currentId ? [currentId] : []))
    } catch {
      // storage blocked
    }
    setItems([])
  }

  return (
    <section className={className} aria-labelledby="recent-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="recent-h" className="text-4xl">
          Recently viewed
        </h2>
        <button type="button" onClick={clear} className="link min-h-11 text-sm">
          Clear history
        </button>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {items.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
