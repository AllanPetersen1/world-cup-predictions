// ============================================================
// MATCHES API ROUTE
// ============================================================
// GET /api/matches — Returns all matches from the database
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Check the user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all matches, ordered by kickoff time
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff', { ascending: true })

  if (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  return NextResponse.json({ matches })
}
