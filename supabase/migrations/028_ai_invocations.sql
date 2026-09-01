-- ═══════════════════════════════════════════════════════════════════════════
-- 028_ai_invocations.sql   ·   M15-6
--
-- WHAT THIS IS FOR
--
-- EXECUTION_PLAN M15-6: *"`ai_history` → `ai_invocations` with prompt version
-- and hashes."*
-- Architecture Q.4: *"Every call logs to `ai_invocations`: capability, prompt
-- version, model, input hash, output hash, latency, tokens, moderation
-- verdict, outcome."*
-- Architecture S.5: *"ADAPT → `ai_invocations` … retain existing rows as
-- declared-class history only (H.6)."*
--
--
-- WHAT `ai_history` (000_initial_schema.sql) CANNOT ANSWER
--
-- It stores `tool`, a 300-character `input_text`, the parsed `output`, and the
-- student's `grade`/`board`. It records that a call happened. It has no
-- prompt version, no model identity, and no hash of what went in, so the one
-- question a provenance log exists to answer — *"prompt v2 of
-- `mark_scheme_eval` was wrong; which outputs came from it?"* — cannot be
-- answered from it at all.
--
--
-- WHY A NEW TABLE, NOT A RENAME
--
-- `ai_history` rows predate prompt versioning, model configuration and output
-- hashing — there is nothing to backfill those columns FROM. Renaming the
-- table and back-filling NULLs would claim a provenance discipline for rows
-- that were written before it existed (PRINCIPLES §7 — never claim what
-- happened before the mechanism that would know did). So `ai_history` is left
-- exactly as it is — declared-class history, still readable by the surfaces
-- that read it today — and `ai_invocations` is a new table that every call
-- writes to from this migration forward. `app/api/ai/route.ts` stops writing
-- to `ai_history` in the same pass that adds this table; no code path writes
-- to both.
--
--
-- WHAT EACH COLUMN IS FOR (see lib/ai-capabilities/invocations.ts for the
-- pure row-builder this schema mirrors)
--
--   capability        the manifest name (M15-3) — what `tool` used to be
--   prompt_version     which text of that capability's prompt produced this
--                       row (M15-3's registry; bumped only when a prompt's
--                       wording or contract changes)
--   schema_version      which shape of THIS row was written — independent of
--                       prompt_version, so a reader in the future knows which
--                       writer produced a row before trusting its columns
--   model               the model actually used (M15-5) — no longer inferred
--                       from a hardcoded literal in the route
--   input_hash          sha256 of the FULL sanitised params (canonical JSON),
--                       not the 300-char prefix ai_history truncated to —
--                       "was this exact question asked before" becomes
--                       answerable without storing every essay a student has
--                       pasted (O.2 minimisation)
--   prompt_hash         sha256 of the system+userText actually sent, so "did
--                       two students get different treatment for the same
--                       input" is answerable without storing anyone's profile
--   output_hash         sha256 of the validated output; NULL when the call
--                       produced no usable output (a failure has no output
--                       hash, and an empty JSON object would be
--                       indistinguishable from one)
--   outcome             succeeded | repaired | rejected | off_topic | failed
--                       — M15-4's reject-never-degrade path has an outcome
--                       name for every terminal state, including the ones
--                       that produce no output; a log that records only
--                       successes measures nothing
--   moderation          passed | blocked_regex | blocked_classifier — the
--                       M15-2 KEEP security spine's own verdict, carried onto
--                       the row it gated
--   repair_attempts     0 or 1 — Q.4's single bounded structured-repair retry
--   input_text          retained from ai_history exactly as truncated before,
--                       because admin surfaces and app/tools/paper-trauma
--                       read it today and this pass does not touch them
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- THIS FILE IS NOT APPLIED BY THIS PASS — `scripts/check-migrations.mjs`
-- will report 028 UNAPPLIED until a human runs it against the target
-- database. No migration in this repository applies itself.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_invocations (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  capability       TEXT        NOT NULL,
  prompt_version   TEXT        NOT NULL,
  schema_version   TEXT        NOT NULL,
  model            TEXT        NOT NULL,
  input_hash       TEXT        NOT NULL,
  prompt_hash      TEXT        NOT NULL,
  output_hash      TEXT,
  outcome          TEXT        NOT NULL
                     CHECK (outcome IN ('succeeded', 'repaired', 'rejected', 'off_topic', 'failed')),
  moderation       TEXT        NOT NULL
                     CHECK (moderation IN ('passed', 'blocked_regex', 'blocked_classifier')),
  latency_ms       INTEGER     NOT NULL CHECK (latency_ms >= 0),
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  rejection        TEXT,
  repair_attempts  INTEGER     NOT NULL DEFAULT 0 CHECK (repair_attempts IN (0, 1)),
  input_text       TEXT,
  output           JSONB,
  grade            TEXT,
  board            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A rejection reason exists only on a rejection; an output hash exists only
-- when there is output to hash. Mirrors invocations.ts's own totality rather
-- than trusting every future writer to keep the two in step.
ALTER TABLE ai_invocations
  DROP CONSTRAINT IF EXISTS ai_invocations_rejection_shape;
ALTER TABLE ai_invocations
  ADD CONSTRAINT ai_invocations_rejection_shape CHECK (
    (outcome = 'rejected' AND rejection IS NOT NULL)
    OR (outcome <> 'rejected')
  );

ALTER TABLE ai_invocations
  DROP CONSTRAINT IF EXISTS ai_invocations_output_shape;
ALTER TABLE ai_invocations
  ADD CONSTRAINT ai_invocations_output_shape CHECK (
    (outcome IN ('succeeded', 'repaired') AND output_hash IS NOT NULL)
    OR (outcome NOT IN ('succeeded', 'repaired'))
  );

CREATE INDEX IF NOT EXISTS idx_ai_invocations_user_id    ON ai_invocations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_invocations_capability ON ai_invocations(capability);
CREATE INDEX IF NOT EXISTS idx_ai_invocations_created_at ON ai_invocations(created_at DESC);
-- "Which outputs came from prompt vN of this capability" — the question
-- ai_history could not answer, answered directly.
CREATE INDEX IF NOT EXISTS idx_ai_invocations_capability_version
  ON ai_invocations(capability, prompt_version);

-- ── RLS — same posture as ai_history (001_rls.sql): a user reads and deletes
-- only their own rows; writes come from the service role in app/api/ai/route.ts,
-- which bypasses RLS, but the INSERT policy is declared anyway so the table's
-- posture is legible from the policy list alone, not just from which key
-- happens to write it today. ──────────────────────────────────────────────────
ALTER TABLE ai_invocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_invocations_select_own" ON ai_invocations;
DROP POLICY IF EXISTS "ai_invocations_insert_own" ON ai_invocations;
DROP POLICY IF EXISTS "ai_invocations_delete_own" ON ai_invocations;

CREATE POLICY "ai_invocations_select_own" ON ai_invocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_invocations_insert_own" ON ai_invocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_invocations_delete_own" ON ai_invocations
  FOR DELETE USING (auth.uid() = user_id);

-- ── Column documentation ────────────────────────────────────────────────────

COMMENT ON TABLE ai_invocations IS
  'M15-6. Replaces ai_history as the write target for every AI route call from this migration forward. ai_history is retained, unmodified, as declared-class history for rows written before this table existed (S.5, H.6) — nothing here backfills or renames it.';

COMMENT ON COLUMN ai_invocations.capability IS
  'The manifest capability name (lib/ai-capabilities/registry.ts) — what ai_history.tool used to be.';

COMMENT ON COLUMN ai_invocations.prompt_version IS
  'lib/ai-capabilities/registry.ts promptVersionFor(). "1" for every capability at M15-3 (the prompts moved verbatim); bumped per-capability the next time that capability''s prompt text or output contract changes.';

COMMENT ON COLUMN ai_invocations.schema_version IS
  'INVOCATION_SCHEMA_VERSION (lib/ai-capabilities/invocations.ts) — which shape of THIS row a reader is looking at, independent of prompt_version.';

COMMENT ON COLUMN ai_invocations.input_hash IS
  'sha256("ai-input:<schema_version>:<capability>:<canonical JSON of sanitised params>"). Full input, not a 300-char prefix — O.2 minimisation: a hash is evidence, a transcript is a liability.';

COMMENT ON COLUMN ai_invocations.prompt_hash IS
  'sha256 of the system+userText actually sent to the model, personalisation included. Answers "which students got the personalised variant" without storing anyone''s profile in the log.';

COMMENT ON COLUMN ai_invocations.output_hash IS
  'sha256 of the validated output object. NULL when the call produced no usable output (failed / rejected / off_topic) — a failure has no output hash, and treating it as one would be indistinguishable from an empty object.';

COMMENT ON COLUMN ai_invocations.outcome IS
  'M15-4 reject-never-degrade: succeeded | repaired (passed only after the one bounded structured repair) | rejected (failed validation twice) | off_topic (the model itself refused) | failed (the call to the model errored).';

COMMENT ON COLUMN ai_invocations.moderation IS
  'The M15-2 KEEP security spine''s own verdict for the call that produced this row: passed | blocked_regex | blocked_classifier. As of M15-6, the route only reaches the insert once a call has been sent to the model, so every row currently written carries "passed" — a blocked request is still rejected via error_logs exactly as before this pass. The wider vocabulary is declared here, not invented in application code, so a future pass that logs blocked attempts as their own rows is a data change, not a schema change.';

COMMENT ON COLUMN ai_invocations.repair_attempts IS
  'Q.4: 0 or 1. The single bounded structured-repair retry, never more — a second failure is information (this capability''s contract and this model disagree), not a reason to retry further.';

COMMENT ON COLUMN ai_invocations.input_text IS
  'The same TEXT_KEYS-derived, 300-character-truncated preview ai_history wrote, retained because admin surfaces and app/tools/paper-trauma read this column today and this pass does not touch them.';

-- ── Verification the founder can run after applying this file ──────────────
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(c.name, ', ')
    INTO missing
    FROM (VALUES
      ('capability'), ('prompt_version'), ('schema_version'), ('model'),
      ('input_hash'), ('prompt_hash'), ('output_hash'), ('outcome'),
      ('moderation'), ('latency_ms'), ('input_tokens'), ('output_tokens'),
      ('rejection'), ('repair_attempts'), ('input_text'), ('output'),
      ('grade'), ('board')
    ) AS c(name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'ai_invocations'
        AND column_name  = c.name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ai_invocations is missing: % — M15-6 provenance is incomplete', missing;
  END IF;

  IF to_regclass('public.ai_history') IS NULL THEN
    RAISE EXCEPTION 'ai_history is gone — M15-6 requires it retained as declared-class history (S.5, H.6), not dropped';
  END IF;

  RAISE NOTICE 'ai_invocations exists with full M15-6 provenance columns. ai_history is retained, untouched.';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '028',
  '028_ai_invocations.sql',
  '7700b5e1305f0ba77c923650b7b8b04501070b4d124e0d6ba2eee5511332010a',
  'self'
);
