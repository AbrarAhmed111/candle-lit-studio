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

type LineKey = { productId: string; variantId: string; colour?: string }

/** One cart line per size and colour */
export const sameLine = (a: LineKey, b: LineKey) =>
  a.productId === b.productId && a.variantId === b.variantId && (a.colour ?? '') === (b.colour ?? '')

/** Stock left for this line: every colour of a size shares the same stock */
const roomFor = (items: CartItem[], line: LineKey) => {
  const stock = getProductById(line.productId)?.variants.find(v => v.id === line.variantId)?.stock ?? 0
  const others = items.filter(i => i.variantId === line.variantId && !sameLine(i, line)).reduce((n, i) => n + i.qty, 0)
  return Math.max(0, stock - others)
}

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
      const { productId, variantId, qty, colour } = action.payload
      const max = roomFor(state.items, action.payload)
      const existing = state.items.find(i => sameLine(i, action.payload))
      if (existing) existing.qty = Math.min(existing.qty + qty, max)
      else if (max > 0)
        state.items.push({ productId, variantId, qty: Math.min(qty, max), ...(colour ? { colour } : {}) })
    },
    setQty(state, action: PayloadAction<CartItem>) {
      const item = state.items.find(i => sameLine(i, action.payload))
      if (!item) return
      item.qty = Math.max(1, Math.min(action.payload.qty, roomFor(state.items, item)))
    },
    removeItem(state, action: PayloadAction<LineKey>) {
      state.items = state.items.filter(i => !sameLine(i, action.payload))
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

export const { hydrateCart, addItem, setQty, removeItem, setCoupon, clearCart, setDrawer } = cartSlice.actions
export default cartSlice.reducer
