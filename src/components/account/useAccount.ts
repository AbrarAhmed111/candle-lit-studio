'use client'

import { useCallback, useEffect, useState } from 'react'
import { sampleOrders } from '@/data/store'
import { localOrders } from '@/lib/orders'
import type { Order } from '@/types'

// Demo account, kept in this browser until Supabase auth is connected.

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

export function useAccount() {
  const [account, setAccount] = useState<Account>(demo)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved) setAccount(saved)
    } catch {
      // keep the demo account
    }
    setReady(true)
  }, [])

  const update = useCallback((apply: (a: Account) => Account) => {
    setAccount(current => {
      const next = apply(current)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // storage blocked: the change lasts until reload
      }
      return next
    })
  }, [])

  return { account, update, ready }
}

/** The signed-in customer's orders, newest first. null while loading. */
export function useMyOrders(phone: string) {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    // Orders placed in this browser plus the sample orders for this phone number
    const mine = [...localOrders(), ...sampleOrders.filter(o => o.customer.phone === phone)]
    setOrders(mine.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()))
  }, [phone])

  return orders
}
