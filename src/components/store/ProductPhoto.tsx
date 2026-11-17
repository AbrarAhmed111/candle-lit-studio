import clsx from 'clsx'
import type { Product } from '@/types'

/** Unsplash CDN URL for a photo id, resized on their side. Full links pass through. */
export const photoUrl = (id: string, width = 800) =>
  /^https?:\/\//.test(id)
    ? id
    : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=75`

const widths = [240, 480, 800, 1200, 1600]

type Props = {
  product: Pick<Product, 'name' | 'images'>
  /** Which of the product's photos to show */
  index?: number
  /** How wide the photo is drawn, so the browser picks the right file */
  sizes?: string
  /** Empty alt for photos that sit next to the product name */
  decorative?: boolean
  eager?: boolean
  className?: string
  /** Read by the zoom styles on the product page */
  'data-zoom'?: boolean
}

/**
 * Product photo that fills its parent. The parent sets the size, the shape
 * and a background colour that shows while the photo loads.
 */
export default function ProductPhoto({
  product,
  index = 0,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  decorative,
  eager,
  className,
  'data-zoom': zoom,
}: Props) {
  const id = product.images[index] ?? product.images[0]
  // A product saved without photos shows its background colour instead
  if (!id) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(id)}
      srcSet={widths.map(w => `${photoUrl(id, w)} ${w}w`).join(', ')}
      sizes={sizes}
      alt={decorative ? '' : `${product.name} candle`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      data-zoom={zoom}
      className={clsx('h-full w-full object-cover', className)}
    />
  )
}
