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
--
-- user_data.id is TEXT in the live database, not the UUID that
-- 000_initial_schema.sql declares, so it must be cast — and because it is text
-- it carries no foreign key to auth.users. Two guards follow from that: skip
-- anything that is not a well-formed UUID (the cast would abort the migration),
-- and skip ids with no matching auth user (the FK on user_id would reject them).
-- The ::text comparison avoids depending on which side is uuid.
INSERT INTO ai_rate_limits (user_id, ai_calls_today, ai_calls_reset_at)
SELECT ud.id::uuid,
       COALESCE(ud.ai_calls_today, 0),
       COALESCE(ud.ai_calls_reset_at, now())
FROM user_data ud
WHERE ud.id IS NOT NULL
  AND ud.id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id::text = ud.id::text)
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
