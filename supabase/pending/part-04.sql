-- ═══════════════════════════════════════════════════════════════════════════
-- STUDYLEDGER — PENDING MIGRATIONS, PART 4 OF 6
--
-- 023, 024, 025
--
-- RUN THE PARTS IN ORDER. Each part is a whole number of migrations and is
-- idempotent, so a part that is interrupted can simply be run again.
--
-- Supabase → SQL Editor → New query. Press Ctrl+A then Delete FIRST: the
-- editor runs only the highlighted text if anything is selected, and a
-- partial run reports success.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 023_assessments.sql ───

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


-- ─── 024_assessment_attempts.sql ───

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


-- ─── 025_mistake_dna.sql ───

-- ═══════════════════════════════════════════════════════════════════════════
-- 025_mistake_dna.sql — MISTAKE DNA: THE TWO ENUM WIDENINGS, THE SEVERITY
-- STAMP, THE RETEST SCHEDULE, THE RESOLUTION RECORD, AND THE DATABASE'S HALF
-- OF THE TRIPLE REFUSAL.
--
-- EXECUTION_PLAN M11-3: *"Additive extensions only: two enum values, `source`
-- CHECK. **KEEP, extend additively.** Done when: `types.ts` and `007` are
-- extended, never rewritten."*
-- EXECUTION_PLAN M11-2: *"Severity-factor derivation, versioned."*
-- EXECUTION_PLAN M11-4: *"Retest scheduling and the `RESOLUTION_COOLING_DAYS =
-- 7` gate."*
-- EXECUTION_PLAN M11-5: *"Triple refusal of client-set resolution: RLS +
-- `applyTransition` + ingest. Done when: V.4.4 — three independent refusals."*
--
-- Architecture Part G in full; Part V.4.1–V.4.9.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–024.
--
--
-- WHY THIS FILE EXISTS RATHER THAN AN EDIT TO 007
--
-- `007_mistakes.sql` is registered in M1's migration ledger with a checksum over
-- its body. `scripts/check-migrations.mjs` reports DIVERGENT the moment that
-- body changes, because T1 is *"an append-only event store cannot tolerate
-- schema drift"* and the ledger records *"this exact text was run"*, not
-- *"something like this was run"*. Editing 007 to add an enum value would be
-- precisely the drift class the ledger was built to catch — so every change
-- below is an ALTER against the live shape, and 007 is untouched.
--
-- G.1's verdict governs the posture: `007` is **KEEP, extend additively** —
-- *"Four invariants enforced structurally … Only the `source` CHECK needs
-- extending."* Nothing here drops a constraint, drops a column, drops a policy
-- or relaxes a CHECK. Every statement adds.
--
--
-- THE ONE THING THIS FILE IS FOR
--
-- V.4.4: *"Directly POSTing `status: 'resolved'` from the client is **refused by
-- RLS** (`007_mistakes.sql:369-376`) **and** by `applyTransition`
-- (`engine.ts:508-513`) **and** by event ingest. Three refusals."*
--
-- Two of the three already exist and are NOT rebuilt here:
--
--   applyTransition  `STUDENT_SETTABLE` refuses a student actor for anything
--                    outside {acknowledged, practising} (engine.ts:508-513),
--                    and refuses `resolved` with no `correctAnswers`
--                    (:515-529). Untouched — G.1 says KEEP.
--   event ingest     `SOURCE_RESTRICTIONS` in `lib/event-contract.ts` refuses
--                    `MISTAKE_RESOLVED` from any source but `system`.
--                    Untouched — M7 built it correctly.
--
-- The DATABASE's refusal is the one with a hole, and §5 closes it. `007`'s
-- UPDATE policy is correct and stays exactly as it is. But `007`'s INSERT policy
-- is `WITH CHECK (auth.uid() = student_id)` and says nothing about `status` — so
-- a client could INSERT a pattern that is BORN `resolved`, never updating
-- anything, and the UPDATE policy would never see it. §5 refuses that, and §6
-- takes the columns a client has no business writing out of its reach entirely.
--
-- **The three refusals are independent by construction**: one is a Postgres
-- policy, one is a pure TypeScript function with no I/O, one is a validation
-- table on the event contract. No single change disables two of them, and each
-- catches what the others cannot see — RLS never sees a service-role write,
-- `applyTransition` never sees a raw POST, and ingest never sees a direct
-- PostgREST call.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 · THE TWO ENUM WIDENINGS AND THE `source` CHECK (M11-3)
--
-- G.1: *"Additions needed: `'in-session-assessment'` in `OccurrenceSource`, and
-- `'assessment_attempt' | 'declaration'` in `EvidenceType`. Both additive."*
--
-- These are CHECK constraints rather than Postgres ENUM types, so widening is
-- DROP + ADD of the constraint — which is additive in effect (every value that
-- passed before still passes) even though it is two statements. The alternative,
-- an ALTER TYPE ... ADD VALUE, is not available because 007 never created a type.
--
-- **M10's already-written rows are NOT re-pointed here.** `lib/assessment-
-- mistakes.ts` writes `source = 'self-test'` and `evidence.type = 'manual'`, and
-- says in its own header that both were compromises pending this widening. Those
-- are DATA, and changing the value on rows that already exist is a correction
-- under Part O.4 (append and supersede, never edit in place) — not an additive
-- schema extension. This migration makes the correct values REPRESENTABLE; the
-- restatement is a separate, auditable act.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── occurrences.source ──────────────────────────────────────────────────────
ALTER TABLE occurrences DROP CONSTRAINT IF EXISTS occurrences_source_check;

ALTER TABLE occurrences ADD CONSTRAINT occurrences_source_check CHECK (
  source IN (
    -- 007's seven, verbatim and in its order.
    'board-exam', 'school-exam', 'mock', 'coaching-test',
    'homework', 'past-paper', 'self-test',
    -- G.1's addition. A mistake made inside THIS product's own assessment.
    -- Not `mock` and not `past-paper`: those name real papers a student sat
    -- elsewhere, and borrowing one would put a school exam in the record that
    -- never happened.
    'in-session-assessment'
  )
);

-- ── evidence.type ───────────────────────────────────────────────────────────
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_type_check;

ALTER TABLE evidence ADD CONSTRAINT evidence_type_check CHECK (
  type IN (
    -- 007's three, verbatim.
    'photo', 'pdf', 'manual',
    -- G.3: *"for an in-session mistake the evidence is the assessment attempt
    -- itself … Without that, the engine's own principle would force fabricating
    -- evidence, which migrate-legacy.ts:8-18 correctly refused to do."*
    'assessment_attempt',
    -- A student's own statement (M9's declaration path). Evidence OF THE
    -- STATEMENT, never of the fact — which is why it is a distinct type rather
    -- than `manual`, whose meaning is "a student transcribed a real paper".
    'declaration'
  )
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 · THE SEVERITY STAMP (M11-2)
--
-- `patterns.severity` is a stored number derived by a formula. A number whose
-- meaning depends on a formula is meaningless without the formula's identity
-- beside it — the argument M6 made for `taxonomy_version`, M10 for
-- `prompt_version`, and M14-5 will make for `ScoreSnapshot.formula_version`.
--
-- §4.6 promises *"formula improvements upgrade every existing pattern
-- retroactively"*. That is a RECOMPUTE, and a recompute whose need cannot be
-- detected is a recompute that never happens. These two columns are how it is
-- detected: `WHERE severity_version <> 'sf_v1'`.
--
-- `severity_factors` stores the four normalised inputs, not just the output, so
-- a severity can be EXPLAINED (§4.6: *"so ranking is explainable"*) without
-- re-reading the marks, the exam calendar and the taxonomy as they were on the
-- day.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS severity_version TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS severity_factors JSONB;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patterns_severity_version_shape') THEN
    -- A severity and its version travel together. A leaf with a severity and no
    -- version is a number nobody can interpret; a version with no severity is a
    -- claim about a computation that did not happen.
    --
    -- Parents are exempt in both directions: §4.6.2 says parent severity is the
    -- MAX of descendants, derived on demand and NEVER persisted, so a parent has
    -- neither and must keep having neither.
    ALTER TABLE patterns ADD CONSTRAINT patterns_severity_version_shape CHECK (
      (tier = 'concept' AND severity IS NOT NULL AND severity_version IS NOT NULL)
      OR (tier <> 'concept' AND severity IS NULL AND severity_version IS NULL AND severity_factors IS NULL)
    ) NOT VALID;
  END IF;
END $$;

-- NOT VALID, then validated separately: leaves written before this migration
-- have no `severity_version`, and a constraint that refuses to be added at all
-- would make this file unrunnable against a database that already has patterns.
-- The validation is left to a human who has backfilled the stamp, because
-- inventing a version for a severity computed under unknown rules is exactly the
-- fabrication `migrate-legacy.ts` refused (T2).
--
--   UPDATE patterns SET severity_version = 'sf_v0_unknown'
--     WHERE tier = 'concept' AND severity_version IS NULL;
--   ALTER TABLE patterns VALIDATE CONSTRAINT patterns_severity_version_shape;
--
-- `sf_v0_unknown` is deliberately not a version this build claims to support —
-- `isSeverityVersionSupported()` returns false for it, so those rows are read as
-- numbers and never compared as severities.


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 · THE RETEST SCHEDULE (M11-4)
--
-- G.8: *"A `RetestSchedule` entry per open leaf: `{pattern_id, due_at,
-- attempt_count, last_result}`. Intervals expand on success and reset on
-- failure. The retest question is generated by the Assessment Engine with
-- `targets_pattern_id` set, and is injected into the *next* session's assessment
-- as an above-manifest addition (F.2.b)."*
--
-- `023_assessments.sql:225` already holds `targets_pattern_id` and the
-- `counts_toward_coverage = FALSE` pairing. This table is the other end of that
-- link: what is DUE, and when.
--
-- ONE ROW PER PATTERN — the primary key says so. A pattern with two schedules is
-- a pattern that could be retested twice in one session and resolved by whichever
-- schedule was looser.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mistake_retest_schedule (
  pattern_id      UUID PRIMARY KEY REFERENCES patterns(id) ON DELETE RESTRICT,
  student_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- NEVER earlier than `last_seen_at + 7 days`. §4 enforces it; the application
  -- derives it from `RESOLUTION_COOLING_DAYS` so the two cannot disagree.
  due_at          TIMESTAMPTZ NOT NULL,

  -- The rung of G.8's ladder that produced `due_at`. Retained so the next
  -- interval is derived from the schedule rather than recomputed from a guess.
  interval_days   INTEGER NOT NULL CHECK (interval_days >= 7),

  attempt_count   INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_result     TEXT CHECK (last_result IN ('pass', 'fail')),
  last_attempt_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A result implies an attempt and an attempt implies a result. A schedule
  -- claiming `pass` with no attempt is a claim about a retest that never
  -- happened, which is the shape §3.2 exists to refuse.
  CONSTRAINT retest_result_needs_attempt CHECK (
    (last_result IS NULL AND last_attempt_at IS NULL AND attempt_count = 0)
    OR (last_result IS NOT NULL AND last_attempt_at IS NOT NULL AND attempt_count > 0)
  )
);

CREATE INDEX IF NOT EXISTS mistake_retest_due_idx
  ON public.mistake_retest_schedule (student_id, due_at);


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 · THE COOLING GATE, IN THE DATABASE (M11-4)
--
-- G.8: *"`canResolve` requires a correct answer ≥`RESOLUTION_COOLING_DAYS = 7`
-- after the last occurrence … This is the fluency-illusion guard."*
--
-- The engine enforces it in TypeScript. This trigger enforces the SCHEDULE half
-- in Postgres, for 020 §5's reason, restated: *"RLS does not apply to the
-- service role, and everything the engine writes runs as it. A REVOKE protects
-- against a client; only a trigger protects against the next endpoint somebody
-- writes."*
--
-- A retest due date inside the cooling window would let a student sit a retest
-- whose result the resolution gate has already agreed to ignore — the schedule
-- asking a question whose answer cannot count.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mistake_retest_cooling_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_last_seen TIMESTAMPTZ;
  v_tier      TEXT;
BEGIN
  SELECT last_seen_at, tier INTO v_last_seen, v_tier
  FROM patterns WHERE id = NEW.pattern_id;

  IF v_tier IS DISTINCT FROM 'concept' THEN
    RAISE EXCEPTION 'retest schedule %: only leaf patterns are retested (§4.4.2)', NEW.pattern_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- No occurrence yet ⇒ nothing to cool from ⇒ nothing to schedule.
  IF v_last_seen IS NULL THEN
    RAISE EXCEPTION 'retest schedule %: the pattern has no last_seen_at to measure a cooling period from', NEW.pattern_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- THE SEVEN DAYS. Measured from the last occurrence, which is exactly what
  -- `canResolve` measures from — one origin, so the schedule and the gate can
  -- never disagree about which day is day 7.
  IF NEW.due_at < v_last_seen + INTERVAL '7 days' THEN
    RAISE EXCEPTION
      'retest schedule %: due_at % is inside the 7-day cooling period after % (G.8, V.4.3)',
      NEW.pattern_id, NEW.due_at, v_last_seen
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mistake_retest_cooling_gate_trg ON public.mistake_retest_schedule;
CREATE TRIGGER mistake_retest_cooling_gate_trg
  BEFORE INSERT OR UPDATE ON public.mistake_retest_schedule
  FOR EACH ROW EXECUTE FUNCTION public.mistake_retest_cooling_gate();


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 · THE RESOLUTION RECORD (C.3, G.8)
--
-- G.8: *"On success the system (never the student) applies `practising →
-- resolved`, appends a `MistakeResolution` row with the proof attempt IDs, and
-- emits `MISTAKE_RESOLVED`."* And: *"a resolution that cannot name them is not
-- constructible."*
--
-- Which is why `proof_attempt_ids` is NOT NULL with a cardinality CHECK, and why
-- there is no INSERT policy for `authenticated` at all: this table is written by
-- the service role, after the engine returned proof, or it is not written.
--
-- The row SURVIVES recurrence. G.8: *"A new occurrence merging into a `resolved`
-- leaf drives `resolved → recurred`. **The prior resolution is not deleted** —
-- its `MistakeResolution` row stands, which is why that entity is separate from
-- the pattern (C.3). A student who fixed something, lost it, and fixed it again
-- has a *better* record than one who never fixed it, and the data model must be
-- able to say so."* Hence no DELETE policy and no UPDATE policy, anywhere.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mistake_resolutions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id         UUID NOT NULL REFERENCES patterns(id) ON DELETE RESTRICT,
  student_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  resolved_at        TIMESTAMPTZ NOT NULL,

  -- THE PROOF. §4.8's *"≥2 correct answers on the same concept"*, named.
  proof_attempt_ids  UUID[] NOT NULL CHECK (array_length(proof_attempt_ids, 1) >= 2),

  -- The occurrence instant the cooling period was measured from, and how many
  -- days actually elapsed. Stored rather than recomputed: `patterns.last_seen_at`
  -- moves when the pattern recurs, and a resolution must still be able to say
  -- what it was proven against.
  measured_from      TIMESTAMPTZ NOT NULL,
  cooling_days       NUMERIC NOT NULL CHECK (cooling_days >= 7),

  -- Always 'system'. The column exists so the record STATES that no student set
  -- it, rather than leaving it to be inferred from the absence of a route.
  set_by             TEXT NOT NULL DEFAULT 'system' CHECK (set_by = 'system'),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mistake_resolutions_pattern_idx
  ON public.mistake_resolutions (pattern_id, resolved_at DESC);
CREATE INDEX IF NOT EXISTS mistake_resolutions_student_idx
  ON public.mistake_resolutions (student_id, resolved_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 · REFUSAL ONE OF THREE — THE DATABASE (M11-5, V.4.4)
--
-- `007:369-376` already refuses a client UPDATE that leaves a pattern in
-- 'resolved'. That policy is CORRECT and is not touched.
--
-- The hole it leaves is INSERT. `007`'s `patterns_insert_own` is
-- `WITH CHECK (auth.uid() = student_id)` and says nothing about `status`, so a
-- client could POST a pattern that is BORN 'resolved' and never update anything.
-- The UPDATE policy would never see it. A student cannot resolve a mistake, and
-- creating one that arrives already resolved is the same act with a different
-- verb.
--
-- The new INSERT policy is strictly narrower than the one it replaces: same
-- ownership predicate, plus a status restriction. Nothing a legitimate client
-- could insert before is refused now, because a client has never had a reason to
-- insert a pattern in any state but 'open'.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS patterns_insert_own ON patterns;
CREATE POLICY patterns_insert_own ON patterns
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    -- A pattern is BORN 'open'. §4.8's lifecycle starts there and nowhere else,
    -- and 'resolved', 'recurred' and 'dormant' are all system judgements.
    AND status = 'open'
    -- A born-resolved pattern would also arrive with a resolution timestamp.
    AND resolved_at IS NULL
  );

-- ── The columns a client may never write ────────────────────────────────────
-- 020 §"THE ONE-WAY DOOR" established this pattern on `occurrences` and the
-- reason transfers exactly: a policy constrains the ROW, a grant constrains the
-- COLUMN, and severity is not a row-shaped question. `severity` is DERIVED
-- (§4.6.1: *"Derived so it cannot be gamed"*) — a client that can write it can
-- rank itself to the top of its own remediation queue.
--
-- REVOKE first so the grant is the complete statement of what is permitted,
-- rather than a widening of whatever was there before.
REVOKE UPDATE ON patterns FROM authenticated;
GRANT UPDATE (status, history) ON patterns TO authenticated;

-- `history` is grantable alongside `status` because §4.4 requires *"every status
-- transition, with cause"* and the two are written in one statement. The RLS
-- policy still decides WHICH statuses, so the grant widens the columns and never
-- the values.

-- ── The new tables' RLS ─────────────────────────────────────────────────────
ALTER TABLE public.mistake_retest_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_resolutions     ENABLE ROW LEVEL SECURITY;

-- A student may SEE their retests and their resolutions. That is the whole of
-- what a client may do with either.
DROP POLICY IF EXISTS mistake_retest_select_own ON public.mistake_retest_schedule;
CREATE POLICY mistake_retest_select_own ON public.mistake_retest_schedule
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS mistake_resolutions_select_own ON public.mistake_resolutions;
CREATE POLICY mistake_resolutions_select_own ON public.mistake_resolutions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- NO INSERT, UPDATE OR DELETE POLICY ON EITHER TABLE, FOR ANYONE BUT THE
-- SERVICE ROLE. A student who could insert a `mistake_resolutions` row would
-- have resolved their own mistake by writing the proof instead of earning it —
-- the fluency illusion with an audit trail attached.


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 · A BORN-RESOLVED PATTERN IS REFUSED FOR THE SERVICE ROLE TOO
--
-- 020 §5's argument, applied to resolution: RLS does not bind the service role,
-- and everything Mistake DNA writes runs as it. §6 stops a client; this stops
-- the next endpoint somebody writes.
--
-- A pattern may not be INSERTED as 'resolved' by anyone, ever. Resolution is a
-- TRANSITION — `practising → resolved`, per `ALLOWED_TRANSITIONS` — and a
-- transition has a prior state by definition. An INSERT has none, so an INSERT
-- of a resolved pattern is a resolution with no history, which is a resolution
-- that names no proof.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.patterns_resolution_requires_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'resolved' THEN
    RAISE EXCEPTION
      'pattern %: resolved is a transition from practising, never an initial state (§4.8, V.4.4)', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    -- ALLOWED_TRANSITIONS.practising = ['resolved', 'recurred', 'dormant'], and
    -- `resolved` is reachable from nowhere else (G.7).
    IF OLD.status IS DISTINCT FROM 'practising' THEN
      RAISE EXCEPTION
        'pattern %: ''%'' → ''resolved'' is not a legal transition; only practising → resolved is (§4.8)',
        NEW.id, OLD.status
        USING ERRCODE = 'check_violation';
    END IF;

    -- THE PROOF MUST ALREADY EXIST. G.8: *"a resolution that cannot name them is
    -- not constructible."* The `mistake_resolutions` row is written first, in the
    -- same transaction, and this trigger refuses the status change without it.
    IF NOT EXISTS (
      SELECT 1 FROM public.mistake_resolutions r WHERE r.pattern_id = NEW.id
    ) THEN
      RAISE EXCEPTION
        'pattern %: resolution requires a mistake_resolutions row naming its proof attempts (G.8, PRINCIPLES §3.1)',
        NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patterns_resolution_requires_proof_trg ON patterns;
CREATE TRIGGER patterns_resolution_requires_proof_trg
  BEFORE INSERT OR UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION public.patterns_resolution_requires_proof();


-- ═══════════════════════════════════════════════════════════════════════════
-- §8 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · IT DOES NOT REWRITE `007_mistakes.sql`. Not one line of that file changed.
--   Every statement above is an ALTER, a CREATE of something new, or a policy
--   replacement that is strictly narrower than what it replaced.
--
-- · NO STATUS ENUM PATCH. `PRODUCT_DECISIONS §9.4`, ratified 2026-08-10: *"The
--   status-enum patch is **rejected outright** — it would convert a dead pillar
--   into a self-awardable one, which is worse than the bug."* The status CHECK on
--   `patterns` is untouched, holds the same six values it has always held, and
--   gains no new one. What this file adds is the machinery BEHIND the statuses:
--   proof, cooling, schedule and provenance.
--
-- · IT DOES NOT RE-POINT M10's ROWS. See §1.
--
-- · IT DOES NOT BACKFILL. `lib/mistakes/migrate-legacy.ts` operates on
--   localStorage, refuses to create occurrences for evidence-less legacy rows,
--   and is executed by a human against a browser — never by a migration. T2:
--   the un-backfillable remainder is MARKED, not invented.
--
-- · NO `coverage_state`, NO SCORE TERM, NO PARENT PROJECTION. M12, M14 and M17.
--
-- · IT DOES NOT APPLY ITSELF. `scripts/check-migrations.mjs` will report 025
--   UNAPPLIED until a human runs it in the SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '025',
  '025_mistake_dna.sql',
  'b39e146e97a399cc3be74963b82a843ac87b204c4ecc703641ad022e61c2a782',
  'self'
);

-- What this part left behind, from the database rather than from a claim:
SELECT version, name, recorded_by FROM supabase_migrations.schema_migrations ORDER BY version;
