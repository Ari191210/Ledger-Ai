-- ══════════════════════════════════════════════════════════════════
-- Ledger — Row Level Security policies
-- Run this in Supabase SQL editor or via CLI: supabase db push
-- ══════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ────────────────────────────────────────────────
ALTER TABLE IF EXISTS user_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS error_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS page_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════
-- user_data — users own their own row
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "user_data_select_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_insert_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_update_own"  ON user_data;
DROP POLICY IF EXISTS "user_data_delete_own"  ON user_data;

CREATE POLICY "user_data_select_own" ON user_data
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_data_insert_own" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_data_update_own" ON user_data
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "user_data_delete_own" ON user_data
  FOR DELETE USING (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════
-- ai_history — users own their own history rows
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "ai_history_select_own"  ON ai_history;
DROP POLICY IF EXISTS "ai_history_insert_own"  ON ai_history;
DROP POLICY IF EXISTS "ai_history_delete_own"  ON ai_history;

CREATE POLICY "ai_history_select_own" ON ai_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_history_insert_own" ON ai_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_history_delete_own" ON ai_history
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- rooms — participants can read rooms they're in; anyone can create
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "rooms_select_participant"  ON rooms;
DROP POLICY IF EXISTS "rooms_insert_any_authed"   ON rooms;
DROP POLICY IF EXISTS "rooms_update_participant"  ON rooms;

-- Room is readable if the user's id appears in participants array
CREATE POLICY "rooms_select_participant" ON rooms
  FOR SELECT USING (
    auth.uid()::text = ANY(participants)
    OR host_id = auth.uid()
  );

CREATE POLICY "rooms_insert_any_authed" ON rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rooms_update_participant" ON rooms
  FOR UPDATE USING (
    auth.uid()::text = ANY(participants)
    OR host_id = auth.uid()
  );

-- ══════════════════════════════════════════════════════════════════
-- error_logs — insert-only for authenticated users; read by service role only
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "error_logs_insert_authed" ON error_logs;

CREATE POLICY "error_logs_insert_authed" ON error_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No SELECT policy — only service role (admin dashboard) can read errors

-- ══════════════════════════════════════════════════════════════════
-- page_events — insert-only for authenticated users
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "page_events_insert_authed" ON page_events;

CREATE POLICY "page_events_insert_authed" ON page_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ══════════════════════════════════════════════════════════════════
-- announcements — public read, service role write
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "announcements_select_all" ON announcements;

CREATE POLICY "announcements_select_all" ON announcements
  FOR SELECT USING (true);

-- ══════════════════════════════════════════════════════════════════
-- ai_calls rate limit table (create if not exists)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_calls_today    INTEGER   NOT NULL DEFAULT 0,
  ai_calls_reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_own" ON ai_rate_limits;
CREATE POLICY "rate_limits_own" ON ai_rate_limits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- Index helpers
-- ══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_ai_history_user_id   ON ai_history(user_id);
CREATE INDEX IF NOT EXISTS idx_page_events_user_id  ON page_events(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created   ON error_logs(created_at DESC);
