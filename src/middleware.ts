import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Pages that must work on every host, including an admin subdomain
const AUTH_PAGES = ['/signin', '/signup', '/auth/callback']

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const hostname = request.headers.get('host') || ''

	// The dashboard opens on the store's own address (localhost, *.vercel.app,
	// your domain). updateSession() lets in only signed-in team members.
	//
	// If you later point admin.<your domain> at this app, that host shows only
	// the dashboard: any other page there goes to /admin.
	if (hostname.startsWith('admin.')) {
		const isAuthPage = AUTH_PAGES.some(page => pathname.startsWith(page))
		if (!isAuthPage && !pathname.startsWith('/admin')) {
			return NextResponse.redirect(new URL('/admin', request.url))
		}
	}

	return await updateSession(request)
}

export const config = {
	matcher: [
		/*
		 * Every path except Next.js assets and plain files such as images,
		 * icons and the Google verification page, which need no session.
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|html|txt|xml)$).*)'
	]
}
