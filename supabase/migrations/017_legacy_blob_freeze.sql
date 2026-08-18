-- ═══════════════════════════════════════════════════════════════════════════
-- 017_legacy_blob_freeze.sql   ·   M7-5
--
-- EXECUTION_PLAN M7-5: *"Backfill from `user_data.blob`; freeze it read-only as
-- `legacy_blob`. Verdict KEEP frozen. Done when: T2 accepted — the seam is
-- MARKED, using `RECOVERY_EPOCH_MS` as precedent; pre-epoch data is never
-- presented as verified."*
--
-- Architecture S.1 marks the blob **KEEP frozen**; T2 states why the backfill is
-- lossy and cannot be made otherwise. This file is the freeze. `lib/legacy-
-- backfill.ts` is the backfill, and it reads what this file froze.
--
-- ADDITIVE ONLY. Four ADD COLUMNs, one copy, one trigger, one column-level
-- REVOKE. It drops nothing, renames nothing and truncates nothing.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY `legacy_blob` IS A NEW COLUMN AND NOT A RENAME OF `blob`
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The task says *"freeze it read-only as `legacy_blob`"*, and the obvious
-- reading is `ALTER TABLE user_data RENAME COLUMN blob TO legacy_blob`. That
-- reading is wrong here, for two independent reasons, and both are load-bearing.
--
-- 1. **`blob` still has six live server-side READERS, and one of them is the
--    Ledger Score.** `app/api/cron/score-snapshot`, `app/api/cron/risk-alerts`,
--    `app/api/cron/notifications`, `app/api/cron/weekly-report`,
--    `app/api/send-parent-digest` and `app/api/parent/[code]` all read
--    `user_data.blob` and derive the shipped score from it through
--    `scoreInputsFromBlob()`. The event substrate cannot replace them yet:
--    every tool manifest still declares `emits_events: []` (M8+), there are no
--    projections (M12) and there is no event-derived score (M14). Renaming the
--    column would stop every student's score moving on the day this ran — a
--    silent, total loss of the Return beat (`PRODUCT_PRINCIPLES` §7.1) in
--    exchange for a tidier column name.
--
-- 2. **A frozen archive must be a SNAPSHOT, or the backfill's idempotency is a
--    lie.** If the backfill read a column that live code keeps writing, a second
--    run would read DIFFERENT bytes and emit different events. Deriving the
--    backfill's event ids from the archive is what makes re-running it a no-op
--    (`ON CONFLICT (student_id, client_event_id) DO NOTHING`), and that requires
--    the archive to stop changing. A rename cannot give that; a copy plus a
--    freeze trigger can.
--
-- So: `legacy_blob` is a WRITE-ONCE COPY taken at the epoch, and the epoch is
-- `legacy_blob_frozen_at`. That is the seam T2 asks to be marked, and it is
-- marked as a stored timestamp per student rather than as a constant nobody can
-- verify. `lib/legacy-backfill.ts` carries `LEGACY_EPOCH_MS` — the same shape
-- `RECOVERY_EPOCH_MS` (`lib/ledger-score-v2.ts:75`) already established — as
-- the repository-side statement of the same boundary.
--
-- **`blob` IS NOT FROZEN BY THIS FILE, AND SAYING SO IS THE HONEST POSITION.**
-- It is in wind-down, and its removal condition is written into §5 below. What
-- IS true after this file is that `legacy_blob` — the thing the record is
-- rebuilt from, disputed against and exported from (O.6, M18-1) — can never be
-- written again by anything, service role included.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE ARCHIVE COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS legacy_blob            JSONB,
  ADD COLUMN IF NOT EXISTS legacy_blob_frozen_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_backfill_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_backfill_events INTEGER;

COMMENT ON COLUMN public.user_data.legacy_blob IS
  'M7-5. A WRITE-ONCE snapshot of user_data.blob taken at the freeze epoch. Never written again by any path, service role included (see the trigger in §3). This is what lib/legacy-backfill.ts reads, and what a dispute or an export (O.6) is answered from.';
COMMENT ON COLUMN public.user_data.legacy_blob_frozen_at IS
  'THE SEAM (architecture T2). Everything in legacy_blob predates the event layer, has no evidence and no concept id, and is never presented as verified.';
COMMENT ON COLUMN public.user_data.legacy_backfill_at IS
  'When lib/legacy-backfill.ts last ran for this student. Re-running is a no-op — the event ids are derived from the frozen archive — so this is a record of the run, not a guard against it.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · THE FREEZE — one copy, taken once
--
-- `WHERE legacy_blob IS NULL` is the whole of the idempotency. A second run
-- finds no rows. A row whose blob is absent or empty is deliberately NOT given
-- an empty archive: an archive that exists means "there was a pre-epoch record
-- here", and manufacturing one for a student who had none would be a fact
-- nobody observed (Law 7).
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE public.user_data
SET legacy_blob           = blob,
    legacy_blob_frozen_at = NOW()
WHERE legacy_blob IS NULL
  AND blob IS NOT NULL
  AND blob <> '{}'::jsonb;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · READ-ONLY, ENFORCED — the same three layers 015 and 016 use
--
-- O.6's posture, applied one table down: policy is not enough, a grant is not
-- enough, and a trigger catches what neither does — a future migration, a psql
-- session, or an application bug running as the table's owner.
--
-- The trigger is deliberately NARROW. `user_data` is a live table with a live
-- UPDATE policy and half the product writes to it; refusing all UPDATEs would
-- break the product. It refuses exactly one thing: changing an archive that has
-- already been taken.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.user_data_legacy_blob_is_frozen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legacy_blob IS NOT NULL AND NEW.legacy_blob IS DISTINCT FROM OLD.legacy_blob THEN
    RAISE EXCEPTION
      'user_data.legacy_blob is frozen (M7-5). It is the pre-epoch archive the record is disputed against; a correction is a new EVENT_SUPERSEDED event, never an edit here.';
  END IF;

  IF OLD.legacy_blob_frozen_at IS NOT NULL
     AND NEW.legacy_blob_frozen_at IS DISTINCT FROM OLD.legacy_blob_frozen_at THEN
    RAISE EXCEPTION
      'user_data.legacy_blob_frozen_at is the SEAM (architecture T2) and cannot be moved once stamped.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_data_legacy_blob_is_frozen_trg ON public.user_data;
CREATE TRIGGER user_data_legacy_blob_is_frozen_trg
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.user_data_legacy_blob_is_frozen();

-- Column-level grant, the mechanism M19-2 names: the aggregator is refused by
-- the database, not by policy. A student's own client can never name these
-- columns in an UPDATE at all, so the trigger above is the second refusal
-- rather than the first.
REVOKE UPDATE (legacy_blob, legacy_blob_frozen_at, legacy_backfill_at, legacy_backfill_events)
  ON public.user_data FROM anon, authenticated;

REVOKE INSERT (legacy_blob, legacy_blob_frozen_at, legacy_backfill_at, legacy_backfill_events)
  ON public.user_data FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · THE BACKFILL'S OWN BOOKKEEPING
--
-- Not a guard. `lib/legacy-backfill.ts` derives every `client_event_id`
-- deterministically from (student, source key, item identity) over the FROZEN
-- archive, so the R.10 dedup constraint absorbs a re-run whether or not this
-- column says anything. It exists so an operator can answer "did this student's
-- backfill run, and how many events did it produce" without reading the stream.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS user_data_legacy_backfill_pending_idx
  ON public.user_data (id)
  WHERE legacy_blob IS NOT NULL AND legacy_backfill_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · `blob` — STILL LIVE, IN WIND-DOWN, WITH ITS REMOVAL CONDITION STATED
--
-- M7-6 retires the 15-second whole-blob upsert and the merge-by-string-length,
-- and narrows what still reaches this column to a scoped, marked legacy-
-- compatibility flush. It does NOT drop the column, because the shipped Ledger
-- Score is still derived from it server-side.
--
-- DROP `blob` WHEN ALL THREE ARE TRUE, and not before:
--
--   1. M12 exists — `coverage_state` and per-concept accuracy are projected
--      from `academic_events`, so a score has event-derived inputs at all.
--   2. M14 exists — `lib/ledger-score.ts` / `-v2.ts` no longer call
--      `scoreInputsFromBlob()`, and `app/api/cron/score-snapshot`,
--      `risk-alerts`, `notifications`, `weekly-report`, `send-parent-digest`
--      and `parent/[code]` no longer select it.
--   3. `legacy_blob` is confirmed non-null for every row that ever had a
--      non-empty `blob`, i.e. this migration's §2 ran to completion.
--
-- Condition 3 is why the archive is a copy: `blob` may be dropped without
-- losing the pre-epoch record, because the pre-epoch record is in
-- `legacy_blob`.
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON COLUMN public.user_data.blob IS
  'PRE-EVENT-LAYER TRANSPORT, IN WIND-DOWN (M7-6). Still read by the shipped Ledger Score close and the parent digest. Written only by the scoped legacy flush in lib/sync.ts. Its removal condition is stated in supabase/migrations/017_legacy_blob_freeze.sql §5. The permanent archive is legacy_blob, not this.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · VERIFICATION — the file checks its own claims
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  missing   TEXT;
  unfrozen  BIGINT;
BEGIN
  FOREACH missing IN ARRAY ARRAY['legacy_blob','legacy_blob_frozen_at','legacy_backfill_at','legacy_backfill_events']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_data' AND column_name = missing
    ) THEN
      RAISE EXCEPTION 'user_data.% was not created', missing;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.user_data'::regclass
      AND tgname = 'user_data_legacy_blob_is_frozen_trg'
  ) THEN
    RAISE EXCEPTION 'the freeze trigger is missing — legacy_blob would be editable';
  END IF;

  -- Every row that has a non-empty blob must now have an archive. If this
  -- raises, §2 did not cover the table and the backfill would read a partial
  -- history without knowing it.
  SELECT count(*) INTO unfrozen
  FROM public.user_data
  WHERE blob IS NOT NULL AND blob <> '{}'::jsonb AND legacy_blob IS NULL;

  IF unfrozen > 0 THEN
    RAISE EXCEPTION '% user_data rows have a blob but no legacy_blob — the freeze did not complete', unfrozen;
  END IF;

  RAISE NOTICE '017: legacy_blob frozen for % rows',
    (SELECT count(*) FROM public.user_data WHERE legacy_blob IS NOT NULL);
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not drop or rename `user_data.blob`. See the header and §5.
-- · It does not insert a single `academic_events` row. The backfill is code
--   (`lib/legacy-backfill.ts`) and not SQL, for the reason M7-2 split the
--   validator from the endpoint: the mapping from a ragged localStorage string
--   to a D.1 envelope is a DECISION, it is lossy in named places, and a
--   decision is provable in a test only if it is a function.
-- · It does not fabricate an archive for a student who had no blob. An absent
--   archive means "no pre-epoch record", which is the truth.
-- · It does not touch `lib/ledger-score.ts` or `lib/ledger-score-v2.ts`, and
--   moves no score. `RECOVERY_EPOCH_MS` is referenced as a PRECEDENT for how a
--   seam is marked; it is not read, changed or generalised here.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '017',
  '017_legacy_blob_freeze.sql',
  '4d0b3f9bd0264f432cacc7a0d9c7f84643c70a69dcb3ef68ab42872ace0af7f5',
  'self'
);
