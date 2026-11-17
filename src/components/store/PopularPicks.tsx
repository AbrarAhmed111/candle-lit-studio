import ProductCard from './ProductCard'
import { products } from '@/data/products'

/** Best sellers, shown where a page would otherwise end empty */
export default function PopularPicks({ title = 'Loved by our customers' }: { title?: string }) {
  const popular = products.filter(p => p.bestSeller).slice(0, 4)
  if (popular.length === 0) return null

  return (
    <section aria-labelledby="popular-h" className="mt-20 border-t border-hairline pt-12 text-left">
      <h2 id="popular-h" className="text-3xl lg:text-4xl">
        {title}
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {popular.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
