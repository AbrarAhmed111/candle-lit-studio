'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductPhoto from '@/components/store/ProductPhoto'
import { StatusBadge } from '@/components/admin/ui'
import { getProductById } from '@/data/products'
import { formatDate, formatPKR } from '@/lib/pricing'
import { useAppDispatch } from '@/store/store'
import { addItem, setDrawer } from '@/store/cart/CartSlice'
import type { Order } from '@/types'

/** Puts every line that is still sold and in stock back into the cart. */
export function useReorder() {
  const dispatch = useAppDispatch()

  return (order: Order) => {
    let added = 0
    const missing: string[] = []
    order.lines.forEach(line => {
      const product = getProductById(line.productId)
      const variant = product?.variants.find(v => v.label === line.variant)
      // The colour must still be offered
      const colourOk = product?.colours?.length ? product.colours.some(c => c.name === line.colour) : true
      if (!product || !variant || variant.stock === 0 || !colourOk) return missing.push(line.name)
      dispatch(
        addItem({
          productId: product.id,
          variantId: variant.id,
          colour: line.colour,
          qty: Math.min(line.qty, variant.stock),
        }),
      )
      added += 1
    })
    if (added === 0) return toast.error('None of these candles are in stock right now.')
    dispatch(setDrawer(true))
    if (missing.length > 0) toast(`Added what is in stock. Not available: ${missing.join(', ')}.`)
  }
}

export default function OrderCard({ order }: { order: Order }) {
  const reorder = useReorder()
  const items = order.lines.reduce((n, l) => n + l.qty, 0)

  return (
    <article className="rounded-2xl border border-hairline bg-linen p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl">
            <Link href={`/account/orders/${order.number}`} className="draw-link pb-0.5">
              Order {order.number}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-umber">
            Placed {formatDate(order.placedAt)}. {items} {items === 1 ? 'item' : 'items'}, {formatPKR(order.total)},{' '}
            {order.paymentMethod === 'Easypaisa' ? 'paid by Easypaisa' : 'cash on delivery'}.
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Items in this order">
        {order.lines.map(l => {
          const product = getProductById(l.productId)
          return (
            <li
              key={l.productId + l.variant + (l.colour ?? '')}
              className="flex items-center gap-3 rounded-xl bg-wax/50 py-1.5 pl-1.5 pr-3.5"
            >
              {product && (
                <span
                  className="block h-12 w-10 shrink-0 overflow-hidden rounded-lg"
                  style={{ backgroundColor: product.art.bg }}
                >
                  <ProductPhoto product={product} sizes="40px" decorative />
                </span>
              )}
              <span className="text-sm">
                {l.name}
                <span className="block text-umber">
                  {l.variant}
                  {l.colour && `, ${l.colour}`}, qty {l.qty}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      {order.shipment && order.status === 'Dispatched' && (
        <p className="mt-4 text-sm text-umber">
          With {order.shipment.courier}, tracking ID{' '}
          <span className="font-medium tabular-nums text-espresso">{order.shipment.trackingId}</span>.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/account/orders/${order.number}`} className="btn-outline min-h-11 px-5 text-sm">
          View order
        </Link>
        <button type="button" onClick={() => reorder(order)} className="btn-outline min-h-11 px-5 text-sm">
          <RotateCcw size={15} /> Order again
        </button>
      </div>
    </article>
  )
}
