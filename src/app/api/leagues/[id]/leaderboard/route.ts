// ============================================================
// LEAGUE LEADERBOARD API
// ============================================================
// Same logic as /api/leaderboard but filtered to league members only

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LeaderboardEntry } from '@/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = params.id

  // Verify the league exists
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Check the requesting user is a member
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: 'You are not a member of this league' },
      { status: 403 }
    )
  }

  // Get all members of this league
  const { data: members, error: membersError } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (membersError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  const memberIds = members.map(m => m.user_id)

  // Get profiles for all members
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', memberIds)

  // Get scored predictions for all members
  const { data: predictions } = await supabase
    .from('predictions')
    .select('user_id, points_awarded')
    .in('user_id', memberIds)
    .not('points_awarded', 'is', null)

  // Calculate leaderboard
  const leaderboard: LeaderboardEntry[] = (profiles || []).map(profile => {
    const userPredictions = (predictions || []).filter(
      p => p.user_id === profile.id
    )
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
      rank: 0,
    }
  })

  // Sort and rank
  leaderboard.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return b.exact_scores - a.exact_scores
  })

  let currentRank = 1
  leaderboard.forEach((entry, index) => {
    if (index > 0) {
      const prev = leaderboard[index - 1]
      if (
        entry.total_points !== prev.total_points ||
        entry.exact_scores !== prev.exact_scores
      ) {
        currentRank = index + 1
      }
    }
    entry.rank = currentRank
  })

  return NextResponse.json({ league, leaderboard })
}