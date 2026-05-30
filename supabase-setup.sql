-- ============================================================
-- WORLDCUP PREDICTOR — COMPLETE DATABASE SETUP
-- ============================================================
-- Run this entire file in the Supabase SQL Editor.
-- Go to: your project → SQL Editor → New Query → paste → Run
--
-- This creates:
--   1. All tables
--   2. Row Level Security (RLS) policies
--   3. Automatic triggers
-- ============================================================


-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
-- Stores each user's display name.
-- Automatically created when a user signs up (see trigger below).
-- The id links to Supabase Auth users.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow users to read any profile (needed for leaderboard)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);  -- Anyone logged in can read any profile

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);  -- Users can only update their own profile


-- ============================================================
-- 2. MATCHES TABLE
-- ============================================================
-- Stores football match data fetched from the API.
-- Only the cron job (using admin client) writes to this table.

CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     INTEGER UNIQUE NOT NULL,  -- football-data.org match ID
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  home_team_crest TEXT,
  away_team_crest TEXT,
  kickoff         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'SCHEDULED',
  home_score      INTEGER,  -- NULL until match finishes
  away_score      INTEGER,
  matchday        INTEGER,
  stage           TEXT,
  competition     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on kickoff for fast sorting
CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON public.matches(kickoff);
CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches(status);
CREATE INDEX IF NOT EXISTS matches_external_id_idx ON public.matches(external_id);

-- Row Level Security: Everyone can read matches, no one can write from browser
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_all"
  ON public.matches FOR SELECT
  USING (true);  -- All logged-in users can read matches

-- Note: INSERT/UPDATE is done server-side with the service role key
-- which bypasses RLS, so we don't need an insert policy here


-- ============================================================
-- 3. PREDICTIONS TABLE
-- ============================================================
-- Stores each user's score predictions for each match.
-- Users can only see/edit their own predictions.

CREATE TABLE IF NOT EXISTS public.predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  predicted_home  INTEGER NOT NULL CHECK (predicted_home >= 0),
  predicted_away  INTEGER NOT NULL CHECK (predicted_away >= 0),
  points_awarded  INTEGER,  -- NULL until match is scored, then 0, 1, or 3
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have ONE prediction per match
  CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS predictions_user_id_idx ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS predictions_match_id_idx ON public.predictions(match_id);

-- Row Level Security
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Users can read their own predictions
CREATE POLICY "predictions_select_own"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own predictions
CREATE POLICY "predictions_insert_own"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "predictions_update_own"
  ON public.predictions FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. TRIGGER: Auto-create profile on signup
-- ============================================================
-- When a new user signs up via Supabase Auth, this function
-- automatically creates a row in the profiles table.
-- The username comes from the metadata set during signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges to write to profiles
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    -- Use username from metadata if provided, otherwise use part of email
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Attach the function to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 5. TRIGGER: Auto-update updated_at on predictions
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_updated_at ON public.predictions;
CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
-- Tables created:
--   public.profiles    — user display names
--   public.matches     — football match data
--   public.predictions — user score predictions
--
-- Next steps:
--   1. Go to Authentication → Settings in your Supabase project
--   2. Set "Site URL" to your Vercel URL
--   3. Add your local URL (http://localhost:3000) to "Redirect URLs"
-- ============================================================
