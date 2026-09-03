-- ═══════════════════════════════════════════════════════════════════════════
-- 037_jobs_status_check.sql
--
-- A DRIFT REPAIR. `jobs.status` has no CHECK constraint in production, though
-- both 000 and 004 declare one:
--
--   status TEXT NOT NULL DEFAULT 'pending'
--     CHECK (status IN ('pending', 'running', 'done', 'failed'))
--
-- MEASURED, not assumed: writing `status = 'not-a-real-status-xyzzy'` to a
-- throwaway row was ACCEPTED by production and then removed. A CHECK either
-- exists or it does not, and a value no vocabulary would ever contain settles
-- which.
--
-- ── HOW IT DRIFTED ────────────────────────────────────────────────────────
-- 004 creates the table with `CREATE TABLE IF NOT EXISTS`, and its own comment
-- says jobs was "declared in 000, never applied". The table already existed
-- when 004 ran, so IF NOT EXISTS did nothing at all: not just the constraint,
-- the entire definition was skipped. The repo has therefore described a
-- constraint that production has never had.
--
-- This is the fourth drift of this shape found this week, after the three in
-- `user_data`. `CREATE TABLE IF NOT EXISTS` is silent by design, which makes
-- it the wrong tool for evolving a table that may already exist.
--
-- ── WHY IT MATTERS ────────────────────────────────────────────────────────
-- `lib/jobs.ts` selects work with `status = 'pending'`. Any status it does not
-- recognise is not an error, it is simply invisible: the row is never selected
-- and never runs. A single typo in a status string would strand a job
-- permanently and silently, which is precisely how fifteen welcome emails sat
-- unnoticed for six weeks.
--
-- ── SAFETY ────────────────────────────────────────────────────────────────
-- The constraint is added NOT VALID first, so it governs new writes without
-- rejecting any row already present, and is validated separately. If existing
-- data were somehow outside the vocabulary, VALIDATE would fail loudly rather
-- than this migration failing halfway. Nothing is deleted (K.4).
-- ═══════════════════════════════════════════════════════════════════════════

-- Show any row that would violate the constraint, BEFORE adding it. A clean
-- run prints nothing; anything printed must be understood before proceeding.
DO $$
DECLARE
  v_bad INT;
BEGIN
  SELECT count(*) INTO v_bad
  FROM public.jobs
  WHERE status NOT IN ('pending', 'running', 'done', 'failed');

  IF v_bad > 0 THEN
    RAISE NOTICE '037: % row(s) hold a status outside the vocabulary; listing below', v_bad;
  ELSE
    RAISE NOTICE '037: every existing row is inside the vocabulary';
  END IF;
END $$;

-- Idempotent: re-running this file must not fail on an existing constraint.
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'running', 'done', 'failed'))
  NOT VALID;

-- Separate step: proves every existing row conforms, and fails loudly if not.
ALTER TABLE public.jobs
  VALIDATE CONSTRAINT jobs_status_check;

COMMENT ON CONSTRAINT jobs_status_check ON public.jobs IS
  'Declared in 000 and 004 but never applied. 004 used CREATE TABLE IF NOT EXISTS on a table that was already present, so the whole definition was skipped. Added by 037 after production was measured accepting an arbitrary status. lib/jobs.ts selects on status = pending, so an unrecognised status does not raise; it strands the job silently.';


-- ── Verification the founder can run after applying this file ──────────────
--
-- Proves the constraint is now enforced, without leaving a row behind.
DO $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_rejected BOOLEAN := FALSE;
BEGIN
  -- `id` is supplied explicitly rather than relying on its DEFAULT. Production
  -- does have one, but scripts/rehearse-production.mjs builds its tables from
  -- the measured column list, which records types and nullability but not
  -- defaults. Depending on the default made this block fail in rehearsal with
  -- a not-null violation. Naming the value works in both places and depends on
  -- one thing less.
  INSERT INTO public.jobs (id, type, payload, status)
  VALUES (v_id, 'send-welcome', '{"name":"037-verification"}'::jsonb, 'pending');

  BEGIN
    UPDATE public.jobs SET status = 'not-a-real-status-xyzzy' WHERE id = v_id;
  EXCEPTION WHEN check_violation THEN
    v_rejected := TRUE;
  END;

  DELETE FROM public.jobs WHERE id = v_id;

  IF NOT v_rejected THEN
    RAISE EXCEPTION '037: the CHECK is still not enforced; an arbitrary status was accepted';
  END IF;

  RAISE NOTICE '037: jobs.status now rejects values outside its vocabulary';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '037',
  '037_jobs_status_check.sql',
  '5fc9cf744fc4c5e50fe9c85562b48f976bbe5c7c991bb97063dae0e36be10f01'
);
