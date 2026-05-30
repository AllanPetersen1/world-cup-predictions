// ============================================================
// SCORING LOGIC
// ============================================================
// Pure functions for calculating prediction points.
// Pure = no side effects, same input always gives same output.
// Easy to test and understand.
// ============================================================

/**
 * Calculate points for a single prediction.
 *
 * Rules:
 *   Exact score match  → 3 points
 *   Correct outcome    → 1 point  (win/draw/loss correct, score wrong)
 *   Wrong prediction   → 0 points
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact score: both goals match perfectly
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 3
  }

  // Correct outcome: did we predict the right winner/draw?
  const predictedOutcome = getOutcome(predictedHome, predictedAway)
  const actualOutcome = getOutcome(actualHome, actualAway)

  if (predictedOutcome === actualOutcome) {
    return 1
  }

  return 0
}

/**
 * Get the outcome of a match from scores.
 * Returns 'HOME', 'AWAY', or 'DRAW'
 */
function getOutcome(home: number, away: number): 'HOME' | 'AWAY' | 'DRAW' {
  if (home > away) return 'HOME'
  if (away > home) return 'AWAY'
  return 'DRAW'
}

/**
 * Check if a match is locked for predictions.
 * Predictions lock 1 minute before kickoff.
 */
export function isPredictionLocked(kickoff: string): boolean {
  const kickoffTime = new Date(kickoff).getTime()
  const now = Date.now()
  const oneMinute = 60 * 1000
  return now >= kickoffTime - oneMinute
}

/**
 * Format a score prediction or result for display.
 * e.g. formatScore(2, 1) → "2 - 1"
 */
export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '? - ?'
  return `${home} - ${away}`
}
