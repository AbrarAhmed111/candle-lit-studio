import type { Category, Product } from '@/types'
import { products } from './product-list'
import { reviews, testimonials } from './reviews'

export { products, reviews, testimonials }

// Dummy catalogue. Replaced by Supabase data once the backend is connected.
// `images` are Unsplash photo ids, stand-ins until the studio's own photos are shot.

export const categories: Category[] = [
  {
    slug: 'scented-candles',
    name: 'Scented candles',
    description: 'One candle, one clear mood. Soy wax and fragrance, poured in small batches.',
    cover: 'desi-gulab',
  },
  {
    slug: 'jar-candles',
    name: 'Jar candles',
    description: 'Burn it down, wash it out, keep the jar. Even-burning glass candles.',
    cover: 'oud-majlis',
  },
  {
    slug: 'floral-fragrances',
    name: 'Floral fragrances',
    description: 'Rose, motia and raat ki rani. A garden in bloom, any month of the year.',
    cover: 'motia-nights',
  },
  {
    slug: 'decorative-candles',
    name: 'Decorative candles',
    description: 'Pillars and tapers that dress a table before they are even lit.',
    cover: 'twisted-taper-pair',
  },
  {
    slug: 'gift-sets',
    name: 'Gift sets',
    description: 'Boxed, ribboned and ready to give, with your note written by hand.',
    cover: 'the-evening-trio',
  },
  {
    slug: 'seasonal-collections',
    name: 'Seasonal collections',
    description: 'Here for a season, then gone. Limited pours for winter, Ramadan and Eid.',
    cover: 'winter-bonfire',
  },
]

export const getProduct = (slug: string) => products.find(p => p.slug === slug)
export const getProductById = (id: string) => products.find(p => p.id === id)
export const getCategory = (slug: string) => categories.find(c => c.slug === slug)
export const getReviews = (productId: string) => reviews.filter(r => r.productId === productId)
/** Main categories, for menus and the homepage */
export const topCategories = () => categories.filter(c => !c.parent && !c.archived)
export const childrenOf = (slug: string) => categories.filter(c => c.parent === slug && !c.archived)
/** A product is in a category when it is in it or in one of its subcategories */
export const inCategory = (product: Product, slug: string) =>
  product.categories.includes(slug) || childrenOf(slug).some(c => product.categories.includes(c.slug))

/** The picture for a category: its own photo, its chosen product, or its first product */
export const categoryCover = (c: Category): { image: string } | { product: Product } | null => {
  if (c.image) return { image: c.image }
  const product = getProduct(c.cover) ?? products.find(p => inCategory(p, c.slug))
  return product ? { product } : null
}

export const productsInCategory = (slug: string) => products.filter(p => p.categories.includes(slug))
