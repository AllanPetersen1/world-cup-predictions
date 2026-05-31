// ============================================================
// PROFILE API — Update & Delete
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH: Update username
export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { username: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { username } = body

  if (!username || username.trim().length < 2) {
    return NextResponse.json(
      { error: 'Username must be at least 2 characters' },
      { status: 400 }
    )
  }

  if (username.trim().length > 30) {
    return NextResponse.json(
      { error: 'Username must be 30 characters or less' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: username.trim() })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating username:', error)
    return NextResponse.json({ error: 'Failed to update username' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE: Delete account entirely
export async function DELETE() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to delete the auth user
  // This cascades and deletes their profile, predictions, and league memberships
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}