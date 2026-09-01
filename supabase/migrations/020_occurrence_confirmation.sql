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
