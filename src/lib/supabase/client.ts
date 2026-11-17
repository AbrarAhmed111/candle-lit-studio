'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from './config'

// Browser client - lightweight and safe to call multiple times
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
