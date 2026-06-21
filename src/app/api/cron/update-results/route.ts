// ============================================================
// CRON JOB ROUTE
// ============================================================
// GET /api/cron/update-results
//
// This is called automatically by:
//   - Vercel Cron (configured in vercel.json)
//   - GitHub Actions (as a fallback)
//
// What it does:
//   1. Fetches recent match results from football API
//   2. Updates match scores in the database
//   3. Calculates points for all predictions on finished matches
//   4. Logs what happened
//
// SECURITY: Protected by a secret token in the Authorization header
// ============================================================

import { createAdminClient } from '@/lib/supabase/server'
import { fetchActiveMatches } from '@/lib/football-api'
import { fetchCompetitionMatches } from '@/lib/football-api'
import { calculatePoints } from '@/lib/scoring'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // ---- Security check ----
  // Only allow requests with the correct secret
  // Vercel and GitHub Actions will include this in the header
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`


  if (authHeader !== expectedToken) {
    console.warn('Cron job called with invalid token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient() // Admin client bypasses Row Level Security
  const log: string[] = []

  try {
    // ---- Step 1: Fetch recent matches from football API ----
    log.push('Fetching active matches from football API...')
    const apiMatches = await fetchCompetitionMatches()
    log.push(`Found ${apiMatches.length} matches from API`)

    // ---- Step 2: Update match scores in database ----
    let updatedMatchCount = 0

    for (const apiMatch of apiMatches) {
      // Find this match in our DB by its external ID
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score')
        .eq('external_id', apiMatch.external_id)
        .single()

      if (!existingMatch) {
        // Match doesn't exist in our DB yet — insert it
        const { error } = await supabase.from('matches').insert({
          external_id: apiMatch.external_id,
          home_team: apiMatch.home_team,
          away_team: apiMatch.away_team,
          home_team_crest: apiMatch.home_team_crest,
          away_team_crest: apiMatch.away_team_crest,
          kickoff: apiMatch.kickoff,
          status: apiMatch.status,
          home_score: apiMatch.home_score,
          away_score: apiMatch.away_score,
          matchday: apiMatch.matchday,
          stage: apiMatch.stage,
          competition: apiMatch.competition,
        })
        if (!error) {
          log.push(`Inserted new match: ${apiMatch.home_team} vs ${apiMatch.away_team}`)
          updatedMatchCount++
        }
        continue
      }

      // Match exists — update its score and status if changed
      const scoreChanged =
        existingMatch.home_score !== apiMatch.home_score ||
        existingMatch.away_score !== apiMatch.away_score ||
        existingMatch.status !== apiMatch.status

      if (!scoreChanged) continue // Skip if nothing changed

      const { error: updateError } = await supabase
        .from('matches')
        .update({
          status: apiMatch.status,
          home_score: apiMatch.home_score,
          away_score: apiMatch.away_score,
        })
        .eq('id', existingMatch.id)

      if (updateError) {
        log.push(`Error updating match ${existingMatch.id}: ${updateError.message}`)
        continue
      }

      updatedMatchCount++
      log.push(
        `Updated ${apiMatch.home_team} vs ${apiMatch.away_team}: ` +
        `${apiMatch.home_score}-${apiMatch.away_score} (${apiMatch.status})`
      )

      // ---- Step 3: Score predictions for finished matches ----
      // Only score if match just finished and scores are available
      if (
        apiMatch.status === 'FINISHED' &&
        apiMatch.home_score !== null &&
        apiMatch.away_score !== null
      ) {
        await scorePredictionsForMatch(
          supabase,
          existingMatch.id,
          apiMatch.home_score,
          apiMatch.away_score,
          log
        )
      }
    }

    log.push(`Done. Updated ${updatedMatchCount} matches.`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      log,
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cron job failed:', message)
    return NextResponse.json(
      { success: false, error: message, log },
      { status: 500 }
    )
  }
}

/**
 * Calculate and save points for all predictions on a finished match.
 */
async function scorePredictionsForMatch(
  supabase: ReturnType<typeof createAdminClient>,
  matchId: string,
  actualHome: number,
  actualAway: number,
  log: string[]
) {
  // Get all predictions for this match that haven't been scored yet
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('id, predicted_home, predicted_away, points_awarded')
    .eq('match_id', matchId)

  if (error) {
    log.push(`Error fetching predictions for match ${matchId}: ${error.message}`)
    return
  }

  if (!predictions || predictions.length === 0) {
    log.push(`No unscored predictions for match ${matchId}`)
    return
  }

  log.push(`Scoring ${predictions.length} predictions for match ${matchId}...`)

  // Score each prediction
  for (const prediction of predictions) {
    const points = calculatePoints(
      prediction.predicted_home,
      prediction.predicted_away,
      actualHome,
      actualAway
    )

    const { error: scoreError } = await supabase
      .from('predictions')
      .update({ points_awarded: points })
      .eq('id', prediction.id)

    if (scoreError) {
      log.push(`Error scoring prediction ${prediction.id}: ${scoreError.message}`)
    }
  }

  log.push(`Scored ${predictions.length} predictions for match ${matchId}`)
}
