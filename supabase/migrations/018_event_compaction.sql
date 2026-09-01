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
