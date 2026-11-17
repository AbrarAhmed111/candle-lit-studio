// The app runs on its demo data until real Supabase keys are set. Every data
// path checks this one flag, so connecting Supabase needs no code changes.

export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
// Supabase's newer publishable key (sb_publishable_…) or the legacy anon key
export const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''
).trim()

export const isSupabaseConfigured = /^https?:\/\/.+/.test(supabaseUrl) && supabaseAnonKey.length > 20

/** Public site address, used for the Google sign-in return link */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'http://localhost:3000'
).replace(/\/$/, '')
