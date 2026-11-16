import { createServerClient } from './server'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PAGES = ['/signin', '/signup', '/forget-password', '/reset-password']
const PROTECTED_PATHS = ['/account']
const ADMIN_PATHS = ['/admin']

export async function updateSession(request: NextRequest) {
	const currentPath = request.nextUrl.pathname
	const supabaseResponse = NextResponse.next()

	const isAuthPage = AUTH_PAGES.some(path => currentPath.startsWith(path))
	const isProtectedPath = PROTECTED_PATHS.some(path => currentPath.startsWith(path))
	const isAdminPath = ADMIN_PATHS.some(path => currentPath.startsWith(path))

	// Supabase is not configured yet: the storefront runs on dummy data,
	// so every public page is served without a session lookup.
	if (
		!process.env.NEXT_PUBLIC_SUPABASE_URL ||
		!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	) {
		// Demo mode: the account and admin areas open on dummy data.
		// Once the Supabase keys are set, the session checks below apply.
		return supabaseResponse
	}

	// The storefront is public. Only auth, account and admin paths need the session.
	if (!isAuthPage && !isProtectedPath && !isAdminPath) return supabaseResponse

	const supabase = await createServerClient()
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (user && !userError) {
		// Signed-in users have no use for the auth pages
		if (isAuthPage) {
			const returnUrl = request.nextUrl.searchParams.get('returnUrl')
			if (returnUrl) {
				try {
					const url = new URL(returnUrl, request.nextUrl.origin)
					if (url.origin === request.nextUrl.origin) return NextResponse.redirect(url)
				} catch {
					// ignore invalid returnUrl
				}
			}
			return NextResponse.redirect(new URL('/', request.url))
		}
		return supabaseResponse
	}

	if (isProtectedPath || isAdminPath) {
		const signinUrl = new URL('/signin', request.url)
		signinUrl.searchParams.set('returnUrl', request.url)
		return NextResponse.redirect(signinUrl)
	}

	return supabaseResponse
}
