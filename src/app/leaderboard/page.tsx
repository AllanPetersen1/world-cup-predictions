'use client'
// ============================================================
// LEADERBOARD PAGE
// ============================================================
// Shows ranked list of all users and their points.
// ============================================================

import { useEffect, useState } from 'react'
import Nav from '@/components/layout/Nav'
import { createClient } from '@/lib/supabase/client'
import type { LeaderboardEntry } from '@/types'
import styles from './leaderboard.module.css'

export default function LeaderboardPage() {
  const supabase = createClient()

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

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

      const res = await fetch('/api/leaderboard')
      if (!res.ok) {
        setError('Failed to load leaderboard')
      } else {
        const { leaderboard: data } = await res.json()
        setLeaderboard(data || [])
      }

      setLoading(false)
    }

    load()
  }, [supabase])

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
        <div className={styles.pageHeader}>
          <h1>Leaderboard</h1>
          <p className={styles.subtitle}>Overall leaderboard of all users. Points update automatically after each match</p>
        </div>

        {loading && <div className="loading">Loading standings...</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && (
          <>
            {/* Scoring key */}
            <div className={styles.scoringKey}>
              <span className="points-badge points-3">+3</span> Exact score ·
              <span className="points-badge points-1" style={{ margin: '0 0.3rem' }}>+1</span> Correct result ·
              <span className="points-badge points-0" style={{ marginLeft: '0.3rem' }}>+0</span> Wrong
            </div>

            {/* Table */}
            {leaderboard.length === 0 ? (
              <div className={styles.empty}>
                No scores yet. Predictions will be scored automatically once matches finish.
              </div>
            ) : (
              <div className={styles.table}>
                {/* Header */}
                <div className={`${styles.row} ${styles.headerRow}`}>
                  <span className={styles.colRank}>Rank</span>
                  <span className={styles.colName}>Player</span>
                  <span className={styles.colStat}>Exact</span>
                  <span className={styles.colStat}>Results</span>
                  <span className={styles.colPoints}>Points</span>
                </div>

                {/* Rows */}
                {leaderboard.map((entry) => {
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
                          {entry.total_predictions} predictions scored
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
          </>
        )}
      </main>
    </div>
  )
}
