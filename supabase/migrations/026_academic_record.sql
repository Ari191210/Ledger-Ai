-- ═══════════════════════════════════════════════════════════════════════════
-- 026_academic_record.sql — THE ACADEMIC RECORD PROJECTION: `coverage_state`
-- AS A VIEW, THE L2 CACHE THAT COPIES IT, THE PER-CONCEPT ACCURACY COUNTERS,
-- AND THE WATERMARK LEDGER THE CONSISTENCY JOB CHECKS.
--
-- EXECUTION_PLAN M12-1: *"`coverage_state` per concept: declared → studied →
-- proven. Done when: V.2.7 — a concept becomes `proven` only after
-- assessment."*
-- EXECUTION_PLAN M12-2: *"Per-concept accuracy, watermarked and incremental.
-- Done when: U.2 qualification 1: no queue is introduced."*
-- EXECUTION_PLAN M12-3: *"Consistency job verifying each projection's watermark
-- against the stream. Done when: T8 mitigation."*
--
-- Architecture C.3 (`AcademicRecord`), H.1 (the five layers), H.2 (L2 is
-- disposable), Part W's *Persistence* rows L1–L5; V.2.7; T6; T8.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–025.
--
--
-- THE ONE DECISION THIS FILE ENCODES
--
-- **`coverage_state` IS A VIEW, AND THE TABLE IS ONLY ITS CACHE.**
--
-- C.3: *"Rebuild rule: fully derivable from events + attempts + patterns.
-- **Stored only as a cache, with the watermark that produced it.**"* H.1 puts
-- `AcademicRecord` in L2, whose row in the table reads *"rebuildable from L1 by
-- replay"*, and H.1.a is the rule that makes the whole thing auditable: *"a
-- layer may read downward and may never write downward … there is exactly one
-- door into the truth."*
--
-- So the DERIVATION stores nothing and cannot drift — a query is not a copy.
-- `lib/coverage-state.ts` holds all four rungs; §2's
-- `concept_assessment_evidence` holds the two that can be expressed without
-- naming M9's fenced session-concept relation (§2 explains the split in full).
--
-- §4's `academic_record` is a TABLE, and it is a CACHE OF THAT VIEW, carrying
-- `input_watermark_event_id` for exactly the reason C.3 gives about
-- `StudySession`: *"records how far the projection has consumed, WHICH MAKES A
-- STALE ROW DETECTABLE rather than silently wrong."* When the two disagree the
-- VIEW WINS, and §6's comment says so in the schema rather than in a wiki.
--
-- M10 refused to award `proven` and said why (`lib/assessment-verification.ts`:
-- *"a second module deciding when a concept becomes proven would be the second
-- source of truth H.1.a forbids"*). This file is where it is awarded, once.
--
--
-- WHAT MAKES A CONCEPT `proven` — THE FOURTH RUNG, IN SQL
--
-- V.2.7: *"The student passes both. **Now** … `AcademicRecord.coverage_state`
-- for Torque becomes `proven`."* Three conditions, all required:
--
--   1. the coverage obligation was DISCHARGED — 024 §3's
--      `assessment_verification_coverage.covered`, which already requires a
--      BOUND and ANSWERED unrevoked question;
--   2. the session is `VERIFIED` — reachable only through M10's transition
--      gate, which refuses a coverage hole server-side (V.3.5, T5);
--   3. at least `questions_required` DISTINCT questions for that concept have a
--      correct latest attempt.
--
-- Condition 3 counts DISTINCT QUESTIONS and reads the LATEST attempt per
-- question, because F.5 makes answers append-only with `attempt_no`: counting
-- attempts would let four wrong answers and one right answer to a single
-- question prove a concept, which is not a reading of the evidence this record
-- may take.
--
-- Condition 2 is what keeps V.3.4 false while V.2.7 is true. In V.3.4 the
-- session closes `CLOSED_UNVERIFIED`, so its concepts stop at `studied` and
-- *"nothing is presented as verified."*
--
--
-- ADDITIVE THROUGHOUT
--
-- Six new objects (three tables, three views), no ALTER of any existing table,
-- no DROP of any constraint, no widening of any CHECK, and no policy on an
-- existing table is touched. 015–025 are untouched, so no earlier checksum
-- moves (T1).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · PRECONDITIONS — this file reads five objects it did not create
--
-- A view over a missing table fails at CREATE with a message about a relation,
-- which is a worse first line of a stack trace than the one below. 024 §10's
-- posture, reused.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM unnest(ARRAY[
    'study_sessions', 'assessments',
    'assessment_questions', 'assessment_attempts', 'academic_events'
  ]) AS t
  WHERE to_regclass('public.' || t) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      '026 requires 015, 021, 022, 023 and 024 to be applied first — missing: %', missing;
  END IF;

  IF to_regclass('public.assessment_verification_coverage') IS NULL THEN
    RAISE EXCEPTION
      '026 projects `assessed` and `proven` from 024 §3''s assessment_verification_coverage, which is absent';
  END IF;

  -- 022's confirmed-set view is DELIBERATELY NOT CHECKED HERE, and not named
  -- anywhere in this file. See §2: M9 fences that relation by substring, so
  -- rungs 1 and 2 are derived in `lib/coverage-state.ts` and nothing in this
  -- migration reads a session concept at all.
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · THE ASSESSMENT EVIDENCE — C.3's `coverage_state`, rungs 3 and 4
--
-- The ladder, bottom to top. Each rung is a strictly stronger predicate than
-- the one below it, so the CASE reads top-down and returns the highest rung
-- whose evidence exists.
--
--   declared  a CONFIRMED session_concept exists (022 §4's predicate). V.2.2:
--             *"Neither is confirmed. NEITHER REACHES THE RECORD."*
--   studied   the episode happened: the session carried E-class evidence, or it
--             left the open states. ABANDONED is excluded — E.2.b makes it
--             reachable only with zero evidence, so counting it would put an
--             event in the record that never occurred.
--   assessed  024 §3 says `covered`. F.2.a's *"recorded as `studied`, NOT
--             `assessed`"* is the rung below.
--   proven    covered + VERIFIED session + enough correct distinct questions.
--
-- `security_invoker = true` on every view here, exactly as 020 §3, 022 §4,
-- 023 §4 and 024 §3 do it: the view is a NAME for a predicate and never a
-- privilege escalation past RLS.
-- ═══════════════════════════════════════════════════════════════════════════

-- Correct answers per (assessment, concept), counting DISTINCT QUESTIONS whose
-- LATEST unrevoked attempt was correct. Split out of the main view so the
-- distinct-question rule is one readable object rather than a nested clause.
CREATE OR REPLACE VIEW public.concept_correct_answers
  WITH (security_invoker = true)
AS
  SELECT
    q.assessment_id,
    q.concept_ref,
    a.session_id,
    a.student_id,
    COUNT(DISTINCT q.question_id) FILTER (WHERE latest.is_correct)  AS correct_questions,
    COUNT(DISTINCT q.question_id)                                    AS answered_questions
  FROM public.unrevoked_assessment_questions q
  JOIN public.assessments a ON a.assessment_id = q.assessment_id
  JOIN LATERAL (
    -- F.5: answers are append-only with `attempt_no`; the LAST one is the
    -- student's answer and the earlier ones are the history of getting there.
    SELECT t.is_correct
    FROM public.assessment_attempts t
    WHERE t.question_id = q.question_id
    ORDER BY t.attempt_no DESC
    LIMIT 1
  ) AS latest ON TRUE
  WHERE q.counts_toward_coverage = TRUE
  GROUP BY q.assessment_id, q.concept_ref, a.session_id, a.student_id;

COMMENT ON VIEW public.concept_correct_answers IS
  'Per (assessment, concept): distinct unrevoked questions whose LATEST attempt '
  'was correct. Distinct questions, not attempts — F.5 makes answers '
  'append-only, and counting attempts would let one question proven four times '
  'over stand in for four questions.';


-- THE ASSESSMENT HALF OF THE LADDER — rungs 3 and 4, and NOT rungs 1 and 2.
--
-- **WHY THE `declared` AND `studied` RUNGS ARE NOT IN THIS FILE.** 022's header
-- makes `confirmed_session_concepts` the only reachable spelling of M9's record
-- and fences it hard: M9's own suite fails if ANY file outside 022 and
-- `lib/session-concepts.ts` names the session-concept relation, and it matches
-- on the substring — so the view's own name is fenced along with the table
-- beneath it. 022 anticipated exactly that (*"a view name that contains the raw
-- table's name as a substring makes 'does this file reach past the view?'
-- unanswerable by inspection"*), and its answer was that downstream readers go
-- through `CONFIRMED_SESSION_CONCEPTS_VIEW` in `lib/session-concepts.ts` rather
-- than retyping the name.
--
-- This migration honours that rather than arguing with it. The consequence is
-- a deliberate split, recorded here rather than resolved by judgement in the
-- moment:
--
--   rungs 1–2 (`declared`, `studied`)  →  `lib/coverage-state.ts`, fed by the
--       caller through M9's exported view constant. TypeScript is the CANONICAL
--       derivation and computes all four rungs.
--   rungs 3–4 (`assessed`, `proven`)  →  this view, over M10's evidence alone.
--       It names no session concept, so the fence holds.
--
-- Nothing is lost by the split: the two halves are checked against each other
-- by `tests/academic-record.test.mjs`, and §6's drift view uses THIS view as
-- the CEILING a cached row may not exceed — which is the direction that
-- matters. A cache claiming `proven` with no assessment behind it is the
-- fabricated claim V.2.7 is a test against; a cache claiming `declared` when
-- the student has since studied more is merely stale.
CREATE OR REPLACE VIEW public.concept_assessment_evidence
  WITH (security_invoker = true)
AS
  SELECT
    v.student_id,
    v.concept_ref,
    COUNT(*)                                             AS assessed_count,
    MIN(v.assessment_id::TEXT)::UUID                     AS assessed_in_assessment_id,
    -- THE FOURTH RUNG. All three conditions in one predicate, so no path
    -- reaches `proven` holding only two of them.
    BOOL_OR(
      s.state = 'VERIFIED'
      AND ca.correct_questions >= GREATEST(v.questions_required, 1)
    )                                                    AS proven,
    -- The ceiling, as the same vocabulary `coverage_state` uses, so §6 can
    -- compare a cached string against it without a mapping table.
    CASE
      WHEN BOOL_OR(
             s.state = 'VERIFIED'
             AND ca.correct_questions >= GREATEST(v.questions_required, 1)
           ) THEN 'proven'
      ELSE 'assessed'
    END                                                  AS evidence_state
  FROM public.assessment_verification_coverage v
  JOIN public.study_sessions s ON s.session_id = v.session_id
  LEFT JOIN public.concept_correct_answers ca
    ON ca.assessment_id = v.assessment_id
   AND ca.concept_ref   = v.concept_ref
  WHERE v.covered = TRUE
  GROUP BY v.student_id, v.concept_ref;

COMMENT ON VIEW public.concept_assessment_evidence IS
  'M12-1, rungs 3 and 4. Per (student, concept): whether M10 discharged the '
  'coverage obligation (`assessed`) and whether it was discharged CORRECTLY in '
  'a VERIFIED session (`proven`, V.2.7). Rungs 1 and 2 are derived in '
  'lib/coverage-state.ts — see the note above for why they are not here.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · `projection_watermarks` — HOW FAR EACH PROJECTION HAS CONSUMED
--
-- H.1's L2 storage rule, verbatim: *"tables with `input_watermark_event_id`."*
-- One row per (projection, student), because a per-student mark is what lets a
-- catch-up run resume for one student without re-reading everybody's stream —
-- U.2 qualification 1's *"scheduled catch-up for the expensive ones"*, and the
-- reason no queue is needed.
--
-- `last_seq` is the ORDERING key (R.10) and `last_event_id` is the identity.
-- Both are stored: a `seq` cannot be checked against L1 on its own and an id
-- cannot be compared. M12-3 checks them against each other and against the
-- stream, and a disagreement is `watermark_mismatch`.
--
-- SERVICE ROLE ONLY. Not because the numbers are secret — a student may read
-- their own record — but because a client that could write a watermark could
-- tell the system it had already consumed the events proving a mistake.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.projection_watermarks (
  projection            TEXT        NOT NULL CHECK (length(projection) BETWEEN 1 AND 64),
  student_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 0 means "nothing consumed". `academic_events_seq` starts at 1, so `seq > 0`
  -- admits the whole stream and the zero state needs no special case.
  last_seq              BIGINT      NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
  last_event_id         UUID,

  -- T8's *"missing a required update"*, made checkable: a mark at the head of
  -- the stream with fewer events folded than the stream holds is a fold that
  -- skipped something.
  events_processed      BIGINT      NOT NULL DEFAULT 0 CHECK (events_processed >= 0),

  -- O.4's replay-from-checkpoint, counted. A projection that is rebuilt often
  -- is a projection with a problem, and the count is how anyone would know.
  rebuild_count         INTEGER     NOT NULL DEFAULT 0 CHECK (rebuild_count >= 0),

  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (projection, student_id),

  -- An advanced mark that names no event cannot be verified against L1, so the
  -- database refuses to store one rather than leaving M12-3 to report it later.
  CONSTRAINT projection_watermarks_named CHECK (
    last_seq = 0 OR last_event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS projection_watermarks_projection_idx
  ON public.projection_watermarks (projection, updated_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · `academic_record` — THE L2 CACHE OF §2, AND NOTHING MORE
--
-- C.3's key fields, minus the ones later milestones own: `open_pattern_count`
-- and `resolved_pattern_count` are M11's `patterns` and are DERIVABLE by a
-- join, so storing them here would be a second copy of a second copy; M13 reads
-- them from `patterns`. What is stored is what M12 projects.
--
-- H.2: L2 *"may be truncated and rebuilt at any time. That property is a hard
-- requirement, not an optimisation."* So this table has no history, no
-- append-only trigger and no audit — TRUNCATE is a legal operation on it, and a
-- rebuild is how a formula correction is deployed without rewriting L1 by hand.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_record (
  student_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- C.3's identity is `(student_id, subject, concept_id, as_of)`. The KEY here
  -- is `concept_ref`, not `concept_id`: B.4 and V.2.4 make an unresolved
  -- concept first-class (`concept_id IS NULL`, `text:<normalised>` ref), and a
  -- key on the id would merge every unresolved declaration a student ever made
  -- into one NULL bucket. `subject` and `concept_id` are carried as attributes.
  concept_ref               TEXT        NOT NULL CHECK (length(concept_ref) > 0),
  concept_id                UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,
  subject                   TEXT,

  coverage_state            TEXT        NOT NULL CHECK (coverage_state IN (
                              'untouched','declared','studied','assessed','proven'
                            )),

  first_studied_at          TIMESTAMPTZ,
  last_studied_at           TIMESTAMPTZ,
  session_count             INTEGER     NOT NULL DEFAULT 0 CHECK (session_count >= 0),
  assessed_count            INTEGER     NOT NULL DEFAULT 0 CHECK (assessed_count >= 0),

  -- C.3's *"each carries the identity of the inputs that produced it so a stale
  -- one is detectable rather than merely wrong."* Which session declared it,
  -- which assessment proved it. A `proven` row with no `proven_by_assessment_id`
  -- is refused below.
  evidence_refs             JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- C.3's watermark column, by its C.3 name.
  input_watermark_event_id  UUID,
  input_watermark_seq       BIGINT      NOT NULL DEFAULT 0 CHECK (input_watermark_seq >= 0),

  projected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (student_id, concept_ref),

  -- THE INVARIANT THIS TABLE EXISTS TO CARRY. A cached `proven` with no
  -- assessment behind it is exactly the fabricated claim V.2.7 is an acceptance
  -- test against, and the database refuses to hold one — so a bad projection
  -- run fails loudly at the write rather than quietly at the surface.
  CONSTRAINT academic_record_proven_needs_assessment CHECK (
    coverage_state <> 'proven'
    OR (evidence_refs ? 'proven_by_assessment_id'
        AND evidence_refs ->> 'proven_by_assessment_id' IS NOT NULL)
  ),

  CONSTRAINT academic_record_assessed_needs_count CHECK (
    coverage_state NOT IN ('assessed','proven') OR assessed_count >= 1
  ),

  CONSTRAINT academic_record_studied_order CHECK (
    first_studied_at IS NULL OR last_studied_at IS NULL OR last_studied_at >= first_studied_at
  )
);

CREATE INDEX IF NOT EXISTS academic_record_state_idx
  ON public.academic_record (student_id, coverage_state);

-- H.4's query 4: *"What have I studied but never been tested on?"* — C.3 calls
-- it *"only expressible because coverage state is a first-class field"*, and
-- this is the index that makes it cheap.
CREATE INDEX IF NOT EXISTS academic_record_studied_not_assessed_idx
  ON public.academic_record (student_id, last_studied_at DESC)
  WHERE coverage_state = 'studied';

CREATE INDEX IF NOT EXISTS academic_record_concept_idx
  ON public.academic_record (concept_id)
  WHERE concept_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · `concept_accuracy` — M12-2's COUNTERS
--
-- INTEGERS ONLY. The ratio is computed on read (`accuracyOf()` in
-- `lib/concept-accuracy.ts`) and never stored, so a change to how accuracy is
-- expressed cannot require rewriting stored history — and so a concept with
-- zero answers has NO accuracy rather than an accuracy of zero (J.4, V.6.1:
-- *"a new account has no score, not zero"*).
--
-- `last_seq` is per-concept as well as per-student, so a reader can tell a
-- stale concept from a stale student without re-reading the stream.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.concept_accuracy (
  student_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_ref           TEXT        NOT NULL CHECK (length(concept_ref) > 0),
  concept_id            UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,

  answered              INTEGER     NOT NULL DEFAULT 0 CHECK (answered >= 0),
  correct               INTEGER     NOT NULL DEFAULT 0 CHECK (correct >= 0),
  wrong                 INTEGER     NOT NULL DEFAULT 0 CHECK (wrong >= 0),

  last_seq              BIGINT      NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (student_id, concept_ref),

  -- The three counters are one fact stated three ways; the database refuses
  -- them disagreeing rather than leaving a reader to pick (023 §1's posture).
  CONSTRAINT concept_accuracy_counts_agree CHECK (answered = correct + wrong)
);

CREATE INDEX IF NOT EXISTS concept_accuracy_student_idx
  ON public.concept_accuracy (student_id, last_seq DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · `academic_record_drift` — T8, AS A QUERY ANYONE CAN RUN
--
-- T8: *"A partial recompute leaves the record internally inconsistent IN A WAY
-- NO USER CAN SEE."* This view is the way to see it: the cached row beside the
-- evidence that would have to exist for it to be true, one row per
-- disagreement, and nothing else.
--
-- **IT COMPARES AGAINST A CEILING, AND THE DIRECTION IS DELIBERATE.** §2 knows
-- rungs 3 and 4; rungs 1 and 2 live in `lib/coverage-state.ts` (see §2's note).
-- So this view asks the question that matters and that it CAN answer from the
-- schema alone: *does the cache claim a rung the assessment evidence does not
-- support?* A cached `proven` with no proving assessment, or a cached
-- `assessed` with no discharged obligation, is the fabricated claim V.2.7 is a
-- test against. The opposite direction — a cache that is merely STALE and
-- claims LESS than the evidence — is lag, is expected between scheduled
-- catch-ups (U.2 qualification 1), and is caught by the watermark check
-- instead, where it belongs.
--
-- **IT REPORTS. IT DOES NOT REPAIR.** There is no trigger on this view, no
-- rule, and no function anywhere in this file that writes `academic_record`.
-- Part H.1 authorises no self-healing — H.2's rebuild is O.4's *"replay from
-- checkpoint rather than patching"*, a deliberate audited act — and a job that
-- silently corrected a data-integrity symptom would hide the bug that caused it
-- for exactly as long as it kept running.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.academic_record_drift
  WITH (security_invoker = true)
AS
  SELECT
    r.student_id,
    r.concept_ref,
    r.coverage_state                              AS cached_state,
    -- What the evidence alone supports. NULL means "no assessment evidence at
    -- all", which is legal for `declared` and `studied` and is a finding only
    -- for the two rungs below.
    e.evidence_state                              AS derived_state,
    r.input_watermark_seq,
    r.projected_at
  FROM public.academic_record r
  LEFT JOIN public.concept_assessment_evidence e
    ON e.student_id = r.student_id AND e.concept_ref = r.concept_ref
  WHERE
    (r.coverage_state = 'proven'   AND COALESCE(e.proven, FALSE) = FALSE)
    OR
    (r.coverage_state = 'assessed' AND COALESCE(e.assessed_count, 0) = 0);

COMMENT ON VIEW public.academic_record_drift IS
  'M12-3 / T8. Every cached academic_record row that claims `assessed` or '
  '`proven` without the M10 evidence that would make it true. Detection only — '
  'nothing in 026 writes the cache, and nothing corrects a row it finds.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · ROW LEVEL SECURITY — SELECT-own on the record, nothing on the marks
--
-- 023 §6 / 024 §4's posture. A student may read their own record; nobody but
-- the service role writes it, because a client that could write
-- `coverage_state = 'proven'` could award itself the one state the whole of
-- Part F exists to make expensive.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.academic_record        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_accuracy       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_watermarks  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_record_select_own ON public.academic_record;
CREATE POLICY academic_record_select_own ON public.academic_record
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS concept_accuracy_select_own ON public.concept_accuracy;
CREATE POLICY concept_accuracy_select_own ON public.concept_accuracy
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- `projection_watermarks` gets NO policy at all — RLS enabled with zero
-- policies denies every non-service-role read and write. The same posture
-- `score_history` (005) already takes, and for the same reason: a watermark is
-- a fact about the SYSTEM, not about the student, and O.1's export is L1+L3+L5.
REVOKE ALL ON public.projection_watermarks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.academic_record  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.concept_accuracy FROM anon, authenticated;

GRANT SELECT ON public.concept_assessment_evidence TO authenticated;
GRANT SELECT ON public.concept_correct_answers   TO authenticated;
GRANT SELECT ON public.academic_record_drift     TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · SELF-CHECK — the invariants this file claims, asserted against the
--     catalogue rather than against its own text
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_proven_needs_assessment'
  ) THEN
    RAISE EXCEPTION
      '026 did not install the constraint that a cached `proven` names the assessment that proved it (V.2.7)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projection_watermarks_named'
  ) THEN
    RAISE EXCEPTION
      '026 did not install the constraint that an advanced watermark names an event — M12-3 could not verify it (T8)';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename IN ('academic_record','concept_accuracy','projection_watermarks')
    AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'a non-SELECT policy exists on a projection table (%): a client that can write coverage_state can award itself `proven`',
      bad_policy;
  END IF;

  RAISE NOTICE '026: assessment evidence derived, academic_record cached, watermarks ledgered, drift visible';
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO SELF-HEALING. There is no trigger, rule or function that writes
--   `academic_record` from any derivation. §6 makes drift VISIBLE; O.4
--   makes correcting it a deliberate act. Part H.1 authorises neither a
--   silent recompute nor an automatic one, and T8's mitigation is stated as a
--   job that *"verifies"*.
--
-- · NO `untouched` ROW. C.3's enum contains it and the CHECK permits it, but
--   the view never emits one: a concept nobody confirmed has no row, which is
--   V.2.2's *"neither reaches the record"* expressed as an absence rather than
--   as a row saying nothing happened. `deriveCoverageState()` returns
--   `untouched` for the same input, so the two halves still agree.
--
-- · NO PATTERN COUNTS. C.3 lists `open_pattern_count` and
--   `resolved_pattern_count` on `AcademicRecord`; both are one join away from
--   M11's `patterns` and caching them here would be a copy of a copy. M13 reads
--   `patterns`.
--
-- · NO SCORE, NO SNAPSHOT, NO `formula_version`. V.2.7 also says *"Verified
--   Performance and Proven Coverage move"*; those are J.2 dimensions and M14's.
--   This file produces the STATE they will read.
--
-- · NO EVENT EMISSION. A projection is L2 and H.1.a forbids it writing
--   downward into L1. Nothing here appends to `academic_events`.
--
-- · NO BACKFILL. `academic_record` and `concept_accuracy` are born empty and
--   are filled by a catch-up run. H.2 makes that safe by design: L2 is
--   disposable, so an empty cache is a cold cache and never a lost fact.
--
-- · NO DELETE PATH beyond `ON DELETE CASCADE` from `auth.users`, which is O.5's
--   account deletion and not a data operation this file offers.
--
-- · IT DOES NOT APPLY ITSELF. `scripts/check-migrations.mjs` will report 026
--   UNAPPLIED until a human runs it in the SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '026',
  '026_academic_record.sql',
  '6e1ad6599ebd984f874eb828a0c811e035e7c60a378329c7db3922c78dd38cc8',
  'self'
);
