-- ═══════════════════════════════════════════════════════════════════════════
-- 032_recommendations.sql   ·   M20
--
-- EXECUTION_PLAN M20:
--   M20-1  Candidate generation, priority, decay. Done when: K.1, K.2, K.7.
--   M20-2  Mandatory `evidence_refs`; a recommendation with none CANNOT BE
--          INSERTED. Done when: V.7.4.
--   M20-3  "Guide, never gate" enforced mechanically. Done when: K.3 — the
--          next action cannot gate anything (V.11).
--   M20-4  Outcome tracking; escalation without shaming. Done when: K.5, K.6.
--
-- Architecture Part K in full; C.3 `Recommendation` / `RecommendationOutcome`;
-- B.11 (Recommendation Engine).
--
-- NOT APPLIED to any database. Same posture as every migration since 015.
--
--
-- WHAT THIS FILE ADDS, AND WHY IT IS ONE FILE
--
--   1 · recommendation_kind / recommendation_state /
--       recommendation_outcome_kind    Bounded enums. K.1's candidate-kind
--                                       table, C.3's state list, and C.3's
--                                       outcome list, transcribed exactly —
--                                       mirrored in `lib/recommendations/
--                                       types.ts` and cross-checked by
--                                       `tests/recommendations.test.mjs`, the
--                                       same discipline 031 uses for
--                                       `personal_model_dimension`.
--   2 · recommendations                C.3 `Recommendation`. `evidence_refs`
--                                       is NOT NULL with a `cardinality(...)
--                                       >= 1` CHECK — B.11's "a recommendation
--                                       with no evidence reference is a bug"
--                                       made structural (V.7.4). No `blocks`
--                                       column, no `required` column, no
--                                       gating field of any kind exists on
--                                       this table — K.3's "there is no
--                                       `blocks` field, no `required` flag"
--                                       is an ABSENCE, not a rule text can
--                                       violate.
--   3 · recommendation_outcomes        C.3 `RecommendationOutcome` — raw
--                                       evidence about the system, append-
--                                       only, the same three-layer refusal
--                                       024/030 already use for their own
--                                       append-only tables.
--   4 · THE GRANTS                     K.3's "the recommendations table is
--                                       read-only to every subsystem except
--                                       the Recommendation Engine and the
--                                       outcome-recording path" — both of
--                                       which run server-side as
--                                       `service_role`, the same posture
--                                       024/029/030 already use for every
--                                       write a client must never make
--                                       directly. `authenticated` gets SELECT
--                                       only: a student may always SEE their
--                                       own recommendations, and may never
--                                       write a row that could be mistaken
--                                       for a gate.
--
-- ADDITIVE ONLY. Idempotent; safe to re-run. Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE BOUNDED ENUMS (M20-1, K.1, C.3)
--
-- `recommendation_kind` transcribes K.1's candidate-kind table, one value per
-- row of that table's "Candidate kinds" column. Adding an eleventh kind is a
-- migration and a code change in `lib/recommendations/types.ts`, the same
-- deliberate friction 031 §1 chose for `personal_model_dimension` — this list
-- grows by decision, never silently.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.recommendation_kind AS ENUM (
    'work_open_pattern',
    'take_due_retest',
    'pattern_recurred',
    'verify_unverified_session',
    'coverage_hole',
    'subject_no_proven_concept',
    'concept_decaying',
    'exam_weak_coverage',
    'dormant_session_reaping',
    'personal_model_confirm',
    'correction_request_pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.recommendation_kind IS
  'K.1''s candidate-kind table, transcribed. Mirrors RECOMMENDATION_KINDS in '
  'lib/recommendations/types.ts; tests/recommendations.test.mjs asserts the '
  'two never drift.';

DO $$ BEGIN
  CREATE TYPE public.recommendation_state AS ENUM (
    'active', 'dismissed', 'ignored', 'superseded', 'acted_on', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.recommendation_state IS
  'C.3 Recommendation.state, verbatim. K.4 defines every transition.';

DO $$ BEGIN
  CREATE TYPE public.recommendation_outcome_kind AS ENUM (
    'acted_on', 'dismissed', 'ignored_expired', 'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.recommendation_outcome_kind IS
  'C.3 RecommendationOutcome.outcome, verbatim.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · `recommendations` — C.3, DERIVED STATE
--
-- V.7.4, made structural: `evidence_refs` is NOT NULL, and
-- `cardinality(evidence_refs) >= 1` is CHECKed rather than
-- `array_length(evidence_refs, 1) >= 1` — Postgres's `array_length()` returns
-- NULL (not 0) for a zero-length array, which would make an empty-but-
-- non-null `evidence_refs` slip past an `array_length >= 1` CHECK silently.
-- `cardinality()` returns 0 for an empty array, so the CHECK actually fires.
-- This is the exact bug class M8–M11's own "reject not degrade" convention
-- exists to close.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recommendations (
  recommendation_id UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  kind              public.recommendation_kind NOT NULL,
  subject           TEXT,
  concept_id        UUID        REFERENCES public.concepts(id) ON DELETE SET NULL,
  pattern_id        UUID        REFERENCES public.patterns(id) ON DELETE SET NULL,

  priority          NUMERIC     NOT NULL,
  reason_template   TEXT        NOT NULL CHECK (length(trim(reason_template)) > 0),

  -- B.11 / V.7.4 — THE STRUCTURAL REFUSAL. NOT NULL alone rejects a bare
  -- NULL; the CHECK additionally rejects an empty array, which NOT NULL
  -- alone would not catch.
  evidence_refs     JSONB[]     NOT NULL,

  -- K.3 — deliberately absent from this table: any column named `blocks`,
  -- `required`, `gates`, `locks`, or similar. A recommendation has no write
  -- access to any other subsystem's state and no field that could carry one.

  state             public.recommendation_state NOT NULL DEFAULT 'active',
  surfaced_count    INTEGER     NOT NULL DEFAULT 0 CHECK (surfaced_count >= 0),

  -- K.4/K.7 — dedupe within the active set, and cooling after close.
  dedupe_key        TEXT        NOT NULL CHECK (length(trim(dedupe_key)) > 0),

  expires_at        TIMESTAMPTZ NOT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT recommendations_evidence_refs_nonempty
    CHECK (cardinality(evidence_refs) >= 1)
);

-- C.3's identity: at most one ACTIVE recommendation per (student, dedupe_key)
-- — this is what "the dedupe_key is suppressed for a cooling window" (K.4)
-- rests on: a second candidate for the same underlying condition cannot
-- create a second active row while the first is still open.
CREATE UNIQUE INDEX IF NOT EXISTS recommendations_student_dedupe_active_idx
  ON public.recommendations (student_id, dedupe_key) WHERE state = 'active';

CREATE INDEX IF NOT EXISTS recommendations_student_state_idx
  ON public.recommendations (student_id, state, priority DESC);
CREATE INDEX IF NOT EXISTS recommendations_expires_idx
  ON public.recommendations (expires_at) WHERE state = 'active';

COMMENT ON TABLE public.recommendations IS
  'C.3 Recommendation. evidence_refs is NOT NULL with a cardinality >= 1 '
  'CHECK — B.11''s "a recommendation with no evidence reference is a bug" '
  'made structural (V.7.4). No blocks/required/gates column exists anywhere '
  'in this table (K.3).';

CREATE OR REPLACE FUNCTION public.recommendations_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendations_touch_trg ON public.recommendations;
CREATE TRIGGER recommendations_touch_trg
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.recommendations_touch();

-- K.4 — once a recommendation leaves `active`, it is CLOSED. Its terminal
-- state (dismissed / ignored / superseded / acted_on / expired) is never
-- reopened and never overwritten by a later transition — "the row is closed
-- ..., never silently deleted, because the sequence of what was suggested
-- and what actually happened is how K.8 learns." Re-deriving the same
-- underlying condition creates a NEW row with a new `recommendation_id`
-- once the dedupe_key's cooling window (K.7) has elapsed; it never mutates
-- a closed one.
CREATE OR REPLACE FUNCTION public.recommendations_state_is_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state <> 'active' AND NEW.state IS DISTINCT FROM OLD.state THEN
    RAISE EXCEPTION
      'recommendation %: state is closed (%) and cannot transition again (K.4)',
      OLD.recommendation_id, OLD.state;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendations_state_is_append_only_trg ON public.recommendations;
CREATE TRIGGER recommendations_state_is_append_only_trg
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.recommendations_state_is_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · `recommendation_outcomes` — C.3, RAW EVIDENCE, APPEND-ONLY (K.6)
--
-- "Every recommendation closes with a RecommendationOutcome... so 'do our
-- recommendations actually close gaps for this student?' is answerable from
-- data. That is the feedback loop that lets correction_method become an
-- evidenced dimension of the Personal Model." This table is that evidence,
-- and it is append-only for the same reason 024/030's evidence tables are:
-- a system that can edit its own outcome history cannot prove it learned
-- anything.
--
-- `resulting_session_id` / `resulting_resolution_id` carry no FK, the same
-- trade `personal_model_signals.source_event_id` (031 §2) makes for a
-- partitioned target — `study_sessions` and `mistake_resolutions` are not
-- partitioned, but pointing this table at either would make
-- recommendation_outcomes' own append-only guarantee load-bearing for
-- referential integrity on two OTHER subsystems' primary keys, which is a
-- coupling this table does not need: existence is the writer's
-- responsibility, not this table's.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  outcome_id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id      UUID        NOT NULL REFERENCES public.recommendations(recommendation_id) ON DELETE RESTRICT,

  outcome                public.recommendation_outcome_kind NOT NULL,
  at                     TIMESTAMPTZ NOT NULL,

  resulting_session_id     UUID,
  resulting_resolution_id  UUID,
  benefit_observed          NUMERIC,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_outcomes_recommendation_idx
  ON public.recommendation_outcomes (recommendation_id, at DESC);

COMMENT ON TABLE public.recommendation_outcomes IS
  'C.3 RecommendationOutcome. Append-only raw evidence — K.6''s feedback '
  'loop. Never recomputed away.';

-- Append-only, three layers, same posture as 024 §6 / 030 §5:
--   (a) no UPDATE/DELETE policy is ever granted to `authenticated` (§4);
--   (b) an explicit REVOKE closes the client-library path for every role;
--   (c) a trigger refuses UPDATE/DELETE outright, because RLS does not bind
--       `service_role` and every server write in this codebase runs as it.
CREATE OR REPLACE FUNCTION public.recommendation_outcomes_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'recommendation_outcomes is append-only (K.6) — % is not permitted', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS recommendation_outcomes_no_update_trg ON public.recommendation_outcomes;
CREATE TRIGGER recommendation_outcomes_no_update_trg
  BEFORE UPDATE ON public.recommendation_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.recommendation_outcomes_append_only();

DROP TRIGGER IF EXISTS recommendation_outcomes_no_delete_trg ON public.recommendation_outcomes;
CREATE TRIGGER recommendation_outcomes_no_delete_trg
  BEFORE DELETE ON public.recommendation_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.recommendation_outcomes_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · RLS — a student may SEE their own recommendations and outcomes.
-- Writing is §5's problem, and §5 gives writing to `service_role` alone.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.recommendations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendations_select_own ON public.recommendations;
CREATE POLICY recommendations_select_own ON public.recommendations
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS recommendation_outcomes_select_own ON public.recommendation_outcomes;
CREATE POLICY recommendation_outcomes_select_own ON public.recommendation_outcomes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.recommendation_id = recommendation_outcomes.recommendation_id
        AND r.student_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policy for `authenticated` on either table — every
-- write (candidate insertion, dismissal, outcome recording, decay/expiry) is
-- server-side, under the student's identity taken from their verified
-- session, never from a request body (D.1.a). This is also HOW K.3's "no
-- code path through which a recommendation could gate anything" is made a
-- database-level guarantee rather than a promise about application code: a
-- client cannot write this table at all, gate-shaped or otherwise.


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE GRANTS — K.3, "read-only to every subsystem except the
-- Recommendation Engine and the outcome-recording path"
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON public.recommendations FROM authenticated;
GRANT SELECT ON public.recommendations TO authenticated;

REVOKE ALL ON public.recommendation_outcomes FROM authenticated;
GRANT SELECT ON public.recommendation_outcomes TO authenticated;

-- `service_role` is the Recommendation Engine and the outcome-recording
-- path, both of which run server-side (`lib/recommendations/*.ts` behind
-- `app/api/recommendations/**`), the same posture every other L2 writer in
-- this codebase already uses.
REVOKE ALL ON public.recommendations FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.recommendations TO service_role;
-- No DELETE grant, to either role — K.4: "never silently deleted."

REVOKE ALL ON public.recommendation_outcomes FROM service_role;
GRANT SELECT, INSERT ON public.recommendation_outcomes TO service_role;
-- No UPDATE/DELETE grant — §3's trigger is belt-and-braces on top of this.


-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--
-- · No `blocks`, `required`, `locks`, or `gates` column, anywhere. K.3's
--   guarantee is an absence, and an absence cannot be a bug fixed later by a
--   forgotten `if` — there is nothing for a forgotten `if` to read.
-- · No default priority formula, no decay computation, in SQL. K.2/K.7 are
--   TypeScript-side, pure and deterministic
--   (`lib/recommendations/engine.ts`), read here only as the two columns
--   (`priority`, `expires_at`) their output is written into — the same
--   split 031 draws between `resolveEffectiveValue()` (TypeScript) and the
--   columns it resolves from (SQL).
-- · No AI write path. B.11: "AI may rewrite the phrasing... AI may not add,
--   remove or reorder candidates." Nothing in this file grants an AI-facing
--   role any access to this table at all.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '032',
  '032_recommendations.sql',
  '91d3f637aecc0850cc2b9cd1d085435d318de3279afeb1f0dc74fdb4605e882b',
  'self'
);
