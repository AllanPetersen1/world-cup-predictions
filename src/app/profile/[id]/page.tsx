'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { formatScore } from '@/lib/scoring'
import type { Match, Prediction } from '@/types'
import styles from './publicprofile.module.css'

type Filter = 'all' | 'live' | 'finished'
type Tab = 'predictions' | 'chart'

interface PredictionWithMatch {
  match: Match
  prediction: Prediction | null
}

interface Profile {
  id: string
  username: string
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipMatch}>{d.label}</div>
      <div className={styles.tooltipRow}>
        <span>This match</span>
        <span className={styles.tooltipPts}>+{d.matchPoints} pts</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>Total</span>
        <span className={styles.tooltipTotal}>{d.cumulative} pts</span>
      </div>
      {d.predicted && (
        <div className={styles.tooltipPred}>Predicted: {d.predicted}</div>
      )}
    </div>
  )
}

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PredictionWithMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [tab, setTab] = useState<Tab>('predictions')

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

  // Build chart data from finished matches only, in chronological order
  const chartData = (() => {
    let cumulative = 0
    return items
      .filter(({ match }) => match.status === 'FINISHED')
      .map(({ match, prediction }) => {
        const pts = prediction?.points_awarded ?? 0
        cumulative += pts
        return {
          label: `${match.home_team} vs ${match.away_team}`,
          shortLabel: `${match.home_team.substring(0, 3).toUpperCase()} v ${match.away_team.substring(0, 3).toUpperCase()}`,
          matchPoints: pts,
          cumulative,
          predicted: prediction
            ? formatScore(prediction.predicted_home, prediction.predicted_away)
            : null,
          actual: match.home_score !== null
            ? formatScore(match.home_score, match.away_score)
            : null,
        }
      })
  })()

  const filtered = [...items]
    .reverse() // show most recent first in predictions tab
    .filter(({ match }) => {
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
  const totalPoints = chartData.length > 0
    ? chartData[chartData.length - 1].cumulative
    : 0

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
      <Link href="/leaderboard" className="btn btn-secondary"
        style={{ marginTop: '1rem', display: 'inline-flex' }}>
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
          <p className={styles.subtitle}>Locked predictions only — hidden before kickoff</p>
        </div>
        <div className={styles.pointsSummary}>
          <div className={styles.pointsNum}>{totalPoints}</div>
          <div className={styles.pointsLabel}>total points</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'predictions' ? styles.tabActive : ''}`}
          onClick={() => setTab('predictions')}
        >
          Predictions
        </button>
        <button
          className={`${styles.tab} ${tab === 'chart' ? styles.tabActive : ''}`}
          onClick={() => setTab('chart')}
        >
          Points Over Time
        </button>
      </div>
      {/* ---- CHART TAB ---- */}
      {tab === 'chart' && (
        <div className={styles.chartSection}>
          {chartData.length < 2 ? (
            <div className={styles.empty}>
              Not enough finished matches to show a chart yet.
            </div>
          ) : (
            <>
              {/* Stat row above chart */}
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>
                    {chartData.filter(d => d.matchPoints === 3).length}
                  </span>
                  <span className={styles.statLabel}>Exact scores</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>
                    {chartData.filter(d => d.matchPoints === 1).length}
                  </span>
                  <span className={styles.statLabel}>Correct results</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>
                    {chartData.filter(d => d.matchPoints === 0).length}
                  </span>
                  <span className={styles.statLabel}>Wrong</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{chartData.length}</span>
                  <span className={styles.statLabel}>Scored</span>
                </div>
              </div>

              {/* Line chart */}
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--navy-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: 'var(--grey)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                    />
                    <YAxis
                      tick={{ fill: 'var(--grey)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="var(--navy-border)" />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--green)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--green)', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: 'var(--green)', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- PREDICTIONS TAB ---- */}
      {tab === 'predictions' && (
        <>
          <div className={styles.filters}>
            {([
              { value: 'all', label: `All (${items.length})` },
              { value: 'live', label: `Live (${liveCount})` },
              { value: 'finished', label: `Finished (${finishedCount})` },
            ] as { value: Filter; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value as Filter)}
                className={`${styles.filterBtn} ${filter === value ? styles.filterActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

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
                              {kickoffDate.toLocaleDateString('en-GB', {
                                weekday: 'short', day: 'numeric', month: 'short'
                              })}
                            </div>
                            <div className={styles.kickoffTime}>
                              {kickoffDate.toLocaleTimeString('en-GB', {
                                hour: '2-digit', minute: '2-digit'
                              })}
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
        </>
      )}
    </main>
  )
}