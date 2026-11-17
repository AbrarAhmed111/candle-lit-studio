import type { Metadata } from 'next'
import { Suspense } from 'react'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import Catalogue from '@/components/store/Catalogue'
import { products } from '@/data/products'
import { loadCatalog } from '@/lib/catalog/server'

export const metadata: Metadata = {
  title: 'All candles',
  description: 'Browse every Candle Lit Studio candle. Filter by fragrance, price and collection.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage() {
  await loadCatalog()
  return (
    <div className="page pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'All candles' }]} />
      <h1 className="mt-6 text-5xl lg:text-6xl">All candles</h1>
      <p className="mt-4 max-w-xl text-lg text-umber">
        {products.length} candles. One of them already smells like your home.
      </p>
      <div className="mt-10 lg:mt-14">
        <Suspense fallback={<p className="py-20 text-center text-umber">Loading candles…</p>}>
          <Catalogue />
        </Suspense>
      </div>
    </div>
  )
}
