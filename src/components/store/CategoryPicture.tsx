import clsx from 'clsx'
import ProductPhoto, { photoUrl } from './ProductPhoto'
import { categoryCover } from '@/data/products'
import type { Category } from '@/types'

/** A category's own photo, or a photo of one of its candles, filling its parent */
export default function CategoryPicture({
  category,
  sizes,
  eager,
  className,
}: {
  category: Category
  sizes: string
  eager?: boolean
  className?: string
}) {
  const cover = categoryCover(category)
  if (!cover) return null
  if ('image' in cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl(cover.image, 800)}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        className={clsx('h-full w-full object-cover', className)}
      />
    )
  }
  return <ProductPhoto product={cover.product} sizes={sizes} decorative eager={eager} className={className} />
}

/** Background colour behind a category picture while it loads */
export const categoryTint = (category: Category) => {
  const cover = categoryCover(category)
  return cover && 'product' in cover ? cover.product.art.bg : '#EADFCB'
}
