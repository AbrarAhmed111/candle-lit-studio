import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import Breadcrumbs from '@/components/store/Breadcrumbs'
import ProductCard from '@/components/store/ProductCard'
import Reveal from '@/components/store/Reveal'
import ProductGallery from '@/components/store/ProductGallery'
import ProductPurchase from '@/components/store/ProductPurchase'
import RecentlyViewed from '@/components/store/RecentlyViewed'
import Stars from '@/components/store/Stars'
import { getCategory, getProduct, getReviews, products } from '@/data/products'
import { careSteps, safetyNotes } from '@/data/store'
import { photoUrl } from '@/components/store/ProductPhoto'
import { formatDate, fromPrice, totalStock } from '@/lib/pricing'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = () => products.map(p => ({ slug: p.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct((await params).slug)
  if (!product) return {}
  return {
    title: `${product.name}, ${product.tagline.toLowerCase()}`,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    // Link previews on WhatsApp, Facebook and others show the name and photo
    openGraph: {
      title: `${product.name} | Candle Lit Studio`,
      description: product.tagline,
      url: `/products/${product.slug}`,
      images: [{ url: photoUrl(product.images[0], 1200), alt: `${product.name} candle` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.tagline,
      images: [photoUrl(product.images[0], 1200)],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug)
  if (!product) notFound()

  const category = getCategory(product.categories[0])
  const reviews = getReviews(product.id)
  const related = products
    .filter(p => p.id !== product.id && p.categories.some(c => product.categories.includes(c)))
    .sort(
      (a, b) =>
        Number(b.fragranceFamily === product.fragranceFamily) -
        Number(a.fragranceFamily === product.fragranceFamily),
    )
    .slice(0, 4)

  // Only attributes this candle actually has are listed
  const specs = [
    ['Fragrance family', product.fragranceFamily],
    ['Wax', product.waxType],
    ['Colour', product.colour],
    ['Size', product.dimensions],
    ['Weight', product.variants.map(v => v.weight).filter(Boolean).join(' or ')],
    ['Burn time', product.variants.map(v => v.burnTime).filter(Boolean).join(' or ')],
    ['Made with', product.ingredients],
    ['SKU', product.variants.map(v => v.sku).join(', ')],
  ].filter(([, value]) => value) as [string, string][]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(id => photoUrl(id, 1200)),
    sku: product.variants[0].sku,
    brand: { '@type': 'Brand', name: 'Candle Lit Studio' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: fromPrice(product).sale,
      availability:
        totalStock(product) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <div className="page pt-8 lg:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: 'All candles', href: '/shop' },
          ...(category
            ? [{ label: category.name, href: `/collections/${category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-20">
        <ProductGallery product={product} />

        <div>
          <h1 className="text-5xl lg:text-6xl">{product.name}</h1>
          <p className="mt-3 font-display text-2xl italic text-umber">{product.tagline}</p>
          <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm text-umber hover:text-caramel">
            <Stars rating={product.rating} />
            {product.rating} from {product.reviewCount} reviews
          </a>

          <div className="mt-7">
            <ProductPurchase product={product} />
          </div>

          <div className="mt-10">
            <p className="max-w-prose text-lg">{product.description}</p>

            {product.notes && (
              <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-hairline py-6">
                {(
                  [
                    ['First', product.notes.top],
                    ['Heart', product.notes.middle],
                    ['Lasting', product.notes.base],
                  ] as const
                ).map(([stage, note]) => (
                  <div key={stage}>
                    <dt className="text-sm text-umber">{stage}</dt>
                    <dd className="mt-1 font-display text-lg leading-snug">{note}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6 divide-y divide-hairline border-b border-hairline">
              <Disclosure title="Details" open>
                <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-[0.95rem]">
                  {specs.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-umber">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Disclosure>
              <Disclosure title="Candle care">
                <ul className="space-y-2 text-[0.95rem] text-umber">
                  {careSteps.map(s => (
                    <li key={s.title}>
                      <span className="text-espresso">{s.title}.</span> {s.body}
                    </li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure title="Safety">
                <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem] text-umber">
                  {safetyNotes.map(n => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </Disclosure>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-40 pt-20 lg:pt-28">
        <div className="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-20">
          <div>
            <h2 className="text-4xl">Reviews</h2>
            <p className="mt-5 font-display text-6xl">{product.rating}</p>
            <div className="mt-2">
              <Stars rating={product.rating} size={18} />
            </div>
            <p className="mt-2 text-sm text-umber">Based on {product.reviewCount} reviews</p>
            <p className="mt-6 text-sm text-umber">
              After your order is delivered we email you a link to review it.
            </p>
          </div>
          <div>
            {reviews.length === 0 ? (
              <p className="border-t border-hairline pt-6 text-umber">
                Written reviews for {product.name} will appear here once they are
                approved.
              </p>
            ) : (
              <ul className="divide-y divide-hairline border-t border-hairline">
                {reviews.map(r => (
                  <li key={r.id} className="py-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars rating={r.rating} />
                      <h3 className="font-sans text-base font-semibold tracking-normal">
                        {r.title}
                      </h3>
                    </div>
                    <p className="mt-2 max-w-prose text-umber">{r.body}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-umber">
                      <span className="text-espresso">
                        {r.author}, {r.city}
                      </span>
                      <span>{formatDate(r.date)}</span>
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 text-sage">
                          <BadgeCheck size={15} /> Verified purchase
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="pt-20 lg:pt-28">
          <h2 className="text-4xl">You may also like</h2>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed currentId={product.id} className="pt-20 lg:pt-28" />
    </div>
  )
}

function Disclosure({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="group/d py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-xl font-light transition-transform group-open/d:rotate-45">
          +
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  )
}
