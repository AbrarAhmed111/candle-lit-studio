import { Star } from 'lucide-react'

export default function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'fill-ember text-ember' : 'fill-wax text-wax'}
        />
      ))}
    </span>
  )
}
