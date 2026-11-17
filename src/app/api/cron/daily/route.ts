import { NextResponse, type NextRequest } from 'next/server'
import { sendCartReminders, sendReviewRequests, sendScheduledNewsletters } from '@/lib/email/jobs'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vercel Cron calls this once a day (see vercel.json) with CRON_SECRET:
// review requests, cart reminders and scheduled newsletters.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [reviews, carts, newsletters] = await Promise.allSettled([
    sendReviewRequests(),
    sendCartReminders(),
    sendScheduledNewsletters(),
  ])
  const value = <T>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  return NextResponse.json({ reviews: value(reviews), carts: value(carts), newsletters: value(newsletters) })
}
