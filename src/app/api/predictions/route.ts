// ============================================================
// PREDICTIONS API ROUTE
// ============================================================
// GET  /api/predictions — Get current user's predictions
// POST /api/predictions — Submit or update a prediction
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { isPredictionLocked } from '@/lib/scoring'
import { NextResponse } from 'next/server'

// GET: Return all predictions for the logged-in user
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: predictions, error } = await supabase
    .from('predictions')
    .select(`
      *,
      match:matches(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching predictions:', error)
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }

  return NextResponse.json({ predictions })
}

// POST: Submit or update a prediction for a match
export async function POST(request: Request) {
  const supabase = await createClient()

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse the request body
  let body: { match_id: string; predicted_home: number; predicted_away: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { match_id, predicted_home, predicted_away } = body

  // Validate inputs
  if (!match_id || predicted_home === undefined || predicted_away === undefined) {
    return NextResponse.json(
      { error: 'match_id, predicted_home, and predicted_away are required' },
      { status: 400 }
    )
  }

  if (
    !Number.isInteger(predicted_home) || predicted_home < 0 ||
    !Number.isInteger(predicted_away) || predicted_away < 0
  ) {
    return NextResponse.json(
      { error: 'Scores must be non-negative integers' },
      { status: 400 }
    )
  }

  // Look up the match to check kickoff time
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('kickoff, status')
    .eq('id', match_id)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Reject if match has already started
  if (isPredictionLocked(match.kickoff)) {
    return NextResponse.json(
      { error: 'Predictions are locked — match has started or is about to start' },
      { status: 403 }
    )
  }

  // Upsert = insert if not exists, update if exists
  // The unique constraint on (user_id, match_id) makes this work
  const { data: prediction, error: upsertError } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id,
        predicted_home,
        predicted_away,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' } // Update if this combo already exists
    )
    .select()
    .single()

  if (upsertError) {
    console.error('Error saving prediction:', upsertError)
    return NextResponse.json({ error: 'Failed to save prediction' }, { status: 500 })
  }

  return NextResponse.json({ prediction }, { status: 201 })
}
