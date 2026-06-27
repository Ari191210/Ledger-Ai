-- ══════════════════════════════════════════════════════════════════
-- Migration 000 — Full initial schema
-- Run FIRST in Supabase SQL editor before any other migration
-- ══════════════════════════════════════════════════════════════════

-- ── user_data ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_data (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Flat profile columns (written by lib/user-data.ts via ...updates spread)
  grade             TEXT,
  board             TEXT,
  stream            TEXT,
  interests         JSONB,
  "targetExam"      TEXT,
  "onboardingDone"  BOOLEAN,
  "aiProfile"       JSONB,
  plan              JSONB,
  marks             JSONB,
  focus             JSONB,
  exams             JSONB,
  "weakTopics"      JSONB,
  "papersCount"     INT,
  "emailEnabled"    BOOLEAN,
  "parentCode"      TEXT,
  "parentName"      TEXT,
  "referralCode"    TEXT,
  username          TEXT        UNIQUE,
  -- Sync blob (written by lib/sync.ts)
  blob              JSONB       DEFAULT '{}'::jsonb,
  -- Rate limiting (migration 003)
  ai_calls_today    INT         NOT NULL DEFAULT 0,
  ai_calls_reset_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── rooms ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  duration         INT         NOT NULL DEFAULT 25,
  running          BOOLEAN     NOT NULL DEFAULT false,
  started_at       BIGINT,
  seconds_at_pause INT         NOT NULL DEFAULT 0,
  members          TEXT[]      NOT NULL DEFAULT '{}',
  tasks            JSONB       NOT NULL DEFAULT '[]',
  participants     TEXT[]      NOT NULL DEFAULT '{}',
  host_id          UUID,
  bailed           TEXT[]      NOT NULL DEFAULT '{}',
  session_end      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── ai_history ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  tool       TEXT        NOT NULL,
  input_text TEXT,
  output     JSONB,
  result     TEXT,
  grade      TEXT,
  board      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── error_logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,
  message    TEXT,
  stack      TEXT,
  url        TEXT,
  route      TEXT,
  user_agent TEXT,
  user_id    UUID,
  context    JSONB       DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── page_events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT        NOT NULL,
  page       TEXT        NOT NULL,
  tool       TEXT,
  user_id    UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── announcements ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message    TEXT        NOT NULL,
  style      TEXT        NOT NULL DEFAULT 'info',
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── jobs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts     INT         NOT NULL DEFAULT 0,
  error        TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_history_user_id   ON ai_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_history_tool      ON ai_history(tool);
CREATE INDEX IF NOT EXISTS idx_page_events_user_id  ON page_events(user_id);
CREATE INDEX IF NOT EXISTS idx_page_events_session  ON page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created   ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_blob       ON user_data USING GIN (blob);
CREATE INDEX IF NOT EXISTS idx_rooms_bailed         ON rooms     USING GIN (bailed);
CREATE INDEX IF NOT EXISTS jobs_runner_idx          ON jobs(scheduled_at ASC) WHERE status = 'pending';

-- ══════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE user_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- user_data
DROP POLICY IF EXISTS "user_data_select_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_insert_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_update_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_delete_own"  ON user_data;
CREATE POLICY "user_data_select_own" ON user_data FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_data_insert_own" ON user_data FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_data_update_own" ON user_data FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "user_data_delete_own" ON user_data FOR DELETE USING (auth.uid() = id);

-- ai_history
DROP POLICY IF EXISTS "ai_history_select_own" ON ai_history;
DROP POLICY IF EXISTS "ai_history_insert_own" ON ai_history;
DROP POLICY IF EXISTS "ai_history_delete_own" ON ai_history;
CREATE POLICY "ai_history_select_own" ON ai_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_history_insert_own" ON ai_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_history_delete_own" ON ai_history FOR DELETE USING (auth.uid() = user_id);

-- rooms
DROP POLICY IF EXISTS "rooms_select_participant" ON rooms;
DROP POLICY IF EXISTS "rooms_insert_any_authed"  ON rooms;
DROP POLICY IF EXISTS "rooms_update_participant" ON rooms;
CREATE POLICY "rooms_select_participant" ON rooms FOR SELECT USING (
  auth.uid()::text = ANY(participants) OR auth.uid()::text = ANY(members) OR host_id = auth.uid()
);
CREATE POLICY "rooms_insert_any_authed" ON rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "rooms_update_participant" ON rooms FOR UPDATE USING (
  auth.uid()::text = ANY(participants) OR auth.uid()::text = ANY(members) OR host_id = auth.uid()
);

-- error_logs (insert-only for authed users; service role reads)
DROP POLICY IF EXISTS "error_logs_insert_authed" ON error_logs;
CREATE POLICY "error_logs_insert_authed" ON error_logs FOR INSERT WITH CHECK (true);

-- page_events (insert-only)
DROP POLICY IF EXISTS "page_events_insert_authed" ON page_events;
CREATE POLICY "page_events_insert_authed" ON page_events FOR INSERT WITH CHECK (true);

-- announcements (public read)
DROP POLICY IF EXISTS "announcements_select_all" ON announcements;
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT USING (true);
