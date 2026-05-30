'use client'
// ============================================================
// MATCH CARD COMPONENT
// ============================================================
// Displays a single match with:
//   - Team names and crests
//   - Kickoff time
//   - Result (if finished)
//   - Prediction form (if match is upcoming)
//   - Points earned (if match is finished)
// ============================================================

import { useState } from 'react'
import { isPredictionLocked, formatScore } from '@/lib/scoring'
import type { Match, Prediction } from '@/types'
import styles from './MatchCard.module.css'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
  onPredictionSaved: (prediction: Prediction) => void
}

export default function MatchCard({ match, prediction, onPredictionSaved }: MatchCardProps) {
  const [homeGoals, setHomeGoals] = useState<string>(
    prediction?.predicted_home?.toString() ?? ''
  )
  const [awayGoals, setAwayGoals] = useState<string>(
    prediction?.predicted_away?.toString() ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const locked = isPredictionLocked(match.kickoff)
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'

  // Format kickoff time for the user's local timezone
  const kickoffDate = new Date(match.kickoff)
  const formattedDate = kickoffDate.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
  const formattedTime = kickoffDate.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  })

  async function handleSave() {
    const home = parseInt(homeGoals)
    const away = parseInt(awayGoals)

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError('Enter valid scores (0 or more)')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          predicted_home: home,
          predicted_away: away,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to save prediction')
      } else {
        onPredictionSaved(data.prediction)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  // Points display
  const pointsBadgeClass =
    prediction?.points_awarded === 3 ? 'points-3' :
    prediction?.points_awarded === 1 ? 'points-1' :
    prediction?.points_awarded === 0 ? 'points-0' :
    prediction ? 'points-pending' : ''

  const pointsLabel =
    prediction?.points_awarded === 3 ? '+3 pts' :
    prediction?.points_awarded === 1 ? '+1 pt' :
    prediction?.points_awarded === 0 ? '0 pts' :
    prediction ? 'Pending' : ''

  return (
    <div className={`card ${styles.card} ${isLive ? styles.live : ''}`}>
      {/* Match header: stage, date, status */}
      <div className={styles.header}>
        <span className={styles.stage}>
          {match.stage?.replace(/_/g, ' ') || `Matchday ${match.matchday}`}
        </span>
        <div className={styles.headerRight}>
          <span className={`status-badge status-${match.status}`}>
            {isLive ? '● Live' : match.status}
          </span>
          {pointsLabel && (
            <span className={`points-badge ${pointsBadgeClass}`}>{pointsLabel}</span>
          )}
        </div>
      </div>

      {/* Teams and score */}
      <div className={styles.matchup}>
        {/* Home team */}
        <div className={`${styles.team} ${styles.teamHome}`}>
          {match.home_team_crest && (
            <img
              src={match.home_team_crest}
              alt={`${match.home_team} crest`}
              className={styles.crest}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className={styles.teamName}>{match.home_team}</span>
        </div>

        {/* Score / VS */}
        <div className={styles.scoreSection}>
          {isFinished || isLive ? (
            <div className={styles.score}>
              <span>{match.home_score ?? '?'}</span>
              <span className={styles.scoreDash}>—</span>
              <span>{match.away_score ?? '?'}</span>
            </div>
          ) : (
            <div className={styles.kickoff}>
              <div className={styles.kickoffDate}>{formattedDate}</div>
              <div className={styles.kickoffTime}>{formattedTime}</div>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className={`${styles.team} ${styles.teamAway}`}>
          {match.away_team_crest && (
            <img
              src={match.away_team_crest}
              alt={`${match.away_team} crest`}
              className={styles.crest}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className={styles.teamName}>{match.away_team}</span>
        </div>
      </div>

      {/* Prediction section */}
      <div className={styles.prediction}>
        {locked ? (
          // Locked: show what they predicted (read-only)
          <div className={styles.lockedPrediction}>
            <span className={styles.lockedLabel}>Your prediction:</span>
            {prediction ? (
              <span className={styles.lockedScore}>
                {formatScore(prediction.predicted_home, prediction.predicted_away)}
              </span>
            ) : (
              <span className={styles.noPrediction}>No prediction made</span>
            )}
          </div>
        ) : (
          // Open: show the input form
          <div className={styles.predictionForm}>
            <span className={styles.predictionLabel}>
              {prediction ? 'Edit prediction' : 'Your prediction'}
            </span>
            <div className={styles.scoreInputs}>
              <input
                type="number"
                min="0"
                max="20"
                value={homeGoals}
                onChange={e => setHomeGoals(e.target.value)}
                className={styles.scoreInput}
                placeholder="0"
                aria-label={`${match.home_team} goals`}
              />
              <span className={styles.inputDash}>—</span>
              <input
                type="number"
                min="0"
                max="20"
                value={awayGoals}
                onChange={e => setAwayGoals(e.target.value)}
                className={styles.scoreInput}
                placeholder="0"
                aria-label={`${match.away_team} goals`}
              />
              <button
                onClick={handleSave}
                disabled={saving || homeGoals === '' || awayGoals === ''}
                className={`btn btn-primary btn-sm ${styles.saveBtn}`}
              >
                {saving ? '...' : saved ? '✓' : prediction ? 'Update' : 'Save'}
              </button>
            </div>
            {error && <p className={styles.inputError}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
