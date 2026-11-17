import { createServerClient as createSupabaseClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from './config'

// Server Components, server actions and route handlers: acts as the signed-in visitor
export async function createClient() {
  const cookieStore = await cookies()

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions: CookieOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            }
            cookieStore.set(name, value, cookieOptions)
          })
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the session instead.
        }
      },
    },
  })
}

export const createServerClient = createClient

/**
 * Anonymous client without cookies, for public data that is cached and shared
 * between visitors (the catalogue). Row level security still applies.
 */
export function createPublicClient() {
  return createPlainClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
