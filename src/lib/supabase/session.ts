import type { SupabaseClient } from '@supabase/supabase-js'

export type SessionUser = {
  id: string
  email: string
  user_metadata: Record<string, unknown>
}

/**
 * The signed-in visitor, read from their verified login token.
 *
 * getClaims() checks the token's signature with the project's public key,
 * which Supabase caches, so most calls need no trip to the Auth server.
 * (getUser() asks the Auth server every time.) Projects still on the old
 * shared-secret keys fall back to asking the server, so this is never less
 * safe than getUser().
 */
export async function sessionUser(supabase: Pick<SupabaseClient, 'auth'>): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    user_metadata: (claims.user_metadata as Record<string, unknown> | undefined) ?? {},
  }
}
