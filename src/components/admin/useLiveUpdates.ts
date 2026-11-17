'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

// Tables whose changes the dashboard shows without a page refresh
const tables = [
  'orders',
  'order_events',
  'shipments',
  'contact_messages',
  'reviews',
  'subscribers',
  'products',
  'variants',
  'customer_notes',
  'team_members',
]

/**
 * Keeps the dashboard current. Supabase Realtime reports every change to the
 * tables above (new orders, payments, messages, edits by other team members),
 * and the data reloads quietly a moment later. Coming back to the tab after a
 * while also reloads, in case the connection slept.
 */
export function useLiveUpdates(enabled: boolean, reload: () => Promise<void> | void) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    if (!enabled) return
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    // Many changes arrive together (an order writes its lines, stock and history), so wait for the last one
    const soon = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reloadRef.current(), 700)
    }

    let channel = supabase.channel('dashboard-live')
    for (const table of tables) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        if (table === 'orders' && payload.eventType === 'INSERT') {
          const order = payload.new as { number?: string; customer_name?: string }
          toast.success(`New order ${order.number ?? ''}${order.customer_name ? ` from ${order.customer_name}` : ''}`, {
            duration: 6000,
          })
        }
        if (table === 'contact_messages' && payload.eventType === 'INSERT') toast('New message in the inbox')
        soon()
      })
    }
    channel.subscribe()

    let hiddenAt = 0
    const onVisible = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 30_000) reloadRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [enabled])
}
