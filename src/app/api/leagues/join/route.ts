// ============================================================
// LEAGUES API — Join by invite code
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { invite_code: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invite_code } = body

  if (!invite_code) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  // Look up the league by invite code
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', invite_code.toUpperCase().trim())
    .single()

  if (leagueError || !league) {
    return NextResponse.json(
      { error: 'Invalid invite code — double check and try again' },
      { status: 404 }
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'You are already in this league' },
      { status: 409 }
    )
  }

  // Join the league
  const { error: joinError } = await supabase
    .from('league_members')
    .insert({
      league_id: league.id,
      user_id: user.id,
    })

  if (joinError) {
    console.error('Error joining league:', joinError)
    return NextResponse.json({ error: 'Failed to join league' }, { status: 500 })
  }

  return NextResponse.json({ league }, { status: 201 })
}