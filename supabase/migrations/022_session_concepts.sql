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
