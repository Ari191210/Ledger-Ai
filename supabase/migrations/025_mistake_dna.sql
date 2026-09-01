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
