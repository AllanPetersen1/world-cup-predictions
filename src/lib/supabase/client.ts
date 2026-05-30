// ============================================================
// SUPABASE BROWSER CLIENT
// ============================================================
// Use this in Client Components (files with "use client" at top)
// and in regular browser-side code.
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // These env vars are prefixed with NEXT_PUBLIC_ so they're
  // safe to expose to the browser (they're read-only keys)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
