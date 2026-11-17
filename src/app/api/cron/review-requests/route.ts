import { NextResponse, type NextRequest } from 'next/server'
import { sendReviewRequests } from '@/lib/email/notify'

export const dynamic = 'force-dynamic'

// Vercel Cron calls this once a day (see vercel.json) with CRON_SECRET
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await sendReviewRequests())
}
