-- ═══════════════════════════════════════════════════════════════════════════
-- 024_assessment_attempts.sql — THE GRADED ATTEMPT, THE REVOCATION APPEND, THE
-- ASSESSMENT-ORIGINATED OCCURRENCE, AND THE TRANSITION GATE THAT REFUSES TO
-- VERIFY.
--
-- EXECUTION_PLAN M10-4: *"The transition gate — coverage failure **refuses to
-- verify**. Done when: V.3.4, V.3.5. T5 mitigation: the guarantee fails
-- **closed**."*
-- EXECUTION_PLAN M10-5: *"Deterministic grading against a stored `answer_key`;
-- closed-form only in V1. Done when: F.4.a. A model opinion is never a grade
-- (P.3.a)."*
-- EXECUTION_PLAN M10-6: *"Provenance on every generated item + the retroactive
-- revocation path. Done when: T4 mitigation; F.4.b."*
-- EXECUTION_PLAN M10-7: *"Immediate mistake logging on a wrong answer. Done
-- when: V.4.1 — the occurrence exists **before the next question renders**."*
--
-- Architecture Part F.2 layer 4, F.4.a, F.4.b, F.5, F.6, F.8; Part V.3.4,
-- V.3.5, V.4.1; threats T4 and T5.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–023.
--
--
-- THE ONE THING THIS FILE EXISTS FOR
--
-- T5: *"The coverage guarantee fails open. If generation cannot fill a slot and
-- the assessment silently shrinks, 'every confirmed concept is assessed'
-- becomes false while the UI still says verified."*
--
-- F.2 layer 4 names the mitigation and calls it load-bearing: *"`ASSESSING →
-- VERIFIED` is refused unless `∀ c ∈ coverage_manifest : ∃ answered question
-- with concept_id = c`. This is a SERVER-SIDE PRECONDITION ON THE STATE
-- TRANSITION, so no client path and no model behaviour can produce a `VERIFIED`
-- session with a coverage hole."*
--
-- §9 is that precondition, and it is a TRIGGER rather than application code for
-- 020 §5's reason, unchanged: *"RLS does not apply to the service role, and
-- everything the engine writes runs as it. A REVOKE protects against a client;
-- only a trigger protects against the next endpoint somebody writes."*
--
-- **AND IT FAILS CLOSED.** Every branch in §9 that cannot prove coverage
-- REFUSES. No assessment row ⇒ refuse. An empty manifest ⇒ refuse. A manifest
-- entry with no bound question ⇒ refuse. A bound question with no graded
-- attempt ⇒ refuse. A graded attempt whose question has been revoked ⇒ that
-- attempt does not count, so ⇒ refuse. There is no branch that permits
-- `VERIFIED` because something was missing, and that asymmetry is the whole
-- mitigation: F.2.a — *"Refusing to verify is always available; verifying with
-- a hole never is."*
--
--
-- ADDITIVE. It creates three tables, three views and six triggers. It ADDs two
-- nullable columns and three CHECK constraints to `occurrences` (020's own
-- pattern, guarded by a catalogue lookup), and it adds ONE trigger to
-- `study_sessions` beside the two 021 installed — 021's own triggers, columns,
-- constraints, policies and index are untouched. **No column is altered, no
-- constraint is dropped, no existing policy is rewritten, nothing is deleted
-- and nothing is backfilled.**
--
-- WHAT IT DELIBERATELY DOES NOT WIDEN. `evidence.type` keeps 007's three values
-- (§4.9: `photo` | `pdf` | `manual`). An assessment attempt is recorded as
-- `manual` — the non-file arm — with `storage_ref = 'attempt:<attempt_id>'`
-- carrying its identity. Dropping and re-adding 007's CHECK to introduce a
-- fourth value would be an edit to M1's frozen schema, which is a decision and
-- not a migration; the naming compromise is stated here in the open rather than
-- taken quietly.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · ASSESSMENT_ATTEMPTS — append-only, deterministically graded
--
-- F.5: *"Answers are APPEND-ONLY with `attempt_no`; changing an answer
-- APPENDS."* So there is no UPDATE path to a grade, and §7 refuses one.
--
-- F.4.a: *"Closed-form (MCQ, numeric, ordering, match): graded 100%
-- DETERMINISTICALLY against `answer_key`. NO MODEL IN THE PATH. These are the
-- only formats whose results are `E`-class by default."*
--
-- P.3.a: *"A tool that asks a model 'was that right?' and writes the answer is
-- at Level 1 regardless of how confident it sounds."* `grader` therefore has
-- exactly ONE permitted value in V1. `'ai_proposed_student_confirmed'` — the
-- short-text arm F.4.a describes — is ABSENT, not disabled, for the same reason
-- `short_text` is absent from 023's `format` CHECK: a value the schema cannot
-- hold is a path the product cannot take by accident.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  attempt_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  question_id           UUID        NOT NULL
                          REFERENCES public.assessment_questions(question_id) ON DELETE RESTRICT,
  assessment_id         UUID        NOT NULL
                          REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  session_id            UUID        NOT NULL
                          REFERENCES public.study_sessions(session_id) ON DELETE CASCADE,
  student_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- F.5's append-only counter. 1 for the first answer to a question, 2 for the
  -- second, and the pair is UNIQUE so a "correction" is a NEW ROW.
  attempt_no            INTEGER     NOT NULL CHECK (attempt_no >= 1),

  -- What the student sent, verbatim and structured. `{"kind":"mcq",
  -- "selected_index":2}` | `{"kind":"numeric","value":3.0,"unit":"Nm"}` |
  -- `{"kind":"ordering","order":[...]}` | `{"kind":"match","pairs":[...]}` |
  -- `{"kind":"blank"}`.
  submitted_answer      JSONB       NOT NULL,

  -- THE GRADE. NOT NULL, because an ungraded attempt is not a thing this
  -- pipeline can produce: grading is a pure function that runs before the row
  -- is built (`lib/assessment-grading.ts`), not a job that runs after it.
  is_correct            BOOLEAN     NOT NULL,
  marks_awarded         INTEGER     NOT NULL CHECK (marks_awarded >= 0),

  -- P.3.a, AS AN ENUM OF ONE.
  grader                TEXT        NOT NULL DEFAULT 'deterministic'
                          CHECK (grader = 'deterministic'),

  -- Which comparison rule decided it, so a grade can be explained without
  -- re-running it: `exact` | `tolerance` | `unit_mismatch` | `blank` |
  -- `sequence` | `pairs`.
  grade_rule            TEXT        NOT NULL CHECK (length(grade_rule) > 0),

  -- F.5: *"Timing is recorded but is NOT an integrity signal used to invalidate
  -- answers. Inferring cheating from speed would be an unevidenced inference
  -- about a student — precisely what PRINCIPLES 106-112 forbids storing."* It is
  -- here because F.6's classifier reads it to tell a blank that ran out of time
  -- from a blank that did not, and for nothing else.
  time_ms               INTEGER     CHECK (time_ms IS NULL OR time_ms >= 0),

  graded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- F.5's append-only rule, as a constraint rather than as a convention.
  CONSTRAINT assessment_attempts_append_only UNIQUE (question_id, attempt_no),

  -- A grade and its marks are the same fact stated twice; the database refuses
  -- them disagreeing rather than leaving a reader to pick (023 §1's posture).
  CONSTRAINT assessment_attempts_marks_shape CHECK (
    (is_correct = FALSE AND marks_awarded = 0) OR (is_correct = TRUE AND marks_awarded > 0)
  )
);

CREATE INDEX IF NOT EXISTS assessment_attempts_assessment_idx
  ON public.assessment_attempts (assessment_id, question_id, attempt_no DESC);

CREATE INDEX IF NOT EXISTS assessment_attempts_student_idx
  ON public.assessment_attempts (student_id, graded_at DESC);

-- V.4.1's query: "which wrong answers exist?" — the input to M10-7.
CREATE INDEX IF NOT EXISTS assessment_attempts_wrong_idx
  ON public.assessment_attempts (assessment_id, question_id)
  WHERE is_correct = FALSE;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · ASSESSMENT_QUESTION_REVOCATIONS — F.4.b, AS AN APPEND
--
-- F.4.b: *"If prompt version v is later found defective,
-- `AssessmentQuestion.provenance.prompt_version = v` identifies every affected
-- question; the affected attempts are marked `evidence_revoked` by APPENDING
-- `EVENT_SUPERSEDED` events … **NOTHING IS EDITED IN PLACE, AND THE HISTORY
-- SHOWS THAT A REVOCATION HAPPENED.**"*
--
-- PRINCIPLES §3.2: *"Facts are immutable and never deleted; a correction
-- APPENDS A SUPERSEDING FACT rather than editing history."*
--
-- So a revocation is a ROW, never an edit. The question it names keeps its
-- stem, its key, its provenance and its `admitted_at` exactly as 023 §9 froze
-- them; the ONE thing that moves on the question itself is `retained`, which
-- 023 §9 already permits and which F.8 already specifies (*"the question is
-- withdrawn from the bank"*). A reader asking *"was this question ever
-- revoked?"* reads this table; a reader asking *"what did this question say?"*
-- reads the question, and gets the same answer it would have got before.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assessment_question_revocations (
  revocation_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  question_id           UUID        NOT NULL
                          REFERENCES public.assessment_questions(question_id) ON DELETE RESTRICT,
  student_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- WHAT WAS FOUND DEFECTIVE, not merely which row was swept. F.4.b's sweep is
  -- keyed on `prompt_version`; F.8's upheld complaint is keyed on one question;
  -- a bad manifest is keyed on `manifest_hash`. Recording the SCOPE is what
  -- lets a later reader tell "this one question was wrong" from "everything
  -- this prompt ever wrote was wrong", which are different facts about the
  -- product and must not compress into one.
  scope                 TEXT        NOT NULL
                          CHECK (scope IN ('question','prompt_version','manifest_hash')),
  -- The value the scope selected on: a question_id, a prompt version, or a
  -- manifest hash. Retained verbatim so the sweep is reproducible.
  selector              TEXT        NOT NULL CHECK (length(selector) > 0),

  -- Why. Free text, written by whoever decided — never generated, never
  -- inferred, and never empty, because a revocation with no stated reason is a
  -- deletion with paperwork.
  reason                TEXT        NOT NULL CHECK (length(trim(reason)) > 0),

  -- WHO. `student_dispute` is F.8's first row (*"the question was wrong /
  -- ambiguous"*); `operator` is a human sweep; `system` is an automated one.
  -- There is deliberately no `'ai'` value: a model may not revoke evidence any
  -- more than it may award it (P.3.a).
  revoked_by            TEXT        NOT NULL CHECK (revoked_by IN ('student_dispute','operator','system')),

  -- D.2's `EVENT_SUPERSEDED` append that carries this into the event stream.
  -- Nullable because the revocation row is the durable fact and the event is
  -- its projection; a revocation that could not be published is still a
  -- revocation, and losing it to a failed insert would be the worse outcome.
  superseding_event_id  UUID,

  revoked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_question_revocations_question_idx
  ON public.assessment_question_revocations (question_id, revoked_at DESC);

CREATE INDEX IF NOT EXISTS assessment_question_revocations_selector_idx
  ON public.assessment_question_revocations (scope, selector);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · THE VIEWS — the predicates stop being the reader's to remember
--
-- 020 §3 and 022 §4's argument, one layer down: *"the safe query is the one
-- with the SHORTER NAME."*
-- ═══════════════════════════════════════════════════════════════════════════

-- A question that has NOT been revoked. Every reader that asks "may this count
-- as evidence?" reads this; the table answers "what did it say?", which is a
-- different question and still has an honest answer for a revoked row.
CREATE OR REPLACE VIEW public.unrevoked_assessment_questions
  WITH (security_invoker = true)
AS
  SELECT q.*
  FROM public.assessment_questions q
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_question_revocations r
    WHERE r.question_id = q.question_id
  );

COMMENT ON VIEW public.unrevoked_assessment_questions IS
  'F.4.b. A question with no revocation appended against it. The revoked rows '
  'are not deleted and are still readable from the table — a student''s graded '
  'answer to one must remain explicable (PRINCIPLES 3.2).';

-- An attempt, with F.4.b's `evidence_revoked` DERIVED rather than stored. The
-- attempt row is never edited; the state is a join. That is what makes "nothing
-- is edited in place" true rather than promised — there is no column to edit.
CREATE OR REPLACE VIEW public.assessment_attempt_evidence
  WITH (security_invoker = true)
AS
  SELECT
    a.*,
    EXISTS (
      SELECT 1 FROM public.assessment_question_revocations r
      WHERE r.question_id = a.question_id
    ) AS evidence_revoked
  FROM public.assessment_attempts a;

COMMENT ON VIEW public.assessment_attempt_evidence IS
  'F.4.b''s `evidence_revoked`, derived from the revocation append rather than '
  'stored on the attempt. The grade itself is never un-written: it happened, and '
  'a record that edited it would be rewriting history (PRINCIPLES 3.2).';

-- F.2 LAYER 4'S PREDICATE, AS A QUERY.
--
-- 023 §4's `assessment_coverage` answers *"is every manifest entry BOUND to a
-- question?"*. F.2 layer 4 asks a strictly stronger question — *"∃ ANSWERED
-- question"* — so this view adds the second half and the revocation exclusion.
-- It is a separate view rather than a rewrite of 023 §4, because 023 is
-- registered in the ledger with its own checksum and this pass may not edit it.
CREATE OR REPLACE VIEW public.assessment_verification_coverage
  WITH (security_invoker = true)
AS
  SELECT
    a.assessment_id,
    a.session_id,
    a.student_id,
    e.entry ->> 'concept_ref'                            AS concept_ref,
    COALESCE((e.entry ->> 'questions_required')::INT, 1)  AS questions_required,
    COUNT(DISTINCT q.question_id)                         AS questions_bound,
    COUNT(DISTINCT t.question_id)                         AS questions_answered,
    (COUNT(DISTINCT q.question_id) >= COALESCE((e.entry ->> 'questions_required')::INT, 1)
     AND
     COUNT(DISTINCT t.question_id) >= COALESCE((e.entry ->> 'questions_required')::INT, 1)
    )                                                     AS covered
  FROM public.assessments a
  CROSS JOIN LATERAL jsonb_array_elements(a.coverage_manifest) AS e(entry)
  -- Bound, and not revoked. A revoked question is not evidence, so it cannot
  -- hold up a coverage obligation either.
  LEFT JOIN public.unrevoked_assessment_questions q
    ON q.assessment_id = a.assessment_id
   AND q.counts_toward_coverage = TRUE
   AND q.concept_ref = e.entry ->> 'concept_ref'
  -- Answered. The join is through the same unrevoked question, so an attempt
  -- against a revoked question contributes nothing here.
  LEFT JOIN public.assessment_attempts t
    ON t.question_id = q.question_id
  GROUP BY a.assessment_id, a.session_id, a.student_id, e.entry;

COMMENT ON VIEW public.assessment_verification_coverage IS
  'F.2 layer 4. `covered = false` on ANY row means the session may not become '
  'VERIFIED (V.3.4, V.3.5, T5). Stronger than 023 §4''s assessment_coverage: '
  'it requires an ANSWERED question, and it excludes revoked ones (F.4.b).';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ROW LEVEL SECURITY — SELECT-own and nothing else
--
-- 023 §6's posture, for its reason. A client that could INSERT into
-- `assessment_attempts` could write itself a correct answer it never gave; a
-- client that could INSERT into `assessment_question_revocations` could revoke
-- the question it just got wrong. Both are written by the server, under the
-- student's identity taken from their token and never from a body (D.1.a).
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.assessment_attempts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_question_revocations   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessment_attempts_select_own ON public.assessment_attempts;
CREATE POLICY assessment_attempts_select_own ON public.assessment_attempts
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS assessment_question_revocations_select_own ON public.assessment_question_revocations;
CREATE POLICY assessment_question_revocations_select_own ON public.assessment_question_revocations
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

REVOKE INSERT, UPDATE, DELETE ON public.assessment_attempts             FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.assessment_question_revocations FROM anon, authenticated;

GRANT SELECT ON public.unrevoked_assessment_questions    TO authenticated;
GRANT SELECT ON public.assessment_attempt_evidence       TO authenticated;
GRANT SELECT ON public.assessment_verification_coverage  TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE ATTEMPT IS A FACT — append-only, from every writer
--
-- F.5: *"Answers are append-only with `attempt_no`; changing an answer
-- appends."* A grade that can be edited after the fact is not evidence, and it
-- is the one edit a hurried endpoint would reach for ("just fix the mark").
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assessment_attempts_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  q public.assessment_questions%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO q FROM public.assessment_questions WHERE question_id = NEW.question_id;
    IF q.question_id IS NULL THEN
      RAISE EXCEPTION 'attempt references no question' USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF NEW.student_id IS DISTINCT FROM q.student_id
       OR NEW.session_id IS DISTINCT FROM q.session_id
       OR NEW.assessment_id IS DISTINCT FROM q.assessment_id THEN
      RAISE EXCEPTION
        'attempt %: student, session and assessment must match the question it answers', NEW.attempt_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE and DELETE are both refused. There is no legal edit to a graded
  -- attempt: a re-answer is a new row with the next `attempt_no`, and a
  -- disputed grade is a revocation append (§2) plus a superseding attempt.
  RAISE EXCEPTION
    'assessment_attempt %: answers are append-only (F.5). A correction appends; it never edits (PRINCIPLES 3.2)',
    OLD.attempt_id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS assessment_attempts_append_only_trg ON public.assessment_attempts;
CREATE TRIGGER assessment_attempts_append_only_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.assessment_attempts_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · A REVOCATION IS ALSO A FACT — it too may only be appended
--
-- The obvious omission would be to protect the thing being revoked and leave
-- the revocation itself editable, which would let a revocation be quietly
-- un-revoked and leave no trace that either ever happened. F.4.b: *"the history
-- SHOWS that a revocation happened."*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assessment_revocations_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- The one permitted movement: attaching the event id after the event landed.
  -- Everything else, including a DELETE, is refused.
  IF TG_OP = 'UPDATE'
     AND OLD.superseding_event_id IS NULL
     AND NEW.superseding_event_id IS NOT NULL
     AND NEW.revocation_id IS NOT DISTINCT FROM OLD.revocation_id
     AND NEW.question_id   IS NOT DISTINCT FROM OLD.question_id
     AND NEW.student_id    IS NOT DISTINCT FROM OLD.student_id
     AND NEW.scope         IS NOT DISTINCT FROM OLD.scope
     AND NEW.selector      IS NOT DISTINCT FROM OLD.selector
     AND NEW.reason        IS NOT DISTINCT FROM OLD.reason
     AND NEW.revoked_by    IS NOT DISTINCT FROM OLD.revoked_by
     AND NEW.revoked_at    IS NOT DISTINCT FROM OLD.revoked_at THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'revocation %: a revocation is appended and never edited or removed (F.4.b, PRINCIPLES 3.2)',
    OLD.revocation_id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS assessment_revocations_append_only_trg ON public.assessment_question_revocations;
CREATE TRIGGER assessment_revocations_append_only_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_question_revocations
  FOR EACH ROW EXECUTE FUNCTION public.assessment_revocations_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · THE ASSESSMENT-ORIGINATED OCCURRENCE — two additive columns
--
-- 020 §1 already reserved the value: *"`assessment` is reserved for M10-7,
-- which logs an occurrence from a graded wrong answer."* This is M10-7 claiming
-- it, and it needs two things 020 could not have known it would need.
--
-- `assessment_attempt_id` — V.4.1: *"an `occurrence` exists with a non-null
-- `evidence_id` POINTING AT THE ATTEMPT."* The evidence row carries the
-- attempt's identity in its `storage_ref`; this column carries it structurally,
-- so "which occurrence came from which answer" is a join rather than a string
-- parse. Its partial UNIQUE index is also the idempotency: a retried submit
-- writes one occurrence, not two.
--
-- `confirmed_by` — 020 §7 argued no such column was needed because *"there is
-- exactly one actor who can set `confirmed_at` under the policy above."* M10-7
-- introduces a SECOND actor, so that argument expires here and is replaced
-- rather than ignored. See §8 for why an assessment-originated occurrence is
-- confirmed by the system at all.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE occurrences
  ADD COLUMN IF NOT EXISTS assessment_attempt_id UUID;

ALTER TABLE occurrences
  ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_attempt_fk'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_attempt_fk
      FOREIGN KEY (assessment_attempt_id)
      REFERENCES public.assessment_attempts(attempt_id) ON DELETE RESTRICT;
  END IF;

  -- An attempt reference belongs only to an assessment-originated occurrence,
  -- and an assessment-originated occurrence must name the attempt it came from.
  -- Both directions, so neither can drift into the other.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_attempt_matches_origin'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_attempt_matches_origin CHECK (
      (origin = 'assessment' AND assessment_attempt_id IS NOT NULL)
      OR (origin IS DISTINCT FROM 'assessment' AND assessment_attempt_id IS NULL)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_confirmed_by_known'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_confirmed_by_known CHECK (
      confirmed_by IS NULL OR confirmed_by IN ('student','assessment')
    );
  END IF;

  -- ONLY AN ASSESSMENT-ORIGINATED OCCURRENCE MAY BE CONFIRMED BY THE SYSTEM.
  -- Without this, `confirmed_by = 'assessment'` becomes a way to auto-confirm
  -- an AI extraction, which is precisely the gate M8-5 exists to hold shut.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_system_confirm_is_assessment'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_system_confirm_is_assessment CHECK (
      confirmed_by IS DISTINCT FROM 'assessment' OR origin = 'assessment'
    );
  END IF;

  -- A confirmer with nothing confirmed is a contradiction in both directions.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_confirmed_by_needs_confirmation'
  ) THEN
    ALTER TABLE occurrences ADD CONSTRAINT occurrences_confirmed_by_needs_confirmation CHECK (
      confirmed_by IS NULL OR confirmed_at IS NOT NULL
    );
  END IF;
END
$$;

-- One occurrence per attempt. The idempotency of M10-7's write, at the level
-- that survives a retry, a double-click and a duplicated request.
CREATE UNIQUE INDEX IF NOT EXISTS occurrences_one_per_attempt
  ON occurrences (assessment_attempt_id)
  WHERE assessment_attempt_id IS NOT NULL;

-- 020's column grant is unchanged and is what keeps this safe: `authenticated`
-- may UPDATE `confirmed_at` AND NOTHING ELSE, so a student cannot write
-- `confirmed_by` at all, and `'assessment'` can only ever have been written by
-- the server. Restated rather than re-granted — this file grants nothing new to
-- a client.

-- `confirmed_by` moves once, forwards, in the statement that confirms. 020's
-- own trigger enumerates the columns that existed when it was written and
-- cannot know about this one, so the guard is here.
CREATE OR REPLACE FUNCTION public.occurrences_confirmed_by_forward_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.confirmed_by IS NOT NULL
     AND NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by THEN
    RAISE EXCEPTION
      'occurrence %: confirmed_by is written once and never changed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.assessment_attempt_id IS DISTINCT FROM OLD.assessment_attempt_id THEN
    RAISE EXCEPTION
      'occurrence %: the attempt it came from is immutable (PRINCIPLES 3.2)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS occurrences_confirmed_by_forward_only_trg ON occurrences;
CREATE TRIGGER occurrences_confirmed_by_forward_only_trg
  BEFORE UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION public.occurrences_confirmed_by_forward_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · WHY AN ASSESSMENT-ORIGINATED OCCURRENCE IS CONFIRMED BY THE SYSTEM
--
-- M8-5's confirmation gate exists for one stated reason, and it is worth
-- quoting rather than paraphrasing. 020's header: a draft is *"a reading of a
-- photographed paper"* — an inference by a model over an image, which *"is not
-- ground truth"*. The student confirms because only the student holds the
-- paper. B.20 and L1 are the same rule from the other side: an inference is not
-- a fact.
--
-- A graded assessment answer is a DIFFERENT KIND OF OBJECT. F.4.a: closed-form
-- items are *"graded 100% DETERMINISTICALLY against `answer_key`. NO MODEL IN
-- THE PATH."* The system does not believe the student got it wrong; it computed
-- that they did, from an answer they submitted, against a key that passed seven
-- gates. There is nothing for the student to attest to that the system does not
-- already hold — asking them to confirm it would be asking them to agree that
-- 3 ≠ 4.
--
-- **BUT ONLY THE HALF THAT IS ACTUALLY DETERMINISTIC.** F.6's classifier is
-- explicitly two-tiered: *"1. DETERMINISTIC FIRST where the question format
-- allows it — a numeric answer off by a sign is `sign-error` … a blank is
-- `not-known` or `ran-out-of-time` by timing. 2. AI-PROPOSED OTHERWISE,
-- PRESENTED TO THE STUDENT FOR CONFIRMATION. 3. Student's classification always
-- wins."*
--
-- So the split this file installs is F.6's own split, and not a new one:
--
--   · the answer was wrong                  — computed. Never in doubt.
--   · WHY it was wrong, where a rule decides — computed. `confirmed_by =
--                                              'assessment'`, immediately.
--   · WHY it was wrong, where none does     — a proposal. `confirmed_at` stays
--                                              NULL and M8-5's gate applies
--                                              unchanged, because guessing an
--                                              error class would be the
--                                              inference L1 forbids.
--
-- The occurrence EXISTS in both cases, which is what V.4.1 and F.6 require. It
-- is what the occurrence CLAIMS that differs, and the schema tells the two
-- apart rather than averaging them.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 9 · THE TRANSITION GATE — M10-4, T5's LOAD-BEARING MITIGATION
--
-- F.2 layer 4, verbatim: *"`ASSESSING → VERIFIED` is refused unless `∀ c ∈
-- coverage_manifest : ∃ answered question with concept_id = c`. This is a
-- server-side precondition on the state transition, so NO CLIENT PATH AND NO
-- MODEL BEHAVIOUR can produce a `VERIFIED` session with a coverage hole."*
--
-- V.3.5: *"Attempt to force `ASSESSING → VERIFIED` via a DIRECT API CALL with
-- concept 3 unanswered. REFUSED SERVER-SIDE, with a typed error."*
--
-- IT FAILS CLOSED, AND THE SHAPE IS DELIBERATE. The function computes a single
-- count — `holes` — of manifest entries that are not both bound and answered,
-- and permits the transition only when that count is exactly zero. Every way of
-- having no data produces a positive count or an outright refusal:
--
--   · no assessment row for the session      → refused, explicitly
--   · a manifest that names nothing          → refused, explicitly (and 023 §1
--                                              already refuses to store one)
--   · a manifest entry with no question      → counted as a hole
--   · a question with no attempt             → counted as a hole
--   · a question revoked since it was bound  → excluded by the view, so counted
--
-- There is no `ELSE RETURN NEW`, no default-permit and no branch that treats an
-- absence as satisfaction. That is the difference between a guarantee that
-- fails closed and one that merely usually holds.
--
-- IT IS ADDITIVE. 021's `study_sessions_transition_guard_trg` and
-- `study_sessions_birth_guard_trg` are untouched and still run. This is a THIRD
-- trigger on the same table, and both must pass: 021 answers *"is this edge on
-- the machine?"*, this answers *"has the evidence for this particular edge been
-- manufactured?"*. Deliberately not the same question and deliberately not the
-- same function — one bug cannot silence both (023 §8's argument, reused).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.study_sessions_verification_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  a_id    UUID;
  entries INT;
  holes   INT;
BEGIN
  -- Only the one transition is gated. Every other edge is 021's business.
  IF NEW.state IS NOT DISTINCT FROM OLD.state OR NEW.state <> 'VERIFIED' THEN
    RETURN NEW;
  END IF;

  SELECT assessment_id INTO a_id
  FROM public.assessments
  WHERE session_id = NEW.session_id;

  IF a_id IS NULL THEN
    RAISE EXCEPTION
      'session % cannot be verified: it has no assessment, and verification is manufactured by assessment and by nothing else (F.1, F.2)',
      NEW.session_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT covered)
    INTO entries, holes
  FROM public.assessment_verification_coverage
  WHERE assessment_id = a_id;

  IF entries = 0 THEN
    RAISE EXCEPTION
      'session % cannot be verified: its coverage manifest names nothing, which would make "every confirmed concept is assessed" vacuously true (T5)',
      NEW.session_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF holes > 0 THEN
    RAISE EXCEPTION
      'session % cannot be verified: % of % coverage obligations have no answered, unrevoked question (F.2 layer 4, V.3.4, V.3.5). Refusing to verify is always available; verifying with a hole never is',
      NEW.session_id, holes, entries
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_sessions_verification_gate_trg ON public.study_sessions;
CREATE TRIGGER study_sessions_verification_gate_trg
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.study_sessions_verification_gate();


-- ═══════════════════════════════════════════════════════════════════════════
-- 10 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7, 013 §5, 015 §6, 020 §7, 021 §7, 022 §8 and 023 §10.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_verification_gate_trg') THEN
    RAISE EXCEPTION
      '024 did not install the transition gate: ASSESSING -> VERIFIED must be refused on a coverage hole (M10-4, T5, V.3.4, V.3.5)';
  END IF;

  -- 021's own guards must still be there. A "gate" installed by removing the
  -- machine it guards would be worse than no gate at all.
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_transition_guard_trg')
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_birth_guard_trg') THEN
    RAISE EXCEPTION '024 has disturbed 021''s session guards; it is additive and must not';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_attempts_append_only_trg') THEN
    RAISE EXCEPTION '024 did not install the append-only guard on attempts (F.5)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_revocations_append_only_trg') THEN
    RAISE EXCEPTION '024 did not install the append-only guard on revocations (F.4.b)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'assessment_verification_coverage'
  ) THEN
    RAISE EXCEPTION '024 did not create assessment_verification_coverage: the transition gate reads it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'unrevoked_assessment_questions'
  ) THEN
    RAISE EXCEPTION '024 did not create unrevoked_assessment_questions (F.4.b)';
  END IF;

  -- P.3.a, as a catalogue lookup: there is exactly one grader and it is not a
  -- model. If this ever admits a second value, grading has left the
  -- deterministic path and F.4.a's E-class claim is no longer true.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'assessment_attempts'
      AND pg_get_constraintdef(c.oid) LIKE '%grader = ''deterministic''%'
  ) THEN
    RAISE EXCEPTION
      '024 did not pin grader to deterministic: a model opinion is never a grade (P.3.a, F.4.a)';
  END IF;

  -- 020's one-way door must be exactly as 020 left it.
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'occurrences_forward_only_trg') THEN
    RAISE EXCEPTION '024 has disturbed 020''s confirmation door';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'occurrences_system_confirm_is_assessment'
  ) THEN
    RAISE EXCEPTION
      '024 did not install the constraint that only an assessment-originated occurrence may be system-confirmed (M8-5''s gate stays shut for extraction)';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename IN ('assessment_attempts','assessment_question_revocations') AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'a non-SELECT policy exists on the attempt tables (%): a client that can write a grade can write itself a mark it never earned',
      bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 11 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO `close_reason = 'coverage_unfillable'`. F.2.a names that string and 021
--   does not hold it; adding it means editing 021's `close_reason` CHECK and
--   M9's `CLOSE_REASONS`, which is an edit to verified work this pass may not
--   make. The refusal is recorded at ASSESSMENT level instead — 023 §1 already
--   has `status = 'unfillable'` — and the session closes through the edge M9
--   already draws for "closed without an assessment that could be produced".
--   Named here so the divergence from V.3.4's literal wording is a recorded
--   decision rather than an omission.
--
-- · NO PATTERN MERGE, no severity, no `pattern_id` write. M11 owns Mistake DNA.
--   This file creates individual occurrences and leaves `pattern_id` NULL,
--   which `007` explicitly permits (*"an occurrence may exist before merge
--   assigns it"*).
--
-- · NO SCORE RECOMPUTATION. F.4.b's *"every `ScoreSnapshot` whose
--   `input_watermark_event_id` postdates the first affected event is
--   recomputed"* needs snapshots keyed on a watermark, which is M12/M14. The
--   revocation append is written now so the recompute has something true to
--   read later; performing it now would mean inventing the projection it reads.
--
-- · NO `coverage_state` PROJECTION. V.2.7's *"AcademicRecord.coverage_state for
--   Torque becomes `proven`"* is M12-1 by name in the plan. The evidence it
--   projects from is what this file manufactures.
--
-- · NO WIDENING OF `evidence.type`. See the header.
--
-- · NO SHORT-TEXT GRADER. F.4.a permits `ai_proposed_student_confirmed` and V1
--   ships closed-form only, so the value is absent from the CHECK rather than
--   present and unused.
--
-- · NO DELETE PATH, anywhere, for anything. Not for an attempt, not for a
--   revocation, not for a question, not for an occurrence.
--
-- · IT DOES NOT BACKFILL. There is nothing to backfill: F.1 records that this
--   subsystem does not exist in any form today, and `assessment_questions` gains
--   its first row from M10-2's route.
--
-- · IT DOES NOT APPLY ITSELF. `scripts/check-migrations.mjs` will report 024
--   UNAPPLIED until a human runs it in the SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '024',
  '024_assessment_attempts.sql',
  '8d6950c0c6fb7d664f308c3d41506484191ad2f9e779db17671bb732880aa327',
  'self'
);
