import type { Metadata } from 'next'
import Link from 'next/link'
import ProductPhoto from '@/components/store/ProductPhoto'
import { getProduct } from '@/data/products'
import { loadCatalog } from '@/lib/catalog/server'
import { about } from '@/data/content'

export const metadata: Metadata = {
  title: 'Our story',
  description: 'How Candle Lit Studio began on a kitchen stove in Quetta, and why every candle is still made by hand.',
}

export default async function AboutPage() {
  await loadCatalog()
  const rose = getProduct('desi-gulab')!
  const oud = getProduct('oud-majlis')!

  return (
    <>
      <section className="bg-soot text-ivory">
        <div className="page grid grid-cols-1 items-end gap-8 pt-36 md:grid-cols-[1.3fr_1fr] lg:pt-48">
          <div className="pb-14 lg:pb-24">
            <h1 className="text-5xl italic lg:text-7xl">
              <span className="line-mask">
                <span style={{ animationDelay: '200ms' }}>{about.title[0]}</span>
              </span>
              <span className="line-mask">
                <span style={{ animationDelay: '350ms' }}>{about.title[1]}</span>
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-wax/85">{about.intro}</p>
          </div>
          <div className="flex items-end justify-center gap-4">
            <div className="alcove h-60 w-44 overflow-hidden lg:h-80 lg:w-60">
              <ProductPhoto product={rose} sizes="240px" eager />
            </div>
            <div className="alcove h-48 w-36 overflow-hidden lg:h-64 lg:w-48">
              <ProductPhoto product={oud} sizes="192px" eager />
            </div>
          </div>
        </div>
      </section>

      <section className="page grid grid-cols-1 gap-10 pt-20 lg:grid-cols-[1fr_1.4fr] lg:gap-20 lg:pt-28">
        <h2 className="text-4xl lg:text-5xl">{about.storyHeading}</h2>
        <div className="max-w-prose space-y-5 text-lg text-umber">
          {about.story.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="mt-20 bg-wax lg:mt-28">
        <div className="page py-20 lg:py-28">
          <h2 className="text-4xl lg:text-5xl">{about.processHeading}</h2>
          <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {about.process.map(({ title, text }, i) => (
              <li key={title} className="border-t border-espresso pt-5">
                <span className="font-display text-xl italic text-caramel">Step {i + 1}</span>
                <h3 className="mt-1 text-3xl">{title}</h3>
                <p className="mt-3 text-umber">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page pt-20 text-center lg:pt-28">
        <h2 className="mx-auto max-w-2xl text-4xl italic lg:text-5xl">{about.closing}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn-primary">
            Shop all candles
          </Link>
          <Link href="/contact" className="btn-outline">
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
