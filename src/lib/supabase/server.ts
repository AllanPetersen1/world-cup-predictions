// ============================================================
// SUPABASE SERVER CLIENT
// ============================================================
// Use this in Server Components, API Routes, and middleware.
// It reads cookies to maintain the user's session server-side.
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can't set cookies — safe to ignore
          }
        },
      },
    }
  )
}

// ============================================================
// SUPABASE ADMIN CLIENT (server-only, bypasses Row Level Security)
// ============================================================
// Only use this in trusted server code like cron jobs.
// NEVER expose the service role key to the browser.
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This key bypasses all RLS policies
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
