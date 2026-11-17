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
      // No return page: the callback picks the dashboard for staff, the account for customers
      redirectTo: `${await origin()}/auth/callback${returnUrl ? `?next=${encodeURIComponent(safePath(returnUrl))}` : ''}`,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error || !data.url) return fail('Google sign-in could not start. Please try again.')
  redirect(data.url)
}

export async function signInWithEmail(email: string, password: string): Promise<ActionResult<{ staff: boolean }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) return fail('That email and password do not match. Try again, or continue with Google.')
  const { data: staff } = await supabase.rpc('is_staff')
  return ok({ staff: !!staff })
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

/** Emails a reset link. Always reports success so nobody can test which emails have accounts. */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail('Enter an email address like name@example.com.')
  if (!isSupabaseConfigured) return ok(null)
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  })
  return ok(null)
}

/** Sets a new password for the visitor who opened the reset link */
export async function updatePassword(password: string): Promise<ActionResult> {
  if (password.length < 8) return fail('Use at least 8 characters.')
  if (!isSupabaseConfigured) return fail(NOT_CONNECTED)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('This reset link has expired. Ask for a new one.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return fail(/different from the old/i.test(error.message) ? 'Choose a password you have not used before.' : error.message)
  return ok(null)
}
