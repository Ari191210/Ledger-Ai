-- ═══════════════════════════════════════════════════════════════════════════
-- 033_today.sql   ·   M21-1 / M21-3
--
-- WHAT THIS CLOSES
--
-- Architecture Part L (Today Engine); B.12: *"Today owns no facts. It is a
-- projection with a cache and one durable field, `students.last_seen_at`."*
-- L.5: *"`last_seen_at` advances only when Today is actually rendered … An
-- accomplishment is shown once and then moves into the record — it does not
-- persist as a badge."*
--
-- This migration adds exactly the one durable field B.12 names, and exactly
-- one write path for it — the same "read-then-append under a lock" shape
-- `012_students_and_profiles.sql §5` (`set_student_profile`) already
-- established, because the hazard is the same one: a whole-row read-
-- modify-write from the client would race the same way `user_data` used to.
--
-- ADDITIVE ONLY. One column on `students` (012), one function. Nothing
-- existing is touched.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- NOT APPLIED to any database by the milestone that wrote it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. `students.last_seen_at` — B.12's one durable field ──────────────────
--
-- NULL means "Today has never been rendered for this student" — L.4's
-- `no_evidence_yet` / a brand-new account reads this as "everything since the
-- beginning of time is new", which `lib/today/engine.ts`'s
-- `accomplishmentsSince()` implements as `since = lastSeenAtMs ?? -Infinity`.
-- It is NOT defaulted to `now()` on creation, because a default of "now" would
-- silently hide every accomplishment that happened between account creation
-- and first Today render — exactly the kind of silent loss 012's profile chain
-- exists to prevent, one table over.
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN students.last_seen_at IS
  'B.12 / L.5. The one durable field the Today Engine owns. Advances only when Today is actually rendered, via public.mark_today_seen() — never by a client UPDATE. NULL means Today has never been rendered for this student.';

-- ── 2. `mark_today_seen()` — the ONLY write path for `last_seen_at` ────────
--
-- Returns the PREVIOUS value (before this call), because that is exactly what
-- the caller needs: `lib/today/engine.ts` computes "what changed since I was
-- last here" from the OLD `last_seen_at`, and only after that computation is
-- complete does the caller advance the row to `now()`. Reading the old value
-- and writing the new one in ONE function call, under ONE lock, is what makes
-- "read old, then write new" atomic — the same reasoning `set_student_profile`
-- gives for locking the identity row before it reads `is_current`.
--
-- `p_now` defaults to `now()`; a caller may pass an explicit timestamp only
-- for deterministic testing against a live database, never to backdate a
-- student's own visit.
CREATE OR REPLACE FUNCTION public.mark_today_seen(p_now TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (previous_last_seen_at TIMESTAMPTZ, new_last_seen_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_old TIMESTAMPTZ;
  v_new TIMESTAMPTZ := COALESCE(p_now, now());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'mark_today_seen: no authenticated caller'
      USING ERRCODE = '28000';
  END IF;

  PERFORM public.ensure_student();

  SELECT last_seen_at INTO v_old FROM students
   WHERE student_id = v_uid
     FOR UPDATE;

  UPDATE students SET last_seen_at = v_new WHERE student_id = v_uid;

  RETURN QUERY SELECT v_old, v_new;
END;
$$;

REVOKE ALL     ON FUNCTION public.mark_today_seen(TIMESTAMPTZ) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_today_seen(TIMESTAMPTZ) TO authenticated, service_role;

COMMENT ON FUNCTION public.mark_today_seen(TIMESTAMPTZ) IS
  'The only write path for students.last_seen_at (M21-3, L.5). Reads the prior value and advances to now() under FOR UPDATE on the caller''s own students row, in one transaction — so "what is new since last render" and "the render happened" cannot race. Called once per Today render, after the response is built, never before.';

-- ── 3. Verification the founder can run after applying this file ──────────
DO $$
DECLARE
  n_col INT;
BEGIN
  SELECT count(*) INTO n_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'last_seen_at';

  IF n_col <> 1 THEN
    RAISE EXCEPTION 'students.last_seen_at was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mark_today_seen'
  ) THEN
    RAISE EXCEPTION 'public.mark_today_seen() was not created';
  END IF;

  RAISE NOTICE 'M21: students.last_seen_at present, mark_today_seen() installed.';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '033',
  '033_today.sql',
  'cf0f473bdf4a54b6d38346156b70e2cba50960f410b6ef28d84af5f8fcc954d4',
  'self'
);
