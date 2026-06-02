import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // All finished matches chronologically
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'FINISHED')
    .order('kickoff', { ascending: true })

  if (matchesError) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  // All scheduled matches (for prediction rate)
  const { data: allMatches, error: allMatchesError } = await supabase
    .from('matches')
    .select('id')

  if (allMatchesError) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ predictions: [], totalMatches: allMatches?.length || 0 })
  }

  const matchIds = matches.map(m => m.id)

  const { data: predictions, error: predsError } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .in('match_id', matchIds)

  if (predsError) {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }

  const predsByMatchId = new Map(
    (predictions || []).map(p => [p.match_id, p])
  )

  const result = matches.map(match => ({
    match,
    prediction: predsByMatchId.get(match.id) || null,
  }))

  return NextResponse.json({
    predictions: result,
    totalMatches: allMatches?.length || 0,
  })
}