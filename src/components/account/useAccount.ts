'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { getAccount, getMyOrders, saveAccount } from '@/lib/actions/account'
import { sampleOrders } from '@/data/store'
import { localOrders } from '@/lib/orders'
import type { Order } from '@/types'

// The signed-in customer's account. In demo mode a sample account is kept in
// this browser; with Supabase connected it is read from and saved to the database.

const KEY = 'cls_account'

export type Address = {
  id: string
  label: string
  name: string
  phone: string
  address: string
  area: string
  city: string
  landmark?: string
  isDefault: boolean
}

export type Account = {
  profile: { name: string; email: string; phone: string }
  addresses: Address[]
  prefs: { newsletter: boolean; whatsapp: boolean }
}

const demo: Account = {
  profile: { name: 'Sarah Ahmed', email: 'sarah@example.com', phone: '03001234567' },
  addresses: [
    {
      id: 'a1',
      label: 'Home',
      name: 'Sarah Ahmed',
      phone: '03001234567',
      address: 'House 12, Street 8, Block C',
      area: 'DHA Phase 5',
      city: 'Lahore',
      isDefault: true,
    },
    {
      id: 'a2',
      label: 'Office',
      name: 'Sarah Ahmed',
      phone: '03001234567',
      address: 'Office 4, 2nd Floor, Siddiq Trade Centre',
      area: 'Gulberg II',
      city: 'Lahore',
      landmark: 'Opposite Main Boulevard',
      isDefault: false,
    },
  ],
  prefs: { newsletter: true, whatsapp: true },
}

const empty: Account = {
  profile: { name: '', email: '', phone: '' },
  addresses: [],
  prefs: { newsletter: false, whatsapp: true },
}

export function useAccount() {
  const [account, setAccount] = useState<Account>(isSupabaseConfigured ? empty : demo)
  const [ready, setReady] = useState(false)
  const latest = useRef(account)

  useEffect(() => {
    if (isSupabaseConfigured) {
      getAccount().then(result => {
        if (result.ok && result.data) {
          latest.current = result.data
          setAccount(result.data)
        } else if (!result.ok) {
          toast.error(result.error)
        }
        setReady(true)
      })
      return
    }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved) {
        latest.current = saved
        setAccount(saved)
      }
    } catch {
      // keep the demo account
    }
    setReady(true)
  }, [])

  const update = useCallback((apply: (a: Account) => Account) => {
    const next = apply(latest.current)
    latest.current = next
    setAccount(next)
    if (isSupabaseConfigured) {
      saveAccount(next).then(async result => {
        if (!result.ok) return toast.error(result.error)
        // New addresses get their database ids
        const fresh = await getAccount()
        if (fresh.ok && fresh.data) {
          latest.current = fresh.data
          setAccount(fresh.data)
        }
      })
      return
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // storage blocked: the change lasts until reload
    }
  }, [])

  return { account, update, ready }
}

/** The signed-in customer's orders, newest first. null while loading. */
export function useMyOrders(phone: string) {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured) {
      getMyOrders().then(result => setOrders(result.ok ? result.data : []))
      return
    }
    // Orders placed in this browser plus the sample orders for this phone number
    const mine = [...localOrders(), ...sampleOrders.filter(o => o.customer.phone === phone)]
    setOrders(mine.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()))
  }, [phone])

  return orders
}
