'use server'

import { sendTeamInvite, type Invitee } from '@/lib/email/team'
import { fail, ok, type ActionResult } from '../result'
import { guard } from './shared'

/** Emails a team member a link to the dashboard. Only administrators may invite. */
export async function adminInviteTeamMember(person: Invitee): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data: isAdmin } = await g.supabase.rpc('is_admin')
  if (!isAdmin) return fail('Only an administrator can invite people to the team.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) return fail('That email address does not look right.')

  const { data: me } = await g.supabase.from('team_members').select('name').eq('user_id', g.user.id).maybeSingle()
  const invitedBy = (me?.name as string | undefined) || g.user.email || 'The store owner'
  const result = await sendTeamInvite(person, invitedBy)
  return result.ok ? ok(null) : fail(result.error)
}
