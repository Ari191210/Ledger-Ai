-- ═══════════════════════════════════════════════════════════════════════════
-- 006_ai_usage_server_side.sql
--
-- Move the AI daily-usage counter off a row the user can write.
--
-- The counter lived on user_data.ai_calls_today. 000_initial_schema.sql grants
-- "user_data_update_own" (FOR UPDATE USING auth.uid() = id), so any logged-in
-- user could reset their own cap from devtools:
--     supabase.from("user_data").update({ ai_calls_today: 0 })
-- A quota the quota-holder can edit is not a quota.
--
-- ai_rate_limits already existed (001_rls.sql) but was never used by the app,
-- AND carried the same flaw — its policy was FOR ALL USING (auth.uid() =
-- user_id), i.e. user-writable too. This migration adopts that table as the
-- single source of truth and replaces the policy with the server-write-only
-- pattern already used by score_history (005): SELECT for the owner, no
-- INSERT/UPDATE/DELETE policy at all, so only the service role can write.
--
-- The read-modify-write in the route was also racy (concurrent calls read the
-- same value and all wrote n+1). consume_ai_call() below does the day rollover
-- and the increment in one atomic statement.
--
-- user_data.ai_calls_today / ai_calls_reset_at are deliberately NOT dropped:
-- they are the rollback path and the backfill source.
--
-- Run in Supabase SQL editor: paste and click Run. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── The table (declared in 001; ensured here so 006 stands alone) ───────────
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_calls_today    INTEGER     NOT NULL DEFAULT 0,
  ai_calls_reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- ── RLS: the user may read their own usage; only the service role writes ────
-- Drops the permissive FOR ALL policy from 001_rls.sql.
DROP POLICY IF EXISTS "rate_limits_own"          ON ai_rate_limits;
DROP POLICY IF EXISTS ai_rate_limits_select_own  ON ai_rate_limits;

CREATE POLICY ai_rate_limits_select_own
  ON ai_rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Preserve history: carry existing counts over, once ──────────────────────
-- ON CONFLICT DO NOTHING keeps this safe to re-run and never overwrites a
-- count the new system has already started tracking.
INSERT INTO ai_rate_limits (user_id, ai_calls_today, ai_calls_reset_at)
SELECT id,
       COALESCE(ai_calls_today, 0),
       COALESCE(ai_calls_reset_at, now())
FROM user_data
WHERE id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ── Atomic consume: day rollover + increment in one statement ───────────────
-- Returns the caller's usage count *after* this call. SECURITY DEFINER so it
-- can write a table with no write policy; EXECUTE is revoked from anon and
-- authenticated below, so only the service role can reach it.
CREATE OR REPLACE FUNCTION public.consume_ai_call(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'utc');
  v_count INTEGER;
BEGIN
  INSERT INTO ai_rate_limits AS r (user_id, ai_calls_today, ai_calls_reset_at)
  VALUES (p_user_id, 1, v_day)
  ON CONFLICT (user_id) DO UPDATE
    SET ai_calls_today    = CASE WHEN r.ai_calls_reset_at < v_day THEN 1
                                 ELSE r.ai_calls_today + 1 END,
        ai_calls_reset_at = CASE WHEN r.ai_calls_reset_at < v_day THEN v_day
                                 ELSE r.ai_calls_reset_at END
  RETURNING r.ai_calls_today INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL     ON FUNCTION public.consume_ai_call(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_ai_call(UUID) FROM anon, authenticated;
