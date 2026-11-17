import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config'

const AUTH_PAGES = ['/signin', '/signup']
const PROTECTED_PATHS = ['/account']
const ADMIN_PATHS = ['/admin']

const safeReturn = (request: NextRequest) => {
  const returnUrl = request.nextUrl.searchParams.get('returnUrl')
  if (!returnUrl) return null
  try {
    const url = new URL(returnUrl, request.nextUrl.origin)
    return url.origin === request.nextUrl.origin ? url : null
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  // Supabase is not configured yet: the whole site runs on demo data,
  // and the account and admin areas open without a session.
  if (!isSupabaseConfigured) return NextResponse.next({ request })

  const path = request.nextUrl.pathname
  const isAuthPage = AUTH_PAGES.some(p => path.startsWith(p))
  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p))
  const isAdmin = ADMIN_PATHS.some(p => path.startsWith(p))

  let response = NextResponse.next({ request })

  // Refreshes the session cookie on every request so it never expires mid-visit
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const redirect = (url: URL) => {
    const next = NextResponse.redirect(url)
    // Keep any refreshed session cookies on the redirect
    response.cookies.getAll().forEach(c => next.cookies.set(c))
    return next
  }

  if (user && isAuthPage) return redirect(safeReturn(request) ?? new URL('/account', request.url))

  if (!user && (isProtected || isAdmin)) {
    const signin = new URL('/signin', request.url)
    signin.searchParams.set('returnUrl', `${path}${request.nextUrl.search}`)
    return redirect(signin)
  }

  // The dashboard is for the team listed in Settings > Team
  if (user && isAdmin) {
    const { data: staff } = await supabase.rpc('is_staff')
    if (!staff) {
      const home = new URL('/', request.url)
      home.searchParams.set('notice', 'not-staff')
      return redirect(home)
    }
  }

  return response
}
