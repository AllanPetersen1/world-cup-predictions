// ============================================================
// FOOTBALL API CLIENT
// ============================================================
// Wraps the football-data.org API.
// Free tier: 10 calls/minute, access to major competitions.
// Docs: https://www.football-data.org/documentation/quickstart
// ============================================================

import type { FootballAPIMatch, Match } from '@/types'

const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.FOOTBALL_API_KEY!
const COMPETITION = process.env.FOOTBALL_COMPETITION_CODE || 'WC'

/**
 * Fetch all matches for the configured competition.
 * Returns matches mapped to our internal Match format.
 */
export async function fetchCompetitionMatches(): Promise<Omit<Match, 'id' | 'created_at'>[]> {
  const response = await fetch(
    `${API_BASE}/competitions/${COMPETITION}/matches`,
    {
      headers: { 'X-Auth-Token': API_KEY },
      // Don't cache — we always want fresh data in cron jobs
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Football API error ${response.status}: ${error}`)
  }

  const data = await response.json()
  const matches: FootballAPIMatch[] = data.matches || []

  // Map API format → our internal format
  return matches.map(mapAPIMatchToInternal)
}

/**
 * Fetch only matches that are currently in-play or recently finished.
 * More efficient for the cron job — no need to update all matches.
 */
export async function fetchActiveMatches(): Promise<Omit<Match, 'id' | 'created_at'>[]> {
  // Fetch matches with IN_PLAY or FINISHED status in the last 24h
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateFrom = yesterday.toISOString().split('T')[0] // "YYYY-MM-DD"

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateTo = tomorrow.toISOString().split('T')[0]

  const response = await fetch(
    `${API_BASE}/competitions/${COMPETITION}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    {
      headers: { 'X-Auth-Token': API_KEY },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Football API error ${response.status}: ${error}`)
  }

  const data = await response.json()
  const matches: FootballAPIMatch[] = data.matches || []

  return matches.map(mapAPIMatchToInternal)
}

/**
 * Map football-data.org API response to our Match type.
 */
function mapAPIMatchToInternal(apiMatch: FootballAPIMatch): Omit<Match, 'id' | 'created_at'> {
  return {
    external_id: apiMatch.id,
    home_team: apiMatch.homeTeam.name,
    away_team: apiMatch.awayTeam.name,
    home_team_crest: apiMatch.homeTeam.crest,
    away_team_crest: apiMatch.awayTeam.crest,
    kickoff: apiMatch.utcDate,
    status: mapStatus(apiMatch.status),
    home_score: apiMatch.score.fullTime.home,
    away_score: apiMatch.score.fullTime.away,
    matchday: apiMatch.matchday,
    stage: apiMatch.stage,
    competition: apiMatch.competition.code,
  }
}

/**
 * Map API status strings to our MatchStatus type.
 */
function mapStatus(apiStatus: string): Match['status'] {
  const statusMap: Record<string, Match['status']> = {
    SCHEDULED: 'SCHEDULED',
    TIMED: 'SCHEDULED',
    IN_PLAY: 'IN_PLAY',
    PAUSED: 'PAUSED',
    FINISHED: 'FINISHED',
    POSTPONED: 'POSTPONED',
    CANCELLED: 'CANCELLED',
    SUSPENDED: 'CANCELLED',
  }
  return statusMap[apiStatus] || 'SCHEDULED'
}
