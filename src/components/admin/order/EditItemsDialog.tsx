'use client'

import { useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { useAdmin } from '../AdminData'
import { done } from '../ui'
import Modal from '@/components/store/Modal'
import { formatPKR, salePrice } from '@/lib/pricing'
import { adminEditOrder } from '@/lib/actions/admin'
import type { AdminOrder } from '@/data/admin'

type EditLine = { variantId: string; colour?: string; qty: number; unitPrice: number }

/** One choice per size, and per colour for products that come in colours */
const keyOf = (variantId: string, colour?: string) => (colour ? `${variantId}|${colour}` : variantId)

/** Change the candles, quantities, delivery fee or discount of an order not yet dispatched */
export default function EditItemsDialog({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const { products, updateOrder, live, refresh } = useAdmin()
  const options = products.flatMap(p =>
    p.variants.flatMap(v =>
      (p.colours?.length ? p.colours.map(c => c.name) : [undefined]).map(colour => ({
        key: keyOf(v.id, colour),
        id: v.id,
        colour,
        label: `${p.name}, ${v.label}${colour ? `, ${colour}` : ''}`,
        product: p,
        variant: v,
      })),
    ),
  )
  const find = (l: { variantId: string; colour?: string }) =>
    options.find(o => o.key === keyOf(l.variantId, l.colour)) ??
    // A colour the owner has since removed still shows its size
    options.find(o => o.id === l.variantId)
  const [lines, setLines] = useState<EditLine[]>(() =>
    order.lines.map(l => ({
      variantId:
        l.variantId ?? options.find(o => o.product.id === l.productId && o.variant.label === l.variant)?.id ?? '',
      colour: l.colour,
      qty: l.qty,
      unitPrice: l.unitPrice,
    })),
  )
  const [adding, setAdding] = useState('')
  const [shipping, setShipping] = useState(String(order.shipping))
  const [discount, setDiscount] = useState(String(order.couponDiscount))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  const total = subtotal - Math.min(Number(discount) || 0, subtotal) + (Number(shipping) || 0)
  const whole = (v: string) => /^[0-9]+$/.test(v.trim())

  const add = () => {
    const o = options.find(x => x.key === adding)
    if (!o) return
    const same = (l: EditLine) => keyOf(l.variantId, l.colour) === o.key
    setLines(list =>
      list.some(same)
        ? list.map(l => (same(l) ? { ...l, qty: l.qty + 1 } : l))
        : [...list, { variantId: o.id, colour: o.colour, qty: 1, unitPrice: salePrice(o.product, o.variant) }],
    )
    setAdding('')
  }

  const setQty = (index: number, qty: number) =>
    setLines(list => list.map((x, j) => (j === index ? { ...x, qty: Math.max(0, qty) } : x)))

  const save = async () => {
    const kept = lines.filter(l => l.qty > 0 && l.variantId)
    if (!kept.length) return setError('An order needs at least one candle. To stop it, cancel the order instead.')
    if (!whole(shipping) || !whole(discount)) return setError('Enter delivery and discount in whole rupees.')
    setSaving(true)
    if (live) {
      const result = await adminEditOrder(order.number, {
        lines: kept,
        shipping: Number(shipping),
        discount: Number(discount),
        note: note.trim(),
      })
      setSaving(false)
      if (!result.ok) return setError(result.error)
      refresh()
    } else {
      updateOrder(
        order.number,
        {
          lines: kept.map(l => {
            const o = find(l)!
            return {
              productId: o.product.id,
              variantId: o.id,
              name: o.product.name,
              variant: o.variant.label,
              colour: l.colour,
              qty: l.qty,
              unitPrice: l.unitPrice,
              originalPrice: o.variant.price,
            }
          }),
          subtotal,
          couponDiscount: Math.min(Number(discount), subtotal),
          shipping: Number(shipping),
          total,
        },
        `Order edited${note.trim() ? `: ${note.trim()}` : ''}`,
      )
    }
    done(`${order.number} edited`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      label="Edit items"
      className="max-w-2xl rounded-[2rem] bg-ivory p-6 shadow-2xl sm:p-8"
    >
      <h2 className="pr-10 text-3xl">Edit {order.number}</h2>
      <p className="mt-2 text-umber">
        Change candles or quantities, for example after a call with the customer. Stock moves with the change.
      </p>
      <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
        {lines.map((l, i) => {
          const o = find(l)
          return (
            <li key={l.variantId + i} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                {o ? `${o.product.name}, ${o.variant.label}${l.colour ? `, ${l.colour}` : ''}` : 'Size no longer sold'}
                <span className="block text-sm text-umber">{formatPKR(l.unitPrice)} each</span>
              </span>
              <span className="flex items-center rounded-xl border border-hairline">
                <button
                  type="button"
                  aria-label="One less"
                  onClick={() => setQty(i, l.qty - 1)}
                  className="grid h-10 w-10 place-items-center"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center tabular-nums">{l.qty}</span>
                <button
                  type="button"
                  aria-label="One more"
                  onClick={() => setQty(i, l.qty + 1)}
                  className="grid h-10 w-10 place-items-center"
                >
                  <Plus size={14} />
                </button>
              </span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setLines(list => list.filter((_, j) => j !== i))}
                className="grid h-10 w-10 place-items-center text-wine"
              >
                <X size={16} />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex gap-2">
        <select
          value={adding}
          onChange={e => setAdding(e.target.value)}
          aria-label="Add a candle"
          className="field min-w-0 flex-1"
        >
          <option value="">Add a candle…</option>
          {options.map(o => (
            <option key={o.key} value={o.key}>
              {o.label}, {formatPKR(salePrice(o.product, o.variant))}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} disabled={!adding} className="btn-outline shrink-0">
          Add
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="field-label mb-0">
          Delivery (Rs.)
          <input
            inputMode="numeric"
            value={shipping}
            onChange={e => setShipping(e.target.value)}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Discount (Rs.)
          <input
            inputMode="numeric"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            className="field mt-1.5"
          />
        </label>
        <label className="field-label mb-0">
          Why <span className="font-normal text-umber">(optional)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Swapped on WhatsApp"
            className="field mt-1.5"
          />
        </label>
      </div>
      <p className="mt-4 text-lg">
        New total: <span className="font-display text-2xl">{formatPKR(Math.max(0, total))}</span>
        {total !== order.total && <span className="ml-2 text-sm text-umber">was {formatPKR(order.total)}</span>}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={save} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onClose} className="btn-outline">
          Discard
        </button>
      </div>
    </Modal>
  )
}
