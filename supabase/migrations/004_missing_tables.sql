-- ══════════════════════════════════════════════════════════════════
-- Migration 004 — Tables the code depends on that do NOT exist in prod
--
-- Verified missing against the live database on 2026-07-12 (REST
-- introspection returned 404 "Could not find the table in the schema
-- cache" for every table below).
--
-- Without these:
--   · stripe_events      → webhook 500s on EVERY event. A customer can
--                          complete checkout and be charged, but the tier
--                          is never granted. Money in, nothing delivered.
--   · stripe_customers   → no customer→user mapping; billing portal 404s.
--   · push_subscriptions → notification engine + hourly cron are dead.
--   · jobs               → job queue + /api/jobs/run cron are dead.
--   · page_events        → /api/track silently no-ops; admin stats empty.
--
-- Run in Supabase SQL editor: paste and click Run. Idempotent.
-- ══════════════════════════════════════════════════════════════════

-- ── page_events (declared in 000, never applied) ───────────────────────────
CREATE TABLE IF NOT EXISTS page_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT        NOT NULL,
  page       TEXT        NOT NULL,
  tool       TEXT,
  user_id    UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_events_user_id ON page_events(user_id);
CREATE INDEX IF NOT EXISTS idx_page_events_session ON page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_created ON page_events(created_at DESC);

ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_events_insert_authed" ON page_events;
CREATE POLICY "page_events_insert_authed" ON page_events FOR INSERT WITH CHECK (true);

-- ── jobs (declared in 000, never applied) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts     INT         NOT NULL DEFAULT 0,
  error        TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_runner_idx ON jobs(scheduled_at ASC) WHERE status = 'pending';

-- Service-role only (lib/jobs.ts uses supabaseServer). RLS on with no
-- policy = clients get nothing, service role bypasses.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- ── push_subscriptions (no migration ever written) ─────────────────────────
-- Columns from app/api/push/subscribe/route.ts:36-44 and lib/push.ts:42-46.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint     TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh       TEXT        NOT NULL,
  auth         TEXT        NOT NULL,
  tz           TEXT,
  user_agent   TEXT,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── stripe_customers (no migration ever written) ───────────────────────────
-- upsert keys on customer_id (webhook route.ts:57-59); looked up by user_id
-- with .maybeSingle() (checkout route.ts:46-50, billing-portal:22-26), so
-- user_id must be UNIQUE or a second row would make maybeSingle() throw.
CREATE TABLE IF NOT EXISTS stripe_customers (
  customer_id TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- ── stripe_events (no migration ever written) ──────────────────────────────
-- The idempotency ledger. The webhook INSERTs the event id before doing any
-- work and relies on the PK unique violation (SQLSTATE 23505) to detect a
-- replay (route.ts:34-43). Without the PK there is no replay protection.
CREATE TABLE IF NOT EXISTS stripe_events (
  id         TEXT        PRIMARY KEY,
  type       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
