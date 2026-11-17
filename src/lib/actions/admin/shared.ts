import 'server-only'

import { revalidateTag } from 'next/cache'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { CATALOG_TAG } from '@/lib/catalog/server'
import { NOT_CONNECTED } from '../result'
import { sessionUser } from '@/lib/supabase/session'

/** Shared by the dashboard actions: the signed-in team member and a cache refresh */

const staffClient = async () => {
  const supabase = await createClient()
  const user = await sessionUser(supabase)
  return { supabase, user }
}

export const guard = async () => {
  if (!isSupabaseConfigured) return { error: NOT_CONNECTED } as const
  const { supabase, user } = await staffClient()
  if (!user) return { error: 'Please sign in again.' } as const
  return { supabase, user } as const
}

export const refreshStore = () => revalidateTag(CATALOG_TAG)
