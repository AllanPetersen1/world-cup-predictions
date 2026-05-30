// ============================================================
// TYPES — The "shape" of all data in the app
// ============================================================
// These match our Supabase database tables exactly.
// If you change the DB schema, update these too.
// ============================================================

export type MatchStatus = 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'

export interface Match {
  id: string
  external_id: number          // ID from football-data.org
  home_team: string
  away_team: string
  home_team_crest?: string     // URL to team logo image
  away_team_crest?: string
  kickoff: string              // ISO date string e.g. "2026-06-14T18:00:00Z"
  status: MatchStatus
  home_score: number | null    // null until match finishes
  away_score: number | null
  matchday: number | null
  stage: string | null         // e.g. "GROUP_STAGE", "FINAL"
  competition: string
  created_at: string
}

export interface Profile {
  id: string                   // matches Supabase auth user id
  username: string
  email: string
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  predicted_home: number
  predicted_away: number
  points_awarded: number | null  // null until match finishes & scoring runs
  created_at: string
  updated_at: string
}

// Prediction joined with match data (for display purposes)
export interface PredictionWithMatch extends Prediction {
  match: Match
}

// Leaderboard entry — calculated from predictions
export interface LeaderboardEntry {
  user_id: string
  username: string
  total_points: number
  exact_scores: number         // how many 3-point predictions
  correct_outcomes: number     // how many 1-point predictions
  total_predictions: number
  rank: number
}

// What we get back from the football-data.org API
// (We map this into our Match type)
export interface FootballAPIMatch {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  homeTeam: {
    id: number
    name: string
    crest: string
  }
  awayTeam: {
    id: number
    name: string
    crest: string
  }
  score: {
    fullTime: {
      home: number | null
      away: number | null
    }
  }
  competition: {
    name: string
    code: string
  }
}
