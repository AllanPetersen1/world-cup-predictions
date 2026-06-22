// ============================================================
// LEADERBOARD API ROUTE
// ============================================================
// GET /api/leaderboard — Returns ranked leaderboard
// ============================================================

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LeaderboardEntry } from '@/types'

export async function GET() {
  const supabase = await createClient()

  // Must be logged in to view leaderboard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ask the database view for the pre-calculated math
  // We sort it right in the database!
  const { data: rawLeaderboard, error } = await supabase
    .from('global_leaderboard')
    .select('*')
    .order('total_points', { ascending: false })
    .order('exact_scores', { ascending: false })

  if (error) {
    console.error('Error fetching leaderboard view:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  const leaderboard: LeaderboardEntry[] = rawLeaderboard as LeaderboardEntry[]

  // Assign ranks (handle ties: same points = same rank)
  let currentRank = 1
  leaderboard.forEach((entry, index) => {
    if (index > 0) {
      const prev = leaderboard[index - 1]
      if (entry.total_points !== prev.total_points || entry.exact_scores !== prev.exact_scores) {
        currentRank = index + 1
      }
    }
    entry.rank = currentRank
  })

  return NextResponse.json({ leaderboard })
}
