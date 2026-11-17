'use server'

import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Account, Address } from '@/components/account/useAccount'
import type { Order } from '@/types'
import { fail, friendly, ok, NOT_CONNECTED, type ActionResult } from './result'

const session = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function getAccount(): Promise<ActionResult<Account | null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const { supabase, user } = await session()
  if (!user) return ok(null)

  const [profile, addresses] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at'),
  ])
  if (profile.error || addresses.error) return fail(friendly(profile.error?.message ?? addresses.error?.message))

  const p = profile.data
  return ok({
    profile: {
      name: p?.name || (user.user_metadata?.full_name as string) || '',
      email: user.email ?? p?.email ?? '',
      phone: p?.phone ?? '',
    },
    addresses: (addresses.data ?? []).map(
      (a): Address => ({
        id: a.id,
        label: a.label,
        name: a.name,
        phone: a.phone,
        address: a.address,
        area: a.area,
        city: a.city,
        landmark: a.landmark ?? undefined,
        isDefault: a.is_default,
      }),
    ),
    prefs: { newsletter: p?.newsletter ?? false, whatsapp: p?.whatsapp ?? true },
  })
}

/** Saves the whole account as the page holds it: profile, preferences and addresses */
export async function saveAccount(account: Account): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const { supabase, user } = await session()
  if (!user) return fail('Please sign in again.')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name: account.profile.name.trim(),
      phone: account.profile.phone.trim(),
      newsletter: account.prefs.newsletter,
      whatsapp: account.prefs.whatsapp,
    })
    .eq('id', user.id)
  if (profileError) return fail(friendly(profileError.message))

  // The newsletter tick is the same list the dashboard manages
  if (user.email && account.prefs.newsletter) {
    await supabase.rpc('subscribe', { email: user.email, name: account.profile.name, source: 'Checkout' })
  }

  const uuid = /^[0-9a-f-]{36}$/i
  const keep = account.addresses.filter(a => uuid.test(a.id)).map(a => a.id)
  const removeQuery = supabase.from('addresses').delete().eq('user_id', user.id)
  const { error: removeError } = keep.length
    ? await removeQuery.not('id', 'in', `(${keep.join(',')})`)
    : await removeQuery
  if (removeError) return fail(friendly(removeError.message))

  // Clear the default first: only one address may hold it
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
  const rows = account.addresses.map(a => ({
    ...(uuid.test(a.id) ? { id: a.id } : {}),
    user_id: user.id,
    label: a.label,
    name: a.name,
    phone: a.phone,
    address: a.address,
    area: a.area,
    city: a.city,
    landmark: a.landmark ?? null,
    is_default: a.isDefault,
  }))
  const withId = rows.filter(r => 'id' in r)
  const fresh = rows.filter(r => !('id' in r))
  const nonDefaultFirst = <T extends { is_default: boolean }>(list: T[]) => [...list].sort((a, b) => Number(a.is_default) - Number(b.is_default))
  if (withId.length) {
    const { error } = await supabase.from('addresses').upsert(nonDefaultFirst(withId))
    if (error) return fail(friendly(error.message))
  }
  if (fresh.length) {
    const { error } = await supabase.from('addresses').insert(nonDefaultFirst(fresh))
    if (error) return fail(friendly(error.message))
  }
  return ok(null)
}

export async function getMyOrders(): Promise<ActionResult<Order[]>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const { supabase, user } = await session()
  if (!user) return ok([])
  const { data, error } = await supabase.rpc('my_orders')
  if (error) return fail(friendly(error.message))
  return ok((data as Order[]) ?? [])
}

/** Merges the browser's wishlist into the account and returns the full list */
export async function syncWishlist(localIds: string[]): Promise<ActionResult<string[] | null>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const { supabase, user } = await session()
  if (!user) return ok(null)
  if (localIds.length) {
    await supabase
      .from('wishlists')
      .upsert(localIds.map(product_id => ({ user_id: user.id, product_id })), { ignoreDuplicates: true })
  }
  const { data, error } = await supabase.from('wishlists').select('product_id').eq('user_id', user.id).order('created_at')
  if (error) return fail(friendly(error.message))
  return ok(data.map(r => r.product_id))
}

export async function setWishlisted(productId: string, saved: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const { supabase, user } = await session()
  if (!user) return ok(null)
  const { error } = saved
    ? await supabase.from('wishlists').upsert({ user_id: user.id, product_id: productId }, { ignoreDuplicates: true })
    : await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId)
  return error ? fail(friendly(error.message)) : ok(null)
}
