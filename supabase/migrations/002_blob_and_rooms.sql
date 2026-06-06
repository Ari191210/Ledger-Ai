-- ══════════════════════════════════════════════════════════════════
-- Migration 002 — user_data.blob JSONB + rooms.bailed TEXT[]
-- Run in Supabase SQL editor: paste and click Run
-- ══════════════════════════════════════════════════════════════════

-- ── 1. user_data: add blob JSONB column ────────────────────────────────────
-- The sync layer (lib/sync.ts) already writes/reads user_data.blob.
-- If the column exists as TEXT, cast it to JSONB.
-- If it doesn't exist, create it.

DO $$
BEGIN
  -- Column doesn't exist at all → add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_data' AND column_name = 'blob'
  ) THEN
    ALTER TABLE user_data ADD COLUMN blob JSONB DEFAULT '{}'::jsonb;

  -- Column exists but is TEXT → convert it
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_data'
      AND column_name = 'blob'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE user_data
      ALTER COLUMN blob TYPE JSONB
      USING CASE
        WHEN blob IS NULL OR blob = '' THEN '{}'::jsonb
        ELSE blob::jsonb
      END;
  END IF;
END $$;

-- Ensure default is set either way
ALTER TABLE user_data
  ALTER COLUMN blob SET DEFAULT '{}'::jsonb;

-- Index for fast blob lookups (GIN supports @> and ? operators on JSONB)
CREATE INDEX IF NOT EXISTS idx_user_data_blob ON user_data USING GIN (blob);


-- ── 2. rooms: add bailed TEXT[] column ─────────────────────────────────────
-- Study Rooms bail pact mechanic: array of display names who left early.
-- The rooms page pushes names into this array via array_append().

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS bailed TEXT[] DEFAULT '{}';

-- Index for fast array membership checks
CREATE INDEX IF NOT EXISTS idx_rooms_bailed ON rooms USING GIN (bailed);


-- ── 3. rooms: ensure session_end column exists ──────────────────────────────
-- Needed to mark when a room session completes (for bail pact logic).
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ;


-- ── 4. user_data: ensure updated_at column exists ───────────────────────────
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
