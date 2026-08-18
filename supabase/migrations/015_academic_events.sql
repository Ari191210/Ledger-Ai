-- ═══════════════════════════════════════════════════════════════════════════
-- 015_academic_events.sql   ·   M7-1, M7-2
--
-- THE SPINE. Architecture C.2: *"`AcademicEvent` · raw evidence — the spine …
-- Everything else in the product is a projection of this table."* Part D is its
-- full contract and this file is Part D as SQL. Where they disagree, this file
-- is the defect.
--
-- EXECUTION_PLAN M7-1: *"Event table: append-only, partitioned,
-- `client_event_id` unique. Done when: ordering by server `seq`, never client
-- `occurred_at` (R.10)."*
-- EXECUTION_PLAN M7-2: *"Ingest endpoint: validation, dedup, quarantine table.
-- Done when: invalid events quarantine rather than corrupt (D.3)."*
--
-- ADDITIVE ONLY. It creates two tables, one sequence, one trigger and one
-- function. It alters nothing that exists. In particular it does NOT touch
-- `user_data.blob`, `lib/sync.ts`'s destination: the legacy whole-blob upsert
-- keeps working exactly as it does today and is retired in M7-6, AFTER this
-- substrate is proven. Retiring a live data path before its replacement is
-- verified is how a product loses a record.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- THE PARTITIONING DECISION, AND WHY IT IS BY STUDENT AND NOT BY MONTH
-- ═══════════════════════════════════════════════════════════════════════════
--
-- M7-1 says "partitioned". M7-7 says "monthly partitioning" and T6 names it as
-- the volume mitigation. Read together they suggest range partitioning on time.
-- **That scheme is incompatible with the dedup guarantee R.10 states, and dedup
-- is the guarantee the architecture calls integrity.**
--
-- The mechanism, precisely. PostgreSQL can only enforce a UNIQUE constraint on
-- a partitioned table if the constraint INCLUDES every partition key column —
-- because uniqueness is enforced per-partition index, and a value in partition
-- A is invisible to partition B's index. So:
--
--   PARTITION BY RANGE (received_at)  →  the strongest available constraint is
--                                        UNIQUE (student_id, client_event_id,
--                                        received_at), which is not a dedup
--                                        constraint at all. A retry that
--                                        crosses a month boundary — precisely
--                                        what an offline outbox does — inserts
--                                        a DUPLICATE, and T7 is back.
--
--   PARTITION BY HASH (student_id)    →  UNIQUE (student_id, client_event_id)
--                                        contains the partition key and is
--                                        globally enforced. R.10 holds.
--
-- Hash-on-student is also the right key on its own merits: every read path in
-- Parts D–L filters by `student_id` first, `(student_id, seq)` ordering stays
-- inside one partition, and no student's stream is ever split across
-- partitions.
--
-- WHAT THIS LEAVES FOR M7-7. Monthly partitioning is not merely deferred, it is
-- re-opened: subpartitioning these by month would re-break the unique
-- constraint at the second level for the same reason. And the retention scheme
-- D.5 actually specifies is COMPACTION — *"rolled into a per-(session, concept)
-- summary row … and the raw rows dropped"* — which is a DELETE of selected rows
-- and needs no time partition to perform. M7-7 should therefore decide
-- explicitly whether time partitioning buys anything compaction does not, with
-- the knowledge that it costs the dedup constraint. This file does not decide
-- that; it refuses to prejudge it by choosing a key that would.
--
-- HASH PARTITION COUNT is 8. Splitting a hash partition later is a rebuild, so
-- the number is effectively fixed; 8 is chosen to be comfortably more than the
-- parallelism a single Postgres instance uses for maintenance and small enough
-- that the empty case costs nothing. This is a capacity guess and is labelled
-- as one.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE ORDERING AUTHORITY
--
-- R.10: *"Ordering: by server `seq`, never by client `occurred_at`."*
-- D.4:  *"`occurred_at` … is client-supplied and therefore forgeable."*
--
-- A shared sequence, owned by nothing, incremented by the trigger in §3 and by
-- no other caller. MONOTONIC, NOT GAPLESS: a rolled-back transaction and a
-- retry absorbed by ON CONFLICT both consume a value. That is correct — the
-- guarantee the record needs is that `seq` orders events, not that it counts
-- them.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS public.academic_events_seq AS BIGINT;

GRANT USAGE ON SEQUENCE public.academic_events_seq TO authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · ACADEMIC_EVENTS — the D.1 envelope, column for column
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_events (
  -- ── identity ─────────────────────────────────────────────────────────────
  event_id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  client_event_id     TEXT        NOT NULL CHECK (length(client_event_id) BETWEEN 1 AND 128),
  seq                 BIGINT      NOT NULL,
  schema_version      SMALLINT    NOT NULL CHECK (schema_version >= 1),

  -- ── subject ──────────────────────────────────────────────────────────────
  -- D.1.a: from the verified token, NEVER the body. `app/api/events/route.ts`
  -- takes it from `auth.getUser()`; RLS below refuses any other value anyway.
  student_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Resolved by the session resolver (E.4) — M9. NULL until then, which is a
  -- legal state, not a missing one.
  session_id          UUID,

  -- ── time (D.1.b — a claim and a fact, both kept) ─────────────────────────
  occurred_at         TIMESTAMPTZ NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL,
  clock_skew_ms       BIGINT      NOT NULL,

  -- ── origin ───────────────────────────────────────────────────────────────
  tool_slug           TEXT,
  surface             TEXT        NOT NULL CHECK (surface IN ('web','push','cron','import')),
  source              TEXT        NOT NULL CHECK (source IN ('tool','assessment','student_declaration','system','migration')),
  device_id           TEXT,

  -- ── academic address ─────────────────────────────────────────────────────
  subject             TEXT,
  chapter             TEXT,
  -- ON DELETE RESTRICT matches every other concept reference in 007. A concept
  -- an event points at cannot be removed; B.4 supersedes with `merged_into`.
  concept_id          UUID        REFERENCES public.concepts(id) ON DELETE RESTRICT,
  -- V.2.4 / M6-3: an unresolved declaration is LEGAL. `concept_id` NULL with
  -- `declared_text` preserved is the system refusing to guess, not a defect.
  declared_text       TEXT,
  assessment_id       UUID,
  question_id         UUID,

  -- ── content ──────────────────────────────────────────────────────────────
  -- Not an ENUM type: D.2's list grows every milestone, and `ALTER TYPE … ADD
  -- VALUE` cannot run inside a transaction block, which would make every future
  -- migration non-atomic. A CHECK is alterable transactionally and reads the
  -- same. The authoritative list is `EVENT_TYPES` in `lib/event-contract.ts`;
  -- `tests/academic-events.test.mjs` asserts this CHECK equals it, so the two
  -- cannot drift.
  event_type          TEXT        NOT NULL CHECK (event_type IN (
                        'SESSION_STARTED','SESSION_FINISH_REQUESTED','SESSION_VERIFIED',
                        'SESSION_CLOSED_UNVERIFIED',
                        'CONCEPT_VIEWED','EXPLANATION_READ','QUESTION_STARTED',
                        'QUESTION_ATTEMPTED','QUESTION_CORRECT','QUESTION_WRONG',
                        'PRACTICE_COMPLETED','REVISION_COMPLETED',
                        'EXTERNAL_STUDY_DECLARED','CONCEPT_CONFIRMED','CONCEPT_ADDED',
                        'ASSESSMENT_STARTED','ASSESSMENT_SKIPPED','ASSESSMENT_COMPLETED',
                        'MISTAKE_DETECTED','MISTAKE_CORRECTED','MISTAKE_RETESTED',
                        'MISTAKE_RESOLVED','MISTAKE_RECURRED','MISTAKE_ACKNOWLEDGED',
                        'MISTAKE_PRACTISING',
                        'PREFERENCE_SET','RECOMMENDATION_SURFACED','RECOMMENDATION_ACTED_ON',
                        'RECOMMENDATION_DISMISSED','CORRECTION_REQUESTED','CORRECTION_RESOLVED',
                        'PARENT_POLICY_CHANGED','PARENT_REPORT_VIEWED',
                        'EVENT_SUPERSEDED')),

  payload             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  result              JSONB,
  evidence_id         UUID        REFERENCES public.evidence(id) ON DELETE RESTRICT,

  -- D.1.c — the SYSTEM's confidence in this event's academic claim. The
  -- STUDENT's pre-answer confidence is `payload.confidence_before`, 0..3,
  -- matching `occurrences.confidence_before` in 007. Two different quantities;
  -- one field name each.
  confidence          NUMERIC     CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- D.1.d — the deterministic gate, written into the record. No downstream
  -- projection may treat 'unconfirmed' as evidence.
  confirmation        TEXT        NOT NULL DEFAULT 'not_required'
                                  CHECK (confirmation IN ('not_required','rule_confirmed','student_confirmed','unconfirmed')),

  -- ── provenance ───────────────────────────────────────────────────────────
  -- D.1.e — `metadata.prompt_version` is required whenever AI touched the
  -- event. Enforced at ingest (Q.4), not here: "AI touched it" is not a fact
  -- this row can check about itself.
  metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- C.2: *"A correction is a NEW event of type `EVENT_SUPERSEDED` carrying
  -- `supersedes_event_id`"*. No FK: a self-referencing foreign key on a
  -- partitioned table would have to carry `student_id` too, and the target's
  -- existence is checked at ingest (D.3.5) where the student scope is already
  -- known.
  supersedes_event_id UUID,

  -- ── keys ─────────────────────────────────────────────────────────────────
  -- Every one of these begins with `student_id` because it is the partition
  -- key; see the header. That is also the natural leading column for all of
  -- them, so nothing is being contorted to fit.
  PRIMARY KEY (student_id, event_id),

  -- R.10 / D.3.6 — THE DEDUP CONSTRAINT. `INSERT … ON CONFLICT
  -- (student_id, client_event_id) DO NOTHING` is what makes a retry safe by
  -- construction, and this is the index that makes that work. T7's whole
  -- mitigation rests on this one line plus `lib/event-outbox.ts` never
  -- regenerating the id.
  CONSTRAINT academic_events_client_id_unique UNIQUE (student_id, client_event_id),

  -- D.4 — the ordering key. UNIQUE rather than a plain index so that two
  -- events in one student's stream can never share a position.
  CONSTRAINT academic_events_seq_unique UNIQUE (student_id, seq),

  -- D.2.a, at the SQL layer. *"Three independent refusals of the single most
  -- gameable transition in the product."* RLS refuses a student-written
  -- resolution, `applyTransition` refuses it in the domain layer, the ingest
  -- validator refuses it — and this refuses it even to a caller who reached the
  -- table by some path none of the three cover.
  --
  -- Mirrors `SOURCE_RESTRICTIONS` in `lib/event-contract.ts`; the test asserts
  -- the two agree.
  CONSTRAINT academic_events_system_only CHECK (
    event_type NOT IN ('MISTAKE_RESOLVED','MISTAKE_RECURRED','SESSION_STARTED',
                       'SESSION_VERIFIED','SESSION_CLOSED_UNVERIFIED','PARENT_REPORT_VIEWED')
    OR source = 'system'
  ),
  CONSTRAINT academic_events_graded_only CHECK (
    event_type NOT IN ('MISTAKE_RETESTED','ASSESSMENT_COMPLETED')
    OR source IN ('system','assessment')
  ),
  CONSTRAINT academic_events_supersede_shape CHECK (
    event_type <> 'EVENT_SUPERSEDED'
    OR (supersedes_event_id IS NOT NULL AND source IN ('system','migration'))
  ),

  -- D.3.4 — a tool-sourced event names its tool. Which tools may emit WHICH
  -- types is the capability manifest's question (P.2) and is answered at
  -- ingest, because the manifest lives in TypeScript.
  CONSTRAINT academic_events_tool_named CHECK (source <> 'tool' OR tool_slug IS NOT NULL)
) PARTITION BY HASH (student_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.academic_events_p%s
         PARTITION OF public.academic_events
         FOR VALUES WITH (MODULUS 8, REMAINDER %s)', i, i);
    -- Partitions are never addressed directly. Reaching one bypasses the
    -- parent's RLS, so no client role may name it at all.
    EXECUTE format('REVOKE ALL ON public.academic_events_p%s FROM anon, authenticated', i);
  END LOOP;
END $$;

-- The read patterns Parts D–L actually use.
CREATE INDEX IF NOT EXISTS academic_events_stream_idx
  ON public.academic_events (student_id, seq);

CREATE INDEX IF NOT EXISTS academic_events_type_idx
  ON public.academic_events (student_id, event_type, seq);

CREATE INDEX IF NOT EXISTS academic_events_concept_idx
  ON public.academic_events (student_id, concept_id, seq)
  WHERE concept_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS academic_events_session_idx
  ON public.academic_events (student_id, session_id, seq)
  WHERE session_id IS NOT NULL;

-- D.5's compaction (M7-7) asks one question — "which raw attention events fell
-- out of the 90-day window?" — and it asks it in SERVER time, never client
-- time, for the same reason everything else does.
CREATE INDEX IF NOT EXISTS academic_events_received_idx
  ON public.academic_events (received_at);

COMMENT ON TABLE public.academic_events IS
  'Architecture Part D. Raw evidence, append-only, ordered by (student_id, seq). occurred_at is a client CLAIM and is never an ordering key.';
COMMENT ON COLUMN public.academic_events.seq IS
  'Server-assigned by academic_events_server_assign(). Monotonic, not gapless. THE ONLY ordering authority (R.10).';
COMMENT ON COLUMN public.academic_events.occurred_at IS
  'The client''s claim of when it happened. Forgeable. Never used for ordering (D.4).';
COMMENT ON COLUMN public.academic_events.clock_skew_ms IS
  'received_at − occurred_at, retained (D.1.b) so the IST/UTC day-boundary class of bug is diagnosable rather than silent.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · SERVER ASSIGNMENT — the structural half of R.10
--
-- A DEFAULT can be overridden by any INSERT that names the column. A BEFORE
-- INSERT trigger cannot. So the four † fields that must not be forgeable are
-- OVERWRITTEN here, unconditionally, whatever the caller supplied — service
-- role included.
--
-- This is what makes "ordering by server `seq`, never client `occurred_at`"
-- structurally true rather than conventionally true. There is no INSERT
-- statement, anywhere, in any language, that can choose its own `seq`.
--
-- `occurred_at` is deliberately NOT overwritten: it is the client's claim and
-- keeping it honestly is the point (D.1.b). It is bounded instead — a claim
-- more than a year in the future is not a claim, it is a clock fault, and
-- letting it through would poison every "when did this happen" query forever.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.academic_events_server_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  NEW.event_id      := gen_random_uuid();
  NEW.seq           := nextval('public.academic_events_seq');
  NEW.received_at   := v_now;
  NEW.clock_skew_ms := (EXTRACT(EPOCH FROM (v_now - NEW.occurred_at)) * 1000)::BIGINT;

  IF NEW.occurred_at > v_now + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'occurred_at % is more than a day in the future — clock fault, not a claim', NEW.occurred_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academic_events_server_assign_trg ON public.academic_events;
CREATE TRIGGER academic_events_server_assign_trg
  BEFORE INSERT ON public.academic_events
  FOR EACH ROW EXECUTE FUNCTION public.academic_events_server_assign();

-- Immutability, enforced rather than assumed. C.2: *"Lifecycle: written once.
-- Never updated. … Immutability: absolute."* The RLS omission below already
-- stops `authenticated`; this stops the service role too, and therefore stops
-- an application bug as well as a malicious client. D.5.a's compaction is the
-- single named exception and it DELETEs raw rows, so DELETE is left to the
-- service role while UPDATE is refused outright.
CREATE OR REPLACE FUNCTION public.academic_events_refuse_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'academic_events is append-only (C.2). A correction is a new EVENT_SUPERSEDED event, never an UPDATE.';
END;
$$;

DROP TRIGGER IF EXISTS academic_events_refuse_update_trg ON public.academic_events;
CREATE TRIGGER academic_events_refuse_update_trg
  BEFORE UPDATE ON public.academic_events
  FOR EACH ROW EXECUTE FUNCTION public.academic_events_refuse_update();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ACADEMIC_EVENT_QUARANTINE — what the ingest refused to record (D.3)
--
-- *"an invalid event is rejected with a typed error and written to a quarantine
-- table with the raw body. It is never coerced into validity. This is the same
-- posture as `ingestion_review` in `008_ingestion.sql` — 'what the pipeline
-- refused to guess'."*
--
-- REACHING THIS TABLE IS A SUCCESS. The alternatives are worse in both
-- directions: coercing the event into validity writes a fact the student never
-- claimed, and dropping it loses a piece of their record that nobody can ever
-- find again. Quarantine keeps the raw body, names the rule that refused it,
-- and lets a human decide.
--
-- NOT partitioned. It is bounded by how wrong clients are, not by how much
-- students learn, and a table that should stay small does not need eight of
-- itself.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.academic_event_quarantine (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- From the token, exactly as the event's would have been. An event is
  -- quarantined only AFTER authentication (D.3 step 1), so this is always known.
  student_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Whatever the body claimed, if it claimed anything parseable. Nullable
  -- because the reason for quarantine may be that it claimed nothing.
  client_event_id TEXT,
  event_type      TEXT,
  schema_version  SMALLINT,

  -- The typed problems from `validateEventDraft()`: [{code, field, detail}].
  -- An array, never a single message — a human reading this a year from now
  -- needs every rule that refused the row, not the first one.
  problems        JSONB       NOT NULL CHECK (jsonb_typeof(problems) = 'array'),

  -- Verbatim. The entire point.
  raw_body        JSONB       NOT NULL,

  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The review seam, same shape as `ingestion_review.resolved_at` and
  -- `ingestion_runs.confirmed_at`: the column IS the record of when a human
  -- decided, and code that ignores it is visibly wrong.
  resolved_at     TIMESTAMPTZ,
  resolution      TEXT
);

CREATE INDEX IF NOT EXISTS academic_event_quarantine_open_idx
  ON public.academic_event_quarantine (student_id, received_at DESC)
  WHERE resolved_at IS NULL;

-- "Has this client_event_id already been refused?" — asked by the ingest so a
-- retry of a permanently invalid event is not re-quarantined on every attempt.
CREATE UNIQUE INDEX IF NOT EXISTS academic_event_quarantine_client_id_unique
  ON public.academic_event_quarantine (student_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

COMMENT ON TABLE public.academic_event_quarantine IS
  'D.3 failure policy. Invalid events land here with their raw body and typed problems; they are never coerced into academic_events and never silently dropped.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · ROW LEVEL SECURITY
--
-- SELECT-own and INSERT-own, and nothing else — the posture 007 established for
-- `evidence`, `patterns` and `occurrences` (`:329-355`), which are the other
-- raw-evidence tables in this schema.
--
-- NO UPDATE POLICY, NO DELETE POLICY, for anyone, ever. C.2: *"No UPDATE
-- policy, no DELETE policy. A correction is a NEW event."* Under PostgreSQL RLS
-- an omitted policy denies the command by construction, which is a stronger
-- statement than a policy that evaluates to false: there is nothing to
-- accidentally widen.
--
-- WHY THE STUDENT MAY INSERT AT ALL, GIVEN D.3's "a single server endpoint, and
-- nothing else, may write events". Two answers, and they are compatible:
--
--   · The single-endpoint rule is enforced where validation lives — in the
--     application. RLS is the floor, not the gate. 007 made the same call for
--     `occurrences`, which is a strictly more sensitive table.
--   · The three things a direct insert could otherwise forge are already
--     impossible: `seq`, `event_id`, `received_at` and `clock_skew_ms` are
--     overwritten by the §3 trigger; `student_id` is pinned to `auth.uid()` by
--     the WITH CHECK below; and the system-only event types are refused by the
--     §2 CHECK constraints. A client that bypasses the endpoint can write a
--     badly-shaped payload for itself. It cannot forge order, identity, time,
--     ownership, or a resolution.
--
-- The WITH CHECK narrows `source` as well. A student's browser is not the
-- assessment engine, not a migration and not the system, and saying so in the
-- policy means the D.2.a refusal survives even a compromised client.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.academic_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_event_quarantine  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_events_select_own ON public.academic_events;
CREATE POLICY academic_events_select_own ON public.academic_events
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS academic_events_insert_own ON public.academic_events;
CREATE POLICY academic_events_insert_own ON public.academic_events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND source IN ('tool', 'student_declaration')
  );

-- A student SEES what the system refused to record about them — the same
-- explainability guarantee `ingestion_review` gives, and it would be hollow if
-- the refusals were hidden. They cannot WRITE here: the quarantine row is the
-- system's account of a refusal, and an account a client could author is not an
-- account. The service role is the only writer.
DROP POLICY IF EXISTS academic_event_quarantine_select_own ON public.academic_event_quarantine;
CREATE POLICY academic_event_quarantine_select_own ON public.academic_event_quarantine
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Belt to the RLS braces: even with a future policy mistake, `authenticated`
-- has no table-level right to modify what it has already written.
REVOKE UPDATE, DELETE ON public.academic_events           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.academic_event_quarantine FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7 and 013 §5: a migration that asserts a posture
-- fails loudly if the posture is not what it just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
  parts      INT;
  strategy   CHAR;
BEGIN
  SELECT partstrat INTO strategy
  FROM pg_partitioned_table
  WHERE partrelid = 'public.academic_events'::regclass;

  IF strategy IS DISTINCT FROM 'h' THEN
    RAISE EXCEPTION 'academic_events is not HASH partitioned (got %) — see the header: any other key breaks UNIQUE(student_id, client_event_id)', strategy;
  END IF;

  SELECT count(*) INTO parts
  FROM pg_inherits WHERE inhparent = 'public.academic_events'::regclass;

  IF parts <> 8 THEN
    RAISE EXCEPTION 'expected 8 hash partitions of academic_events, found %', parts;
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'academic_events'
    AND cmd IN ('UPDATE', 'DELETE', 'ALL')
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'academic_events has an UPDATE/DELETE policy (%) — C.2 says immutability is absolute', bad_policy;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'academic_events_client_id_unique'
  ) THEN
    RAISE EXCEPTION 'the R.10 dedup constraint UNIQUE(student_id, client_event_id) is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.academic_events'::regclass
      AND tgname = 'academic_events_server_assign_trg'
  ) THEN
    RAISE EXCEPTION 'the server-assignment trigger is missing — seq would be client-supplyable';
  END IF;

  RAISE NOTICE '015: academic_events ready — 8 hash partitions, server-assigned seq, quarantine open';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not touch `user_data.blob`. `lib/sync.ts` and
--   `components/sync-manager.tsx` keep working unchanged. Their retirement is
--   M7-6 and it happens after this substrate is verified, never before.
-- · It does not backfill anything. That is M7-5, and T2 records why it is
--   lossy: legacy mistakes have no evidence and no concept id, and the seam
--   must be MARKED rather than papered over.
-- · It does not create monthly partitions or a compaction job. M7-7 — and see
--   the header for why the partitioning half of that task needs re-deciding.
-- · It does not create `study_sessions`, so `session_id` has no FK. E.4's
--   resolver is M9; adding the constraint then is one additive statement.
-- · It does not wire a single tool to emit. Every manifest in
--   `lib/tools-registry.ts` still declares `emits_events: []`, so the ingest
--   refuses every tool-sourced event today. That is M7's boundary working, not
--   M7 being incomplete: this milestone builds the pipe.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '015',
  '015_academic_events.sql',
  '628a24182e61021b5524179fd29b404316b27f62db62e8ef8f4157f0d6086703',
  'self'
);
