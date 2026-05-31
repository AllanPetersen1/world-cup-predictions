// ============================================================
// PUBLIC PREDICTIONS API
// ============================================================
// GET /api/profile/[id]/predictions
// Returns another user's predictions — only for locked matches
// (kickoff has passed). Never exposes upcoming predictions.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  // Must be logged in to view anyone's predictions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: targetUserId } = await params

  // Get the target user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', targetUserId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get all matches that have already kicked off
  const now = new Date().toISOString()
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .lte('kickoff', now) // Only matches where kickoff <= now
    .order('kickoff', { ascending: false })

  if (matchesError) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ profile, predictions: [] })
  }

  const matchIds = matches.map(m => m.id)

  // Get their predictions for those matches only
  const { data: predictions, error: predsError } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', targetUserId)
    .in('match_id', matchIds)

  if (predsError) {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }

  // Join predictions with match data
  const predsByMatchId = new Map(
    (predictions || []).map(p => [p.match_id, p])
  )

  const result = matches.map(match => ({
    match,
    prediction: predsByMatchId.get(match.id) || null,
  }))

  return NextResponse.json({ profile, predictions: result })
}