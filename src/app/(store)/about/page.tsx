import type { Metadata } from 'next'
import Link from 'next/link'
import ProductPhoto from '@/components/store/ProductPhoto'
import { getProduct } from '@/data/products'
import { loadCatalog } from '@/lib/catalog/server'

export const metadata: Metadata = {
  title: 'Our story',
  description:
    'How Candle Lit Studio began on a kitchen stove in Quetta, and why every candle is still made by hand.',
}

const process = [
  ['Melt', 'Soy wax is melted slowly to 80°C in batches of forty candles.'],
  ['Blend', 'Fragrance oil is stirred in by hand for two full minutes so it binds with the wax.'],
  ['Pour', 'Each jar is wicked, centred and poured, then left untouched overnight.'],
  ['Cure', 'Candles rest for two weeks before they are sold. That is what makes the scent carry.'],
]

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
                <span style={{ animationDelay: '200ms' }}>Made slowly, in a small</span>
              </span>
              <span className="line-mask">
                <span style={{ animationDelay: '350ms' }}>room in Quetta.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-wax/85">
              One maker, a few helping hands and a shelf of fragrance oils. We
              pour candles that smell like the places we come from.
            </p>
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
        <h2 className="text-4xl lg:text-5xl">How it began</h2>
        <div className="max-w-prose space-y-5 text-lg text-umber">
          <p>
            It started with a gift. A friend was moving abroad and wanted
            something that smelled like home. Nothing in the shops came close, so
            the first Desi Gulab candle was poured in a steel pot on a kitchen stove.
          </p>
          <p>
            She asked for six more. Then her cousins did. The stove became a
            workbench, the workbench became a studio, and the list of fragrances
            grew: chai on a cold morning, motia after dark, the first rain on dry
            earth.
          </p>
          <p>
            We are still small on purpose. Small batches mean we can test every
            pour, trim every wick and write your gift note by hand.
          </p>
        </div>
      </section>

      <section className="mt-20 bg-wax lg:mt-28">
        <div className="page py-20 lg:py-28">
          <h2 className="text-4xl lg:text-5xl">How a candle is made</h2>
          <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {process.map(([title, text], i) => (
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
        <h2 className="mx-auto max-w-2xl text-4xl italic lg:text-5xl">
          Somewhere on the shelf is the one that smells like home.
        </h2>
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
