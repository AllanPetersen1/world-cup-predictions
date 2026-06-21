'use client'

import { useEffect, useState, useCallback } from 'react'
import MatchCard from '@/components/ui/MatchCard'
import { createClient } from '@/lib/supabase/client'
import { formatScore } from '@/lib/scoring'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import type { Match, Prediction } from '@/types'
import styles from './matches.module.css'

type MatchFilter = 'all' | 'upcoming' | 'live' | 'finished'
type Tab = 'matches' | 'stats'

// ============================================================
// STATS CALCULATIONS
// ============================================================

function calculateStats(
  chartData: any[],
  statsItems: { match: any; prediction: any }[],
  totalMatches: number
) {
  const scored = statsItems.filter(i => i.prediction?.points_awarded !== null && i.prediction !== null)
  const totalPoints = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0
  const exactScores = chartData.filter(d => d.matchPoints === 3).length
  const correctResults = chartData.filter(d => d.matchPoints === 1).length
  const wrong = chartData.filter(d => d.matchPoints === 0).length
  const avgPoints = scored.length > 0 ? (totalPoints / scored.length).toFixed(1) : '0.0'
  const predictionRate = totalMatches > 0
    ? Math.round((statsItems.filter(i => i.prediction !== null).length / totalMatches) * 100)
    : 0

  // Best streak of consecutive correct results (1 or 3 pts)
  let bestStreak = 0
  let currentStreak = 0
  for (const item of statsItems) {
    if ((item.prediction?.points_awarded ?? 0) > 0) {
      currentStreak++
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  // Last 5 form
  const last5 = statsItems.slice(-5).map(item => {
    const pts = item.prediction?.points_awarded ?? -1
    if (pts === 3) return { label: '3', type: 'exact' }
    if (pts === 1) return { label: '1', type: 'correct' }
    if (pts === 0) return { label: '0', type: 'wrong' }
    return { label: '-', type: 'none' }
  })

  // Favourite scoreline
  const scorelineCounts: Record<string, number> = {}
  for (const item of statsItems) {
    if (item.prediction) {
      const key = `${item.prediction.predicted_home}-${item.prediction.predicted_away}`
      scorelineCounts[key] = (scorelineCounts[key] || 0) + 1
    }
  }
  const favouriteScoreline = Object.entries(scorelineCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0]?.replace('-', ' - ') || null

  // Biggest miss — largest combined goal difference between prediction and actual
  let biggestMiss: { match: any; predicted: string; actual: string; diff: number } | null = null
  for (const item of statsItems) {
    if (item.prediction && item.match.home_score !== null) {
      const diff =
        Math.abs(item.prediction.predicted_home - item.match.home_score) +
        Math.abs(item.prediction.predicted_away - item.match.away_score)
      if (!biggestMiss || diff > biggestMiss.diff) {
        biggestMiss = {
          match: item.match,
          predicted: `${item.prediction.predicted_home} - ${item.prediction.predicted_away}`,
          actual: `${item.match.home_score} - ${item.match.away_score}`,
          diff,
        }
      }
    }
  }

  return {
    totalPoints, exactScores, correctResults, wrong,
    avgPoints, predictionRate, bestStreak, last5,
    favouriteScoreline, biggestMiss, totalScored: scored.length,
  }
}

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
        <div className={styles.tooltipPred}>
          Predicted: {d.predicted} · Actual: {d.actual}
        </div>
      )}
    </div>
  )
}

export default function MatchesPage() {
  const supabase = createClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<MatchFilter>('upcoming')
  const [tab, setTab] = useState<Tab>('matches')

  // Stats tab state
  const [statsItems, setStatsItems] = useState<{ match: Match; prediction: Prediction | null }[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [totalMatches, setTotalMatches] = useState(0)

  const loadMatches = useCallback(async () => {
    try {
      const [matchesRes, predictionsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/predictions'),
      ])

      if (!matchesRes.ok) throw new Error('Failed to load matches')
      if (!predictionsRes.ok) throw new Error('Failed to load predictions')

      const { matches: matchData } = await matchesRes.json()
      const { predictions: predData } = await predictionsRes.json()

      setMatches(matchData || [])

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
  }, [])

  async function loadStats() {
    if (statsLoaded) return
    setStatsLoading(true)
    const res = await fetch('/api/stats')
    if (res.ok) {
      const { predictions: data, totalMatches: total } = await res.json()
      setStatsItems(data || [])
      setTotalMatches(total || 0)
      setStatsLoaded(true)
    }
    setStatsLoading(false)
  }

  useEffect(() => {
  loadMatches()

  const interval = setInterval(() => {
    loadMatches()
  }, 5 * 60 * 1000) // refetch every 5 minutes

  return () => clearInterval(interval)
}, [loadMatches])

  // Load stats when switching to that tab
  useEffect(() => {
    if (tab === 'stats') loadStats()
  }, [tab])

  function handlePredictionSaved(prediction: Prediction) {
    setPredictions(prev => ({
      ...prev,
      [prediction.match_id]: prediction,
    }))
  }

  // Build chart data
  const chartData = (() => {
    let cumulative = 0
    return statsItems.map(({ match, prediction }) => {
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

  const totalPoints = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0
  const exactScores = chartData.filter(d => d.matchPoints === 3).length
  const correctResults = chartData.filter(d => d.matchPoints === 1).length
  const wrongPreds = chartData.filter(d => d.matchPoints === 0).length

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return m.status === 'SCHEDULED'
    if (filter === 'live') return m.status === 'IN_PLAY' || m.status === 'PAUSED'
    if (filter === 'finished') return m.status === 'FINISHED'
    return true
  })

  const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED')
  const predictionsMade = upcomingMatches.filter(m => predictions[m.id]).length

  const filterLabels: { value: MatchFilter; label: string }[] = [
    { value: 'upcoming', label: `Upcoming (${upcomingMatches.length})` },
    { value: 'live', label: `Live (${matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length})` },
    { value: 'finished', label: `Finished (${matches.filter(m => m.status === 'FINISHED').length})` },
    { value: 'all', label: `All (${matches.length})` },
  ]

  return (
    <div>
      <main className="container">
        <div className={styles.pageHeader}>
          <h1>My Predictions</h1>
          
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'matches' ? styles.tabActive : ''}`}
            onClick={() => setTab('matches')}
          >
            Matches
          </button>
          <button
            className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
            onClick={() => setTab('stats')}
          >
            My Stats
          </button>
        </div>

        {/* ---- MATCHES TAB ---- */}
        {tab === 'matches' && (
          <>
          {upcomingMatches.length > 0 && tab === 'matches' && (
            <>
              <p className={styles.predictionProgress}>
                {predictionsMade} / {upcomingMatches.length} predictions made
              </p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(predictionsMade / upcomingMatches.length) * 100}%` }}
                />
              </div>
            </>
          )}
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

            {loading && <div className="loading">Loading matches...</div>}
            {error && <div className="error-box" style={{ margin: '2rem 0' }}>{error}</div>}

            {!loading && !error && filteredMatches.length === 0 && (
              <div className={styles.empty}>
                <span>No {filter === 'all' ? '' : filter} matches yet</span>
                {matches.length === 0 && (
                  <p className={styles.emptyHint}>
                    Matches will appear here once they're fetched from the football API.
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
          </>
        )}

        {/* ---- STATS TAB ---- */}
        {tab === 'stats' && (
          <div className={styles.statsSection}>
            {statsLoading && <div className="loading">Loading stats...</div>}

            {!statsLoading && chartData.length === 0 && (
              <div className={styles.empty}>
                <span>No scored matches yet</span>
                <p className={styles.emptyHint}>
                  Your stats will appear here once matches finish and results are scored.
                </p>
              </div>
            )}

            {!statsLoading && chartData.length > 0 && (() => {
              const stats = calculateStats(chartData, statsItems, totalMatches)
              return (
                <>
                  {/* ---- Top stat cards ---- */}
                  <div className={styles.statRow}>
                    <div className={styles.stat}>
                      <span className={styles.statNum}>{stats.totalPoints}</span>
                      <span className={styles.statLabel}>Total Points</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNum}>{stats.avgPoints}</span>
                      <span className={styles.statLabel}>Avg Per Match</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNum}>{stats.predictionRate}%</span>
                      <span className={styles.statLabel}>Prediction Rate</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNum}>{stats.bestStreak}</span>
                      <span className={styles.statLabel}>Best Streak</span>
                    </div>
                  </div>

                  {/* ---- Accuracy breakdown ---- */}
                  <div className={styles.accuracyRow}>
                    <div className={`${styles.accuracyStat} ${styles.exact}`}>
                      <span className={styles.accuracyNum}>{stats.exactScores}</span>
                      <span className={styles.accuracyLabel}>Exact Scores</span>
                      <span className={styles.accuracyPts}>+3 pts each</span>
                    </div>
                    <div className={`${styles.accuracyStat} ${styles.correct}`}>
                      <span className={styles.accuracyNum}>{stats.correctResults}</span>
                      <span className={styles.accuracyLabel}>Correct Results</span>
                      <span className={styles.accuracyPts}>+1 pt each</span>
                    </div>
                    <div className={`${styles.accuracyStat} ${styles.wrong}`}>
                      <span className={styles.accuracyNum}>{stats.wrong}</span>
                      <span className={styles.accuracyLabel}>Wrong</span>
                      <span className={styles.accuracyPts}>0 pts</span>
                    </div>
                  </div>

                  {/* ---- Form + fun facts ---- */}
                  <div className={styles.insightRow}>
                    {/* Last 5 form */}
                    <div className={styles.insightCard}>
                      <div className={styles.insightTitle}>Last 5 Form</div>
                      <div className={styles.formDots}>
                        {stats.last5.length > 0 ? stats.last5.map((f, i) => (
                          <div
                            key={i}
                            className={`${styles.formDot} ${styles[`form_${f.type}`]}`}
                            title={f.label === '3' ? 'Exact' : f.label === '1' ? 'Correct' : f.label === '0' ? 'Wrong' : 'No prediction'}
                          >
                            {f.label}
                          </div>
                        )) : <span className={styles.insightEmpty}>No data yet</span>}
                      </div>
                    </div>

                    {/* Favourite scoreline */}
                    <div className={styles.insightCard}>
                      <div className={styles.insightTitle}>Favourite Prediction</div>
                      {stats.favouriteScoreline ? (
                        <div className={styles.insightBig}>{stats.favouriteScoreline}</div>
                      ) : (
                        <span className={styles.insightEmpty}>No data yet</span>
                      )}
                    </div>

                    {/* Biggest miss */}
                    <div className={styles.insightCard}>
                      <div className={styles.insightTitle}>Biggest Miss</div>
                      {stats.biggestMiss ? (
                        <div className={styles.biggestMiss}>
                          <div className={styles.missTeams}>
                            {stats.biggestMiss.match.home_team} vs {stats.biggestMiss.match.away_team}
                          </div>
                          <div className={styles.missScores}>
                            <span className={styles.missPred}>You: {stats.biggestMiss.predicted}</span>
                            <span className={styles.missActual}>Real: {stats.biggestMiss.actual}</span>
                          </div>
                        </div>
                      ) : (
                        <span className={styles.insightEmpty}>No data yet</span>
                      )}
                    </div>
                  </div>

                  {/* ---- Chart ---- */}
                  {chartData.length >= 2 && (
                    <div className={styles.chartWrap}>
                      <div className={styles.chartTitle}>Points Over Time</div>
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
                  )}

                  {/* ---- Match by match list ---- */}
                  <div className={styles.scoredList}>
                    <div className={styles.scoredTitle}>Match by Match</div>
                    {[...statsItems].reverse().map(({ match, prediction }) => (
                      <div key={match.id} className={styles.scoredRow}>
                        <div className={styles.scoredTeams}>
                          {match.home_team} vs {match.away_team}
                        </div>
                        <div className={styles.scoredRight}>
                          <span className={styles.scoredActual}>
                            {formatScore(match.home_score, match.away_score)}
                          </span>
                          {prediction ? (
                            <>
                              <span className={styles.scoredPred}>
                                {formatScore(prediction.predicted_home, prediction.predicted_away)}
                              </span>
                              <span className={`points-badge ${
                                prediction.points_awarded === 3 ? 'points-3' :
                                prediction.points_awarded === 1 ? 'points-1' : 'points-0'
                              }`}>
                                {prediction.points_awarded === 3 ? '+3' :
                                prediction.points_awarded === 1 ? '+1' : '0'}
                              </span>
                            </>
                          ) : (
                            <span className={styles.noPred}>No prediction</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </main>
    </div>
  )
}