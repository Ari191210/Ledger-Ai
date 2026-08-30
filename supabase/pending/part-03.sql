-- ═══════════════════════════════════════════════════════════════════════════
-- STUDYLEDGER — PENDING MIGRATIONS, PART 3 OF 6
--
-- 017, 018, 019, 020, 021, 022
--
-- RUN THE PARTS IN ORDER. Each part is a whole number of migrations and is
-- idempotent, so a part that is interrupted can simply be run again.
--
-- Supabase → SQL Editor → New query. Press Ctrl+A then Delete FIRST: the
-- editor runs only the highlighted text if anything is selected, and a
-- partial run reports success.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 017_legacy_blob_freeze.sql ───

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


-- ─── 018_event_compaction.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 018_event_compaction.sql   ·   M7-7
--
-- EXECUTION_PLAN M7-7: *"Attention-event compaction and monthly partitioning.
-- Done when: T6 mitigation in place before volume exists."*
--
-- Architecture D.5, class **Permanent, compacted**: *"`CONCEPT_VIEWED`,
-- `EXPLANATION_READ` — verbatim for 90 days; then rolled into a per-(session,
-- concept) summary row `{count, total_dwell_ms, first_at, last_at}` and the raw
-- rows dropped. The derived fact survives; the granularity does not."*
--
-- ADDITIVE ONLY. One table, one function. It alters nothing that exists — in
-- particular it does not repartition `academic_events`, and §0 is why.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- 0 · THE PARTITIONING DECISION, NOW CLOSED
--
-- 015's header flagged M7-7's *"monthly partitioning"* half as **re-opened, not
-- deferred**, and asked this file to decide it explicitly. It is decided here:
--
--   **M7-7 SHIPS COMPACTION AND NO TIME PARTITIONING. `academic_events` STAYS
--   PARTITIONED BY HASH (student_id) AND NOTHING IS SUB-PARTITIONED.**
--
-- Three reasons, in the order of how much they weigh.
--
-- 1. **Sub-partitioning by month re-breaks the dedup constraint one level
--    down.** PostgreSQL requires a UNIQUE constraint on a partitioned table to
--    contain every partition key column — and for a multi-level scheme that
--    means every level's key. Making `academic_events_pN` range-partitioned on
--    `received_at` would demote `UNIQUE (student_id, client_event_id)` to
--    `UNIQUE (student_id, client_event_id, received_at)` inside each hash
--    partition, under which an offline outbox retrying across a month boundary
--    inserts a duplicate. That is T7 restored in full, in exchange for a
--    performance property nothing has yet measured a need for. R.10's dedup
--    guarantee is not tradeable for an unmeasured index win.
--
-- 2. **Time partitioning and compaction solve the same problem, and only one of
--    them is what D.5 actually specifies.** The named retention mechanism is
--    *"the raw rows dropped"* — a DELETE of selected rows, which needs no time
--    partition to perform. A monthly partition would make that DELETE a DETACH,
--    which is faster; but a DETACH drops a WHOLE month including the
--    permanent-verbatim classes (`QUESTION_*`, `MISTAKE_*`, `ASSESSMENT_*`),
--    which D.5 says are kept **forever**. So the fast path is not even the path
--    this product may take: compaction is necessarily selective by event type,
--    and a selective delete is a selective delete whatever the partitioning is.
--
-- 3. **Hash-on-student is the key every read path wants.** Parts D–L filter by
--    `student_id` first; `(student_id, seq)` ordering stays inside one
--    partition. A time key would split every student's stream across every
--    partition and make the ordering scan fan out.
--
-- **What T6 asked for, and what it gets.** T6's mitigation list is *"watermarked
-- incremental projections, monthly partitioning, compaction of attention events
-- (D.5), and daily snapshots"*. Watermarked projections are M12-2/M12-3. Daily
-- snapshots already ship. Compaction is this file. Monthly partitioning is the
-- one item on that list that is **refused**, with the argument above, because in
-- this schema it costs integrity and buys a scan pattern nothing uses. T6 itself
-- labels the volumes **UNVERIFIABLE**; the right response to an unverified
-- capacity guess is not to pay a known integrity cost for it. If production
-- volume ever makes the scan cost real, the additive answer is a BRIN index on
-- `received_at`, not a repartition — and 015 already created a btree there.
--
-- **This closes the flag. A later milestone that wants time partitioning must
-- reopen it against this argument, not against silence.**
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · ACADEMIC_EVENT_COMPACTIONS — the derived rows
--
-- D.5: *"rolled into a per-(session, concept) summary row `{count,
-- total_dwell_ms, first_at, last_at}`"*. `event_type` joins the group key
-- because viewing a concept and reading its explanation are two different acts,
-- and merging them would answer "how long did they look at this" with a figure
-- that is true of neither.
--
-- NOT PARTITIONED. One row replaces up to thousands; it is bounded by
-- (students × sessions × concepts), not by attention.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_event_compactions (
  compaction_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Both nullable, for the same reason they are nullable on the event: the
  -- session resolver is M9, and an unresolved concept is a legal state (V.2.4).
  session_id     UUID,
  concept_id     UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,

  -- The ONLY two classes D.5 permits to be compacted. Mirrors
  -- `COMPACTABLE_EVENT_TYPES` in `lib/event-compaction.ts`; the test asserts
  -- the two agree, so a future edit cannot widen one without the other.
  event_type     TEXT        NOT NULL CHECK (event_type IN ('CONCEPT_VIEWED','EXPLANATION_READ')),

  -- D.5's summary shape, verbatim.
  event_count    INTEGER     NOT NULL CHECK (event_count > 0),
  total_dwell_ms BIGINT      NOT NULL DEFAULT 0 CHECK (total_dwell_ms >= 0),
  first_at       TIMESTAMPTZ NOT NULL,
  last_at        TIMESTAMPTZ NOT NULL,

  -- The `seq` range the summary replaces. D.5.a requires the audit entry to
  -- carry *"the count and the range"*; this is the range, stored where a reader
  -- can find it without the audit trail.
  min_seq        BIGINT      NOT NULL,
  max_seq        BIGINT      NOT NULL,

  -- Stable identity of the (student, session, concept, type) group, computed by
  -- `lib/event-compaction.ts`. A TEXT key rather than a composite UNIQUE over
  -- two nullable UUID columns, because NULL is not equal to NULL in a unique
  -- index and two summaries for the same session-less concept would both be
  -- accepted.
  group_key      TEXT        NOT NULL,

  -- Which run produced it. One UUID per invocation of the compaction job, and
  -- the same value appears in the `compaction_run` audit entry (O.6, D.5.a).
  run_id         UUID        NOT NULL,
  compacted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT academic_event_compactions_range CHECK (last_at >= first_at),
  CONSTRAINT academic_event_compactions_seq_range CHECK (max_seq >= min_seq)
);

-- Re-running the job over a range it already compacted inserts nothing. The raw
-- rows are gone, so the planner normally finds nothing to do; this is the
-- second refusal, for the case where a run died between the summary write and
-- the raw delete.
CREATE UNIQUE INDEX IF NOT EXISTS academic_event_compactions_group_unique
  ON public.academic_event_compactions (student_id, group_key, min_seq, max_seq);

CREATE INDEX IF NOT EXISTS academic_event_compactions_student_idx
  ON public.academic_event_compactions (student_id, last_at DESC);

CREATE INDEX IF NOT EXISTS academic_event_compactions_concept_idx
  ON public.academic_event_compactions (student_id, concept_id)
  WHERE concept_id IS NOT NULL;

COMMENT ON TABLE public.academic_event_compactions IS
  'Architecture D.5, class "Permanent, compacted". The derived fact survives; the granularity does not. D.5.b: derivation is ONE-WAY — raw rows are never synthesised back from these.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · APPEND-ONLY, LIKE EVERYTHING ELSE IN THE RECORD
--
-- D.5.b: *"Compaction may summarise raw into derived. It may NEVER synthesise
-- raw from derived."* An editable summary would be a third thing — a derived
-- row that disagrees with the raw rows it replaced and with the projection that
-- consumed them, with no way to tell which is right.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.academic_event_compactions_refuse_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'academic_event_compactions is append-only (D.5.b). A summary is never edited; a re-derivation is a new row.';
END;
$$;

DROP TRIGGER IF EXISTS academic_event_compactions_refuse_update_trg ON public.academic_event_compactions;
CREATE TRIGGER academic_event_compactions_refuse_update_trg
  BEFORE UPDATE ON public.academic_event_compactions
  FOR EACH ROW EXECUTE FUNCTION public.academic_event_compactions_refuse_update();

ALTER TABLE public.academic_event_compactions ENABLE ROW LEVEL SECURITY;

-- The student sees their own summaries: after compaction these ARE their
-- attention history, and O.6 requires the export to be complete.
DROP POLICY IF EXISTS academic_event_compactions_select_own ON public.academic_event_compactions;
CREATE POLICY academic_event_compactions_select_own ON public.academic_event_compactions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- No INSERT, UPDATE or DELETE policy. D.5.a: *"performed only by a service-role
-- job"*.
REVOKE INSERT, UPDATE, DELETE ON public.academic_event_compactions FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · THE ONLY WAY RAW ROWS MAY BE DELETED
--
-- D.5.a: compaction *"is the single exception to append-only"*, and the
-- exception is bounded here rather than trusted to the caller.
--
-- 015 revoked UPDATE and DELETE from `anon` and `authenticated` and put a
-- BEFORE UPDATE trigger in front of everyone, but deliberately left DELETE
-- available to the service role — *"D.5.a's compaction is the single named
-- exception and it DELETEs raw rows"*. This function is what that sentence was
-- pointing at, and it re-checks in SQL every rule `lib/event-compaction.ts`
-- checks in TypeScript:
--
--   · the type is one of the two compactable classes;
--   · the row is outside the retention window;
--   · the row belongs to the named student.
--
-- Two implementations of one rule would be M1's drift. This is not that: the
-- planner DECIDES which events to compact (a decision, provable in a test with
-- no database), and this REFUSES anything outside the envelope of legal
-- decisions. A caller that reached the table by some path the planner does not
-- cover still cannot delete a `QUESTION_WRONG`.
--
-- WHAT IT CANNOT CHECK, STATED RATHER THAN IMPLIED. D.5.a also forbids
-- compacting *"any event class that any Evidence, Mistake, AssessmentAttempt or
-- ScoreSnapshot references"*. None of those tables carries an event reference
-- yet — `evidence` and `occurrences` (007) predate the event layer, and
-- `AssessmentAttempt` is M10. So the referenced-event exclusion lives in the
-- planner's `referencedEventIds` input, which is empty today and is wired by
-- the milestone that first stores an event reference. That is a real gap and it
-- is named here so the milestone that closes it can find it.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.compact_attention_events(
  p_student_id  UUID,
  p_event_ids   UUID[],
  p_older_than  TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_illegal BIGINT;
  v_deleted INTEGER;
BEGIN
  IF p_event_ids IS NULL OR array_length(p_event_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_illegal
  FROM public.academic_events e
  WHERE e.student_id = p_student_id
    AND e.event_id = ANY(p_event_ids)
    AND (
      e.event_type NOT IN ('CONCEPT_VIEWED','EXPLANATION_READ')
      OR e.received_at >= p_older_than
    );

  IF v_illegal > 0 THEN
    RAISE EXCEPTION
      'refused: % of the named events are either outside the two compactable classes or inside the retention window (D.5). A permanent-verbatim event is never deleted.',
      v_illegal;
  END IF;

  DELETE FROM public.academic_events e
  WHERE e.student_id = p_student_id
    AND e.event_id = ANY(p_event_ids)
    AND e.event_type IN ('CONCEPT_VIEWED','EXPLANATION_READ')
    AND e.received_at < p_older_than;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL     ON FUNCTION public.compact_attention_events(UUID, UUID[], TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compact_attention_events(UUID, UUID[], TIMESTAMPTZ) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compact_attention_events(UUID, UUID[], TIMESTAMPTZ) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · VERIFICATION — the file checks its own claims
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
  strategy   CHAR;
BEGIN
  -- §0's decision, asserted. If a later migration repartitions the event table
  -- by time, this raises on the next re-run of 018 and the argument in §0 gets
  -- read before the dedup constraint is quietly lost.
  SELECT partstrat INTO strategy
  FROM pg_partitioned_table
  WHERE partrelid = 'public.academic_events'::regclass;

  IF strategy IS DISTINCT FROM 'h' THEN
    RAISE EXCEPTION
      'academic_events is no longer HASH partitioned (got %) — see 018 §0: a time key demotes UNIQUE(student_id, client_event_id) and restores T7', strategy;
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'academic_event_compactions'
    AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'academic_event_compactions has a non-SELECT policy (%) — D.5.a: service-role job only', bad_policy;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.academic_event_compactions'::regclass
      AND tgname = 'academic_event_compactions_refuse_update_trg'
  ) THEN
    RAISE EXCEPTION 'the append-only trigger is missing — a summary would be editable (D.5.b)';
  END IF;

  RAISE NOTICE '018: compaction ready — % summaries so far',
    (SELECT count(*) FROM public.academic_event_compactions);
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not repartition anything. See §0 — that is a decision, made and
--   argued, not an omission.
-- · It does not schedule the job. `app/api/cron/event-compaction/route.ts` is
--   the endpoint; nothing in `vercel.json` calls it, which is the same posture
--   `app/api/cron/score-snapshot` documents (Vercel Hobby caps cron count, so
--   the schedule lives in GitHub Actions). Compacting nothing on a schedule
--   before any event exists would be a job whose first real run is also its
--   first tested run.
-- · It does not compact anything on application. There is nothing to compact —
--   `academic_events` is empty until a tool is wired to emit (M8+).
-- · It does not touch the permanent-verbatim classes, at any layer. The two
--   compactable types are named three times — in D.5, in this file's CHECK and
--   its function, and in `COMPACTABLE_EVENT_TYPES` — and a test asserts all
--   three agree.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '018',
  '018_event_compaction.sql',
  '4f623839d31fa252baa0eacffbab7399e92c1c6c9e87e11c222c16437ac93535',
  'self'
);


-- ─── 019_evidence_storage.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 019_evidence_storage.sql   ·   M8-2
--
-- EXECUTION_PLAN M8-2: *"Wire the `evidence` table; photo → storage + evidence
-- record with `content_hash` dedup. Done when: re-uploading the same paper
-- creates one evidence row."*
--
-- `007_mistakes.sql` already declares everything the RECORD needs, including
-- the dedup this milestone is measured by:
--
--     CONSTRAINT evidence_student_hash_unique UNIQUE (student_id, content_hash)
--
-- so this migration adds NO column, NO constraint and NO table to `007`. The
-- mistake schema is frozen and stays frozen. What `007` could not declare is
-- where the BYTES live — Supabase Storage is a separate schema — and that is
-- the whole of this file.
--
-- ADDITIVE ONLY. One bucket, four policies. It drops nothing and alters
-- nothing that exists. Idempotent; safe to re-run.
--
-- Run in: Supabase → SQL Editor.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THE BUCKET IS PRIVATE, AND WHY THAT IS NOT A PREFERENCE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A marked exam paper carries a minor's name, their school, their handwriting
-- and their marks. A public bucket hands all of that to anyone who ever sees
-- the URL, for good, with no account, no log and no revocation — and Supabase
-- public-object URLs are guessable from the path, which here is
-- `<student_id>/<content_hash>`.
--
-- Architecture R.4 (data isolation) and every RLS policy written in this
-- project so far scope reads to `auth.uid()`. Storage is scoped the same way,
-- because a second, weaker posture for the most sensitive artefact in the
-- product would make the first one decorative.
--
-- READS ARE THEREFORE SIGNED OR SERVER-SIDE. `lib/storage.ts` has no
-- `getPublicUrl()` and must never grow one.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THE FIRST PATH SEGMENT IS THE OWNER
-- ═══════════════════════════════════════════════════════════════════════════
--
--     evidence/<student_id>/<sha256-of-the-bytes>
--
-- `storage.foldername(name)[1]` is the student id, so the policies below can
-- compare it to `auth.uid()`. A student cannot write into another student's
-- folder, because the folder name IS the identity check — isolation is
-- structural rather than remembered by the upload code.
--
-- The second segment is the content hash, which makes the upload idempotent:
-- the same paper re-photographed writes byte-identical content to the same key,
-- so the `007` unique constraint never leaves an orphaned second object.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THERE IS NO UPDATE AND NO DELETE POLICY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `007`'s comment on the `evidence` table: *"Every table is student-scoped …
-- The critical asymmetry: occurrences and evidence have SELECT and INSERT
-- policies and NO update or delete policy. Immutability is therefore a property
-- of the database, not a convention the application remembers."*
--
-- The bytes inherit that. An occurrence points at evidence with ON DELETE
-- RESTRICT precisely so a diagnosis cannot be retroactively invalidated;
-- letting the client delete the OBJECT would achieve exactly what the FK
-- forbids, one layer down. Deletion under O.5 (account deletion) runs as the
-- service role, which bypasses these policies.
--
-- The INSERT policy is scoped but not append-only-strict: `upsert` on an
-- identical key is how a retried upload heals a half-finished one. The key is
-- the hash of the content, so an overwrite cannot change what the object says.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE BUCKET
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  FALSE,                     -- see the header. Not a preference.
  20971520,                  -- 20 MB, the cap `lib/storage.ts` enforces too
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · POLICIES — the same `auth.uid()` posture as every table in 007
-- ═══════════════════════════════════════════════════════════════════════════

-- ── read your own evidence ──────────────────────────────────────────────────
DROP POLICY IF EXISTS evidence_objects_select_own ON storage.objects;
CREATE POLICY evidence_objects_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── write into your own folder, and only your own ───────────────────────────
DROP POLICY IF EXISTS evidence_objects_insert_own ON storage.objects;
CREATE POLICY evidence_objects_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── overwrite ONLY your own object at ONLY the same key ─────────────────────
-- Both USING and WITH CHECK are scoped, so an update cannot move an object out
-- of the owner's folder. Present so a retried upload of the same bytes heals;
-- it cannot change what any object says, because the key is the content hash.
DROP POLICY IF EXISTS evidence_objects_update_own ON storage.objects;
CREATE POLICY evidence_objects_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NO DELETE POLICY. Deliberate, and load-bearing — see the header.


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not touch `evidence`, `occurrences`, `patterns` or `concepts`.
--   `007` is frozen (S.3, "KEEP, extend additively") and needed no extension
--   for M8-2: the dedup constraint the done-when rests on has been in `007`
--   since M1. This file adds storage, not schema.
-- · It does not create a signed-URL helper or a public URL. A read path is
--   `/diagnosis`'s problem (M13) and will be signed and short-lived.
-- · It does not add a `mime_type` or `byte_size` column to `evidence`. Those
--   facts live on the object and in `ingestion_stages.output` (verbatim, per
--   `008`), which is where a replay in 2030 will look for them.
-- · It does not apply itself. Nothing in this repository runs a migration; the
--   ledger gate (`scripts/check-migrations.mjs`) will report 019 UNAPPLIED
--   until a human runs it in the SQL editor, which is the intended posture.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '019',
  '019_evidence_storage.sql',
  '8aaf56d5575656cf51f137ffed72ba26798bdbdf19bdd9108c1c15e1eb8ed0f4',
  'self'
);


-- ─── 020_occurrence_confirmation.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 020_occurrence_confirmation.sql   ·   M8-4 / M8-5
--
-- EXECUTION_PLAN M8-5: *"Student confirmation — once, and only forwards.
-- Done when: the `confirmed_at` RLS policy is the enforcement, not the UI
-- (S.1)."*
--
-- M8-4 produces DRAFT occurrences — a reading of a photographed paper, or a
-- mistake the student typed in by hand. A draft is data that exists and is
-- explicitly NOT part of the record. This migration is what makes "not part of
-- the record" a property of the database rather than a filter the application
-- remembers to apply.
--
-- ADDITIVE ONLY. `007_mistakes.sql` is frozen (S.3, *"KEEP, extend
-- additively"*): this file adds four nullable columns, two partial indexes,
-- one view, one policy, one trigger and one column-level grant to
-- `occurrences`. It alters no existing column, drops no policy `007` created,
-- and touches `evidence`, `patterns` and `concepts` not at all. Idempotent;
-- safe to re-run.
--
-- Run in: Supabase → SQL Editor.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY A DRAFT LIVES IN `occurrences` AND NOT IN A SIDE TABLE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Because `007`'s four structural invariants are the ones a proposal most needs
-- to satisfy, and a side table would satisfy none of them:
--
--   · `evidence_id NOT NULL`      — a proposal without a source paper is a
--                                   claim, and the product does not store
--                                   claims (PRINCIPLES §3.2). A draft is
--                                   already, structurally, evidenced.
--   · `occurrences_has_error`     — a proposal that classified nothing is not
--                                   a diagnosable event and cannot be written.
--   · `occurrences_marks_sane`    — a model cannot propose losing 9 marks out
--                                   of 5.
--   · `concept_id NOT NULL`       — an extraction that cannot resolve a concept
--                                   cannot write a row at all. It has to say so
--                                   (`ingestion_review`) instead of guessing.
--
-- A parallel `proposed_occurrences` table would have re-declared all four,
-- drifted from them within one milestone, and then needed a copy step into the
-- real table — which is a second write path into the academic record, i.e. the
-- exact thing M8-4's done-when forbids. One table, one gate.
--
-- The cost of that choice is that every reader of `occurrences` must now know
-- about `confirmed_at`. Section 3 pays it: `confirmed_occurrences` is the view
-- readers use, and the drafts are invisible through it.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- THE ONE-WAY DOOR, AND WHY IT TAKES THREE MECHANISMS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- "Once, and only forwards" is refused three times, by three different parts of
-- Postgres, because each one is blind to a case the others catch:
--
--   1 · COLUMN GRANT      `authenticated` may UPDATE exactly one column.
--                          An RLS policy cannot express "and nothing else
--                          changed" — `USING` sees the old row, `WITH CHECK`
--                          sees the new one, and neither can compare them. So
--                          without this grant a student could edit `marks_lost`
--                          in the same statement that sets `confirmed_at`.
--
--   2 · RLS POLICY        `USING (confirmed_at IS NULL)` refuses to even see an
--                          already-confirmed row, so a second confirmation
--                          matches nothing. `WITH CHECK (confirmed_at IS NOT
--                          NULL)` refuses to leave the row unconfirmed, so
--                          `SET confirmed_at = NULL` is impossible. This is the
--                          shape `008` already uses for `ingestion_runs`
--                          (`:174-178`), reused rather than reinvented — and it
--                          is the enforcement the M8-5 done-when names.
--
--   3 · TRIGGER           RLS DOES NOT APPLY TO THE SERVICE ROLE. Everything
--                          the pipeline writes runs as the service role, so
--                          without a trigger the one-way door would be shut for
--                          the student and wide open for the server that writes
--                          on the student's behalf. The trigger is the only one
--                          of the three that binds every writer, including a
--                          future one nobody has written yet.
--
-- The trigger also carries the immutability `007` states in prose — *"An
-- occurrence is a fact"* — into the one place where an UPDATE is now legal at
-- all. Two changes pass it and no others: `NULL → NOT NULL` on `confirmed_at`,
-- and `NULL → NOT NULL` on `pattern_id` (which is how M11's merge claims an
-- occurrence, and which must keep working).
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DOES NOT GRANT
-- ═══════════════════════════════════════════════════════════════════════════
--
-- No un-confirm. No re-confirm. No DELETE policy. No student INSERT of a
-- confirmed row — §1's CHECK forbids it, so a client cannot skip the gate by
-- writing a row that is born confirmed. Confirming is the ONLY thing a student
-- gained here, and PRINCIPLES §3.1 is untouched: confirming *"this is what I
-- got wrong"* is a student attesting to a fact about a paper they hold. It is
-- not, and can never become, *"I have fixed it"* — that still requires
-- assessment evidence and still lives on `patterns.status`, whose policy `007`
-- wrote and this file does not go near.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE DRAFT COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE occurrences
  -- NULL = a draft. Not part of the record. The single most load-bearing NULL
  -- in the schema, which is why §3's view exists to make forgetting it hard.
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

ALTER TABLE occurrences
  -- How this proposal came to exist. `extraction` means a model read a paper
  -- and suggested it; `manual` means the student typed it; `assessment` is
  -- reserved for M10-7, which logs an occurrence from a graded wrong answer.
  -- Recorded because "never lie" (law 7) includes never quietly presenting a
  -- model's reading as though the student had written it.
  ADD COLUMN IF NOT EXISTS origin TEXT;

ALTER TABLE occurrences
  -- The `ingestion_runs` row this proposal came out of, so a confirmed
  -- occurrence can always be traced back to the stage attempt that produced it
  -- and the verbatim model output stored beside it (`008`'s replay guarantee).
  -- NULL is legal: an occurrence written by a future path that has no run.
  ADD COLUMN IF NOT EXISTS ingestion_run_id UUID;

ALTER TABLE occurrences
  -- What the extraction believed, 0–1. NULL for `manual` — a student typing
  -- what they got wrong is not making a judgement call with a confidence.
  ADD COLUMN IF NOT EXISTS proposal_confidence NUMERIC;

-- ── The constraints on the new columns ──────────────────────────────────────
-- Added separately and idempotently: `ADD CONSTRAINT IF NOT EXISTS` does not
-- exist for CHECK constraints in Postgres, so each is guarded by a catalogue
-- lookup rather than by swallowing an error.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_origin_known'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_origin_known CHECK (
      origin IS NULL OR origin IN ('extraction', 'manual', 'assessment')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_confidence_range'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_confidence_range CHECK (
      proposal_confidence IS NULL OR (proposal_confidence >= 0 AND proposal_confidence <= 1)
    );
  END IF;

  -- (A row may not be BORN confirmed either. That one cannot be a CHECK — a
  --  CHECK cannot distinguish INSERT from UPDATE — so it lives in §5.)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_run_fk'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_run_fk
      FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id) ON DELETE RESTRICT;
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · INDEXES — the two questions this milestone asks
-- ═══════════════════════════════════════════════════════════════════════════

-- "What is waiting for me to look at?" — the confirmation surface's only query.
CREATE INDEX IF NOT EXISTS occurrences_draft_idx
  ON occurrences (student_id, created_at DESC)
  WHERE confirmed_at IS NULL;

-- "What is actually in my record?" — every reader from M11 onward.
CREATE INDEX IF NOT EXISTS occurrences_confirmed_idx
  ON occurrences (student_id, confirmed_at DESC)
  WHERE confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS occurrences_run_idx
  ON occurrences (ingestion_run_id)
  WHERE ingestion_run_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · THE RECORD, AS A VIEW
--
-- `007` says an occurrence is a fact. After this migration that is true of
-- CONFIRMED occurrences only, and every consumer written from M11 onward reads
-- this view rather than the table. A reader that forgets `WHERE confirmed_at IS
-- NOT NULL` silently counts proposals as facts — the exact failure M8-4's
-- done-when exists to prevent — so the safe query is the one with the shorter
-- name.
--
-- `security_invoker` so the caller's own RLS still applies: the view widens
-- nothing, it only narrows.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW confirmed_occurrences
  WITH (security_invoker = true)
AS
  SELECT * FROM occurrences WHERE confirmed_at IS NOT NULL;

COMMENT ON VIEW confirmed_occurrences IS
  'The academic record. Rows in `occurrences` with `confirmed_at IS NULL` are '
  'unconfirmed proposals (M8-4) and are deliberately absent here. Read this, '
  'not the table.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · PRIVILEGES — the student may write exactly one column
--
-- `007` gave `occurrences` no UPDATE policy at all, so nothing is being taken
-- away here; a table-level UPDATE grant that no policy admits is unusable. The
-- REVOKE makes that explicit before the narrow GRANT re-opens one column, so
-- the intent survives a future policy being added by someone who has not read
-- this file.
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE UPDATE ON occurrences FROM authenticated;
GRANT UPDATE (confirmed_at) ON occurrences TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE FORWARD-ONLY TRIGGER — binds the service role too
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION occurrences_forward_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ── An occurrence is never born confirmed ────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    IF NEW.confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION
        'an occurrence cannot be inserted already confirmed: confirmation is a transition, not a value'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- ── Confirmation moves NULL → NOT NULL, once, and never back ─────────────
  IF OLD.confirmed_at IS NOT NULL AND NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN
    RAISE EXCEPTION
      'occurrence % is already confirmed: confirmation happens once and is never reversed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.confirmed_at IS NOT NULL AND NEW.confirmed_at IS NULL THEN
    RAISE EXCEPTION
      'occurrence % cannot be un-confirmed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── Everything else about a written occurrence is immutable (§4.3) ───────
  -- `pattern_id` is the single exception, and only in one direction: M11's
  -- merge claims an unclaimed occurrence. A merge cannot re-point one.
  IF NEW.pattern_id IS DISTINCT FROM OLD.pattern_id
     AND OLD.pattern_id IS NOT NULL THEN
    RAISE EXCEPTION
      'occurrence % is already attached to a pattern', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF  NEW.id                IS DISTINCT FROM OLD.id
   OR NEW.student_id        IS DISTINCT FROM OLD.student_id
   OR NEW.evidence_id       IS DISTINCT FROM OLD.evidence_id
   OR NEW.source            IS DISTINCT FROM OLD.source
   OR NEW.subject           IS DISTINCT FROM OLD.subject
   OR NEW.chapter           IS DISTINCT FROM OLD.chapter
   OR NEW.topic             IS DISTINCT FROM OLD.topic
   OR NEW.concept_id        IS DISTINCT FROM OLD.concept_id
   OR NEW.question_ref      IS DISTINCT FROM OLD.question_ref
   OR NEW.marks_lost        IS DISTINCT FROM OLD.marks_lost
   OR NEW.marks_available   IS DISTINCT FROM OLD.marks_available
   OR NEW.cognitive_error   IS DISTINCT FROM OLD.cognitive_error
   OR NEW.execution_error   IS DISTINCT FROM OLD.execution_error
   OR NEW.confidence_before IS DISTINCT FROM OLD.confidence_before
   OR NEW.student_answer    IS DISTINCT FROM OLD.student_answer
   OR NEW.expected_answer   IS DISTINCT FROM OLD.expected_answer
   OR NEW.marker_note       IS DISTINCT FROM OLD.marker_note
   OR NEW.supersedes        IS DISTINCT FROM OLD.supersedes
   OR NEW.origin            IS DISTINCT FROM OLD.origin
   OR NEW.ingestion_run_id  IS DISTINCT FROM OLD.ingestion_run_id
   OR NEW.created_at        IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'an occurrence is a fact: only confirmation and pattern attachment may change it'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS occurrences_forward_only_trg ON occurrences;
CREATE TRIGGER occurrences_forward_only_trg
  BEFORE INSERT OR UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION occurrences_forward_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · THE POLICY — the enforcement the M8-5 done-when names
--
-- Identical in shape to `008`'s `ingestion_runs_confirm_own` (`:174-178`),
-- because it is the identical decision one level down: the student confirms,
-- once, forwards, and owns nothing else about the row.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS occurrences_confirm_own ON occurrences;
CREATE POLICY occurrences_confirm_own ON occurrences
  FOR UPDATE TO authenticated
  USING      (auth.uid() = student_id AND confirmed_at IS NULL)
  WITH CHECK (auth.uid() = student_id AND confirmed_at IS NOT NULL);

-- Still no DELETE policy on `occurrences`. Still no student INSERT of a
-- confirmed row. `007`'s `occurrences_select_own` and `occurrences_insert_own`
-- are untouched.


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not make `patterns` read the new column. Which occurrences feed a
--   pattern merge is M11's question and M11's code; this file only makes the
--   distinction available to it.
-- · It does not touch `patterns_update_own`. PRINCIPLES §3.1 — a student may
--   never mark their own mistake fixed — is `007`'s policy and stays exactly as
--   `007` wrote it.
-- · It does not add a `confirmed_by` column. There is exactly one actor who can
--   set `confirmed_at` under the policy above, and recording that it was the
--   student would be recording the only thing it could possibly be.
-- · It does not backfill. Every existing occurrence keeps `confirmed_at NULL`
--   and is therefore a draft. That is the honest reading: no occurrence
--   predating this migration was ever confirmed by anybody, and presenting one
--   as confirmed would be inventing a decision a student never made. In
--   practice the table is empty — M8-4 is its first writer.
-- · It does not apply itself. `scripts/check-migrations.mjs` will report 020
--   UNAPPLIED until a human runs it in the SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '020',
  '020_occurrence_confirmation.sql',
  '1d72d61d1433d06955b20afe9d4a74249224b34721c0e7f54297775f4383e9e7',
  'self'
);


-- ─── 021_study_sessions.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 021_study_sessions.sql — THE STUDY SESSION, MATERIALISED
--
-- EXECUTION_PLAN M9-2: *"The session resolver; partial unique index for one
-- live session. Done when: V.1.3 — two tabs produce exactly one session."*
-- Architecture C.3 `StudySession`; Part E in full; B.3.
--
-- ADDITIVE ONLY. It creates one table and touches nothing that exists — not
-- `academic_events` (whose `session_id` column 015 already ships, deliberately
-- unresolved until this milestone), not `user_data`, not `occurrences`.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–020.
--
--
-- THE ONE THING THIS FILE EXISTS FOR
--
-- E.7's CURRENT FACT is that two tabs overwrite each other by design today
-- (`lib/sync.ts:40-48` replaces the whole blob every 15 seconds). The fix E.3
-- names is not a better merge — it is a constraint:
--
--     *"One live session per student, globally. Enforced by the partial unique
--      index in C.3, NOT by client state."*
--
-- §4 below is that index. It is why `resolveSession()` in
-- `lib/session-resolver.ts` inserts without checking first: with the index in
-- place, the loser of a two-tab race is told by the DATABASE that it lost, at
-- the moment it lost, with no window to be stale in. An application-layer
-- "does one already exist?" has a window; this does not.
--
--
-- A NAMING DEFECT IN C.3, CORRECTED HERE IN THE OPEN
--
-- C.3 writes the terminal set as `('completed_unverified','verified',
-- 'abandoned')` — the PRE-CORRECTION name `COMPLETED_UNVERIFIED`, which E.2
-- explicitly renames and re-argues (*"`COMPLETED_UNVERIFIED` is drawn as a
-- predecessor of `VERIFIED`, implying verification is a later upgrade — it is
-- not"*). Part E is the canonical session specification and EXECUTION_PLAN
-- M9-1's done-when names `CLOSED_UNVERIFIED` in its own words. This file uses
-- E.2's names, upper-case as E.2 writes them, and the discrepancy is reported
-- rather than resolved by judgement in the moment (CLAUDE.md).
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · STUDY_SESSIONS — C.3's key fields, and no more
--
-- C.3 classes this row as *"a MATERIALISED PROJECTION of the event stream, and
-- the event stream wins on any disagreement (B.3)"*. Everything here is
-- therefore rebuildable, and `input_watermark_event_id` records how far the
-- projection has consumed **so that a stale row is detectable rather than
-- silently wrong** — C.3's own justification, transcribed.
--
-- WHAT IS DELIBERATELY ABSENT: any duration column. E.1 — *"a session is a
-- contiguous stretch of academic INTENT, not a stretch of time … not a timer,
-- not a pomodoro, not a streak input, and not a productivity measure."*
-- `duration_real` in the E.8 completion payload is COMPUTED at read time from
-- `opened_at` and `closed_at`; storing it would make it a field something could
-- start optimising. B.3's "Must NOT own": *"Timers as truth. Streaks."*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.study_sessions (
  session_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The session belongs to the STUDENT, not to a device or a tab. E.3: *"A
  -- student practising on a phone and reading on a laptop is in ONE session."*
  -- There is no `device_id` column for exactly that reason; `device_id` lives
  -- on the event (D.1) where it preserves the distinction for diagnostics
  -- without fragmenting the unit.
  student_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- E.2's seven states. Not an ENUM type, for 015 §2's reason: `ALTER TYPE …
  -- ADD VALUE` cannot run inside a transaction block, so an enum makes every
  -- future migration that touches it non-atomic. A CHECK is alterable
  -- transactionally and reads the same.
  state                     TEXT        NOT NULL CHECK (state IN (
                              'ACTIVE','DORMANT','REVIEWING','ASSESSING',
                              'CLOSED_UNVERIFIED','VERIFIED','ABANDONED'
                            )),

  -- C.3's enum, verbatim — three values. E.1's *"explicit 'start studying'
  -- action"* is `tool_activity` and records its precise trigger in the opening
  -- event's `payload.opened_by`; the enum is not widened past its spec.
  origin                    TEXT        NOT NULL CHECK (origin IN (
                              'tool_activity','declaration','resumed'
                            )),

  opened_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- THE ONLY LIVENESS INPUT (E.3). It advances when a QUALIFYING event lands,
  -- and at no other time — not on a page view, not on a poll of
  -- `GET /session/current`, and not on a heartbeat, because E.3 refuses all
  -- three by name: *"Liveness is a property of the event stream, not of a
  -- socket, a heartbeat or a timer."*
  last_activity_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  finish_requested_at       TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,

  -- Why it stopped. Every value is a FACT; none is a verdict. There is no
  -- 'gave_up', no 'failed' and no 'incomplete' (§4, NEVER SHAME), and V.1.7
  -- asks for 'reaped' by name.
  close_reason              TEXT        CHECK (close_reason IN (
                              'reaped','review_skipped','assessment_skipped',
                              'generation_failed','assessment_completed','discarded'
                            )),

  -- E.2.b's precondition, as a stored count rather than a subquery: ABANDONED
  -- is reachable *"only while the session contains NO E-class event"*, and a
  -- CHECK cannot run a subquery. Maintained by the session engine when an
  -- evidence-bearing event (D.2's `E` column) attaches.
  evidence_event_count      INTEGER     NOT NULL DEFAULT 0 CHECK (evidence_event_count >= 0),

  -- C.3: how far the projection has consumed.
  input_watermark_event_id  UUID,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Terminal and closed are the same fact stated twice, so the database
  -- refuses them disagreeing rather than leaving a reader to guess which is
  -- authoritative.
  CONSTRAINT study_sessions_terminal_shape CHECK (
    (state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED')
       AND closed_at IS NOT NULL AND close_reason IS NOT NULL)
    OR
    (state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING')
       AND closed_at IS NULL AND close_reason IS NULL)
  ),

  -- E.2.b, AT THE ROW LEVEL. *"Once a question has been answered, evidence
  -- exists and PRINCIPLES §3.2 forbids discarding it — the session may only be
  -- closed, never erased."* `applySessionTransition()` refuses this too; the
  -- CHECK is the refusal that survives a caller which skips that function
  -- entirely, including the service role. Two independent refusals, the posture
  -- 020 established for a born-confirmed occurrence.
  CONSTRAINT study_sessions_abandon_requires_no_evidence CHECK (
    state <> 'ABANDONED' OR evidence_event_count = 0
  ),

  CONSTRAINT study_sessions_activity_after_open CHECK (last_activity_at >= opened_at),
  CONSTRAINT study_sessions_closed_after_open   CHECK (closed_at IS NULL OR closed_at >= opened_at)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · THE LINK FROM THE EVENT STREAM
--
-- 015 ships `academic_events.session_id UUID` with no foreign key, with the
-- comment *"Resolved by the session resolver (E.4) — M9."* This is M9, and the
-- key is STILL NOT ADDED — deliberately.
--
-- Two reasons, and the second is the load-bearing one:
--
--   · 015's table is partitioned by month and its partitions are created in a
--     DO block. A foreign key from a partitioned table is legal in PG 12+ but
--     it takes a lock on every partition on every future partition creation,
--     which turns 015's monthly maintenance into a blocking operation on the
--     one table this product may never fail to write.
--   · An academic event is a FACT and a session row is a DERIVATION (C.3). A
--     foreign key would let the derivation's absence refuse the fact. If the
--     session projection is ever rebuilt — which B.3 says it must be
--     rebuildable — a FK makes the rebuild delete-and-reinsert half the record.
--     The stream wins on any disagreement; a constraint pointing the other way
--     would encode the opposite.
--
-- The join is by id and is checked by the projection, not by the schema.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- The resolver's read: "this student's live session".
CREATE INDEX IF NOT EXISTS study_sessions_student_state_idx
  ON public.study_sessions (student_id, state);

-- The reaper's read: "every live session, oldest activity first". Partial, so
-- it stays the size of the live set rather than the size of history — a
-- product that works has millions of terminal sessions and thousands of live
-- ones, and the sweep must never pay for the former.
CREATE INDEX IF NOT EXISTS study_sessions_liveness_idx
  ON public.study_sessions (last_activity_at)
  WHERE state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING');

CREATE INDEX IF NOT EXISTS study_sessions_student_recent_idx
  ON public.study_sessions (student_id, opened_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ONE LIVE SESSION PER STUDENT — THE WHOLE OF M9-2's DONE-WHEN
--
-- C.3: *"Partial unique index enforcing at most one live session per student:
-- `UNIQUE(student_id) WHERE state NOT IN (terminal states)`."*
--
-- V.1.3: *"Opens a second tab and answers another. Still exactly one session;
-- both events attached; THE PARTIAL UNIQUE INDEX PREVENTS A SECOND."*
--
-- Written as the positive list rather than `NOT IN (…)` on purpose: a partial
-- index predicate must be immutable and PostgreSQL matches it TEXTUALLY when
-- deciding whether a query can use it, so the positive form is the one the
-- resolver's own `WHERE state IN (…)` read will match. The two lists are
-- complements and `LIVE_STATES` in `lib/study-session.ts` is DERIVED from
-- `TERMINAL_STATES` rather than written out twice; a test compares this
-- predicate against that derivation.
--
-- This is the structural guarantee, and it is worth being precise about what
-- it buys. It does not make the resolver's race disappear — it makes the race
-- RESOLVABLE: the second INSERT fails with SQLSTATE 23505 at the instant it
-- would have created a duplicate, and `resolveSession()` treats that as the
-- ordinary path (re-read, attach to the winner) rather than as an error. A
-- check-then-insert in application code has a window between the two
-- statements; there is no window here, because there is no check.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_one_live_per_student
  ON public.study_sessions (student_id)
  WHERE state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING');


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE TRANSITION GUARD — E.2's edges, in SQL
--
-- `applySessionTransition()` in `lib/study-session.ts` is the machine. This is
-- the same machine, refusing at the row level, for the reason 020 gives about
-- a born-confirmed occurrence: a guarantee enforced only in the application is
-- a guarantee that lasts until somebody writes a second application. The
-- service role is included — this trigger has no `session_user` exemption.
--
-- The trigger sees (OLD.state, NEW.state) and not the ACTION, so it holds the
-- PAIRS the action table produces. `tests/study-session.test.mjs` derives the
-- pair set from `TRANSITIONS` and fails unless it matches the list below
-- exactly — the M7 precedent for a list that exists twice because no compiler
-- sees the SQL.
--
-- TERMINAL IS TERMINAL. Any UPDATE that changes `state` away from
-- CLOSED_UNVERIFIED, VERIFIED or ABANDONED is refused. E.2 draws no edge out of
-- them, and §3.2 — *"facts are immutable and never deleted; a correction
-- appends a superseding fact rather than editing history"* — is why a closed
-- session is never reopened: the student starts a NEW one, and the record shows
-- both, honestly.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.study_sessions_transition_guard()
RETURNS TRIGGER AS $$
DECLARE
  -- E.2's edges as 'FROM>TO'. Kept as a literal array so a reader — and a test
  -- — can see the whole machine in one place.
  allowed TEXT[] := ARRAY[
    'ACTIVE>ACTIVE',
    'ACTIVE>DORMANT',
    'ACTIVE>REVIEWING',
    'ACTIVE>ABANDONED',
    'DORMANT>ACTIVE',
    'DORMANT>REVIEWING',
    'DORMANT>CLOSED_UNVERIFIED',
    'DORMANT>ABANDONED',
    'REVIEWING>REVIEWING',
    'REVIEWING>ASSESSING',
    'REVIEWING>CLOSED_UNVERIFIED',
    'ASSESSING>VERIFIED',
    'ASSESSING>CLOSED_UNVERIFIED'
  ];
BEGIN
  NEW.updated_at := NOW();

  IF NEW.state = OLD.state THEN
    -- A same-state update (advancing `last_activity_at`, moving the watermark)
    -- is not a transition and is not checked against the edge list. A terminal
    -- row still cannot take one: it is refused below.
    IF OLD.state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED')
       AND (NEW.closed_at IS DISTINCT FROM OLD.closed_at
            OR NEW.close_reason IS DISTINCT FROM OLD.close_reason
            OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at) THEN
      RAISE EXCEPTION
        'study_sessions: % is terminal (E.2); its closure cannot be rewritten', OLD.state;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED') THEN
    RAISE EXCEPTION
      'study_sessions: % is terminal (E.2); a closed session is never reopened — start a new one',
      OLD.state;
  END IF;

  IF NOT ((OLD.state || '>' || NEW.state) = ANY (allowed)) THEN
    RAISE EXCEPTION
      'study_sessions: % -> % is not an edge of the E.2 state machine', OLD.state, NEW.state;
  END IF;

  -- `student_id` is the session's identity, not a mutable attribute. Without
  -- this, one UPDATE could move a session — and every event attached to it —
  -- to a different student's record.
  IF NEW.student_id <> OLD.student_id THEN
    RAISE EXCEPTION 'study_sessions: student_id is immutable';
  END IF;

  IF NEW.opened_at <> OLD.opened_at THEN
    RAISE EXCEPTION 'study_sessions: opened_at is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_sessions_transition_guard_trg ON public.study_sessions;
CREATE TRIGGER study_sessions_transition_guard_trg
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.study_sessions_transition_guard();

-- A session is BORN live. E.2's entry to every terminal state is a transition,
-- so a row inserted directly as CLOSED_UNVERIFIED would be a close that never
-- happened — the same shape 020 refuses for a born-confirmed occurrence.
CREATE OR REPLACE FUNCTION public.study_sessions_birth_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state NOT IN ('ACTIVE','DORMANT') THEN
    RAISE EXCEPTION
      'study_sessions: a session is born ACTIVE (E.1); % is only reachable by transition', NEW.state;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_sessions_birth_guard_trg ON public.study_sessions;
CREATE TRIGGER study_sessions_birth_guard_trg
  BEFORE INSERT ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.study_sessions_birth_guard();


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · ROW LEVEL SECURITY
--
-- SELECT-own, and NOTHING ELSE — a stricter posture than 015 gave
-- `academic_events`, and deliberately so. E.7.3: *"CLIENTS HOLD NO
-- AUTHORITATIVE SESSION STATE. They render server state and subscribe to
-- changes. A stale tab renders stale, never writes stale."* A client that could
-- INSERT a session could open a second one from a second tab and defeat §4's
-- index by writing the winner itself; a client that could UPDATE one could
-- write `VERIFIED` without an assessment, which is the entire product's central
-- claim forged in one statement.
--
-- Under PostgreSQL RLS an omitted policy denies the command by construction,
-- which is a stronger statement than a policy evaluating to false: there is
-- nothing to accidentally widen. The service role bypasses RLS and is the only
-- writer. In this pass the only such writer is
-- `app/api/cron/session-reaping/route.ts`, which builds its `SessionStore`
-- adapter inline — the shape `app/api/cron/event-compaction/route.ts` (M7-7)
-- established. A shared `lib/sessions.ts` arrives with M9's second pass, when
-- the declaration and confirmation endpoints give it a second caller; one
-- caller does not justify a module.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_sessions_select_own ON public.study_sessions;
CREATE POLICY study_sessions_select_own ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Belt to the RLS braces, the posture 015 §5 established.
REVOKE INSERT, UPDATE, DELETE ON public.study_sessions FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7, 013 §5 and 015 §6: a migration that asserts a
-- posture fails loudly if the posture is not what it just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'study_sessions_one_live_per_student'
  ) THEN
    RAISE EXCEPTION '021 did not create the one-live-session partial unique index (C.3 / V.1.3)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_transition_guard_trg'
  ) THEN
    RAISE EXCEPTION '021 did not install the E.2 transition guard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_birth_guard_trg'
  ) THEN
    RAISE EXCEPTION '021 did not install the birth guard (E.1 — a session is born live)';
  END IF;

  -- The index is useless if its predicate is not the live set. Read the
  -- predicate back out of the catalogue rather than trusting the DDL above:
  -- an index whose WHERE clause drifted would still EXIST, and V.1.3 would
  -- still fail. All four live states, and none of the three terminal ones.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'study_sessions_one_live_per_student'
      AND indexdef LIKE '%ACTIVE%' AND indexdef LIKE '%DORMANT%'
      AND indexdef LIKE '%REVIEWING%' AND indexdef LIKE '%ASSESSING%'
      AND indexdef NOT LIKE '%CLOSED_UNVERIFIED%'
      AND indexdef NOT LIKE '%VERIFIED%'
      AND indexdef NOT LIKE '%ABANDONED%'
  ) THEN
    RAISE EXCEPTION
      'study_sessions_one_live_per_student exists but its predicate is not the E.2 live set';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename = 'study_sessions' AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'study_sessions has a non-SELECT policy (%): E.7.3 — clients hold no authoritative session state',
      bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO `session_concepts` TABLE. C.3 specifies `SessionConcept` and it is
--   real, but it belongs to M9-4/M9-5 (declaration, proposal, confirmation),
--   which are this milestone's second pass. Shipping the table now without the
--   `confirmation_state = 'confirmed' IMPLIES assessment_required = true`
--   invariant C.3 calls *"a database CHECK, not a code convention"* would ship
--   the shape without the guarantee, which is worse than shipping neither.
--
-- · NO `assessments` TABLE and no `UNIQUE(session_id)` on it. E.7.2's
--   single-flight rule is M10's, and it belongs with the table it constrains.
--
-- · NO SCORE COLUMN, no `contributes_to_score`, no `verified_concept_count`.
--   M9-1's done-when is *"the score does not fall"*, and the way this schema
--   guarantees it is by holding NOTHING a scoring pass could read as a
--   penalty. See SESSION_SCORE_CONTRACT in `lib/study-session.ts`, addressed
--   to M14.
--
-- · NO `duration_ms`. §1's reasoning: a stored duration is a number something
--   starts optimising, and E.1 bans the session from being a productivity
--   measure. The E.8 payload computes `duration_real` at read time.
--
-- · NO NOTIFICATION HOOK. V.1.7: *"No notification shames."* There is no
--   trigger here that enqueues anything, and `lib/session-reaping.ts` imports
--   neither `lib/notifications.ts` nor `lib/push.ts` — asserted by a test.
--
-- · IT DOES NOT BACKFILL. There is nothing to backfill: no session has ever
--   existed in this product, and the legacy blob holds no session concept
--   (017's `BACKFILLED_KEYS` maps every legacy row to
--   `EXTERNAL_STUDY_DECLARED`, session-less by construction).
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '021',
  '021_study_sessions.sql',
  '79300c1502e36694fbdda660b80b2b3607088e0f68ce24a8df74c7ae6385b7ed',
  'self'
);


-- ─── 022_session_concepts.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 022_session_concepts.sql — THE DECLARED CONCEPT, AND THE GATE IN FRONT OF
-- THE RECORD.
--
-- EXECUTION_PLAN M9-4: *"`EXTERNAL_STUDY_DECLARED` with `declared_text`
-- verbatim; `origin = 'declaration'`. Done when: V.2.1."*
-- EXECUTION_PLAN M9-5: *"Concept proposal and confirmation as EVENTS, not UI
-- flags; rejections retained. Done when: V.2.2, V.2.3 — nothing proposed
-- reaches the record unconfirmed."*
--
-- Architecture C.3 `SessionConcept`; Part E.5 (external study), E.6 (detection
-- and confirmation); Part V.2.1–V.2.5.
--
-- ADDITIVE ONLY. It creates one table and two views and touches nothing that
-- exists — not `study_sessions` (021), not `academic_events` (015), not
-- `occurrences` (007/020), not `concepts` (007/013). No column is altered, no
-- constraint is dropped, no policy on an existing table is rewritten.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–021.
--
--
-- WHAT 021 §8 DEFERRED, AND WHY IT COMES BACK HERE RATHER THAN THERE
--
-- 021 §8 records the omission by name: *"NO `session_concepts` TABLE. C.3
-- specifies `SessionConcept` and it is real, but it belongs to M9-4/M9-5 …
-- Shipping the table now WITHOUT the `confirmation_state = 'confirmed' IMPLIES
-- assessment_required = true` invariant C.3 calls 'a database CHECK, not a code
-- convention' would ship the shape without the guarantee, which is worse than
-- shipping neither."*
--
-- §2 below is that CHECK. The table arrives with its invariant, in one file,
-- and the invariant is the reason the file exists rather than a decoration on
-- it.
--
--
-- THE ONE THING THIS FILE EXISTS FOR
--
-- M9-5's done-when is five words: *"nothing proposed reaches the record
-- unconfirmed."* That is not a query convention — it is §6's view. 020
-- established the pattern for exactly this class of guarantee:
--
--     *"every consumer written from M11 onward reads this view rather than the
--      table. A reader that forgets `WHERE confirmed_at IS NOT NULL` silently
--      counts proposals as facts — the exact failure M8-4's done-when exists to
--      prevent — so the safe query is the one with the SHORTER NAME."*
--
-- `confirmed_session_concepts` is that view for this table, and the same
-- reasoning is transcribed rather than re-derived: a reader who forgets the
-- predicate is the failure mode, so the predicate is not the reader's to
-- remember. Part F's coverage manifest (M10-1) reads the view, never the table.
--
--
-- WHY A REJECTION IS A ROW AND NOT A DELETE
--
-- E.6: *"Removing a concept is permitted at REVIEWING and emits
-- `CONCEPT_CONFIRMED{accepted: false}` — THE PROPOSAL AND ITS REJECTION ARE
-- BOTH RETAINED, because the rejection is a training signal for concept
-- detection and because silently dropping proposals would make the review step
-- unauditable."* §3.2: *"facts are immutable and never deleted."*
--
-- So this table has NO delete path for anybody, including the service role
-- (§6's trigger refuses `TG_OP = 'DELETE'` unconditionally). A rejected
-- proposal keeps its row, its `rejected_at`, and the `client_event_id` of the
-- `CONCEPT_CONFIRMED{accepted:false}` event that rejected it. The audit trail
-- is the event; the row is the projection; neither is erasable.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · SESSION_CONCEPTS — C.3's key fields, and no more
--
-- C.3 `SessionConcept`:
--   Identity:  `(session_id, concept_ref)` where `concept_ref` is either
--              `concept_id UUID` or, when unresolved, a normalised
--              `declared_text`.
--   Key fields: `detection_source`, `confirmation_state`, `confirmed_at`,
--              `confirmed_by`, `assessment_required`.
--   Null-tolerance: *"`concept_id` may be NULL with `declared_text` set. Per
--              B.4, an unresolved concept must be representable — the system
--              must not invent a taxonomy match to avoid a null."* (V.2.4.)
--
-- WHAT IS DELIBERATELY ABSENT: any score column, any weight, any `points`, any
-- `contributes_to` flag. V.2.5 — *"the score has not moved. A declaration is
-- not evidence."* The way this schema guarantees that is by holding NOTHING a
-- scoring pass could read as a term, in either direction. See
-- SESSION_SCORE_CONTRACT in `lib/study-session.ts`, addressed to M14, and
-- `declarationScoreEffect()` in `lib/external-study.ts`, whose return type is a
-- union of exactly one arm.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.session_concepts (
  session_concept_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id              UUID        NOT NULL
                            REFERENCES public.study_sessions(session_id) ON DELETE CASCADE,

  -- Denormalised from the session so RLS is a column comparison rather than a
  -- join, the posture 020 took with `occurrences.student_id`. §7's trigger
  -- refuses a row whose `student_id` disagrees with its session's, so the
  -- denormalisation cannot drift.
  --
  -- A FOREIGN KEY IS CORRECT HERE AND WAS REFUSED IN 021 §2, AND THE DIFFERENCE
  -- IS THE POINT. 021 refused a key from `academic_events.session_id` because
  -- an event is a FACT and a session is a DERIVATION (C.3), and a constraint
  -- pointing from the fact to the derivation lets the derivation's absence
  -- refuse the fact. A `SessionConcept` is a derivation too — C.3 classes it
  -- `derived state` in as many words — so this key points derivation →
  -- derivation, and rebuilding the session projection rebuilds this one with
  -- it. Nothing raw is ever refused by it.
  student_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- B.4's LEGAL NULL. V.2.4: *"Student types 'and the thing about wobbling
  -- tops' — no taxonomy match. A SessionConcept exists with `concept_id = NULL`
  -- and `declared_text` preserved. The system does NOT guess a match."*
  concept_id              UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,

  -- THE STUDENT'S OWN WORDS, VERBATIM. Not trimmed here, not normalised here,
  -- not case-folded here, not truncated here. `concept_ref` below carries the
  -- normalised form for identity; this column carries what was typed. The two
  -- are separate columns precisely so that tuning comparison can never edit
  -- the record — the same split `lib/concept-resolution.ts` makes between
  -- `normaliseConceptText()` (tunable) and the taxonomy slug (byte-stable
  -- forever).
  declared_text           TEXT,

  -- C.3's composite identity, materialised as one column so `UNIQUE
  -- (session_id, concept_ref)` is expressible. Written by the application as
  -- the concept UUID when resolved, and as `text:<normalised declared_text>`
  -- when not (`conceptRefFor()` in `lib/session-concepts.ts`). It is the
  -- deduplication key and NOTHING reads it as prose.
  concept_ref             TEXT        NOT NULL CHECK (length(concept_ref) > 0),

  -- E.6's table, verbatim — four sources.
  detection_source        TEXT        NOT NULL CHECK (detection_source IN (
                            'tool_tagged','ai_proposed','student_declared','student_added'
                          )),

  -- C.3's enum, verbatim — three states. `rejected` is a STATE, not an absence:
  -- see the header on why a rejection is a row.
  confirmation_state      TEXT        NOT NULL CHECK (confirmation_state IN (
                            'proposed','confirmed','rejected'
                          )),

  -- M9-4's `origin = 'declaration'`, PROPAGATED. 021's `study_sessions.origin`
  -- answers "how did this session start"; this column answers "where did this
  -- concept come from", and the two can legitimately differ — a declaration
  -- made inside a session that a practice question opened is
  -- `origin='declaration'` on a session whose origin is `tool_activity`. Same
  -- three values as C.3's session enum, deliberately, so a reader does not have
  -- to learn a second vocabulary.
  origin                  TEXT        NOT NULL CHECK (origin IN (
                            'tool_activity','declaration','resumed'
                          )),

  proposed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at            TIMESTAMPTZ,
  rejected_at             TIMESTAMPTZ,

  -- C.3's enum, verbatim. `rule` is E.6's auto-confirm for `tool_tagged` (*"the
  -- mapping is deterministic; no inference occurred"*); `student` is the other
  -- three. There is deliberately no `'ai'` value: E.6 says `ai_proposed`
  -- auto-confirms *"never — an inference is not a fact (L1)"*, so a model can
  -- never be the confirmer of anything.
  confirmed_by            TEXT        CHECK (confirmed_by IN ('student','rule')),

  -- F.2's row-level expression. See §2.
  assessment_required     BOOLEAN     NOT NULL DEFAULT FALSE,

  -- THE AUDIT LINK, AND THE WHOLE OF "EVENTS, NOT UI FLAGS".
  --
  -- M9-5's task line: *"Concept proposal and confirmation as EVENTS, not UI
  -- flags."* These two columns are what make that checkable rather than
  -- asserted: every row names the `client_event_id` of the event that proposed
  -- it, and every decided row names the `client_event_id` of the
  -- `CONCEPT_CONFIRMED` event that decided it. 015 carries `UNIQUE (student_id,
  -- client_event_id)` on `academic_events`, so both are resolvable to exactly
  -- one immutable, append-only event.
  --
  -- TEXT and not UUID because `client_event_id` is a derived string (M7's
  -- `deriveClientEventId()` returns `e1_<40 hex>`), and not a foreign key
  -- because `academic_events` is partitioned by month — 021 §2's second
  -- argument, which applies unchanged.
  source_client_event_id  TEXT        NOT NULL CHECK (length(source_client_event_id) > 0),
  decision_client_event_id TEXT       CHECK (decision_client_event_id IS NULL
                                             OR length(decision_client_event_id) > 0),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- B.4 / V.2.4 · a row must be identifiable as SOMETHING. A resolved concept
  -- names a taxonomy node; an unresolved one carries the student's words. A row
  -- with neither is a concept nobody can name, which is not a legal state.
  CONSTRAINT session_concepts_identifiable CHECK (
    concept_id IS NOT NULL OR (declared_text IS NOT NULL AND length(declared_text) > 0)
  ),

  -- The three states and their timestamps are the same fact stated twice, so
  -- the database refuses them disagreeing rather than leaving a reader to guess
  -- which is authoritative. (021's `study_sessions_terminal_shape`, reused.)
  CONSTRAINT session_concepts_state_shape CHECK (
    (confirmation_state = 'proposed'
       AND confirmed_at IS NULL AND rejected_at IS NULL AND confirmed_by IS NULL)
    OR
    (confirmation_state = 'confirmed'
       AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
    OR
    (confirmation_state = 'rejected'
       AND rejected_at IS NOT NULL)
  ),

  -- E.6, AT THE ROW LEVEL: *"`ai_proposed` — inferred from free text or
  -- activity — enters as `proposed`. Auto-confirms? NEVER. An inference is not
  -- a fact (L1)."* The CHECK cannot say "never at INSERT time" on its own (a
  -- CHECK cannot distinguish INSERT from UPDATE), so §7's birth guard says the
  -- INSERT half and this says nothing about it — what this refuses is a
  -- model being recorded as the confirmER, which no state may claim.
  CONSTRAINT session_concepts_no_model_confirmation CHECK (
    confirmation_state <> 'confirmed'
    OR detection_source <> 'ai_proposed'
    OR confirmed_by = 'student'
  )
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · THE INVARIANT 021 §8 REFUSED TO SHIP WITHOUT
--
-- C.3 `SessionConcept`, Hard invariant (TARGET DESIGN): *"`confirmation_state =
-- 'confirmed'` IMPLIES `assessment_required = true`. This is the row-level
-- expression of the Part F coverage guarantee, and IT IS A DATABASE CHECK, NOT
-- A CODE CONVENTION."*
--
-- F.2 is the rule it protects: *"Every SessionConcept with `confirmation_state
-- = 'confirmed'` MUST appear in the session's assessment with at least one
-- question"*, enforced *"at four layers, none of which is a prompt"*, of which
-- this is layer 1 (Data).
--
-- Written as a separate, NAMED constraint rather than folded into §1's shape
-- check so that M10-1's test can look it up by name in `pg_constraint` and fail
-- if it ever went missing. A guarantee whose absence is silent is not one.
--
-- The converse is deliberately NOT constrained: `assessment_required = true` on
-- a `proposed` row is legal and meaningless-but-harmless, and forbidding it
-- would make confirmation a two-column write that could half-succeed.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_concepts_confirmed_implies_assessed'
  ) THEN
    ALTER TABLE public.session_concepts
      ADD CONSTRAINT session_concepts_confirmed_implies_assessed CHECK (
        confirmation_state <> 'confirmed' OR assessment_required = TRUE
      );
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · IDENTITY AND INDEXES
--
-- C.3's identity is `(session_id, concept_ref)`. As a UNIQUE constraint it is
-- also the deduplication rule: a student who declares "Torque" twice in one
-- session has one row and two events, which is the right way round — the events
-- are the history and the row is the projection.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS session_concepts_identity
  ON public.session_concepts (session_id, concept_ref);

-- "What is this session's confirmed set?" — Part F's coverage manifest (M10-1),
-- and the only query that may be read as fact.
CREATE INDEX IF NOT EXISTS session_concepts_confirmed_idx
  ON public.session_concepts (session_id)
  WHERE confirmation_state = 'confirmed';

-- "What is waiting for me at the review step?" — the REVIEWING surface's query.
CREATE INDEX IF NOT EXISTS session_concepts_proposed_idx
  ON public.session_concepts (session_id)
  WHERE confirmation_state = 'proposed';

-- B.4's taxonomy review queue: unresolved declarations, retained verbatim and
-- routed for curation. E.6: *"Free text is retained verbatim and routed to the
-- taxonomy review queue (B.4); it does NOT block the session."*
CREATE INDEX IF NOT EXISTS session_concepts_unresolved_idx
  ON public.session_concepts (student_id, proposed_at DESC)
  WHERE concept_id IS NULL;

CREATE INDEX IF NOT EXISTS session_concepts_student_idx
  ON public.session_concepts (student_id, proposed_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · THE RECORD, AS A VIEW — M9-5's DONE-WHEN, IN ONE OBJECT
--
-- *"Nothing proposed reaches the record unconfirmed."*
--
-- V.2.2: *"AI proposes Torque and Moment of Inertia. Both appear as
-- SessionConcept{detection_source:'ai_proposed', confirmation_state:'proposed'}.
-- NEITHER IS CONFIRMED. NEITHER REACHES THE RECORD."*
--
-- This is 020 §3's `confirmed_occurrences` applied to the same class of
-- problem, and the argument is transcribed rather than re-derived: a reader
-- that forgets the predicate silently counts proposals as facts, so the
-- predicate stops being the reader's to remember. Every consumer from M10
-- onward — the coverage manifest, the academic record projection (M12), the
-- score (M14), memory (M23), any parent-visible aggregate (N.4) — reads THIS,
-- never `session_concepts`.
--
-- `security_invoker` so the caller's own RLS still applies: the view widens
-- nothing, it only narrows.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.confirmed_session_concepts
  WITH (security_invoker = true)
AS
  SELECT * FROM public.session_concepts WHERE confirmation_state = 'confirmed';

COMMENT ON VIEW public.confirmed_session_concepts IS
  'The confirmed concept set — the only session-concept surface that may be read '
  'as academic fact (M9-5, V.2.2). Rows in session_concepts with '
  'confirmation_state IN (''proposed'',''rejected'') are deliberately absent. '
  'Read this, not the table.';

-- The rejections, kept and readable, because E.6 says they are a training
-- signal and because §3.2 says nothing is deleted. This view exists so that
-- "retained" is a thing somebody can SELECT rather than a claim in a comment.
-- It is deliberately NOT part of the record: nothing downstream of the
-- assessment engine may read it as coverage.
CREATE OR REPLACE VIEW public.rejected_session_concepts
  WITH (security_invoker = true)
AS
  SELECT * FROM public.session_concepts WHERE confirmation_state = 'rejected';

COMMENT ON VIEW public.rejected_session_concepts IS
  'Proposals the student rejected, retained in full (E.6 — the rejection is a '
  'training signal for concept detection, and silently dropping proposals would '
  'make the review step unauditable). NOT part of the academic record.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · ROW LEVEL SECURITY
--
-- SELECT-own and NOTHING ELSE — 021 §6's posture, for 021 §6's reason, applied
-- to the table where the stakes are higher.
--
-- E.7.3: *"CLIENTS HOLD NO AUTHORITATIVE SESSION STATE."* A client that could
-- INSERT here could write itself a `confirmed` concept with
-- `assessment_required = true` and no event behind it — a coverage claim with
-- no proposal and no confirmation, which is M9-5's done-when defeated in one
-- statement. A client that could UPDATE could confirm a proposal without
-- emitting `CONCEPT_CONFIRMED`, turning the event trail into a decoration.
--
-- Under PostgreSQL RLS an omitted policy denies the command by construction,
-- which is stronger than a policy evaluating to false: there is nothing to
-- accidentally widen. The service role bypasses RLS and is the only writer, and
-- §7's triggers bind it too — because RLS does not.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.session_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_concepts_select_own ON public.session_concepts;
CREATE POLICY session_concepts_select_own ON public.session_concepts
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

REVOKE INSERT, UPDATE, DELETE ON public.session_concepts FROM anon, authenticated;

GRANT SELECT ON public.confirmed_session_concepts TO authenticated;
GRANT SELECT ON public.rejected_session_concepts  TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · NOTHING IS EVER DELETED
--
-- §3.2: *"Facts are immutable and never deleted; a correction appends a
-- superseding fact rather than editing history."*
-- E.6: *"the proposal and its rejection are BOTH RETAINED … silently dropping
-- proposals would make the review step unauditable."*
--
-- This trigger is the only mechanism in this file that binds EVERY writer,
-- present and future, including the service role — 020 §5's argument, unchanged:
-- RLS does not apply to the service role, and everything the session engine
-- writes runs as it. A REVOKE protects against a client; only a trigger
-- protects against the next endpoint somebody writes in a hurry.
--
-- The one legitimate deletion is the cascade from a deleted student, which is
-- Part O's right to erasure and arrives as a `DELETE` on `auth.users`. A
-- BEFORE DELETE trigger would break it, so the guard checks whether the owning
-- row still exists: if the student (or their session) is gone, the cascade is
-- the deleter and it is allowed. Anything else is refused.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.session_concepts_no_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.student_id) THEN
    RAISE EXCEPTION
      'session_concept % may not be deleted: a rejection is retained, not dropped (E.6, PRINCIPLES 3.2)',
      OLD.session_concept_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS session_concepts_no_delete_trg ON public.session_concepts;
CREATE TRIGGER session_concepts_no_delete_trg
  BEFORE DELETE ON public.session_concepts
  FOR EACH ROW EXECUTE FUNCTION public.session_concepts_no_delete();


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · THE BIRTH GUARD AND THE DECISION GUARD
--
-- Two refusals the CHECKs in §1 cannot express, because a CHECK sees one row
-- and not a transition.
--
-- BIRTH. E.6: an `ai_proposed` concept auto-confirms *"NEVER"*. A row inserted
-- directly as `confirmed` with `detection_source = 'ai_proposed'` would be a
-- confirmation that never happened — precisely the shape 020 §5 refuses for a
-- born-confirmed occurrence (*"confirmation is a transition, not a value"*).
-- The other three sources DO auto-confirm at birth (E.6's table says so in as
-- many words), so this guard is narrow on purpose: it refuses one source, not
-- the whole idea of a born-confirmed row.
--
-- DECISION. Every move out of `proposed` must name the `CONCEPT_CONFIRMED`
-- event that caused it. This is the mechanical half of *"as EVENTS, not UI
-- flags"*: a confirmation with no `decision_client_event_id` is a checkbox, and
-- the database refuses to store one. The identity columns are immutable for the
-- reason 020 gives — a written row is a fact — and `declared_text` is immutable
-- for a sharper one: it is the student's own words, and V.2.1 requires them
-- verbatim FOREVER, not merely at the moment of writing.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.session_concepts_birth_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.detection_source = 'ai_proposed' AND NEW.confirmation_state <> 'proposed' THEN
    RAISE EXCEPTION
      'an ai_proposed concept is born proposed (E.6 — an inference is not a fact); % is only reachable by a CONCEPT_CONFIRMED event',
      NEW.confirmation_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.confirmation_state <> 'proposed' AND NEW.decision_client_event_id IS NULL THEN
    RAISE EXCEPTION
      'a % session_concept must name the CONCEPT_CONFIRMED event that decided it (M9-5 — events, not UI flags)',
      NEW.confirmation_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_sessions s
    WHERE s.session_id = NEW.session_id AND s.student_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION
      'session_concept.student_id does not match its session''s student'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_concepts_birth_guard_trg ON public.session_concepts;
CREATE TRIGGER session_concepts_birth_guard_trg
  BEFORE INSERT ON public.session_concepts
  FOR EACH ROW EXECUTE FUNCTION public.session_concepts_birth_guard();


CREATE OR REPLACE FUNCTION public.session_concepts_decision_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();

  -- Identity is not an attribute.
  IF NEW.session_concept_id IS DISTINCT FROM OLD.session_concept_id
     OR NEW.session_id      IS DISTINCT FROM OLD.session_id
     OR NEW.student_id      IS DISTINCT FROM OLD.student_id
     OR NEW.concept_ref     IS DISTINCT FROM OLD.concept_ref
     OR NEW.proposed_at     IS DISTINCT FROM OLD.proposed_at
     OR NEW.source_client_event_id IS DISTINCT FROM OLD.source_client_event_id THEN
    RAISE EXCEPTION
      'session_concept %: identity and provenance are immutable', OLD.session_concept_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- THE STUDENT'S WORDS ARE NOT EDITABLE. V.2.1 asks for `declared_text`
  -- verbatim; a column that can be rewritten later is verbatim only until
  -- somebody writes a cleanup script. `concept_id` is the exception and moves
  -- in ONE direction only: NULL → NOT NULL, when B.4's taxonomy review queue
  -- later resolves what the resolver refused to guess. A resolved concept is
  -- never re-pointed (020's `pattern_id` rule, reused).
  IF NEW.declared_text IS DISTINCT FROM OLD.declared_text THEN
    RAISE EXCEPTION
      'session_concept %: declared_text is the student''s own words and is immutable (V.2.1)',
      OLD.session_concept_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.concept_id IS NOT NULL AND NEW.concept_id IS DISTINCT FROM OLD.concept_id THEN
    RAISE EXCEPTION
      'session_concept %: a resolved concept is never re-pointed', OLD.session_concept_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.detection_source IS DISTINCT FROM OLD.detection_source THEN
    RAISE EXCEPTION
      'session_concept %: detection_source records how it was found and is immutable',
      OLD.session_concept_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.confirmation_state IS DISTINCT FROM OLD.confirmation_state THEN
    -- Every decision names its event. Without this, `confirmation_state` is a
    -- mutable database field with no history — the exact "UI flag" M9-5's task
    -- line forbids.
    IF NEW.decision_client_event_id IS NULL
       OR NEW.decision_client_event_id IS NOT DISTINCT FROM OLD.decision_client_event_id THEN
      RAISE EXCEPTION
        'session_concept %: a change of confirmation_state must name a NEW CONCEPT_CONFIRMED event',
        OLD.session_concept_id
        USING ERRCODE = 'check_violation';
    END IF;

    -- A decision is never un-made into a proposal. E.2's terminal reasoning,
    -- applied one level down: the student may change their mind, and that is a
    -- new decision with a new event — never a return to "nobody has decided".
    IF NEW.confirmation_state = 'proposed' THEN
      RAISE EXCEPTION
        'session_concept %: a decided concept never returns to proposed', OLD.session_concept_id
        USING ERRCODE = 'check_violation';
    END IF;

    -- `confirmed_at` and `rejected_at` ACCUMULATE rather than swap: a concept
    -- confirmed and later removed at REVIEWING keeps both stamps, so the
    -- history is legible from the row as well as from the stream.
    IF OLD.confirmed_at IS NOT NULL AND NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN
      RAISE EXCEPTION
        'session_concept %: confirmed_at is written once', OLD.session_concept_id
        USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.rejected_at IS NOT NULL AND NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
      RAISE EXCEPTION
        'session_concept %: rejected_at is written once', OLD.session_concept_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_concepts_decision_guard_trg ON public.session_concepts;
CREATE TRIGGER session_concepts_decision_guard_trg
  BEFORE UPDATE ON public.session_concepts
  FOR EACH ROW EXECUTE FUNCTION public.session_concepts_decision_guard();


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7, 013 §5, 015 §6, 020 §7 and 021 §7: a migration
-- that asserts a posture fails loudly if the posture is not what it just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_concepts_confirmed_implies_assessed'
  ) THEN
    RAISE EXCEPTION
      '022 did not install the C.3 hard invariant (confirmed IMPLIES assessment_required) — the one thing 021 8 refused to ship without';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'confirmed_session_concepts'
  ) THEN
    RAISE EXCEPTION
      '022 did not create confirmed_session_concepts: nothing proposed may reach the record (M9-5, V.2.2)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'rejected_session_concepts'
  ) THEN
    RAISE EXCEPTION
      '022 did not create rejected_session_concepts: a rejection is retained (E.6)';
  END IF;

  -- The view is useless if its predicate is not confirmation. Read the
  -- definition back out of the catalogue rather than trusting the DDL above:
  -- a view whose WHERE clause drifted would still EXIST, and M9-5 would still
  -- fail.
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'confirmed_session_concepts'
      AND definition LIKE '%confirmation_state%'
      AND definition LIKE '%confirmed%'
  ) THEN
    RAISE EXCEPTION
      'confirmed_session_concepts exists but does not filter on confirmation_state';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'session_concepts_no_delete_trg'
  ) THEN
    RAISE EXCEPTION '022 did not install the no-delete guard (E.6 — rejections are retained)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'session_concepts_birth_guard_trg'
  ) THEN
    RAISE EXCEPTION '022 did not install the birth guard (E.6 — ai_proposed never auto-confirms)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'session_concepts_decision_guard_trg'
  ) THEN
    RAISE EXCEPTION '022 did not install the decision guard (M9-5 — events, not UI flags)';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename = 'session_concepts' AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'session_concepts has a non-SELECT policy (%): E.7.3 — clients hold no authoritative session state',
      bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO SCORE COLUMN, no weight, no `points`, no `contributes_to_score`. V.2.5:
--   *"Assertion: THE SCORE HAS NOT MOVED. A declaration is not evidence."* The
--   way this schema guarantees that is by holding nothing a scoring pass could
--   read as a term — in either direction. `EXTERNAL_STUDY_DECLARED` is absent
--   from `EVIDENCE_BEARING_TYPES` in `lib/event-contract.ts` (D.2.b — *"it
--   moves no score dimension by itself"*) and present in
--   `CONFIRMATION_REQUIRED_TYPES`, and neither list was edited by this pass.
--
-- · NO `assessments` TABLE, no `coverage_manifest`, no `UNIQUE(session_id)` on
--   an assessment. That is M10, and E.7.2's single-flight rule belongs with the
--   table it constrains. This migration produces the confirmed set the coverage
--   manifest will be computed FROM; it does not compute it.
--
-- · NO `coverage_state` COLUMN. E.5.6 marks a concept `declared` after
--   confirmation and `assessed`/`proven` only after assessment, and E.5.b makes
--   the distinction load-bearing at every surface — but `coverage_state` is a
--   property of the ACADEMIC RECORD projection (M12), not of one session's
--   concept row. Putting it here would give it two homes and let them disagree.
--
-- · NO AI CALL, ANYWHERE. E.5.3 says the AI boundary proposes concept
--   resolutions from `declared_text`. `lib/external-study.ts` resolves through
--   M6's DETERMINISTIC `resolveConceptText()` instead, for the reason
--   `lib/concept-resolution.ts`'s header already argues at length: the typed
--   capability boundary is M15, and an unversioned model call underneath
--   concept identity is the thing B.4 exists to prevent. The
--   `detection_source = 'ai_proposed'` value is reserved and used, so the
--   substitution is a change of proposer and not of schema.
--
-- · NO NOTIFICATION HOOK, no trigger that enqueues anything.
--
-- · IT DOES NOT BACKFILL. 017's legacy backfill maps every legacy row to
--   `EXTERNAL_STUDY_DECLARED` with `session_id = NULL` — session-less by
--   construction, *"a pre-epoch declaration belongs to no session and never
--   will"* — so there is no legacy row this table could hold.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '022',
  '022_session_concepts.sql',
  '8c9803f69e1221b3873d30e808f44facac31b962d48d222ae4a791a3e5a28e55',
  'self'
);

-- What this part left behind, from the database rather than from a claim:
SELECT version, name, recorded_by FROM supabase_migrations.schema_migrations ORDER BY version;
