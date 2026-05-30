// ============================================================
// HOME PAGE (Root Route)
// ============================================================
// Checks if the user is logged in and redirects accordingly.
// Server Component — runs on the server, no "use client" needed.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/matches')
  } else {
    redirect('/login')
  }
}
