'use client'

import { Provider } from 'react-redux'
import { ReactNode, useEffect } from 'react'
import store from './store'
import { hydrateCart, setCoupon } from './cart/CartSlice'
import { hydrateWishlist } from './wishlist/WishlistSlice'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { registerCoupon } from '@/lib/catalog/hydrate'
import { computeTotals } from '@/lib/pricing'

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

/** Live mode: checks a saved coupon again and joins the wishlist to the account */
async function syncWithAccount() {
  const [{ validateCoupon }, { setWishlisted, syncWishlist }] = await Promise.all([
    import('@/lib/actions/store'),
    import('@/lib/actions/account'),
  ])

  const { cart, wishlist } = store.getState()
  if (cart.couponCode) {
    const result = await validateCoupon(cart.couponCode, computeTotals(cart.items).subtotal)
    if (result.ok) {
      registerCoupon(result.data)
      // Re-select it so totals recompute with the coupon now known
      store.dispatch(setCoupon(null))
      store.dispatch(setCoupon(result.data.code))
    } else {
      store.dispatch(setCoupon(null))
    }
  }

  const synced = await syncWishlist(wishlist.ids)
  if (!synced.ok || synced.data === null) return
  store.dispatch(hydrateWishlist(synced.data))

  // Later hearts and un-hearts go straight to the account
  let last = store.getState().wishlist.ids
  store.subscribe(() => {
    const ids = store.getState().wishlist.ids
    if (ids === last) return
    ids.filter(id => !last.includes(id)).forEach(id => setWishlisted(id, true))
    last.filter(id => !ids.includes(id)).forEach(id => setWishlisted(id, false))
    last = ids
  })
}

const Providers = ({ children }: ProvidersProps) => {
  // Guests keep their cart and wishlist between visits in localStorage
  useEffect(() => {
    store.dispatch(hydrateCart(read(CART_KEY)))
    store.dispatch(hydrateWishlist(read(WISHLIST_KEY)))

    const unsubscribe = store.subscribe(() => {
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

    if (isSupabaseConfigured) syncWithAccount().catch(() => {})
    return unsubscribe
  }, [])

  return <Provider store={store}>{children}</Provider>
}

export default Providers
