import { createServiceClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/supabase/config'
import { emailConfigured } from './mailer'
import { loadStore, sendTemplate } from './notify'

/** Who is being invited, and what they may open */
export type Invitee = { name: string; email: string; role: 'Administrator' | 'Manager'; modules: string[] }

const NOT_READY = 'Email sending is not set up yet, so the invite could not be sent.'

/**
 * Tells a new team member they can open the dashboard. Sign-in links them to
 * the team list by email, so the invite only has to point them to the page.
 */
export async function sendTeamInvite(person: Invitee, invitedBy: string) {
  if (!emailConfigured()) return { ok: false as const, error: NOT_READY }
  const db = createServiceClient()
  if (!db) return { ok: false as const, error: NOT_READY }
  const store = await loadStore(db)
  const access =
    person.role === 'Administrator'
      ? 'You can open every part of the dashboard, including team and settings.'
      : `You can open: ${person.modules.join(', ')}.`
  const result = await sendTemplate(db, store, {
    templateId: 'team-invite',
    to: person.email,
    values: {},
    override: {
      subject: `You are invited to the ${store.name} dashboard`,
      body: [
        `Assalam o alaikum ${person.name.split(' ')[0]},`,
        `${invitedBy} added you to the ${store.name} dashboard as ${person.role === 'Administrator' ? 'an administrator' : 'a manager'}. ${access}`,
        `Press the button below and sign in with Google using ${person.email}. No Google account? Choose "Create an account" on the same page and use this email address with a password of your choice.`,
        'If you did not expect this email, you can ignore it.',
      ].join('\n\n'),
    },
    button: { label: 'Open the dashboard', href: `${siteUrl}/signin` },
  })
  return result ?? { ok: false as const, error: 'The invite could not be sent.' }
}
