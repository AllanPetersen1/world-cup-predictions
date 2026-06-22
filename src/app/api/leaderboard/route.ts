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

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  // Get all predictions that have been scored (points_awarded is not null)
  const { data: predictions, error: predictionsError } = await supabase
    .from('predictions')
    .select('user_id, points_awarded, predicted_home, predicted_away, match_id')
    .not('points_awarded', 'is', null)

  if (predictionsError) {
    console.error('Error fetching predictions:', predictionsError)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  // Calculate stats for each user
  const leaderboard: LeaderboardEntry[] = profiles.map((profile, index) => {
    const userPredictions = predictions.filter(p => p.user_id === profile.id)

    const total_points = userPredictions.reduce(
      (sum, p) => sum + (p.points_awarded || 0), 0
    )
    const exact_scores = userPredictions.filter(p => p.points_awarded === 3).length
    const correct_outcomes = userPredictions.filter(p => p.points_awarded === 1).length

    return {
      user_id: profile.id,
      username: profile.username,
      total_points,
      exact_scores,
      correct_outcomes,
      total_predictions: userPredictions.length,
      rank: 0, // Will be set after sorting
    }
  })

  // Sort by total points descending, then exact scores as tiebreaker
  leaderboard.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return b.exact_scores - a.exact_scores
  })

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
