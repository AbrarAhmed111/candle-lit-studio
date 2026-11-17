'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isSupabaseConfigured, siteUrl } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { fail, ok, NOT_CONNECTED, type ActionResult } from './result'

const safePath = (path?: string | null) => (path && path.startsWith('/') && !path.startsWith('//') ? path : '/account')

const origin = async () => {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return host ? `${host.startsWith('localhost') ? 'http' : proto}://${host}` : siteUrl
}

/** Sends the visitor to Google, then back to /auth/callback */
export async function signInWithGoogle(returnUrl?: string): Promise<ActionResult<never>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safePath(returnUrl))}`,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error || !data.url) return fail('Google sign-in could not start. Please try again.')
  redirect(data.url)
}

export async function signInWithEmail(email: string, password: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) return fail('That email and password do not match. Try again, or continue with Google.')
  return ok(null)
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<ActionResult<{ confirm: boolean }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: name.trim() },
      emailRedirectTo: `${await origin()}/auth/callback?next=/account`,
    },
  })
  if (error) {
    return fail(/registered/i.test(error.message) ? 'An account with this email already exists. Sign in instead.' : error.message)
  }
  // With email confirmation on, there is no session until the link is opened
  return ok({ confirm: !data.session })
}

export async function signOut(): Promise<ActionResult> {
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  await supabase.auth.signOut()
  return ok(null)
}

export type Viewer = { email: string; name: string; staff: boolean } | null

/** Who is signed in, for the header and account pages */
export async function getViewer(): Promise<Viewer> {
  if (!isSupabaseConfigured) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: staff } = await supabase.rpc('is_staff')
  return {
    email: user.email ?? '',
    name: (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? '',
    staff: !!staff,
  }
}
