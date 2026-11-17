import type { Metadata } from 'next'
import Link from 'next/link'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ token?: string }> }

// Opened from the link at the bottom of every newsletter
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams
  let email: string | null = null

  const db = isSupabaseConfigured ? createServiceClient() : null
  if (db && token && /^[0-9a-f-]{36}$/i.test(token)) {
    const { data } = await db
      .from('subscribers')
      .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('email')
      .maybeSingle()
    email = data?.email ?? null
  }

  return (
    <div className="page py-24 text-center">
      <h1 className="text-5xl italic">{email ? 'You are unsubscribed' : 'This link has expired'}</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-umber">
        {email
          ? `We will not send newsletters to ${email} again. Order emails still arrive when you buy.`
          : 'We could not find this subscription. If emails keep arriving, reply to one and we will remove you by hand.'}
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to the shop
      </Link>
    </div>
  )
}
