'use client'

import toast from 'react-hot-toast'
import { useAppDispatch } from '@/store/store'
import { addItem, removeItem } from '@/store/cart/CartSlice'

/** Removes a cart line and offers a few seconds to put it back */
export function useCartRemove() {
  const dispatch = useAppDispatch()

  return (line: { productId: string; variantId: string; qty: number; name: string }) => {
    const { productId, variantId, qty, name } = line
    dispatch(removeItem({ productId, variantId }))
    toast(
      t => (
        <span className="flex items-center gap-4">
          <span>{name} removed</span>
          <button
            type="button"
            onClick={() => {
              dispatch(addItem({ productId, variantId, qty }))
              toast.dismiss(t.id)
            }}
            className="font-medium text-ember underline underline-offset-4 hover:text-ivory"
          >
            Undo
          </button>
        </span>
      ),
      { id: `removed-${variantId}`, duration: 5000 },
    )
  }
}
