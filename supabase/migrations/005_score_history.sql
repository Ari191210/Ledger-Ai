-- ═══════════════════════════════════════════════════════════════════════════
-- 005_score_history.sql
--
-- The Ledger Score becomes a tracked instrument, not a number.
--
-- Without this table the score can only ever be a point-in-time value:
-- computeScoreFromInputs() recalculates from user_data.blob (which stores
-- CURRENT state, not an append-only log), so there is no past to reconstruct.
-- Movement, trend, momentum, highs and lows all require snapshots taken over
-- time. This is that ledger.
--
-- One row per user per calendar day. The UNIQUE constraint makes the daily
-- snapshot job idempotent: re-running it on the same day updates rather than
-- duplicating, so a retried or double-fired cron cannot corrupt the series.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS score_history (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The trading day. DATE (not timestamptz) because a snapshot represents a
  -- day's close, and we never want two rows for one day due to a clock skew.
  captured_on  DATE NOT NULL DEFAULT CURRENT_DATE,

  -- The index and its four sectors. Mirrors ScoreBreakdown in lib/ledger-score.ts.
  total        INTEGER NOT NULL CHECK (total       BETWEEN 0 AND 1000),
  pqa          INTEGER NOT NULL CHECK (pqa         BETWEEN 0 AND 400),  -- Examination
  syllabus     INTEGER NOT NULL CHECK (syllabus    BETWEEN 0 AND 250),  -- Coverage
  mistakes     INTEGER NOT NULL CHECK (mistakes    BETWEEN 0 AND 200),  -- Risk
  consistency  INTEGER NOT NULL CHECK (consistency BETWEEN 0 AND 150),  -- Momentum

  -- Supporting fundamentals, so a report can explain WHY the index moved
  -- without re-deriving them from a blob we no longer have.
  streak         INTEGER NOT NULL DEFAULT 0,
  papers_count   INTEGER NOT NULL DEFAULT 0,
  recent_mistakes INTEGER NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: one close per user per day.
  CONSTRAINT score_history_user_day_unique UNIQUE (user_id, captured_on)
);

-- Every read is "this user's series, most recent first".
CREATE INDEX IF NOT EXISTS score_history_user_date_idx
  ON score_history (user_id, captured_on DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Users read their OWN series and nothing else. Nobody writes from the client:
-- snapshots are written exclusively by the service role (the cron job), so a
-- user cannot manufacture a track record. There is deliberately no INSERT,
-- UPDATE or DELETE policy for authenticated users.
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS score_history_select_own ON score_history;
CREATE POLICY score_history_select_own
  ON score_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
