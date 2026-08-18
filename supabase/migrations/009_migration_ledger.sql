-- ═══════════════════════════════════════════════════════════════════════════
-- 009_migration_ledger.sql   ·   M1-1
--
-- WHY THIS EXISTS
--
-- Architecture T1: "An append-only event store cannot tolerate schema drift —
-- a missing column silently loses data permanently." Finding A.5.a records the
-- current position exactly: `004_missing_tables.sql`'s own header states that
-- five tables the running code required were ABSENT from production on
-- 2026-07-12, and whether 004–008 have since been applied is UNVERIFIABLE from
-- the repository. There is no ledger, no runner, and CLAUDE.md tells the agent
-- to paste SQL into chat for hand-execution.
--
-- This migration makes the deployed schema KNOWABLE. After it runs, the
-- question "which repository migrations are applied to this database?" is a
-- query, not a guess — which is M1-1's done-when.
--
--
-- WHY NOT SUPABASE'S OWN TRACKING
--
-- Supabase DOES ship migration tracking natively: the CLI writes one row per
-- applied migration into `supabase_migrations.schema_migrations`
-- (version text PK, statements text[], name text). It was therefore checked
-- FIRST, and rejected as a complete answer for two repository facts:
--
--   1. Only the CLI writes that table. This repo has no `supabase/config.toml`,
--      no `supabase` dependency in package.json, and no CLI invocation
--      anywhere; every migration to date was pasted into the Supabase SQL
--      editor by hand. Hand-application writes nothing, so the native table is
--      empty or absent and records none of 000–008.
--   2. The native row carries no checksum. It answers "was a version applied",
--      never "was the file edited after it was applied" — and an edited applied
--      migration is the second half of drift, the half that makes two databases
--      claiming the same version actually differ.
--
-- So this migration does NOT build a parallel table. It ADOPTS the Supabase
-- table — same schema, same name, same primary key — and extends it additively
-- with the two columns the checksum gate needs. Adopting rather than
-- duplicating means the day this repo starts running `supabase db push`, the
-- CLI finds its own table already populated and keeps writing to it; a second
-- table would have created exactly the two-sources-of-truth problem H.1.a
-- forbids.
--
--
-- WHY THE BACKFILL PROBES INSTEAD OF ASSERTING
--
-- Backfilling 000–008 as "applied" because the files exist would restate the
-- guess this migration is meant to abolish. Each backfill row below is instead
-- guarded by a catalogue probe for the objects that migration creates, so a
-- row appears ONLY where the database itself is the evidence. A migration
-- whose objects are missing stays out of the ledger and the CI gate reports it
-- UNAPPLIED — which is the correct, loud outcome.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. The ledger ──────────────────────────────────────────────────────────
-- Created with the Supabase CLI's exact shape so the CLI can later adopt it.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version     TEXT PRIMARY KEY,
  statements  TEXT[],
  name        TEXT
);

-- Additive extension. `ADD COLUMN IF NOT EXISTS` so this is a no-op on a
-- database where the CLI already created the table.
ALTER TABLE supabase_migrations.schema_migrations
  ADD COLUMN IF NOT EXISTS checksum    TEXT,
  ADD COLUMN IF NOT EXISTS applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS recorded_by TEXT;

COMMENT ON COLUMN supabase_migrations.schema_migrations.checksum IS
  'sha256 of the migration body (contents before the LEDGER REGISTRATION sentinel, CRLF-normalised, trailing whitespace trimmed). NULL means the row was backfilled from catalogue evidence and the exact text that ran is unknown.';
COMMENT ON COLUMN supabase_migrations.schema_migrations.recorded_by IS
  'How the row got here: "self" (the migration registered itself), "backfill:009" (catalogue-probe evidence), or "cli" (supabase db push).';

-- ── 2. Reading the ledger from CI ──────────────────────────────────────────
-- PostgREST exposes `public` only, and the ledger deliberately lives in
-- `supabase_migrations` where no student role can reach it. This function is
-- the one window onto it: service-role only, read-only, no arguments.
CREATE OR REPLACE FUNCTION public.migration_ledger()
RETURNS TABLE (version TEXT, name TEXT, checksum TEXT, applied_at TIMESTAMPTZ, recorded_by TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = supabase_migrations, public, pg_temp
AS $$
  SELECT m.version, m.name, m.checksum, m.applied_at, m.recorded_by
  FROM supabase_migrations.schema_migrations m
  ORDER BY m.version;
$$;

REVOKE ALL     ON FUNCTION public.migration_ledger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migration_ledger() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.migration_ledger() TO service_role;

-- ── 3. Recording helper ────────────────────────────────────────────────────
-- Every future migration ends with one call to this. Idempotent on re-run of
-- the same file; a DIFFERENT checksum for an already-recorded version is a
-- hard error rather than an overwrite, because silently accepting it would
-- destroy the only evidence that the file changed after it was applied.
CREATE OR REPLACE FUNCTION supabase_migrations.record_migration(
  p_version  TEXT,
  p_name     TEXT,
  p_checksum TEXT,
  p_source   TEXT DEFAULT 'self'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  existing TEXT;
BEGIN
  SELECT checksum INTO existing
  FROM supabase_migrations.schema_migrations
  WHERE version = p_version;

  IF NOT FOUND THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
    VALUES (p_version, p_name, p_checksum, p_source);
    RETURN;
  END IF;

  IF existing IS NULL THEN
    -- Upgrading a catalogue-probe backfill to a checksummed row.
    UPDATE supabase_migrations.schema_migrations
    SET checksum = p_checksum, name = p_name, recorded_by = p_source
    WHERE version = p_version;
    RETURN;
  END IF;

  IF existing IS DISTINCT FROM p_checksum THEN
    RAISE EXCEPTION
      'migration % is already recorded with checksum %, refusing to overwrite with % — the file was edited after it was applied; write a new migration instead',
      p_version, existing, p_checksum;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION supabase_migrations.record_migration(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

-- ── 4. Evidence-based backfill of 000–008 ──────────────────────────────────
-- Checksums are of the files as they stand in the repository at 2026-08-14.
-- They are recorded so that any LATER edit to one of these files is caught as
-- DIVERGENT — not as a claim that this exact text is what originally ran.
-- Rows appear only where the objects exist. ON CONFLICT DO NOTHING so a
-- re-run, or a database the CLI already recorded, is never clobbered.

-- 000 — user_data, rooms, ai_history, error_logs, announcements
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '000', '000_initial_schema.sql',
       '25da5fcd5992aae5567ae1de6f5bc49c24ea45bf15652ee1d916304e8e793603', 'backfill:009'
WHERE to_regclass('public.user_data')     IS NOT NULL
  AND to_regclass('public.rooms')         IS NOT NULL
  AND to_regclass('public.ai_history')    IS NOT NULL
  AND to_regclass('public.error_logs')    IS NOT NULL
  AND to_regclass('public.announcements') IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 001 — ai_rate_limits
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '001', '001_rls.sql',
       '07caa3bdcc105bd833cc76d0275258523c8486447e2df03e090f95aa4bb29267', 'backfill:009'
WHERE to_regclass('public.ai_rate_limits') IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 002 — user_data.blob, rooms.bailed, rooms.session_end, user_data.updated_at
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '002', '002_blob_and_rooms.sql',
       '9b9fefb44bb1b04ec880131b0d13ac76ad9331ccb66a456c3592220ee0220026', 'backfill:009'
WHERE EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='user_data' AND column_name='blob')
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='rooms' AND column_name='bailed')
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='rooms' AND column_name='session_end')
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='user_data' AND column_name='updated_at')
ON CONFLICT (version) DO NOTHING;

-- 003 — user_data.ai_calls_today / ai_calls_reset_at
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '003', '003_ai_rate_limits.sql',
       '27c14a9b49173c42eec024d48156312146172467ee34666d1f9175ee098b1148', 'backfill:009'
WHERE EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='user_data' AND column_name='ai_calls_today')
  AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='user_data' AND column_name='ai_calls_reset_at')
ON CONFLICT (version) DO NOTHING;

-- 004 — the drift of record. ALL FIVE tables must exist; four out of five is
-- not "applied", it is a partially-run paste, and the gate must say so.
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '004', '004_missing_tables.sql',
       '48efd712387f5e4ca14522507f912cef5835066b8e3d7aaa461cc0a5cb4a6198', 'backfill:009'
WHERE to_regclass('public.page_events')        IS NOT NULL
  AND to_regclass('public.jobs')               IS NOT NULL
  AND to_regclass('public.push_subscriptions') IS NOT NULL
  AND to_regclass('public.stripe_customers')   IS NOT NULL
  AND to_regclass('public.stripe_events')      IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 004b — the Stripe subset of 004
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '004b', '004b_stripe_tables_only.sql',
       'bfb7c3c3ab8859dc6d6d9cd42b96ddb7b1dc05ae931f4ad9ab4ad123644aaa56', 'backfill:009'
WHERE to_regclass('public.stripe_customers') IS NOT NULL
  AND to_regclass('public.stripe_events')    IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 005 — score_history
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '005', '005_score_history.sql',
       '91b1e9181f81b048be36e39b06b111517917a077a17c4ea2558a46222dd05719', 'backfill:009'
WHERE to_regclass('public.score_history') IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 006 — the consume_ai_call() RPC
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '006', '006_ai_usage_server_side.sql',
       'e28e08def22f9d806d18c11634674f9d710effa1f5936a8304b279be0f805e74', 'backfill:009'
WHERE EXISTS (SELECT 1 FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = 'consume_ai_call')
ON CONFLICT (version) DO NOTHING;

-- 007 — the mistake domain
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '007', '007_mistakes.sql',
       '46ae6e0b862a85c330f7cd7e448e0ca89603eb968d42fa844931f6ac4e40162a', 'backfill:009'
WHERE to_regclass('public.concepts')    IS NOT NULL
  AND to_regclass('public.evidence')    IS NOT NULL
  AND to_regclass('public.patterns')    IS NOT NULL
  AND to_regclass('public.occurrences') IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- 008 — ingestion
INSERT INTO supabase_migrations.schema_migrations (version, name, checksum, recorded_by)
SELECT '008', '008_ingestion.sql',
       '90bd3d46efe8d2236885e097731d23130ba7e5c166537093e9c41e583b88f0ca', 'backfill:009'
WHERE to_regclass('public.ingestion_runs')   IS NOT NULL
  AND to_regclass('public.ingestion_stages') IS NOT NULL
  AND to_regclass('public.ingestion_review') IS NOT NULL
ON CONFLICT (version) DO NOTHING;

-- ── 5. The reading this migration takes of the live database ───────────────
-- Not an assertion — a recorded observation, so the first run of this file
-- leaves behind the evidence that answers Finding A.5.a's "UNVERIFIABLE".
DO $$
DECLARE
  recorded INT;
  missing  TEXT;
BEGIN
  SELECT count(*) INTO recorded FROM supabase_migrations.schema_migrations;

  SELECT string_agg(v, ', ' ORDER BY v) INTO missing
  FROM (VALUES ('000'),('001'),('002'),('003'),('004'),('004b'),('005'),('006'),('007'),('008')) AS t(v)
  WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations m WHERE m.version = t.v);

  RAISE NOTICE 'migration ledger: % of 10 pre-ledger migrations evidenced as applied', recorded;
  IF missing IS NOT NULL THEN
    RAISE WARNING 'NOT EVIDENCED AS APPLIED (objects absent from this database): % — these will fail the CI gate as UNAPPLIED until they are run', missing;
  END IF;
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '009',
  '009_migration_ledger.sql',
  '353e01740c425da9283ea19b2d81bf43b38095d18f9df1ee897f8b45e44845a0',
  'self'
);
