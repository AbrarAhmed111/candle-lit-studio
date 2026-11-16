import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getProductById } from '@/data/products'
import type { CartItem } from '@/types'

type CartState = {
  items: CartItem[]
  couponCode: string | null
  hydrated: boolean
  drawerOpen: boolean
}

const initialState: CartState = { items: [], couponCode: null, hydrated: false, drawerOpen: false }

const stockOf = (item: { productId: string; variantId: string }) =>
  getProductById(item.productId)?.variants.find(v => v.id === item.variantId)?.stock ?? 0

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<Partial<CartState> | null>) {
      state.items = action.payload?.items ?? []
      state.couponCode = action.payload?.couponCode ?? null
      state.hydrated = true
    },
    addItem(state, action: PayloadAction<CartItem>) {
      const { productId, variantId, qty } = action.payload
      const max = stockOf(action.payload)
      const existing = state.items.find(
        i => i.productId === productId && i.variantId === variantId,
      )
      if (existing) existing.qty = Math.min(existing.qty + qty, max)
      else if (max > 0) state.items.push({ productId, variantId, qty: Math.min(qty, max) })
    },
    setQty(state, action: PayloadAction<CartItem>) {
      const item = state.items.find(
        i =>
          i.productId === action.payload.productId &&
          i.variantId === action.payload.variantId,
      )
      if (!item) return
      item.qty = Math.max(1, Math.min(action.payload.qty, stockOf(item)))
    },
    removeItem(state, action: PayloadAction<{ productId: string; variantId: string }>) {
      state.items = state.items.filter(
        i =>
          !(
            i.productId === action.payload.productId &&
            i.variantId === action.payload.variantId
          ),
      )
    },
    setCoupon(state, action: PayloadAction<string | null>) {
      state.couponCode = action.payload
    },
    setDrawer(state, action: PayloadAction<boolean>) {
      state.drawerOpen = action.payload
    },
    clearCart(state) {
      state.items = []
      state.couponCode = null
    },
  },
})

export const { hydrateCart, addItem, setQty, removeItem, setCoupon, clearCart, setDrawer } =
  cartSlice.actions
export default cartSlice.reducer
