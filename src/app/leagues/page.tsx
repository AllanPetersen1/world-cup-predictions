'use client'
// ============================================================
// LEAGUES PAGE — /leagues
// ============================================================
// Shows all leagues the user is in.
// Lets them create a new league or join one by invite code.
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './leagues.module.css'

interface LeagueItem {
  id: string
  name: string
  invite_code: string
  created_by: string
  member_count: number
  is_creator: boolean
}

export default function LeaguesPage() {
  const supabase = createClient()

  const [leagues, setLeagues] = useState<LeagueItem[]>([])
  const [loading, setLoading] = useState(true)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join modal state
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const res = await fetch('/api/leagues')
    if (res.ok) {
      const { leagues: data } = await res.json()
      setLeagues(data || [])
    }

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLeagueName }),
    })

    const data = await res.json()

    if (!res.ok) {
      setCreateError(data.error || 'Failed to create league')
    } else {
      setShowCreate(false)
      setNewLeagueName('')
      loadData() // Refresh list
    }

    setCreating(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    setJoinError('')

    const res = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: joinCode }),
    })

    const data = await res.json()

    if (!res.ok) {
      setJoinError(data.error || 'Failed to join league')
    } else {
      setShowJoin(false)
      setJoinCode('')
      loadData()
    }

    setJoining(false)
  }

  return (
    <div>
      <main className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1>My Leagues</h1>
            <p className={styles.subtitle}>
              Create or join a private league and compete with friends and family.
            </p>
          </div>
          <div className={styles.headerButtons}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false) }}
            >
              Join League
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false) }}
            >
              + Create League
            </button>
          </div>
        </div>

        {/* Create League Modal */}
        {showCreate && (
          <div className={styles.modal}>
            <div className={styles.modalInner}>
              <h3>Create a New League</h3>
              <p className={styles.modalSubtitle}>
                You'll get an invite code to share with friends
              </p>
              <form onSubmit={handleCreate} className={styles.modalForm}>
                <div className="form-group">
                  <label>League Name</label>
                  <input
                    type="text"
                    placeholder='e.g. "The Lads" or "Office Banter"'
                    value={newLeagueName}
                    onChange={e => setNewLeagueName(e.target.value)}
                    required
                    maxLength={40}
                    autoFocus
                  />
                </div>
                {createError && <div className="error-box">{createError}</div>}
                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowCreate(false); setCreateError('') }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create League'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join League Modal */}
        {showJoin && (
          <div className={styles.modal}>
            <div className={styles.modalInner}>
              <h3>Join a League</h3>
              <p className={styles.modalSubtitle}>
                Enter the invite code shared with you
              </p>
              <form onSubmit={handleJoin} className={styles.modalForm}>
                <div className="form-group">
                  <label>Invite Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WOLF-7X2K"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    required
                    autoFocus
                  />
                </div>
                {joinError && <div className="error-box">{joinError}</div>}
                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowJoin(false); setJoinError('') }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={joining}
                  >
                    {joining ? 'Joining...' : 'Join League'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leagues List */}
        {loading && <div className="loading">Loading leagues...</div>}

        {!loading && leagues.length === 0 && (
          <div className={styles.empty}>
            <span>⚽</span>
            <p>You're not in any leagues yet.</p>
            <p>Create one and invite your friends!</p>
          </div>
        )}

        <div className={styles.leagueGrid}>
          {leagues.map(league => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className={styles.leagueCard}
            >
              <div className={styles.leagueCardTop}>
                <span className={styles.leagueName}>{league.name}</span>
                {league.is_creator && (
                  <span className={styles.creatorBadge}>Creator</span>
                )}
              </div>
              <div className={styles.leagueCardBottom}>
                <span className={styles.memberCount}>
                  👥 {league.member_count} member{league.member_count !== 1 ? 's' : ''}
                </span>
                <span className={styles.inviteCode}>{league.invite_code}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}