// ============================================================
// LEAGUES API — List & Create
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils'
import { NextResponse } from 'next/server'

// GET: Return all leagues the logged-in user is a member of
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all league_members rows for this user, join league data
  const { data: memberships, error } = await supabase
    .from('league_members')
    .select(`
      league_id,
      joined_at,
      league:leagues(*)
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching leagues:', error)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }

  // For each league, get the member count
  const leagues = await Promise.all(
    (memberships || []).map(async (m: any) => {
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', m.league_id)

      return {
        ...m.league,
        member_count: count || 0,
        is_creator: m.league.created_by === user.id,
      }
    })
  )

  return NextResponse.json({ leagues })
}

// POST: Create a new league and auto-join the creator
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name } = body

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'League name must be at least 2 characters' },
      { status: 400 }
    )
  }

  // Generate a unique invite code
  // Try up to 5 times in case of collision (extremely rare)
  let invite_code = ''
  let attempts = 0
  while (attempts < 5) {
    const code = generateInviteCode()
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', code)
      .single()

    if (!existing) {
      invite_code = code
      break
    }
    attempts++
  }

  if (!invite_code) {
    return NextResponse.json(
      { error: 'Could not generate unique code, try again' },
      { status: 500 }
    )
  }

  // Create the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({
      name: name.trim(),
      invite_code,
      created_by: user.id,
      competition: process.env.FOOTBALL_COMPETITION_CODE || 'WC',
    })
    .select()
    .single()

  if (leagueError || !league) {
    console.error('Error creating league:', leagueError)
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 })
  }

  // Auto-join the creator as a member
  await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
  })

  return NextResponse.json({ league }, { status: 201 })
}