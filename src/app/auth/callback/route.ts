import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Google (and email confirmation links) return here with a one-time code
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const asked = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Team members land in the dashboard, customers in their account
      const { data: staff } = asked ? { data: false } : await supabase.rpc('is_staff')
      const next = asked ?? (staff ? '/admin' : '/account')
      // Behind a proxy (Vercel), send the visitor back to the public host
      const forwardedHost = request.headers.get('x-forwarded-host')
      const base = process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : origin
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
