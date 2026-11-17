import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import Catalogue from '@/components/store/Catalogue'
import ProductPhoto from '@/components/store/ProductPhoto'
import { categories, getCategory, getProduct } from '@/data/products'
import { loadCatalog } from '@/lib/catalog/server'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = async () => {
  await loadCatalog()
  return categories.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog()
  const category = getCategory((await params).slug)
  if (!category) return {}
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/collections/${category.slug}` },
  }
}

export default async function CollectionPage({ params }: Props) {
  await loadCatalog()
  const category = getCategory((await params).slug)
  if (!category) notFound()
  const cover = getProduct(category.cover)!

  return (
    <>
      <section className="bg-wax">
        <div className="page grid grid-cols-1 items-end gap-6 pt-8 md:grid-cols-[1fr_auto] lg:pt-12">
          <div className="pb-10 lg:pb-16">
            <Breadcrumbs
              items={[{ label: 'All candles', href: '/shop' }, { label: category.name }]}
            />
            <h1 className="mt-6 text-5xl italic lg:text-7xl">{category.name}</h1>
            <p className="mt-4 max-w-xl text-lg text-umber">{category.description}</p>
          </div>
          <div
            className="alcove hidden h-64 w-52 overflow-hidden md:block lg:h-72 lg:w-60"
            style={{ backgroundColor: cover.art.bg }}
          >
            <ProductPhoto product={cover} sizes="240px" decorative eager />
          </div>
        </div>
      </section>
      <div className="page pt-10 lg:pt-14">
        <Suspense fallback={<p className="py-20 text-center text-umber">Loading candles…</p>}>
          <Catalogue fixedCategory={category.slug} />
        </Suspense>
      </div>
    </>
  )
}
