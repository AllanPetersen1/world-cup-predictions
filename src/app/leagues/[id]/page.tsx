'use client'
// ============================================================
// INDIVIDUAL LEAGUE PAGE — /leagues/[id]
// ============================================================
// Shows the leaderboard for a specific league.
// Displays the invite code so the creator can share it.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { createClient } from '@/lib/supabase/client'
import type { LeaderboardEntry } from '@/types'
import styles from './league.module.css'

interface League {
  id: string
  name: string
  invite_code: string
  created_by: string
}

export default function LeaguePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const leagueId = params.id as string

  const [league, setLeague] = useState<League | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile) setUsername(profile.username)

      const res = await fetch(`/api/leagues/${leagueId}/leaderboard`)

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load league')
      } else {
        const data = await res.json()
        setLeague(data.league)
        setLeaderboard(data.leaderboard || [])
      }

      setLoading(false)
    }

    load()
  }, [leagueId])

  function copyInviteCode() {
    if (!league) return
    navigator.clipboard.writeText(league.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this league?')) return
    setLeaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', user.id)

    router.push('/leagues')
  }

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div>
      <Nav username={username} />

      <main className="container">
        {loading && <div className="loading">Loading league...</div>}

        {error && (
          <div style={{ padding: '2rem 0' }}>
            <div className="error-box">{error}</div>
            <Link href="/leagues" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              ← Back to Leagues
            </Link>
          </div>
        )}

        {!loading && !error && league && (
          <>
            {/* Header */}
            <div className={styles.pageHeader}>
              <div className={styles.headerLeft}>
                <Link href="/leagues" className={styles.backLink}>
                  ← My Leagues
                </Link>
                <h1>{league.name}</h1>
              </div>

              {/* Invite code box */}
              <div className={styles.inviteBox}>
                <div className={styles.inviteLabel}>Invite Code</div>
                <div className={styles.inviteRow}>
                  <span className={styles.inviteCode}>{league.invite_code}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={copyInviteCode}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <div className={styles.inviteHint}>
                  Share this code with friends so they can join
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length === 0 ? (
              <div className={styles.empty}>
                No scores yet — predictions will be scored after matches finish.
              </div>
            ) : (
              <div className={styles.table}>
                {/* Header row */}
                <div className={`${styles.row} ${styles.headerRow}`}>
                  <span className={styles.colRank}>Rank</span>
                  <span className={styles.colName}>Player</span>
                  <span className={styles.colStat}>Exact</span>
                  <span className={styles.colStat}>Results</span>
                  <span className={styles.colPoints}>Points</span>
                </div>

                {leaderboard.map(entry => {
                  const isMe = entry.user_id === currentUserId

                  return (
                    <div
                      key={entry.user_id}
                      className={`${styles.row} ${isMe ? styles.myRow : ''} ${entry.rank <= 3 ? styles.topRow : ''}`}
                    >
                      <span className={`${styles.colRank} ${styles.rankNum}`}>
                        {rankEmoji(entry.rank)}
                      </span>

                      <div className={styles.colName}>
                        <span className={styles.playerName}>
                          {entry.username}
                          {isMe && <span className={styles.youBadge}>you</span>}
                        </span>
                        <span className={styles.predCount}>
                          {entry.total_predictions} scored
                        </span>
                      </div>

                      <span className={`${styles.colStat} ${styles.statNum}`}>
                        {entry.exact_scores}
                        <span className={styles.statLabel}>x3</span>
                      </span>
                      <span className={`${styles.colStat} ${styles.statNum}`}>
                        {entry.correct_outcomes}
                        <span className={styles.statLabel}>x1</span>
                      </span>

                      <span className={`${styles.colPoints} ${styles.pointsNum}`}>
                        {entry.total_points}
                        <span className={styles.ptsLabel}>pts</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Leave league */}
            <div className={styles.leaveSection}>
              {league.created_by !== currentUserId && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving...' : 'Leave League'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}