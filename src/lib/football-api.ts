import type { FootballAPIMatch, Match } from '@/types'

const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.FOOTBALL_API_KEY!
const COMPETITION = process.env.FOOTBALL_COMPETITION_CODE || 'WC'

/**
 * Check rate limit headers from football-data.org response.
 * Headers returned:
 *   X-Requests-Available-Minute  — how many calls left this minute
 *   X-RequestCounter-Reset       — seconds until the counter resets
 */
function checkRateLimit(headers: Headers) {
  const available = headers.get('X-Requests-Available-Minute')
  const reset = headers.get('X-RequestCounter-Reset')

  if (available !== null) {
    const remaining = parseInt(available)
    console.log(`Football API: ${remaining} requests remaining this minute`)

    if (remaining <= 1) {
      const resetIn = reset ? parseInt(reset) : 60
      console.warn(`Football API: Rate limit nearly exhausted. Resets in ${resetIn}s`)
    }
  }
}

/**
 * Wait for a given number of milliseconds.
 * Used to pause between requests if rate limit is low.
 */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Make a single request to the football API with rate limit awareness.
 */
async function footballRequest(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { 'X-Auth-Token': API_KEY },
    cache: 'no-store',
  })

  // Always check rate limit headers on every response
  checkRateLimit(response.headers)

  if (response.status === 429) {
    // 429 = Too Many Requests
    const reset = response.headers.get('X-RequestCounter-Reset')
    const waitSeconds = reset ? parseInt(reset) : 60
    console.error(`Football API: Rate limited. Need to wait ${waitSeconds}s`)
    throw new Error(`Rate limited by football API. Try again in ${waitSeconds} seconds.`)
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Football API error ${response.status}: ${error}`)
  }

  return response.json()
}

/**
 * Fetch all matches for the configured competition.
 */
export async function fetchCompetitionMatches(): Promise<Omit<Match, 'id' | 'created_at'>[]> {
  const data = await footballRequest(
    `${API_BASE}/competitions/${COMPETITION}/matches`
  )

  const matches: FootballAPIMatch[] = data.matches || []
  return matches.map(mapAPIMatchToInternal)
}

/**
 * Fetch only matches within a ±1 day window.
 * More efficient for regular cron runs.
 */
export async function fetchActiveMatches(): Promise<Omit<Match, 'id' | 'created_at'>[]> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateFrom = yesterday.toISOString().split('T')[0]

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateTo = tomorrow.toISOString().split('T')[0]

  const data = await footballRequest(
    `${API_BASE}/competitions/${COMPETITION}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
  )

  const matches: FootballAPIMatch[] = data.matches || []
  return matches.map(mapAPIMatchToInternal)
}

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