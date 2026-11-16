import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type WishlistState = { ids: string[] }

const initialState: WishlistState = { ids: [] }

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    hydrateWishlist(state, action: PayloadAction<string[] | null>) {
      state.ids = action.payload ?? []
    },
    toggleWishlist(state, action: PayloadAction<string>) {
      state.ids = state.ids.includes(action.payload)
        ? state.ids.filter(id => id !== action.payload)
        : [...state.ids, action.payload]
    },
  },
})

export const { hydrateWishlist, toggleWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
