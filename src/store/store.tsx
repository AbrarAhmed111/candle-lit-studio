import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import cartReducer from './cart/CartSlice'
import wishlistReducer from './wishlist/WishlistSlice'

const rootReducer = combineReducers({
  cart: cartReducer,
  wishlist: wishlistReducer,
})

const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export default store
