'use client'

import { Provider } from 'react-redux'
import { ReactNode, useEffect } from 'react'
import store from './store'
import { hydrateCart } from './cart/CartSlice'
import { hydrateWishlist } from './wishlist/WishlistSlice'

type ProvidersProps = {
  children: ReactNode
}

const CART_KEY = 'cls_cart'
const WISHLIST_KEY = 'cls_wishlist'

const read = (key: string) => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const Providers = ({ children }: ProvidersProps) => {
  // Guests keep their cart and wishlist between visits in localStorage
  useEffect(() => {
    store.dispatch(hydrateCart(read(CART_KEY)))
    store.dispatch(hydrateWishlist(read(WISHLIST_KEY)))

    return store.subscribe(() => {
      const { cart, wishlist } = store.getState()
      try {
        window.localStorage.setItem(
          CART_KEY,
          JSON.stringify({ items: cart.items, couponCode: cart.couponCode }),
        )
        window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist.ids))
      } catch {
        // storage unavailable: the cart still works for this visit
      }
    })
  }, [])

  return <Provider store={store}>{children}</Provider>
}

export default Providers
