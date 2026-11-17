'use server'

import { fail, friendly, ok, type ActionResult } from '../result'
import { loadStore } from '@/lib/email/notify'
import { sendNewsletterTo } from '@/lib/email/jobs'
import { emailConfigured } from '@/lib/email/mailer'
import { createServiceClient } from '@/lib/supabase/server'
import { guard } from './shared'

// Email

export type EmailLogEntry = {
  id: number
  at: string
  templateId: string
  to: string
  subject: string
  orderNumber?: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
  attempts: number
}

export type EmailOverview = {
  /** SMTP settings are present */
  smtp: boolean
  /** The service role key is present, needed to send from checkout and the daily job */
  serviceKey: boolean
  log: EmailLogEntry[]
}

export async function adminEmailOverview(): Promise<ActionResult<EmailOverview>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  const { data, error } = await g.supabase
    .from('email_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return fail(friendly(error.message))
  return ok({
    smtp: emailConfigured(),
    serviceKey: !!createServiceClient(),
    log: (data ?? []).map((e: any) => ({
      id: e.id,
      at: e.created_at,
      templateId: e.template_id,
      to: e.to_email,
      subject: e.subject,
      orderNumber: e.order_number ?? undefined,
      status: e.status,
      error: e.error ?? undefined,
      attempts: e.attempts,
    })),
  })
}

/** Sends a newsletter draft to the chosen subscribers, each with their own unsubscribe link */
export async function adminSendNewsletter(
  draftId: string,
  emails: string[],
): Promise<ActionResult<{ sent: number; failed: number }>> {
  const g = await guard()
  if ('error' in g) return fail(g.error!)
  if (!emailConfigured())
    return fail('Email sending is not set up yet. Ask your website developer to finish the email setup.')
  const db = createServiceClient()
  if (!db) return fail('Email sending is not set up yet. Ask your website developer to finish the email setup.')

  // Read through the signed-in session: only Newsletter staff can see drafts
  const { data: draft, error } = await g.supabase.from('newsletter_drafts').select('*').eq('id', draftId).single()
  if (error || !draft) return fail('That draft no longer exists.')
  if (draft.sent_at) return fail('This newsletter has already been sent.')

  const store = await loadStore(db)
  const { sent, failed } = await sendNewsletterTo(db, store, draft, emails)
  if (!sent && !failed) return fail('Nobody in this group is subscribed.')
  return ok({ sent, failed })
}
