import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import Catalogue from '@/components/store/Catalogue'
import CategoryPicture, { categoryTint } from '@/components/store/CategoryPicture'
import { photoUrl } from '@/components/store/ProductPhoto'
import { categories, childrenOf, getCategory } from '@/data/products'
import { loadCatalog } from '@/lib/catalog/server'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = async () => {
  await loadCatalog()
  return categories.filter(c => !c.archived).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadCatalog()
  const category = getCategory((await params).slug)
  if (!category || category.archived) return {}
  return {
    title: category.seoTitle || category.name,
    description: category.seoDescription || category.description,
    alternates: { canonical: `/collections/${category.slug}` },
    openGraph:
      category.banner || category.image ? { images: [photoUrl(category.banner || category.image!, 1200)] } : undefined,
  }
}

export default async function CollectionPage({ params }: Props) {
  await loadCatalog()
  const category = getCategory((await params).slug)
  if (!category || category.archived) notFound()
  const parent = category.parent ? getCategory(category.parent) : undefined
  const subcategories = childrenOf(category.slug)

  return (
    <>
      {category.banner && (
        <div className="relative h-48 overflow-hidden bg-wax sm:h-64 lg:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(category.banner, 2000)} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <section className="bg-wax">
        <div className="page grid grid-cols-1 items-end gap-6 pt-8 md:grid-cols-[1fr_auto] lg:pt-12">
          <div className="pb-10 lg:pb-16">
            <Breadcrumbs
              items={[
                { label: 'All candles', href: '/shop' },
                ...(parent ? [{ label: parent.name, href: `/collections/${parent.slug}` }] : []),
                { label: category.name },
              ]}
            />
            <h1 className="mt-6 text-5xl italic lg:text-7xl">{category.name}</h1>
            <p className="mt-4 max-w-xl text-lg text-umber">{category.description}</p>
            {subcategories.length > 0 && (
              <nav aria-label={`Inside ${category.name}`} className="mt-6 flex flex-wrap gap-2">
                {subcategories.map(sub => (
                  <Link
                    key={sub.slug}
                    href={`/collections/${sub.slug}`}
                    className="min-h-10 rounded-full border border-espresso/30 bg-linen px-4 py-2 text-sm transition-colors hover:border-espresso"
                  >
                    {sub.name}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          {!category.banner && (
            <div
              className="alcove hidden h-64 w-52 overflow-hidden md:block lg:h-72 lg:w-60"
              style={{ backgroundColor: categoryTint(category) }}
            >
              <CategoryPicture category={category} sizes="240px" eager />
            </div>
          )}
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
