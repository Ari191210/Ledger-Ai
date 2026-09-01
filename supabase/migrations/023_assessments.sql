-- ═══════════════════════════════════════════════════════════════════════════
-- 023_assessments.sql — THE ASSESSMENT, ITS FROZEN COVERAGE MANIFEST, AND THE
-- QUESTIONS BOUND TO IT.
--
-- EXECUTION_PLAN M10-1: *"Blueprint + `coverage_manifest`, frozen **before any
-- model call**. Done when: V.3.1."*
-- EXECUTION_PLAN M10-2: *"The seven generation gates; slot binding rejects
-- off-manifest questions. Done when: V.3.2."*
-- EXECUTION_PLAN M10-3: *"Question bank fallback. Done when: V.3.3."*
--
-- Architecture Part F in full — F.2 (the coverage guarantee and its four
-- layers), F.3 (blueprint inputs and the depth ladder), F.4 (the seven gates
-- and provenance), F.5 (integrity, retention, one-assessment-per-session);
-- Part V.3.1–V.3.3; threats T4 and T5.
--
-- ADDITIVE ONLY. It creates two tables, two views and three triggers, and
-- touches nothing that exists — not `study_sessions` (021), not
-- `session_concepts` (022), not `academic_events` (015), not `occurrences`
-- (007/020), not `concepts` (007/013). No column is altered, no constraint is
-- dropped, no policy on an existing table is rewritten.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–022.
--
--
-- THE ONE THING THIS FILE EXISTS FOR
--
-- F.2 layer 2: *"Generation begins by computing a coverage manifest —
-- deterministic code enumerates the confirmed set, allocates a question count
-- per concept, and FREEZES the result into `Assessment.coverage_manifest`
-- **BEFORE ANY MODEL CALL**. The AI is asked to fill slots that already exist;
-- it is never asked 'which concepts should this cover?'"*
--
-- A comment saying "compute the manifest first" is an ordering nobody can
-- verify and everybody can undo. §1 and §6 make it a property of the schema:
--
--   · `coverage_manifest`, `manifest_hash`, `blueprint` and `blueprint_hash`
--     are `NOT NULL`. **The row cannot be created without a manifest.**
--   · `generation_started_at` is `NULL` at birth and, once written, must be
--     `>= frozen_at` (§1's CHECK) and may never be un-written or moved backwards
--     (§6's freeze guard). **Generation has a recorded start, and it is after
--     the freeze.**
--   · The manifest columns are IMMUTABLE after INSERT — §6 refuses any change
--     to any of the four, from every writer including the service role.
--   · `assessment_questions.assessment_id` is `NOT NULL` with a foreign key.
--     **A generated question has nowhere to be written that is not behind a
--     frozen manifest.**
--
-- The TypeScript half is `lib/assessment-blueprint.ts`'s `FrozenBlueprint`
-- brand and `lib/assessment-generation.ts`'s `CommittedManifest` →
-- `BoundRequest` chain, which makes a model call with no committed manifest
-- behind it unrepresentable rather than merely refused.
--
--
-- WHY SLOT BINDING IS ALSO A TRIGGER
--
-- F.2 layer 3: *"A generated question is admitted only if its `concept_id`
-- matches the slot it was generated for. A question for the wrong concept is
-- REJECTED and the slot is RETRIED, NEVER REASSIGNED."*
--
-- That check exists three times on purpose, and the third one is here:
--
--   1. gate 1  (`gateSlotBinding`)  — candidate against the requested slot
--   2. `admit()`                    — finished question against the FROZEN
--                                     manifest, independently, at write time
--   3. §7's trigger                 — row against its own assessment's
--                                     `coverage_manifest`, in the database
--
-- Layers 1 and 2 are the same process and share a bug. Layer 3 does not: it
-- binds every writer that will ever exist, including the service role, including
-- an endpoint somebody writes in a hurry in 2027, including a repair script.
-- 020 §5's argument, unchanged: *"RLS does not apply to the service role, and
-- everything the engine writes runs as it. A REVOKE protects against a client;
-- only a trigger protects against the next endpoint somebody writes."*
--
-- T5 is the threat this file is written against — *"the coverage guarantee
-- fails open … 'every confirmed concept is assessed' becomes false while the UI
-- still says verified."* The mitigation F.2 names as load-bearing is the
-- TRANSITION gate, and that is M10-4 and is deliberately NOT in this file: the
-- `ASSESSING → VERIFIED` precondition belongs with the transition it guards.
-- What is here is the frozen truth that gate will read.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · ASSESSMENTS — one per session, and no assessment without a manifest
--
-- F.5: *"One assessment per session — `UNIQUE(session_id)`."*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assessments (
  assessment_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- F.5's UNIQUE, written as the column constraint rather than as a separate
  -- index so that "one assessment per session" is unmissable at the point the
  -- column is declared. E.7.2's single-flight rule for the generation request
  -- is the application half; this is the storage half, and it holds even when
  -- two requests race.
  session_id              UUID        NOT NULL UNIQUE
                            REFERENCES public.study_sessions(session_id) ON DELETE CASCADE,

  -- Denormalised from the session, the posture 022 §1 took, for the same
  -- reason: RLS becomes a column comparison rather than a join. §6's guard
  -- refuses a row whose student disagrees with its session's.
  student_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ── THE FROZEN PAIR ──────────────────────────────────────────────────────
  -- `coverage_manifest` is the exact, complete list of confirmed concepts this
  -- assessment is OBLIGATED to test, with the question count allocated to each.
  -- It is written once, at INSERT, before any model call, and §6 refuses every
  -- later change to it. Its shape is `ManifestEntry[]` from
  -- `lib/assessment-blueprint.ts`:
  --
  --   [{ concept_ref, concept_id, questions_required, starting_depth,
  --      targets_error_type }]
  --
  -- JSONB and not a child table, deliberately. A child table would make the
  -- manifest something rows can be added to and removed from — exactly the
  -- mutability the freeze exists to deny — and would put the guarantee at the
  -- mercy of whether somebody remembered a trigger on the child. A single
  -- immutable document with a hash over it is one object to protect.
  coverage_manifest       JSONB       NOT NULL,

  -- SHA-256 over canonical JSON (`stableStringify` then `sha256Hex`). It is not
  -- a checksum for corruption — it is the value `admit()` re-derives and
  -- compares before writing any question, and the value F.4.b's revocation
  -- sweep can join on to find every question generated under one manifest.
  manifest_hash           TEXT        NOT NULL CHECK (length(manifest_hash) = 64),

  -- The slot list. `BlueprintSlot[]`: the manifest slots plus F.2.b's pattern
  -- retests, which carry `targets_pattern_id` and
  -- `counts_toward_coverage = false` and are attributed to the pattern, never
  -- to session coverage (V.3.6).
  blueprint               JSONB       NOT NULL,
  blueprint_hash          TEXT        NOT NULL CHECK (length(blueprint_hash) = 64),

  -- THE ORDERING, RECORDED. `frozen_at` is stamped at INSERT;
  -- `generation_started_at` is stamped when the first model call is authorised,
  -- and the CHECK below refuses a value earlier than the freeze. V.3.1 is
  -- therefore answerable by a SELECT rather than by reading code — an ordering
  -- nobody can read back is one nobody can audit.
  frozen_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generation_started_at   TIMESTAMPTZ,

  -- Four states, and none of them is a verdict about the student.
  --   blueprinted  the manifest is frozen; no model has been called
  --   generating   at least one model call has been authorised
  --   ready        every coverage slot is filled and the assessment is
  --                presentable
  --   unfillable   F.2.a — a coverage slot could not be filled by generation
  --                or by the bank. The session's own transition to
  --                CLOSED_UNVERIFIED with reason 'coverage_unfillable' is
  --                M10-4's and is NOT written here.
  status                  TEXT        NOT NULL DEFAULT 'blueprinted'
                            CHECK (status IN ('blueprinted','generating','ready','unfillable')),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- F.2, at the row level. A manifest that names nothing is not a shorter
  -- assessment; it is a session that should never have reached ASSESSING, and
  -- storing one would make "every confirmed concept is covered" vacuously true
  -- — the precise shape of a guarantee that fails open (T5).
  CONSTRAINT assessments_manifest_not_empty CHECK (
    jsonb_typeof(coverage_manifest) = 'array' AND jsonb_array_length(coverage_manifest) > 0
  ),

  CONSTRAINT assessments_blueprint_is_array CHECK (
    jsonb_typeof(blueprint) = 'array' AND jsonb_array_length(blueprint) > 0
  ),

  -- V.3.1, AS A DATABASE CHECK. Generation cannot be recorded as having started
  -- before the manifest was frozen. A CHECK cannot see the ordering of two
  -- statements, but it can refuse the only trace those statements leave, and
  -- that is enough: a pipeline that called a model first has no honest value to
  -- put here.
  CONSTRAINT assessments_generation_after_freeze CHECK (
    generation_started_at IS NULL OR generation_started_at >= frozen_at
  ),

  -- A model has been called ⇒ the assessment is past `blueprinted`, and the
  -- converse. The two facts are the same fact stated twice, so the database
  -- refuses them disagreeing rather than leaving a reader to guess which is
  -- authoritative (021's `study_sessions_terminal_shape`, reused).
  CONSTRAINT assessments_status_shape CHECK (
    (status = 'blueprinted' AND generation_started_at IS NULL)
    OR (status <> 'blueprinted')
  )
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · ASSESSMENT_QUESTIONS — admitted, provenanced, and gradable without a
--     model
--
-- F.4: *"Only after all seven does the question receive `admitted_at` and
-- become presentable. `provenance` (C.3) is written at admission."*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  question_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NOT NULL, with a key. This one column is why a model call with no frozen
  -- manifest behind it has nowhere to write its output.
  assessment_id           UUID        NOT NULL
                            REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  session_id              UUID        NOT NULL
                            REFERENCES public.study_sessions(session_id) ON DELETE CASCADE,
  student_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The slot this question was generated FOR. §7 checks it against the
  -- assessment's own blueprint; never against a parameter the writer supplied.
  slot_index              INTEGER     NOT NULL CHECK (slot_index >= 0),

  -- C.3's identity, as 022 stores it: a concept UUID, or `text:<normalised>`
  -- for a declaration the taxonomy refused to guess at (B.4, V.2.4). V.2.6
  -- requires a question for the unresolved declaration too, so a NULL
  -- `concept_id` is legal here for exactly the reason it is legal in 022.
  concept_ref             TEXT        NOT NULL CHECK (length(concept_ref) > 0),
  concept_id              UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,

  -- F.2.b's attribution. A retest counts toward its pattern and NOT toward
  -- session coverage (V.3.6), and the pair is constrained below so the two
  -- cannot drift apart into a question that counts twice or not at all.
  counts_toward_coverage  BOOLEAN     NOT NULL,
  targets_pattern_id      UUID,

  -- F.3's ladder.
  depth                   TEXT        NOT NULL CHECK (depth IN ('recall','application','transfer')),

  -- F.4.a's closed-form-only V1 posture, AS AN ENUM. `short_text` is absent —
  -- not disabled, ABSENT — so a question whose grading would need a model
  -- cannot be stored at all. P.3.a: *"Only deterministic grading against a
  -- stored `answer_key` produces E-class evidence. A tool that asks a model
  -- 'was that right?' and writes the answer is at Level 1 regardless of how
  -- confident it sounds."*
  format                  TEXT        NOT NULL CHECK (format IN ('mcq','numeric','ordering','match')),

  stem                    TEXT        NOT NULL CHECK (length(stem) > 0),
  -- F.4 gate 6's key, retained so the NEXT assessment can refuse a repeat
  -- without re-reading every stem the student has ever seen (F.5 — *"a retest
  -- can reuse a DIFFERENT question on the same concept — never the same stem"*).
  stem_hash               TEXT        NOT NULL CHECK (length(stem_hash) = 64),

  options                 JSONB,

  -- THE ANSWER KEY, STRUCTURED. M10-5 grades against this with no model in the
  -- path. There is deliberately no `rubric` column in this migration: F.4.a
  -- permits one for short-text items, and short text is not a V1 format, so a
  -- column for it would be an invitation rather than a capability.
  answer_key              JSONB       NOT NULL,

  marks                   INTEGER     NOT NULL CHECK (marks BETWEEN 1 AND 10),

  -- F.4.b's revocation handle. `{capability, prompt_version, model,
  -- rederiver_model, origin, manifest_hash, gates_passed}`. **CURRENT FACT
  -- (F.4.b): today's `ai_history` stores output but no prompt version, which is
  -- why the current architecture cannot revoke at all.** The full revocation
  -- path is M10-6; this column is what makes it possible later, and it is
  -- written now because provenance that is added retroactively is not
  -- provenance.
  provenance              JSONB       NOT NULL,

  -- Written only after all seven gates. There is no draft state here: a
  -- candidate that failed a gate is DISCARDED (F.4 — *"nothing is repaired"*),
  -- so an unadmitted question is not a row with a null column, it is no row.
  admitted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- F.5's retention, which IS the bank. A withdrawn question (F.8 — *"the
  -- question is withdrawn from the bank"*) flips this to FALSE; it is never
  -- deleted, because §3.2 does not delete facts.
  retained                BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One question per slot. The slot is the unit of coverage; two rows on one
  -- slot would make "the manifest is covered" a question of which row you
  -- counted.
  CONSTRAINT assessment_questions_one_per_slot UNIQUE (assessment_id, slot_index),

  -- F.2.b's pair, constrained. A coverage question is never attributed to a
  -- pattern and a retest always is.
  CONSTRAINT assessment_questions_attribution CHECK (
    (counts_toward_coverage = TRUE  AND targets_pattern_id IS NULL)
    OR
    (counts_toward_coverage = FALSE AND targets_pattern_id IS NOT NULL)
  ),

  -- Closed-form shapes. A numeric question carries no options; the other three
  -- carry at least two.
  CONSTRAINT assessment_questions_option_shape CHECK (
    (format = 'numeric' AND options IS NULL)
    OR
    (format <> 'numeric' AND jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2)
  ),

  -- The key's `kind` and the format are the same fact stated twice.
  CONSTRAINT assessment_questions_key_matches_format CHECK (
    answer_key ->> 'kind' = format
  ),

  -- F.4's *"provenance is written at admission"*, made checkable: a row whose
  -- provenance does not name the prompt version cannot be revoked by F.4.b, so
  -- it is not admissible.
  CONSTRAINT assessment_questions_provenance_shape CHECK (
    provenance ? 'prompt_version' AND provenance ? 'model'
    AND provenance ? 'origin' AND provenance ->> 'origin' IN ('generated','bank')
  )
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS assessments_student_idx
  ON public.assessments (student_id, frozen_at DESC);

-- F.4.b's revocation sweep: *"prompt version v is later found defective …
-- `provenance.prompt_version = v` identifies every affected question."* A sweep
-- that has to scan every question in the product is a sweep nobody runs.
CREATE INDEX IF NOT EXISTS assessment_questions_prompt_version_idx
  ON public.assessment_questions ((provenance ->> 'prompt_version'));

CREATE INDEX IF NOT EXISTS assessment_questions_assessment_idx
  ON public.assessment_questions (assessment_id, slot_index);

-- F.5's bank query: "a prior question on this concept that this student has not
-- seen". Partial on `retained`, because a withdrawn question is never a
-- candidate and should not be paged through to discover that.
CREATE INDEX IF NOT EXISTS assessment_questions_bank_idx
  ON public.assessment_questions (student_id, concept_ref, depth, admitted_at DESC)
  WHERE retained = TRUE;

-- F.4 gate 6: "has this student seen this stem?"
CREATE INDEX IF NOT EXISTS assessment_questions_stem_seen_idx
  ON public.assessment_questions (student_id, stem_hash);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · THE COVERAGE VIEW — F.2's guarantee, as something to SELECT
--
-- 022 §4's argument, applied one layer down: a reader who has to remember a
-- predicate is a reader who will one day forget it, so the predicate stops
-- being the reader's to remember. M10-4's transition gate reads THIS.
--
-- One row per manifest entry per assessment, with the number of coverage
-- questions actually bound to it. `covered` is FALSE for a manifest entry with
-- a hole, and the transition gate's precondition is `NOT EXISTS (… AND NOT
-- covered)` — F.2 layer 4 stated as a query rather than as a paragraph.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.assessment_coverage
  WITH (security_invoker = true)
AS
  SELECT
    a.assessment_id,
    a.session_id,
    a.student_id,
    e.entry ->> 'concept_ref'                          AS concept_ref,
    COALESCE((e.entry ->> 'questions_required')::INT, 1) AS questions_required,
    COUNT(q.question_id)                                AS questions_bound,
    COUNT(q.question_id) >= COALESCE((e.entry ->> 'questions_required')::INT, 1) AS covered
  FROM public.assessments a
  CROSS JOIN LATERAL jsonb_array_elements(a.coverage_manifest) AS e(entry)
  LEFT JOIN public.assessment_questions q
    ON q.assessment_id = a.assessment_id
   AND q.counts_toward_coverage = TRUE
   AND q.concept_ref = e.entry ->> 'concept_ref'
  GROUP BY a.assessment_id, a.session_id, a.student_id, e.entry;

COMMENT ON VIEW public.assessment_coverage IS
  'F.2''s coverage guarantee, per manifest entry. `covered = false` is a coverage '
  'hole. M10-4''s ASSESSING -> VERIFIED precondition reads this view; a session '
  'with any uncovered entry may not be verified (V.3.4, V.3.5, T5).';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE RETAINED BANK — F.5, as something to SELECT
--
-- *"Admitted questions persist and become a per-student bank, so a retest can
-- reuse a DIFFERENT question on the same concept — never the same stem. This is
-- both an integrity measure (no memorisation of the check) and the F.2.a
-- fallback."*
--
-- `answer_key` IS deliberately absent from this view. The bank is read to
-- SELECT a question, and a select-a-question query has no business carrying the
-- key; a surface that accidentally serialises this view to a client leaks
-- nothing. `lib/question-bank.ts` reads the table for the key when it actually
-- needs one, server-side.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.retained_question_bank
  WITH (security_invoker = true)
AS
  SELECT
    question_id, student_id, concept_ref, concept_id, depth, format,
    stem, stem_hash, options, marks, admitted_at
  FROM public.assessment_questions
  WHERE retained = TRUE;

COMMENT ON VIEW public.retained_question_bank IS
  'F.5''s per-student retained bank — the F.2.a fallback source when generation '
  'cannot fill a slot (M10-3, V.3.3). Carries no answer_key by design.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · ROW LEVEL SECURITY
--
-- SELECT-own and nothing else — 021 §6 and 022 §5's posture, for their reason,
-- applied where the stakes are highest. A client that could INSERT into
-- `assessments` could write itself a one-entry coverage manifest and verify a
-- session it never sat; a client that could UPDATE `assessment_questions` could
-- rewrite an `answer_key` after answering.
--
-- `answer_key` deserves its own sentence. It is SELECTable by the owning
-- student, which is deliberate and is a limit of this architecture rather than
-- an oversight: RLS is row-level, not column-level, and a student determined
-- enough to read their own row can already read the key. The mitigations are
-- elsewhere and are the honest ones — F.5's retention means a retest is never
-- the same stem, and F.5's timing note refuses to infer cheating from speed
-- because *"inferring cheating from speed would be an unevidenced inference
-- about a student — precisely what PRINCIPLES 106-112 forbids storing."* A
-- column-level revoke is possible and is deliberately NOT taken in this pass:
-- it would need the presentation path rebuilt around a view, and that is a
-- decision, not a migration.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessments_select_own ON public.assessments;
CREATE POLICY assessments_select_own ON public.assessments
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS assessment_questions_select_own ON public.assessment_questions;
CREATE POLICY assessment_questions_select_own ON public.assessment_questions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

REVOKE INSERT, UPDATE, DELETE ON public.assessments          FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.assessment_questions FROM anon, authenticated;

GRANT SELECT ON public.assessment_coverage    TO authenticated;
GRANT SELECT ON public.retained_question_bank TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · THE FREEZE GUARD — V.3.1, IN THE DATABASE
--
-- The manifest is written once and is immutable thereafter, from EVERY writer
-- including the service role. RLS does not bind the service role; a trigger
-- does.
--
-- `generation_started_at` is the ordering's only trace and it is protected in
-- both directions: it may be written once, it may never be un-written, and it
-- may never be moved earlier than the freeze. A pipeline that called a model
-- before freezing has no honest value to write here, and no dishonest one it
-- can write later.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assessments_freeze_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.study_sessions s
      WHERE s.session_id = NEW.session_id AND s.student_id = NEW.student_id
    ) THEN
      RAISE EXCEPTION 'assessment.student_id does not match its session''s student'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := NOW();

  IF NEW.assessment_id IS DISTINCT FROM OLD.assessment_id
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.frozen_at  IS DISTINCT FROM OLD.frozen_at THEN
    RAISE EXCEPTION 'assessment %: identity and the freeze timestamp are immutable', OLD.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- THE COVERAGE MANIFEST IS FROZEN. This is F.2 layer 2's whole claim, and it
  -- is the reason a model cannot later be prompted in a way that silently
  -- narrows or reinterprets what must be covered: there is nothing to narrow,
  -- because the obligation was written before the first call and cannot be
  -- edited after it.
  IF NEW.coverage_manifest IS DISTINCT FROM OLD.coverage_manifest
     OR NEW.manifest_hash  IS DISTINCT FROM OLD.manifest_hash
     OR NEW.blueprint      IS DISTINCT FROM OLD.blueprint
     OR NEW.blueprint_hash IS DISTINCT FROM OLD.blueprint_hash THEN
    RAISE EXCEPTION
      'assessment %: the coverage manifest and blueprint are frozen before any model call and are immutable (F.2, V.3.1)',
      OLD.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.generation_started_at IS NOT NULL
     AND NEW.generation_started_at IS DISTINCT FROM OLD.generation_started_at THEN
    RAISE EXCEPTION
      'assessment %: generation_started_at is written once — the ordering it records is not editable',
      OLD.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessments_freeze_guard_trg ON public.assessments;
CREATE TRIGGER assessments_freeze_guard_trg
  BEFORE INSERT OR UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.assessments_freeze_guard();


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · THE SLOT-BINDING TRIGGER — F.2 layer 3, in the database
--
-- The third and last independent check that a question belongs to the slot it
-- claims and to a concept the frozen manifest names. See the header for why
-- three.
--
-- Note what it does NOT do: it does not repair, reassign or renumber. F.4 —
-- *"A failure at any gate discards the candidate; NOTHING IS REPAIRED."* A
-- trigger that quietly re-pointed a mis-bound question would be the coverage
-- hole T5 describes, installed as a convenience.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assessment_questions_bind_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  a            public.assessments%ROWTYPE;
  slot         JSONB;
BEGIN
  SELECT * INTO a FROM public.assessments WHERE assessment_id = NEW.assessment_id;

  IF a.assessment_id IS NULL THEN
    RAISE EXCEPTION 'assessment_question references no assessment'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.student_id IS DISTINCT FROM a.student_id OR NEW.session_id IS DISTINCT FROM a.session_id THEN
    RAISE EXCEPTION 'assessment_question %: student and session must match its assessment', NEW.question_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- V.3.1, ENFORCED AT THE ONLY DOOR A GENERATED QUESTION CAN COME THROUGH.
  -- A question exists only because a model was called; a model call is only
  -- legitimate after the freeze; so a question on an assessment that never
  -- recorded a generation start is a question that came from somewhere this
  -- pipeline does not have. Bank questions are exempt because no model was
  -- called for them at all — which is M10-3's claim, and here it is load-bearing
  -- rather than decorative.
  IF NEW.provenance ->> 'origin' = 'generated' AND a.generation_started_at IS NULL THEN
    RAISE EXCEPTION
      'assessment %: a generated question exists but generation was never recorded as started (F.2, V.3.1)',
      a.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  slot := a.blueprint -> NEW.slot_index;
  IF slot IS NULL THEN
    RAISE EXCEPTION 'slot % is not in assessment %''s frozen blueprint', NEW.slot_index, a.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF slot ->> 'concept_ref' IS DISTINCT FROM NEW.concept_ref THEN
    RAISE EXCEPTION
      'slot % of assessment % is for %, not % — a question for the wrong concept is rejected and the slot retried, never reassigned (F.2 layer 3)',
      NEW.slot_index, a.assessment_id, slot ->> 'concept_ref', NEW.concept_ref
      USING ERRCODE = 'check_violation';
  END IF;

  IF (slot ->> 'counts_toward_coverage')::BOOLEAN IS DISTINCT FROM NEW.counts_toward_coverage THEN
    RAISE EXCEPTION
      'question %: coverage attribution disagrees with slot % of the frozen blueprint (F.2.b)',
      NEW.question_id, NEW.slot_index
      USING ERRCODE = 'check_violation';
  END IF;

  -- THE MANIFEST IS THE SOLE SOURCE OF TRUTH FOR WHAT MAY COUNT AS COVERAGE.
  -- A retest (F.2.b) is legitimately off-manifest and is exempt — it counts
  -- toward its pattern and not toward session coverage (V.3.6).
  IF NEW.counts_toward_coverage AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(a.coverage_manifest) AS e(entry)
    WHERE e.entry ->> 'concept_ref' = NEW.concept_ref
  ) THEN
    RAISE EXCEPTION
      'question %: % is not on assessment %''s frozen coverage manifest',
      NEW.question_id, NEW.concept_ref, a.assessment_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessment_questions_bind_guard_trg ON public.assessment_questions;
CREATE TRIGGER assessment_questions_bind_guard_trg
  BEFORE INSERT ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_questions_bind_guard();


-- ═══════════════════════════════════════════════════════════════════════════
-- 9 · THE QUESTION IS A FACT
--
-- 3.2: *"Facts are immutable and never deleted; a correction appends a
-- superseding fact rather than editing history."*
-- F.8: an upheld complaint about a question means *"the question is WITHDRAWN
-- FROM THE BANK"* — `retained = FALSE` — and never that it is deleted, because
-- the attempts against it must remain explicable.
--
-- So: only `retained` may move. Everything else on an admitted question is
-- immutable, `answer_key` above all — a key that can be edited after an attempt
-- is a grade that can be changed after the fact.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assessment_questions_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.student_id) THEN
      RAISE EXCEPTION
        'assessment_question % may not be deleted: a withdrawn question is retained = FALSE, never removed (F.8, PRINCIPLES 3.2)',
        OLD.question_id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.question_id            IS DISTINCT FROM OLD.question_id
     OR NEW.assessment_id       IS DISTINCT FROM OLD.assessment_id
     OR NEW.session_id          IS DISTINCT FROM OLD.session_id
     OR NEW.student_id          IS DISTINCT FROM OLD.student_id
     OR NEW.slot_index          IS DISTINCT FROM OLD.slot_index
     OR NEW.concept_ref         IS DISTINCT FROM OLD.concept_ref
     OR NEW.concept_id          IS DISTINCT FROM OLD.concept_id
     OR NEW.counts_toward_coverage IS DISTINCT FROM OLD.counts_toward_coverage
     OR NEW.targets_pattern_id  IS DISTINCT FROM OLD.targets_pattern_id
     OR NEW.depth              IS DISTINCT FROM OLD.depth
     OR NEW.format             IS DISTINCT FROM OLD.format
     OR NEW.stem               IS DISTINCT FROM OLD.stem
     OR NEW.stem_hash          IS DISTINCT FROM OLD.stem_hash
     OR NEW.options            IS DISTINCT FROM OLD.options
     OR NEW.answer_key         IS DISTINCT FROM OLD.answer_key
     OR NEW.marks              IS DISTINCT FROM OLD.marks
     OR NEW.provenance         IS DISTINCT FROM OLD.provenance
     OR NEW.admitted_at        IS DISTINCT FROM OLD.admitted_at THEN
    RAISE EXCEPTION
      'assessment_question %: an admitted question is immutable; only `retained` may move (F.8)',
      OLD.question_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessment_questions_immutable_trg ON public.assessment_questions;
CREATE TRIGGER assessment_questions_immutable_trg
  BEFORE UPDATE OR DELETE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_questions_immutable();


-- ═══════════════════════════════════════════════════════════════════════════
-- 10 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7, 013 §5, 015 §6, 020 §7, 021 §7 and 022 §8: a
-- migration that asserts a posture fails loudly if the posture is not what it
-- just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_generation_after_freeze'
  ) THEN
    RAISE EXCEPTION
      '023 did not install the ordering CHECK (generation_started_at >= frozen_at) — V.3.1 is the milestone';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_manifest_not_empty'
  ) THEN
    RAISE EXCEPTION '023 did not install the non-empty manifest CHECK (F.2 — a manifest that names nothing fails open)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessments_freeze_guard_trg') THEN
    RAISE EXCEPTION '023 did not install the freeze guard (F.2 layer 2 — the manifest is immutable after INSERT)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_questions_bind_guard_trg') THEN
    RAISE EXCEPTION '023 did not install the slot-binding guard (F.2 layer 3, V.3.2)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_questions_immutable_trg') THEN
    RAISE EXCEPTION '023 did not install the immutability guard (F.8 — an answer key is never edited)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'assessment_coverage'
  ) THEN
    RAISE EXCEPTION '023 did not create assessment_coverage: M10-4''s transition gate reads it (V.3.4, V.3.5)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'retained_question_bank'
  ) THEN
    RAISE EXCEPTION '023 did not create retained_question_bank: F.5 is the F.2.a fallback source (V.3.3)';
  END IF;

  -- The bank view must not carry the key. A view that leaked `answer_key` would
  -- be the one query a careless surface serialises straight to a client.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'retained_question_bank'
      AND column_name = 'answer_key'
  ) THEN
    RAISE EXCEPTION 'retained_question_bank exposes answer_key';
  END IF;

  -- One assessment per session (F.5).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'assessments' AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%session_id%'
  ) THEN
    RAISE EXCEPTION '023 did not install UNIQUE(session_id) on assessments (F.5)';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename IN ('assessments','assessment_questions') AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'a non-SELECT policy exists on the assessment tables (%): E.7.3 — clients hold no authoritative session state',
      bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 11 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO `assessment_attempts` TABLE. Attempts are M10-5 (deterministic grading)
--   and M10-7 (immediate mistake logging), and F.5's *"answers are append-only
--   with `attempt_no`"* belongs in the file that also carries the grading
--   function it constrains. Shipping the table now without the append-only rule
--   would ship the shape without the guarantee — 021 §8's exact argument for
--   deferring `session_concepts`, reused.
--
-- · NO `ASSESSING -> VERIFIED` PRECONDITION. That is F.2 layer 4 and M10-4, and
--   it is the load-bearing mitigation for T5. §4's `assessment_coverage` view is
--   what it will read; the transition itself belongs with `study_sessions`,
--   whose transition guard 021 already owns and which this pass may not touch.
--
-- · NO REVOCATION PATH. F.4.b's `EVENT_SUPERSEDED` sweep and the `ScoreSnapshot`
--   recomputation are M10-6. What is here is the `provenance` column and its
--   `prompt_version` index — the handle the sweep will need, written now because
--   provenance added retroactively is not provenance.
--
-- · NO `rubric` COLUMN, and no `short_text` in the `format` CHECK. F.4.a's V1
--   posture is closed-form only, and a column for a format V1 does not ship
--   would be an invitation rather than a capability.
--
-- · NO SCORE COLUMN, no weight, no `points`. The score reads evidence through
--   M12's projection, and an assessment row that carried its own contribution
--   would give the number two homes and let them disagree (022 §9's reasoning).
--
-- · NO AI CALL, no model name in SQL, no prompt text. `provenance.model` is
--   written by the application from configuration — Q.4: *"Model identity moves
--   out of a hardcoded string into configuration so a migration is not a code
--   edit in 2,726 lines."*
--
-- · IT DOES NOT BACKFILL, and there is nothing to backfill: F.1 records as a
--   CURRENT FACT that this subsystem *"does not exist in any form today — no
--   assessment table, no question bank, no grading path"*, and
--   `app/tools/exam-sim` and `app/tools/practice` persist nothing (A.3.c).
--   `lib/papers-data.ts` holds MCQs keyed by a free-text `topic` string with no
--   concept identity, no provenance and no answer-key shape; importing it would
--   be inventing concept identity for content nobody curated, which is exactly
--   what B.4 forbids. It is left where it is.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '023',
  '023_assessments.sql',
  'e10a660614c8d2ca0276df69345a71d867a34e9b7b4c6145f6bbf3e88400e78f',
  'self'
);
