'use client'
// ============================================================
// MATCHES PAGE
// ============================================================
// The main page where users see all matches and make predictions.
// Loads matches and the user's predictions, then displays them.
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import Nav from '@/components/layout/Nav'
import MatchCard from '@/components/ui/MatchCard'
import { createClient } from '@/lib/supabase/client'
import type { Match, Prediction } from '@/types'
import styles from './matches.module.css'

type Filter = 'all' | 'upcoming' | 'live' | 'finished'

export default function MatchesPage() {
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('upcoming')

  const loadData = useCallback(async () => {
    try {
      // Get current user for their username
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get username from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile) setUsername(profile.username)

      // Fetch matches and predictions in parallel
      const [matchesRes, predictionsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/predictions'),
      ])

      if (!matchesRes.ok) throw new Error('Failed to load matches')
      if (!predictionsRes.ok) throw new Error('Failed to load predictions')

      const { matches: matchData } = await matchesRes.json()
      const { predictions: predData } = await predictionsRes.json()

      setMatches(matchData || [])

      // Index predictions by match_id for quick lookup
      const predByMatch: Record<string, Prediction> = {}
      for (const pred of predData || []) {
        predByMatch[pred.match_id] = pred
      }
      setPredictions(predByMatch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handlePredictionSaved(prediction: Prediction) {
    setPredictions(prev => ({
      ...prev,
      [prediction.match_id]: prediction,
    }))
  }

  // Filter matches based on selected tab
  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return m.status === 'SCHEDULED'
    if (filter === 'live') return m.status === 'IN_PLAY' || m.status === 'PAUSED'
    if (filter === 'finished') return m.status === 'FINISHED'
    return true
  })

  // Count predictions made vs possible
  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED')
  const predictionsMade = upcomingMatches.filter(m => predictions[m.id]).length

  const filterLabels: { value: Filter; label: string }[] = [
    { value: 'upcoming', label: `Upcoming (${upcomingMatches.length})` },
    { value: 'live', label: `Live (${matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length})` },
    { value: 'finished', label: `Finished (${matches.filter(m => m.status === 'FINISHED').length})` },
    { value: 'all', label: `All (${matches.length})` },
  ]

  return (
    <div>
      <Nav username={username} />

      <main className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1>Matches</h1>
            {upcomingMatches.length > 0 && (
              <p className={styles.predictionProgress}>
                {predictionsMade} / {upcomingMatches.length} predictions made
              </p>
            )}
          </div>
          {/* Progress bar */}
          {upcomingMatches.length > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(predictionsMade / upcomingMatches.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className={styles.filters}>
          {filterLabels.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`${styles.filterBtn} ${filter === value ? styles.filterActive : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && <div className="loading">Loading matches...</div>}
        {error && <div className="error-box" style={{ margin: '2rem 0' }}>{error}</div>}

        {!loading && !error && filteredMatches.length === 0 && (
          <div className={styles.empty}>
            <span>No {filter === 'all' ? '' : filter} matches yet</span>
            {matches.length === 0 && (
              <p className={styles.emptyHint}>
                Matches will appear here once they're fetched from the football API.
                Ask your admin to run the initial sync.
              </p>
            )}
          </div>
        )}

        <div className={styles.matchList}>
          {filteredMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              onPredictionSaved={handlePredictionSaved}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
