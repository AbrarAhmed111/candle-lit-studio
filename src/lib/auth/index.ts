import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { sessionUser } from '@/lib/supabase/session'

/** The signed-in user, or null (always null in demo mode) */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  return sessionUser(await createClient())
}

export async function requireAuth(returnUrl = '/account') {
  const user = await getCurrentUser()
  if (!user) redirect(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`)
  return user
}

export type StaffAccess = {
  role: 'Administrator' | 'Manager'
  modules: string[]
  name: string
}

/** The signed-in team member's role, or null for customers and visitors */
export async function getStaffAccess(): Promise<StaffAccess | null> {
  if (!isSupabaseConfigured) return null
  const supabase = await createClient()
  const { data } = await supabase.rpc('my_staff_role')
  const row = Array.isArray(data) ? data[0] : data
  return row ? { role: row.role, modules: row.modules ?? [], name: row.name } : null
}
