'use client'
// ============================================================
// PUBLIC PROFILE PAGE — /profile/[id]
// ============================================================
// Shows another user's locked predictions.
// Only visible after kickoff to prevent copying.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { isPredictionLocked, formatScore } from '@/lib/scoring'
import type { Match, Prediction } from '@/types'
import styles from './publicprofile.module.css'

type Filter = 'all' | 'live' | 'finished'

interface PredictionWithMatch {
  match: Match
  prediction: Prediction | null
}

interface Profile {
  id: string
  username: string
}

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PredictionWithMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/profile/${userId}/predictions`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load profile')
      } else {
        const data = await res.json()
        setProfile(data.profile)
        setItems(data.predictions || [])
      }
      setLoading(false)
    }
    load()
  }, [userId])

  const filtered = items.filter(({ match }) => {
    if (filter === 'live') return match.status === 'IN_PLAY' || match.status === 'PAUSED'
    if (filter === 'finished') return match.status === 'FINISHED'
    return true
  })

  const liveCount = items.filter(({ match }) =>
    match.status === 'IN_PLAY' || match.status === 'PAUSED'
  ).length
  const finishedCount = items.filter(({ match }) =>
    match.status === 'FINISHED'
  ).length

  const totalPoints = items.reduce((sum, { prediction }) =>
    sum + (prediction?.points_awarded || 0), 0
  )

  const rankEmoji = (points: number | null) => {
    if (points === 3) return { label: '+3', cls: 'points-3' }
    if (points === 1) return { label: '+1', cls: 'points-1' }
    if (points === 0) return { label: '0', cls: 'points-0' }
    return { label: '?', cls: 'points-pending' }
  }

  if (loading) return <div className="loading">Loading predictions...</div>

  if (error) return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div className="error-box">{error}</div>
      <Link href="/leaderboard" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
        ← Back
      </Link>
    </div>
  )

  return (
    <main className="container">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Link href="/leaderboard" className={styles.backLink}>← Leaderboard</Link>
          <h1>{profile?.username}</h1>
          <p className={styles.subtitle}>
            Locked predictions only — hidden before kickoff
          </p>
        </div>
        {/* Points summary */}
        <div className={styles.pointsSummary}>
          <div className={styles.pointsNum}>{totalPoints}</div>
          <div className={styles.pointsLabel}>total points</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {([
          { value: 'all', label: `All (${items.length})` },
          { value: 'live', label: `Live (${liveCount})` },
          { value: 'finished', label: `Finished (${finishedCount})` },
        ] as { value: Filter; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`${styles.filterBtn} ${filter === value ? styles.filterActive : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Prediction cards */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          No {filter === 'all' ? '' : filter} predictions to show yet.
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(({ match, prediction }) => {
            const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
            const isFinished = match.status === 'FINISHED'
            const points = rankEmoji(prediction?.points_awarded ?? null)
            const kickoffDate = new Date(match.kickoff)

            return (
              <div
                key={match.id}
                className={`card ${styles.card} ${isLive ? styles.live : ''}`}
              >
                {/* Card header */}
                <div className={styles.cardHeader}>
                  <span className={styles.stage}>
                    {match.stage?.replace(/_/g, ' ') || `Matchday ${match.matchday}`}
                  </span>
                  <div className={styles.headerRight}>
                    <span className={`status-badge status-${match.status}`}>
                      {isLive ? '● Live' : match.status}
                    </span>
                    {isFinished && prediction && (
                      <span className={`points-badge ${points.cls}`}>
                        {points.label} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams + scores */}
                <div className={styles.matchup}>
                  <div className={`${styles.team} ${styles.teamHome}`}>
                    {match.home_team_crest && (
                      <div
                        className={styles.crest}
                        style={{ backgroundImage: `url(${match.home_team_crest})` }}
                        role="img"
                        aria-label={match.home_team}
                      />
                    )}
                    <span className={styles.teamName}>{match.home_team}</span>
                  </div>

                  <div className={styles.scoreSection}>
                    {isFinished || isLive ? (
                      <div className={styles.score}>
                        <span>{match.home_score ?? '?'}</span>
                        <span className={styles.scoreDash}>—</span>
                        <span>{match.away_score ?? '?'}</span>
                      </div>
                    ) : (
                      <div className={styles.kickoff}>
                        <div className={styles.kickoffDate}>
                          {kickoffDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className={styles.kickoffTime}>
                          {kickoffDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`${styles.team} ${styles.teamAway}`}>
                    {match.away_team_crest && (
                      <div
                        className={styles.crest}
                        style={{ backgroundImage: `url(${match.away_team_crest})` }}
                        role="img"
                        aria-label={match.away_team}
                      />
                    )}
                    <span className={styles.teamName}>{match.away_team}</span>
                  </div>
                </div>

                {/* Their prediction */}
                <div className={styles.predictionRow}>
                  <span className={styles.predLabel}>Predicted:</span>
                  {prediction ? (
                    <span className={styles.predScore}>
                      {formatScore(prediction.predicted_home, prediction.predicted_away)}
                    </span>
                  ) : (
                    <span className={styles.noPred}>No prediction made</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}