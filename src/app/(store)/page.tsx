import Link from 'next/link'
import { ArrowUpRight, Banknote, Flame, Leaf } from 'lucide-react'
import ProductPhoto from '@/components/store/ProductPhoto'
import Countdown from '@/components/store/Countdown'
import HeroSlider from '@/components/store/HeroSlider'
import NewsletterForm from '@/components/store/NewsletterForm'
import ProductCard from '@/components/store/ProductCard'
import RecentlyViewed from '@/components/store/RecentlyViewed'
import Reveal from '@/components/store/Reveal'
import Stars from '@/components/store/Stars'
import { categories, getProduct, products, testimonials } from '@/data/products'
import { campaign, store } from '@/data/store'
import { formatDate, formatPKR, salePrice } from '@/lib/pricing'
import { loadCatalog } from '@/lib/catalog/server'

const fragrances = [
  'Desi gulab',
  'Doodh patti',
  'Motia',
  'Oud',
  'Sandalwood',
  'Kinnow',
  'Monsoon earth',
  'Woodsmoke',
  'Vanilla kheer',
  'Saffron',
]

export default async function Home() {
  await loadCatalog()
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 4)
  const newArrivals = [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
  const trio = getProduct('the-evening-trio')!
  const rose = getProduct('desi-gulab')!

  return (
    <>
      {/* Hero slider */}
      <HeroSlider />

      {/* Fragrance ticker */}
      <div className="overflow-hidden border-y border-espresso/15 bg-wax py-5" aria-hidden>
        <div className="marquee">
          {[...fragrances, ...fragrances].map((f, i) => (
            <span
              key={i}
              className="flex items-center whitespace-nowrap font-display text-3xl italic lg:text-4xl"
            >
              <span className="px-7">{f}</span>
              <Flame size={18} className="text-caramel" />
            </span>
          ))}
        </div>
      </div>

      {/* Collections */}
      <section id="collections" className="page scroll-mt-24 pt-20 lg:pt-28">
        <Reveal className="flex items-end justify-between gap-6">
          <h2 className="text-4xl lg:text-6xl">Find your scent</h2>
          <Link href="/shop" className="link hidden shrink-0 sm:inline">
            View all candles
          </Link>
        </Reveal>
        <ul className="no-scroll -mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {categories.map((c, i) => {
            const cover = getProduct(c.cover)!
            return (
              <Reveal as="li" key={c.slug} delay={i * 80} className="w-36 shrink-0 snap-start sm:w-auto">
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div
                    className="alcove card-media aspect-[3/4] overflow-hidden"
                    style={{ backgroundColor: cover.art.bg }}
                  >
                    <ProductPhoto
                      product={cover}
                      sizes="(min-width: 640px) 16vw, 144px"
                      decorative
                      className="transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  </div>
                  <p className="mt-4 text-center font-display text-lg leading-snug">
                    <span className="draw-link pb-0.5">{c.name}</span>
                  </p>
                </Link>
              </Reveal>
            )
          })}
        </ul>
      </section>

      {/* Best sellers */}
      <section className="page pt-20 lg:pt-28">
        <Reveal className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl lg:text-6xl">Lit on repeat</h2>
            <p className="mt-3 max-w-md text-umber">
              Four candles our customers cannot stop reordering.
            </p>
          </div>
          <Link href="/shop?sort=best-selling" className="link hidden shrink-0 sm:inline">
            All best sellers
          </Link>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {bestSellers.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Active campaign */}
      <section className="page pt-20 lg:pt-28">
        <Reveal>
          <div className="relative grid grid-cols-1 overflow-hidden rounded-[2rem] bg-caramel text-ivory md:grid-cols-[1.3fr_1fr]">
            <div
              aria-hidden
              className="glow-breathe pointer-events-none absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(255,217,138,0.55), rgba(255,217,138,0) 70%)',
              }}
            />
            <div className="relative p-8 sm:p-12 lg:p-16">
              <h2 className="text-5xl italic lg:text-7xl">{campaign.name}</h2>
              <p className="mt-4 max-w-md text-lg text-ivory/90">{campaign.description}</p>
              <div className="mt-7">
                <Countdown endsAt={campaign.endsAt} />
                <p className="mt-3 text-sm text-ivory/75">Ends {formatDate(campaign.endsAt)}</p>
              </div>
              <Link href="/shop?sale=1" className="btn-light mt-8">
                Shop the sale <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="relative flex items-end justify-center gap-4 px-6 pt-4">
              {['chai-and-cardamom', 'kinnow-grove'].map(slug => {
                const p = getProduct(slug)!
                return (
                  <div
                    key={slug}
                    className="alcove h-48 w-36 overflow-hidden shadow-[0_24px_30px_rgba(46,31,23,0.35)] sm:h-64 sm:w-48 lg:h-72 lg:w-56"
                  >
                    <ProductPhoto product={p} sizes="224px" />
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* New arrivals */}
      <section className="page pt-20 lg:pt-28">
        <Reveal className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl lg:text-6xl">Fresh off the pouring table</h2>
            <p className="mt-3 max-w-md text-umber">New this season. Small batches, so they go quickly.</p>
          </div>
          <Link href="/shop?sort=newest" className="link hidden shrink-0 sm:inline">
            All new arrivals
          </Link>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {newArrivals.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Brand story, as a bento grid */}
      <section className="page pt-20 lg:pt-28">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-soot p-8 text-ivory sm:p-12 lg:col-span-2 lg:p-14">
            <div
              aria-hidden
              className="glow-breathe pointer-events-none absolute -bottom-40 -right-32 h-[36rem] w-[36rem]"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(232,169,60,0.3), rgba(30,20,16,0) 70%)',
              }}
            />
            <h2 className="relative max-w-xl text-4xl italic leading-[1.1] lg:text-[3.6rem] lg:leading-[1.08]">
              One stove. One pot of wax. One stubborn idea.
            </h2>
            <p className="relative mt-6 max-w-lg text-lg text-wax/80">
              No candle on the shelf smelled like home, so we made our own. Every
              one is still poured, wicked and labelled by hand in our Quetta
              studio.
            </p>
            <Link href="/about" className="btn-light relative mt-8">
              Read our story <ArrowUpRight size={17} />
            </Link>
          </Reveal>

          <Reveal
            delay={120}
            className="group flex flex-col justify-between overflow-hidden rounded-[2rem] p-8"
          >
            <div
              className="-m-8 mb-0 h-60 overflow-hidden"
              style={{ backgroundColor: rose.art.bg }}
            >
              <ProductPhoto
                product={rose}
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="-mx-8 -mb-8 bg-wax p-8">
              <h3 className="text-2xl">Scents with a memory</h3>
              <p className="mt-2 text-umber">
                Every fragrance starts as a memory, then earns its place through
                weeks of test burns.
              </p>
            </div>
          </Reveal>

          {(
            [
              [Leaf, 'Clean wax, clean air', 'Soy and coconut wax with cotton and wooden wicks. No paraffin in our jar candles.'],
              [Flame, 'Forty at a time', 'Small batches only. Every candle is checked before it is boxed.'],
              [Banknote, 'Pay at your door', `Cash on delivery across Pakistan. Delivery is free over ${formatPKR(store.freeShippingOver)}.`],
            ] as const
          ).map(([Icon, title, text], i) => (
            <Reveal
              key={title}
              delay={i * 110}
              className="rounded-[2rem] border border-hairline bg-linen p-8 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_50px_-34px_rgba(46,31,23,0.6)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-wax text-caramel">
                <Icon size={22} />
              </span>
              <h3 className="mt-6 text-2xl">{title}</h3>
              <p className="mt-2 text-umber">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Gift feature */}
      <section className="page grid grid-cols-1 items-center gap-10 pt-20 md:grid-cols-2 lg:gap-20 lg:pt-28">
        <Reveal>
          <div
            className="alcove aspect-square overflow-hidden"
            style={{ backgroundColor: trio.art.bg }}
          >
            <ProductPhoto product={trio} sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        </Reveal>
        <Reveal delay={150}>
          <h2 className="text-4xl lg:text-6xl">The gift that actually gets used</h2>
          <p className="mt-5 max-w-md text-lg text-umber">
            {trio.description} Add a note at checkout and we will write it by hand.
          </p>
          <p className="mt-5 text-lg">
            <span className="font-medium">{formatPKR(salePrice(trio, trio.variants[0]))}</span>{' '}
            <s className="text-umber">{formatPKR(trio.variants[0].price)}</s>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/products/${trio.slug}`} className="btn-primary">
              View {trio.name}
            </Link>
            <Link href="/collections/gift-sets" className="btn-outline">
              All gift sets
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="page pt-20 lg:pt-28">
        <Reveal>
          <h2 className="text-4xl lg:text-6xl">Loved in living rooms across Pakistan</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal
              as="figure"
              key={t.author}
              delay={i * 110}
              className="flex flex-col rounded-[2rem] border border-hairline bg-linen p-8 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_50px_-34px_rgba(46,31,23,0.6)]"
            >
              <Stars rating={5} />
              <blockquote className="mt-5 flex-1 font-display text-[1.4rem] italic leading-snug">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 text-sm text-umber">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-wax font-display text-lg text-espresso">
                  {t.author[0]}
                </span>
                <span>
                  <span className="block text-espresso">{t.author}</span>
                  {t.city}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Shown only to visitors who have already opened a product */}
      <RecentlyViewed className="page pt-20 lg:pt-28" />

      {/* Newsletter */}
      <section className="page pt-20 lg:pt-28">
        <Reveal>
          <div className="relative grid grid-cols-1 gap-8 overflow-hidden rounded-[2rem] bg-wax p-8 sm:p-12 md:grid-cols-2 md:items-center lg:p-16">
            <div>
              <h2 className="text-3xl lg:text-5xl">
                Be first to the next pour
              </h2>
              <p className="mt-3 text-umber">
                New scents and private offers, about twice a month. Unsubscribe whenever you like.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </Reveal>
      </section>
    </>
  )
}
