-- ═══════════════════════════════════════════════════════════════════════════
-- 031_personal_model.sql   ·   M19
--
-- EXECUTION_PLAN M19:
--   M19-1  Typed, bounded dimensions; signal extraction; aggregation.
--          Done when: I.2 — "the list is bounded, not open."
--   M19-2  The two-column explicit-over-inferred override, enforced by
--          COLUMN-LEVEL GRANT. Done when: V.5.2–V.5.4 — the aggregator is
--          refused by the DATABASE, not by policy.
--   M19-3  Confidence, decay, floor, disclosure of fallback.
--          Done when: V.5.6, V.5.7 — the fallback is stated, never silent.
--   M19-4  `explicit_value` restored exactly by L1 replay. Done when: V.5.5.
--
-- Architecture Part I in full; C.3 `PersonalModel` / `PersonalModelSignal`;
-- H.1 (L1/L2 layering); I.6's four independent mechanisms.
--
-- NOT APPLIED to any database. Same posture as every migration since 015.
--
--
-- WHAT THIS FILE ADDS, AND WHY IT IS ONE FILE
--
--   1 · personal_model_dimension    I.2's bounded set, AS A TYPE — an enum,
--                                    not a TEXT + CHECK, because a client that
--                                    somehow reaches this column with a raw
--                                    INSERT should get a type error from
--                                    Postgres itself, not a constraint
--                                    violation a future migration could widen
--                                    by accident.
--   2 · personal_model_signals      C.3 `PersonalModelSignal` — L1, append-
--                                    only raw evidence. What the extractors in
--                                    `lib/personal-model.ts` write.
--   3 · personal_model              C.3 `PersonalModel` — L2, one row per
--                                    (student, dimension). `explicit_value`
--                                    and `inferred_value` are two columns,
--                                    never one (I.6 mechanism 1);
--                                    `effective_value` is GENERATED (I.6
--                                    mechanism 2).
--   4 · THE AGGREGATOR ROLE          A Postgres role strictly narrower than
--                                    `service_role`, used for nothing except
--                                    running the inference aggregator
--                                    (`lib/personal-model-aggregator.ts`).
--                                    §5 gives it write access to
--                                    `inferred_value`, `confidence`,
--                                    `evidence_count`, `last_signal_at` and
--                                    NOTHING else — not `explicit_value`, not
--                                    `overridden_at`. This is M19-2's
--                                    "refused by the database, not by
--                                    policy": RLS does not bind a role
--                                    (`service_role` already proves this —
--                                    016 §"REVOKE service_role" is the
--                                    precedent for restricting a privileged
--                                    role's OWN columns), so the guarantee has
--                                    to be a GRANT, and this is that GRANT.
--
--
-- WHY A NEW ROLE, AND NOT JUST A NARROWER GRANT TO `service_role`
--
-- Every other privileged write in this codebase runs as `service_role`,
-- including the ONE path that is allowed to touch `explicit_value` — the
-- server-side projector that turns a `PREFERENCE_SET` event into a written
-- column (I.6 mechanism 3, "setting is an event"). If the aggregator also
-- ran as `service_role`, restricting `service_role`'s own grant on
-- `explicit_value` would restrict BOTH writers at once — there would be no
-- way to grant the projector what it needs without also granting it to the
-- aggregator. Two writers with different trust levels need two roles. The
-- aggregator is the one that is NEW and NARROW, so it is the one that gets
-- the new role; the projector keeps using `service_role`, unchanged, exactly
-- the way every other L2 rebuild in this codebase already does.
--
-- `personal_model_aggregator` is a Postgres LOGIN role. In production it is
-- reached the same way Supabase's own `anon` / `authenticated` /
-- `service_role` are reached: a JWT whose `role` claim names it, signed with
-- the project's JWT secret, held ONLY by the aggregator job's own runtime
-- credential — never the credential `app/api/**` routes use. That credential
-- is out of scope for a migration file; what this file guarantees is what
-- happens if that JWT is ever used to attempt the one write it must never
-- be able to make.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE BOUNDED DIMENSION TYPE (M19-1, I.2)
--
-- Nine names, transcribed from I.2's table in its own order. Adding a tenth
-- is `ALTER TYPE … ADD VALUE` plus a code change in
-- `lib/personal-model.ts:PERSONAL_MODEL_DIMENSIONS` — both are migrations,
-- deliberately, so the model cannot grow opaquely at runtime (I.2: "Adding a
-- dimension is a code change and a migration").
--
-- `ALTER TYPE … ADD VALUE` cannot run inside a transaction block, which is
-- why `academic_events.event_type` (015) uses a CHECK instead — that table's
-- list already grows every milestone. This one does not: I.2 calls it
-- "bounded", and a real ENUM is the stronger statement of exactly that claim,
-- at the cost of a same posture 018's `academic_events_p*` partitions accept
-- elsewhere — a future addition is a slightly heavier migration, in exchange
-- for a type system that refuses an unbounded one today.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.personal_model_dimension AS ENUM (
    'explanation_style',
    'communication_tone',
    'question_format_mix',
    'difficulty_preference',
    'session_length',
    'working_window',
    'correction_method',
    'notification_appetite',
    'recommendation_aggressiveness'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.personal_model_dimension IS
  'I.2 — the bounded, typed dimension list. Mirrors PERSONAL_MODEL_DIMENSIONS '
  'in lib/personal-model.ts; tests/personal-model.test.mjs asserts the two '
  'never drift.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · `personal_model_signals` — C.3, L1, RAW EVIDENCE, APPEND-ONLY
--
-- I.4: "A signal must be derivable from an event that already exists for an
-- academic reason." `source_event_id` names that event but carries no FK —
-- `academic_events` is HASH-PARTITIONED on `student_id` (015 §"THE
-- PARTITIONING DECISION"), and a foreign key into a partitioned table must
-- name the full partition key; `input_watermark_event_id` on every other L2
-- table in this codebase (021, 026, 027) already accepts the same trade for
-- the same reason. Existence and student-ownership of `source_event_id` are
-- checked by the extractor's own query, not by this table.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.personal_model_signals (
  signal_id        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension         public.personal_model_dimension NOT NULL,
  observed_value    JSONB       NOT NULL,
  weight            NUMERIC     NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source_event_id   UUID        NOT NULL,
  observed_at       TIMESTAMPTZ NOT NULL,
  extractor_version SMALLINT    NOT NULL CHECK (extractor_version >= 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_model_signals_student_dim_idx
  ON public.personal_model_signals (student_id, dimension, observed_at);

-- One extractor run must not double-count the same event for the same
-- dimension — the extractor is deterministic (I.3), so re-running it over a
-- window it already covered should be a no-op, not a re-vote.
CREATE UNIQUE INDEX IF NOT EXISTS personal_model_signals_dedupe_idx
  ON public.personal_model_signals (student_id, dimension, source_event_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · `personal_model` — C.3, L2, DERIVED STATE, A PROJECTION
--
-- I.6, verbatim: "Two columns, not one... The aggregator has write access to
-- `inferred_value` only... An inference is physically incapable of
-- overwriting a choice." §5 is where that sentence becomes a GRANT.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.personal_model (
  student_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension           public.personal_model_dimension NOT NULL,

  -- I.6 mechanism 3/4 — written ONLY by the PREFERENCE_SET projector
  -- (service_role), and ONLY in response to a `PREFERENCE_SET` event. `NULL`
  -- is "no explicit choice", which is different from "cleared" — a clear is
  -- itself a `PREFERENCE_SET{value:null}` event that leaves this column
  -- `NULL` again, not a distinct sentinel, because I.6 mechanism 4 requires
  -- clearing to be exactly as event-sourced as setting.
  explicit_value      JSONB,
  overridden_at        TIMESTAMPTZ,

  -- Written ONLY by the aggregator role (§5).
  inferred_value       JSONB,
  confidence           NUMERIC     CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence_count        INTEGER     NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  last_signal_at        TIMESTAMPTZ,

  -- I.6 mechanism 2 — THE ONLY PLACE `effective_value` IS COMPUTED, ANYWHERE.
  -- `COALESCE(explicit_value, inferred_value)` — no product default here: I.5's
  -- default fallback is a PRODUCT-LAYER constant (`lib/personal-model.ts`'s
  -- `resolveEffectiveValue`), not a database literal, because the default
  -- differs by dimension and a generated column cannot branch on which row
  -- it is. A reader that needs the disclosed-default behaviour calls
  -- `resolveEffectiveValue`; a reader that only needs "explicit-if-set-else-
  -- inferred" reads this column directly and never computes it by hand.
  effective_value      JSONB GENERATED ALWAYS AS (COALESCE(explicit_value, inferred_value)) STORED,

  -- C.3's watermark — same purpose as 026 §4's `input_watermark_event_id`:
  -- makes a stale aggregation detectable rather than silently wrong.
  input_watermark_event_id UUID,
  input_watermark_seq      BIGINT NOT NULL DEFAULT 0 CHECK (input_watermark_seq >= 0),

  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (student_id, dimension)
);

CREATE INDEX IF NOT EXISTS personal_model_student_idx
  ON public.personal_model (student_id);

-- `updated_at` maintenance — same shape as every other L2 table in this repo.
CREATE OR REPLACE FUNCTION public.personal_model_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personal_model_touch_trg ON public.personal_model;
CREATE TRIGGER personal_model_touch_trg
  BEFORE UPDATE ON public.personal_model
  FOR EACH ROW EXECUTE FUNCTION public.personal_model_touch();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · RLS — a student may SEE their own model. Writing is §5's problem.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.personal_model_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_model         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_model_signals_select_own ON public.personal_model_signals;
CREATE POLICY personal_model_signals_select_own ON public.personal_model_signals
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS personal_model_select_own ON public.personal_model;
CREATE POLICY personal_model_select_own ON public.personal_model
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- I.6.a: "Overriding is one action." The student's own write of
-- `explicit_value` is a real UPDATE/INSERT from an `authenticated` session,
-- so RLS admits it — narrowed to the right ROW here, narrowed to the right
-- COLUMN by §5's GRANT.
DROP POLICY IF EXISTS personal_model_upsert_own ON public.personal_model;
CREATE POLICY personal_model_upsert_own ON public.personal_model
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS personal_model_update_own ON public.personal_model;
CREATE POLICY personal_model_update_own ON public.personal_model
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- No policy anywhere admits a client DELETE. `personal_model_signals` is
-- append-only raw evidence (C.3) and `personal_model` is a projection whose
-- only legal removal is a full L2 truncate-and-rebuild (H.2), which runs as
-- the table owner, not a granted role.


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE COLUMN-LEVEL GRANTS — M19-2, V.5.2–V.5.4, ENFORCED HERE
--
-- REVOKE ALL first, on every table, from every role that will touch it —
-- 020's "the REVOKE makes that explicit before the narrow GRANT re-opens one
-- column, so the intent survives a future policy being added by someone who
-- has not read this file" — then re-open exactly the columns each writer is
-- allowed to move.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── `authenticated` — the student ───────────────────────────────────────────
-- RLS already admits INSERT/UPDATE on the student's own row (§4); the GRANT
-- narrows which COLUMNS that row-level permission can move. A student may set
-- their own explicit choice and its timestamp — nothing about the inferred
-- side, which is not theirs to write, only to read and to override.
REVOKE ALL ON public.personal_model FROM authenticated;
GRANT SELECT ON public.personal_model TO authenticated;
GRANT INSERT (student_id, dimension, explicit_value, overridden_at) ON public.personal_model TO authenticated;
GRANT UPDATE (explicit_value, overridden_at) ON public.personal_model TO authenticated;

REVOKE ALL ON public.personal_model_signals FROM authenticated;
GRANT SELECT ON public.personal_model_signals TO authenticated;

-- ── `service_role` — the PREFERENCE_SET projector, and everything else that
-- already trusts it (assessment blueprint reads, exports, etc.) ────────────
-- `service_role` is trusted with the explicit side because it is the role the
-- event-sourced write path (I.6 mechanism 3) actually runs as — the same
-- posture 016 gives `service_role` on `audit_entries` INSERT and 025 gives it
-- on pattern resolution. It also needs the columns below it shares no
-- narrower role for.
REVOKE ALL ON public.personal_model FROM service_role;
GRANT SELECT ON public.personal_model TO service_role;
GRANT INSERT (student_id, dimension, explicit_value, overridden_at,
              input_watermark_event_id, input_watermark_seq) ON public.personal_model TO service_role;
GRANT UPDATE (explicit_value, overridden_at,
              input_watermark_event_id, input_watermark_seq) ON public.personal_model TO service_role;

REVOKE ALL ON public.personal_model_signals FROM service_role;
GRANT SELECT, INSERT ON public.personal_model_signals TO service_role;

-- ── `personal_model_aggregator` — THE INFERENCE ENGINE, AND NOTHING ELSE ───
-- THIS is M19-2's guarantee. Note what is absent from both GRANT lists below:
-- `explicit_value` and `overridden_at` appear in NEITHER. An `UPDATE
-- personal_model SET explicit_value = …` issued by this role fails with
-- Postgres error 42501 (insufficient_privilege) before any row is touched —
-- refused by the database, not by an application check that a future
-- endpoint could forget to call.
DO $$ BEGIN
  CREATE ROLE personal_model_aggregator NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A LOGIN JWT reaches Postgres via a role that CAN log in; Supabase's
-- `authenticator` role is that role for every JWT-carried claim, the same way
-- it already is for `anon` / `authenticated` / `service_role`. Membership is
-- what lets `authenticator` `SET ROLE personal_model_aggregator` for a JWT
-- whose `role` claim names it — the runtime side (signing that JWT, handing
-- it only to the aggregator job) is outside this file's reach, same as it is
-- for `service_role`'s key.
DO $$ BEGIN
  GRANT personal_model_aggregator TO authenticator;
EXCEPTION WHEN undefined_object THEN NULL; -- local/CI databases without Supabase's `authenticator` role
END $$;

GRANT USAGE ON SCHEMA public TO personal_model_aggregator;

REVOKE ALL ON public.personal_model FROM personal_model_aggregator;
GRANT SELECT ON public.personal_model TO personal_model_aggregator;
GRANT INSERT (student_id, dimension, inferred_value, confidence, evidence_count,
              last_signal_at, input_watermark_event_id, input_watermark_seq)
  ON public.personal_model TO personal_model_aggregator;
GRANT UPDATE (inferred_value, confidence, evidence_count,
              last_signal_at, input_watermark_event_id, input_watermark_seq)
  ON public.personal_model TO personal_model_aggregator;

REVOKE ALL ON public.personal_model_signals FROM personal_model_aggregator;
GRANT SELECT, INSERT ON public.personal_model_signals TO personal_model_aggregator;

-- The aggregator also needs to READ the event stream it extracts signals
-- from — SELECT only, on the table RLS would otherwise hide entirely from a
-- role with no `auth.uid()`. `personal_model_aggregator` is not
-- `service_role` and RLS is NOT disabled for it, so an explicit bypass policy
-- is required, scoped to SELECT alone.
DROP POLICY IF EXISTS academic_events_aggregator_select ON public.academic_events;
CREATE POLICY academic_events_aggregator_select ON public.academic_events
  FOR SELECT TO personal_model_aggregator USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · A BELT-AND-BRACES TRIGGER — the same column can never move under this
-- role even if a future `GRANT` mistakenly widens it.
--
-- §5 is sufficient by itself (an UPDATE naming a column the caller has no
-- privilege on is refused before the trigger ever runs). This trigger is the
-- second, INDEPENDENT mechanism 020 §5 and 025 §7 both keep alongside their
-- own grants: "RLS does not bind the service role... this stops the next
-- endpoint somebody writes" — here, the next GRANT somebody writes.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.personal_model_explicit_is_sacred()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'personal_model_aggregator' THEN
    IF TG_OP = 'UPDATE' AND (
      NEW.explicit_value IS DISTINCT FROM OLD.explicit_value
      OR NEW.overridden_at IS DISTINCT FROM OLD.overridden_at
    ) THEN
      RAISE EXCEPTION 'personal_model_aggregator may not write explicit_value or overridden_at (I.6 / M19-2)';
    END IF;
    IF TG_OP = 'INSERT' AND (NEW.explicit_value IS NOT NULL OR NEW.overridden_at IS NOT NULL) THEN
      RAISE EXCEPTION 'personal_model_aggregator may not write explicit_value or overridden_at (I.6 / M19-2)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personal_model_explicit_is_sacred_trg ON public.personal_model;
CREATE TRIGGER personal_model_explicit_is_sacred_trg
  BEFORE INSERT OR UPDATE ON public.personal_model
  FOR EACH ROW EXECUTE FUNCTION public.personal_model_explicit_is_sacred();


-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--
-- · No default VALUE is stored anywhere in SQL. I.5's "the system falls back
--   to the product default and says so" is `resolveEffectiveValue()` in
--   `lib/personal-model.ts` — a product-layer decision, not a schema one,
--   because the disclosed MESSAGE is what V.5.7 actually requires and a
--   generated column cannot hold a sentence that varies by dimension.
-- · No DECAY is computed or stored here. I.5: "Decay is applied at read
--   time... no row is ever rewritten to age it." `confidence` is exactly what
--   the aggregator observed; `decayedConfidence()` derives the read-time
--   figure from it and `last_signal_at`, in TypeScript, on every read.
-- · No new event table. `PREFERENCE_SET` already exists as an
--   `academic_events.event_type` value (015 §2) with a required payload of
--   `{dimension, value}` (`lib/event-contract.ts:REQUIRED_PAYLOAD_KEYS`).
--   M19-4's replay reads THAT stream; this file adds no second one.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '031',
  '031_personal_model.sql',
  '139fdf380621cde2abfe3dae5e667fe87e46f1e81c45b605817671e4ca43587b',
  'self'
);
