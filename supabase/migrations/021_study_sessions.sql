-- ═══════════════════════════════════════════════════════════════════════════
-- 021_study_sessions.sql — THE STUDY SESSION, MATERIALISED
--
-- EXECUTION_PLAN M9-2: *"The session resolver; partial unique index for one
-- live session. Done when: V.1.3 — two tabs produce exactly one session."*
-- Architecture C.3 `StudySession`; Part E in full; B.3.
--
-- ADDITIVE ONLY. It creates one table and touches nothing that exists — not
-- `academic_events` (whose `session_id` column 015 already ships, deliberately
-- unresolved until this milestone), not `user_data`, not `occurrences`.
--
-- NOT APPLIED TO ANY DATABASE, and not run. Same posture as 015–020.
--
--
-- THE ONE THING THIS FILE EXISTS FOR
--
-- E.7's CURRENT FACT is that two tabs overwrite each other by design today
-- (`lib/sync.ts:40-48` replaces the whole blob every 15 seconds). The fix E.3
-- names is not a better merge — it is a constraint:
--
--     *"One live session per student, globally. Enforced by the partial unique
--      index in C.3, NOT by client state."*
--
-- §4 below is that index. It is why `resolveSession()` in
-- `lib/session-resolver.ts` inserts without checking first: with the index in
-- place, the loser of a two-tab race is told by the DATABASE that it lost, at
-- the moment it lost, with no window to be stale in. An application-layer
-- "does one already exist?" has a window; this does not.
--
--
-- A NAMING DEFECT IN C.3, CORRECTED HERE IN THE OPEN
--
-- C.3 writes the terminal set as `('completed_unverified','verified',
-- 'abandoned')` — the PRE-CORRECTION name `COMPLETED_UNVERIFIED`, which E.2
-- explicitly renames and re-argues (*"`COMPLETED_UNVERIFIED` is drawn as a
-- predecessor of `VERIFIED`, implying verification is a later upgrade — it is
-- not"*). Part E is the canonical session specification and EXECUTION_PLAN
-- M9-1's done-when names `CLOSED_UNVERIFIED` in its own words. This file uses
-- E.2's names, upper-case as E.2 writes them, and the discrepancy is reported
-- rather than resolved by judgement in the moment (CLAUDE.md).
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · STUDY_SESSIONS — C.3's key fields, and no more
--
-- C.3 classes this row as *"a MATERIALISED PROJECTION of the event stream, and
-- the event stream wins on any disagreement (B.3)"*. Everything here is
-- therefore rebuildable, and `input_watermark_event_id` records how far the
-- projection has consumed **so that a stale row is detectable rather than
-- silently wrong** — C.3's own justification, transcribed.
--
-- WHAT IS DELIBERATELY ABSENT: any duration column. E.1 — *"a session is a
-- contiguous stretch of academic INTENT, not a stretch of time … not a timer,
-- not a pomodoro, not a streak input, and not a productivity measure."*
-- `duration_real` in the E.8 completion payload is COMPUTED at read time from
-- `opened_at` and `closed_at`; storing it would make it a field something could
-- start optimising. B.3's "Must NOT own": *"Timers as truth. Streaks."*
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.study_sessions (
  session_id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The session belongs to the STUDENT, not to a device or a tab. E.3: *"A
  -- student practising on a phone and reading on a laptop is in ONE session."*
  -- There is no `device_id` column for exactly that reason; `device_id` lives
  -- on the event (D.1) where it preserves the distinction for diagnostics
  -- without fragmenting the unit.
  student_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- E.2's seven states. Not an ENUM type, for 015 §2's reason: `ALTER TYPE …
  -- ADD VALUE` cannot run inside a transaction block, so an enum makes every
  -- future migration that touches it non-atomic. A CHECK is alterable
  -- transactionally and reads the same.
  state                     TEXT        NOT NULL CHECK (state IN (
                              'ACTIVE','DORMANT','REVIEWING','ASSESSING',
                              'CLOSED_UNVERIFIED','VERIFIED','ABANDONED'
                            )),

  -- C.3's enum, verbatim — three values. E.1's *"explicit 'start studying'
  -- action"* is `tool_activity` and records its precise trigger in the opening
  -- event's `payload.opened_by`; the enum is not widened past its spec.
  origin                    TEXT        NOT NULL CHECK (origin IN (
                              'tool_activity','declaration','resumed'
                            )),

  opened_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- THE ONLY LIVENESS INPUT (E.3). It advances when a QUALIFYING event lands,
  -- and at no other time — not on a page view, not on a poll of
  -- `GET /session/current`, and not on a heartbeat, because E.3 refuses all
  -- three by name: *"Liveness is a property of the event stream, not of a
  -- socket, a heartbeat or a timer."*
  last_activity_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  finish_requested_at       TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,

  -- Why it stopped. Every value is a FACT; none is a verdict. There is no
  -- 'gave_up', no 'failed' and no 'incomplete' (§4, NEVER SHAME), and V.1.7
  -- asks for 'reaped' by name.
  close_reason              TEXT        CHECK (close_reason IN (
                              'reaped','review_skipped','assessment_skipped',
                              'generation_failed','assessment_completed','discarded'
                            )),

  -- E.2.b's precondition, as a stored count rather than a subquery: ABANDONED
  -- is reachable *"only while the session contains NO E-class event"*, and a
  -- CHECK cannot run a subquery. Maintained by the session engine when an
  -- evidence-bearing event (D.2's `E` column) attaches.
  evidence_event_count      INTEGER     NOT NULL DEFAULT 0 CHECK (evidence_event_count >= 0),

  -- C.3: how far the projection has consumed.
  input_watermark_event_id  UUID,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Terminal and closed are the same fact stated twice, so the database
  -- refuses them disagreeing rather than leaving a reader to guess which is
  -- authoritative.
  CONSTRAINT study_sessions_terminal_shape CHECK (
    (state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED')
       AND closed_at IS NOT NULL AND close_reason IS NOT NULL)
    OR
    (state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING')
       AND closed_at IS NULL AND close_reason IS NULL)
  ),

  -- E.2.b, AT THE ROW LEVEL. *"Once a question has been answered, evidence
  -- exists and PRINCIPLES §3.2 forbids discarding it — the session may only be
  -- closed, never erased."* `applySessionTransition()` refuses this too; the
  -- CHECK is the refusal that survives a caller which skips that function
  -- entirely, including the service role. Two independent refusals, the posture
  -- 020 established for a born-confirmed occurrence.
  CONSTRAINT study_sessions_abandon_requires_no_evidence CHECK (
    state <> 'ABANDONED' OR evidence_event_count = 0
  ),

  CONSTRAINT study_sessions_activity_after_open CHECK (last_activity_at >= opened_at),
  CONSTRAINT study_sessions_closed_after_open   CHECK (closed_at IS NULL OR closed_at >= opened_at)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · THE LINK FROM THE EVENT STREAM
--
-- 015 ships `academic_events.session_id UUID` with no foreign key, with the
-- comment *"Resolved by the session resolver (E.4) — M9."* This is M9, and the
-- key is STILL NOT ADDED — deliberately.
--
-- Two reasons, and the second is the load-bearing one:
--
--   · 015's table is partitioned by month and its partitions are created in a
--     DO block. A foreign key from a partitioned table is legal in PG 12+ but
--     it takes a lock on every partition on every future partition creation,
--     which turns 015's monthly maintenance into a blocking operation on the
--     one table this product may never fail to write.
--   · An academic event is a FACT and a session row is a DERIVATION (C.3). A
--     foreign key would let the derivation's absence refuse the fact. If the
--     session projection is ever rebuilt — which B.3 says it must be
--     rebuildable — a FK makes the rebuild delete-and-reinsert half the record.
--     The stream wins on any disagreement; a constraint pointing the other way
--     would encode the opposite.
--
-- The join is by id and is checked by the projection, not by the schema.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- The resolver's read: "this student's live session".
CREATE INDEX IF NOT EXISTS study_sessions_student_state_idx
  ON public.study_sessions (student_id, state);

-- The reaper's read: "every live session, oldest activity first". Partial, so
-- it stays the size of the live set rather than the size of history — a
-- product that works has millions of terminal sessions and thousands of live
-- ones, and the sweep must never pay for the former.
CREATE INDEX IF NOT EXISTS study_sessions_liveness_idx
  ON public.study_sessions (last_activity_at)
  WHERE state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING');

CREATE INDEX IF NOT EXISTS study_sessions_student_recent_idx
  ON public.study_sessions (student_id, opened_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ONE LIVE SESSION PER STUDENT — THE WHOLE OF M9-2's DONE-WHEN
--
-- C.3: *"Partial unique index enforcing at most one live session per student:
-- `UNIQUE(student_id) WHERE state NOT IN (terminal states)`."*
--
-- V.1.3: *"Opens a second tab and answers another. Still exactly one session;
-- both events attached; THE PARTIAL UNIQUE INDEX PREVENTS A SECOND."*
--
-- Written as the positive list rather than `NOT IN (…)` on purpose: a partial
-- index predicate must be immutable and PostgreSQL matches it TEXTUALLY when
-- deciding whether a query can use it, so the positive form is the one the
-- resolver's own `WHERE state IN (…)` read will match. The two lists are
-- complements and `LIVE_STATES` in `lib/study-session.ts` is DERIVED from
-- `TERMINAL_STATES` rather than written out twice; a test compares this
-- predicate against that derivation.
--
-- This is the structural guarantee, and it is worth being precise about what
-- it buys. It does not make the resolver's race disappear — it makes the race
-- RESOLVABLE: the second INSERT fails with SQLSTATE 23505 at the instant it
-- would have created a duplicate, and `resolveSession()` treats that as the
-- ordinary path (re-read, attach to the winner) rather than as an error. A
-- check-then-insert in application code has a window between the two
-- statements; there is no window here, because there is no check.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_one_live_per_student
  ON public.study_sessions (student_id)
  WHERE state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING');


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE TRANSITION GUARD — E.2's edges, in SQL
--
-- `applySessionTransition()` in `lib/study-session.ts` is the machine. This is
-- the same machine, refusing at the row level, for the reason 020 gives about
-- a born-confirmed occurrence: a guarantee enforced only in the application is
-- a guarantee that lasts until somebody writes a second application. The
-- service role is included — this trigger has no `session_user` exemption.
--
-- The trigger sees (OLD.state, NEW.state) and not the ACTION, so it holds the
-- PAIRS the action table produces. `tests/study-session.test.mjs` derives the
-- pair set from `TRANSITIONS` and fails unless it matches the list below
-- exactly — the M7 precedent for a list that exists twice because no compiler
-- sees the SQL.
--
-- TERMINAL IS TERMINAL. Any UPDATE that changes `state` away from
-- CLOSED_UNVERIFIED, VERIFIED or ABANDONED is refused. E.2 draws no edge out of
-- them, and §3.2 — *"facts are immutable and never deleted; a correction
-- appends a superseding fact rather than editing history"* — is why a closed
-- session is never reopened: the student starts a NEW one, and the record shows
-- both, honestly.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.study_sessions_transition_guard()
RETURNS TRIGGER AS $$
DECLARE
  -- E.2's edges as 'FROM>TO'. Kept as a literal array so a reader — and a test
  -- — can see the whole machine in one place.
  allowed TEXT[] := ARRAY[
    'ACTIVE>ACTIVE',
    'ACTIVE>DORMANT',
    'ACTIVE>REVIEWING',
    'ACTIVE>ABANDONED',
    'DORMANT>ACTIVE',
    'DORMANT>REVIEWING',
    'DORMANT>CLOSED_UNVERIFIED',
    'DORMANT>ABANDONED',
    'REVIEWING>REVIEWING',
    'REVIEWING>ASSESSING',
    'REVIEWING>CLOSED_UNVERIFIED',
    'ASSESSING>VERIFIED',
    'ASSESSING>CLOSED_UNVERIFIED'
  ];
BEGIN
  NEW.updated_at := NOW();

  IF NEW.state = OLD.state THEN
    -- A same-state update (advancing `last_activity_at`, moving the watermark)
    -- is not a transition and is not checked against the edge list. A terminal
    -- row still cannot take one: it is refused below.
    IF OLD.state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED')
       AND (NEW.closed_at IS DISTINCT FROM OLD.closed_at
            OR NEW.close_reason IS DISTINCT FROM OLD.close_reason
            OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at) THEN
      RAISE EXCEPTION
        'study_sessions: % is terminal (E.2); its closure cannot be rewritten', OLD.state;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state IN ('CLOSED_UNVERIFIED','VERIFIED','ABANDONED') THEN
    RAISE EXCEPTION
      'study_sessions: % is terminal (E.2); a closed session is never reopened — start a new one',
      OLD.state;
  END IF;

  IF NOT ((OLD.state || '>' || NEW.state) = ANY (allowed)) THEN
    RAISE EXCEPTION
      'study_sessions: % -> % is not an edge of the E.2 state machine', OLD.state, NEW.state;
  END IF;

  -- `student_id` is the session's identity, not a mutable attribute. Without
  -- this, one UPDATE could move a session — and every event attached to it —
  -- to a different student's record.
  IF NEW.student_id <> OLD.student_id THEN
    RAISE EXCEPTION 'study_sessions: student_id is immutable';
  END IF;

  IF NEW.opened_at <> OLD.opened_at THEN
    RAISE EXCEPTION 'study_sessions: opened_at is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_sessions_transition_guard_trg ON public.study_sessions;
CREATE TRIGGER study_sessions_transition_guard_trg
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.study_sessions_transition_guard();

-- A session is BORN live. E.2's entry to every terminal state is a transition,
-- so a row inserted directly as CLOSED_UNVERIFIED would be a close that never
-- happened — the same shape 020 refuses for a born-confirmed occurrence.
CREATE OR REPLACE FUNCTION public.study_sessions_birth_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state NOT IN ('ACTIVE','DORMANT') THEN
    RAISE EXCEPTION
      'study_sessions: a session is born ACTIVE (E.1); % is only reachable by transition', NEW.state;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_sessions_birth_guard_trg ON public.study_sessions;
CREATE TRIGGER study_sessions_birth_guard_trg
  BEFORE INSERT ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.study_sessions_birth_guard();


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · ROW LEVEL SECURITY
--
-- SELECT-own, and NOTHING ELSE — a stricter posture than 015 gave
-- `academic_events`, and deliberately so. E.7.3: *"CLIENTS HOLD NO
-- AUTHORITATIVE SESSION STATE. They render server state and subscribe to
-- changes. A stale tab renders stale, never writes stale."* A client that could
-- INSERT a session could open a second one from a second tab and defeat §4's
-- index by writing the winner itself; a client that could UPDATE one could
-- write `VERIFIED` without an assessment, which is the entire product's central
-- claim forged in one statement.
--
-- Under PostgreSQL RLS an omitted policy denies the command by construction,
-- which is a stronger statement than a policy evaluating to false: there is
-- nothing to accidentally widen. The service role bypasses RLS and is the only
-- writer. In this pass the only such writer is
-- `app/api/cron/session-reaping/route.ts`, which builds its `SessionStore`
-- adapter inline — the shape `app/api/cron/event-compaction/route.ts` (M7-7)
-- established. A shared `lib/sessions.ts` arrives with M9's second pass, when
-- the declaration and confirmation endpoints give it a second caller; one
-- caller does not justify a module.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_sessions_select_own ON public.study_sessions;
CREATE POLICY study_sessions_select_own ON public.study_sessions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Belt to the RLS braces, the posture 015 §5 established.
REVOKE INSERT, UPDATE, DELETE ON public.study_sessions FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7, 013 §5 and 015 §6: a migration that asserts a
-- posture fails loudly if the posture is not what it just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'study_sessions_one_live_per_student'
  ) THEN
    RAISE EXCEPTION '021 did not create the one-live-session partial unique index (C.3 / V.1.3)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_transition_guard_trg'
  ) THEN
    RAISE EXCEPTION '021 did not install the E.2 transition guard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'study_sessions_birth_guard_trg'
  ) THEN
    RAISE EXCEPTION '021 did not install the birth guard (E.1 — a session is born live)';
  END IF;

  -- The index is useless if its predicate is not the live set. Read the
  -- predicate back out of the catalogue rather than trusting the DDL above:
  -- an index whose WHERE clause drifted would still EXIST, and V.1.3 would
  -- still fail. All four live states, and none of the three terminal ones.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'study_sessions_one_live_per_student'
      AND indexdef LIKE '%ACTIVE%' AND indexdef LIKE '%DORMANT%'
      AND indexdef LIKE '%REVIEWING%' AND indexdef LIKE '%ASSESSING%'
      AND indexdef NOT LIKE '%CLOSED_UNVERIFIED%'
      AND indexdef NOT LIKE '%VERIFIED%'
      AND indexdef NOT LIKE '%ABANDONED%'
  ) THEN
    RAISE EXCEPTION
      'study_sessions_one_live_per_student exists but its predicate is not the E.2 live set';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename = 'study_sessions' AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'study_sessions has a non-SELECT policy (%): E.7.3 — clients hold no authoritative session state',
      bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO `session_concepts` TABLE. C.3 specifies `SessionConcept` and it is
--   real, but it belongs to M9-4/M9-5 (declaration, proposal, confirmation),
--   which are this milestone's second pass. Shipping the table now without the
--   `confirmation_state = 'confirmed' IMPLIES assessment_required = true`
--   invariant C.3 calls *"a database CHECK, not a code convention"* would ship
--   the shape without the guarantee, which is worse than shipping neither.
--
-- · NO `assessments` TABLE and no `UNIQUE(session_id)` on it. E.7.2's
--   single-flight rule is M10's, and it belongs with the table it constrains.
--
-- · NO SCORE COLUMN, no `contributes_to_score`, no `verified_concept_count`.
--   M9-1's done-when is *"the score does not fall"*, and the way this schema
--   guarantees it is by holding NOTHING a scoring pass could read as a
--   penalty. See SESSION_SCORE_CONTRACT in `lib/study-session.ts`, addressed
--   to M14.
--
-- · NO `duration_ms`. §1's reasoning: a stored duration is a number something
--   starts optimising, and E.1 bans the session from being a productivity
--   measure. The E.8 payload computes `duration_real` at read time.
--
-- · NO NOTIFICATION HOOK. V.1.7: *"No notification shames."* There is no
--   trigger here that enqueues anything, and `lib/session-reaping.ts` imports
--   neither `lib/notifications.ts` nor `lib/push.ts` — asserted by a test.
--
-- · IT DOES NOT BACKFILL. There is nothing to backfill: no session has ever
--   existed in this product, and the legacy blob holds no session concept
--   (017's `BACKFILLED_KEYS` maps every legacy row to
--   `EXTERNAL_STUDY_DECLARED`, session-less by construction).
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '021',
  '021_study_sessions.sql',
  '79300c1502e36694fbdda660b80b2b3607088e0f68ce24a8df74c7ae6385b7ed',
  'self'
);
