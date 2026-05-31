// ============================================================
// MIDDLEWARE — Runs on every request before the page loads
// ============================================================
// This is the server-side auth gate.
// If the user has no valid session cookie, they get redirected
// to /login immediately — the page never loads at all.
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require login
const PUBLIC_ROUTES = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through without checking
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (isPublic) return NextResponse.next()

  // Allow cron job through (it has its own secret check)
  if (pathname.startsWith('/api/cron')) return NextResponse.next()

  // Create a response we can attach cookies to
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Create supabase client that can read/write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check if the user has a valid session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // No session — redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // User is logged in — let them through
  return response
}

// Tell Next.js which routes this middleware applies to
export const config = {
  matcher: [
    // Apply to everything except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}