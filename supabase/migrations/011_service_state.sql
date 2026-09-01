-- ═══════════════════════════════════════════════════════════════════════════
-- 011_service_state.sql   ·   M4-3
--
-- WHAT THIS CLOSES
--
-- Architecture R.2, Finding A.5.e, stated exactly: `user_data.notifState` and
-- `user_data.parentAlerts` are documented "service-role writes only"
-- (`lib/user-data.ts:39-42`) and yet live in a row carrying a full
-- `user_data_update_own` UPDATE policy (`000_initial_schema.sql:142`).
--
-- The consequence is not theoretical. Both columns hold DEDUPLICATION state —
-- `notifState.sent` is the map of "we have already sent this nudge",
-- `parentAlerts.examAlerts` is the map of "we have already emailed this
-- parent about this paper". A student with devtools open can clear either one
-- with a single PostgREST call against their own row, and the system will
-- re-fire everything it had already suppressed. Clearing `notifState.sent`
-- reopens the whole push backlog; clearing `examAlerts` makes the exam-risk
-- alert to a PARENT fire again. Neither is data the student owns; both are
-- records the system keeps ABOUT the student, and R.2's rule is that
-- system-owned fields move out of student-writable rows.
--
-- This migration creates the two service-role tables that hold them, copies
-- whatever the columns currently contain, and leaves the columns in place.
--
--
-- WHY THE OLD COLUMNS ARE NOT DROPPED HERE
--
-- Additive only, deliberately, for two independent reasons:
--
--   1. **The columns are drift, and their presence is unproven.** `notifState`,
--      `parentAlerts`, `parentEmail` and `parentDigestEnabled` appear in NO
--      migration in this repository — not 000, not 004, not anywhere. Like
--      `score_history.active` before 010, they were introduced by an ALTER
--      pasted into the SQL editor and never written down (Finding A.5.a, T1).
--      A `DROP COLUMN` cannot be written against a shape the repository has
--      never described, and dropping in the same transaction that copies would
--      make the copy unverifiable.
--   2. **A one-way door.** Once the columns are gone the read path has no
--      fallback, so the drop belongs to a later, separate migration run only
--      after the ledger shows 011 recorded AND the copy below has been
--      inspected. The drop statements are written out at the foot of this file,
--      commented, so the follow-up is a paste rather than a rewrite.
--
-- Until that drop runs, the columns remain student-writable and a determined
-- student can still clear them — but nothing READS them any more (the cron
-- routes read and write the new tables as of this milestone), so clearing them
-- has no effect. The exposure closes with the code change; the drop is hygiene.
--
--
-- POSTURE: RLS ON, ZERO POLICIES
--
-- Both tables enable RLS and define no policy whatsoever. Under Postgres RLS
-- that denies every non-service-role read and write by construction — the
-- posture `jobs` already uses (architecture R.2: "`jobs` RLS-on with no
-- policies (service role only)"), chosen over a policy list because there is no
-- circumstance in which a student role should touch either table, and an empty
-- policy set cannot be loosened by accident the way an over-broad USING clause
-- can. Grants are revoked from `anon` and `authenticated` as well, so the
-- tables are unreachable even if RLS were ever disabled on them.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- NOT APPLIED to any database by the milestone that wrote it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Push notification engine state ──────────────────────────────────────
-- Mirrors `NotifState` in `lib/notifications.ts` field for field. `sent` stays
-- JSONB rather than becoming a child table: it is a bounded map (the engine
-- prunes it to the last 100 keys at `lib/notifications.ts:218`) that is read
-- and rewritten whole on every decision, and normalising it would buy nothing
-- and cost a join in an hourly cron loop.
CREATE TABLE IF NOT EXISTS notification_state (
  user_id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent                   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  last_high_priority_day TEXT,
  last_milestone         INT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notification_state IS
  'Service-role-only push dedup state (M4-3, architecture R.2). Formerly user_data.notifState, where the student could clear it. Never student-readable or student-writable.';
COMMENT ON COLUMN notification_state.sent IS
  'notification key -> ISO timestamp of the send. Pruned to the most recent 100 by lib/notifications.ts.';
COMMENT ON COLUMN notification_state.last_high_priority_day IS
  'Local YYYY-MM-DD on which the one daily high-priority slot was used.';

-- ── 2. Parent alert cooldowns ──────────────────────────────────────────────
-- `parentAlerts` also carried an `inactivityAt` marker. It is NOT recreated:
-- M0-4 removed the inactivity alert entirely, `computeRiskFlags` can only raise
-- `examSoon` (`lib/parent-digest.ts`), and no code has written `inactivityAt`
-- since. Carrying the column forward would re-establish a field for a signal
-- the product has ruled out escalating to a parent.
CREATE TABLE IF NOT EXISTS parent_alert_state (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_alerts JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE parent_alert_state IS
  'Service-role-only parent-alert cooldown markers (M4-3, architecture R.2). Formerly user_data.parentAlerts. A student clearing this could re-fire an email to their parent, which is why it moved.';
COMMENT ON COLUMN parent_alert_state.exam_alerts IS
  '"<exam name>@<exam date>" -> ISO timestamp of the alert already sent. One alert per exam occurrence.';

-- ── 3. RLS: on, with no policies at all ────────────────────────────────────
ALTER TABLE notification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_alert_state ENABLE ROW LEVEL SECURITY;

-- Belt as well as braces: revoke the table grants PostgREST's roles inherit, so
-- these tables are unreachable from the student API even if RLS were disabled.
REVOKE ALL ON TABLE notification_state FROM anon, authenticated;
REVOKE ALL ON TABLE parent_alert_state FROM anon, authenticated;
GRANT  ALL ON TABLE notification_state TO service_role;
GRANT  ALL ON TABLE parent_alert_state TO service_role;

-- ── 4. Copy whatever the drifted columns currently hold ────────────────────
-- Guarded by catalogue probes because, per the header, this repository has
-- never described these columns and cannot assume they exist. Where a column is
-- absent the copy is skipped and the new table simply starts empty, which is
-- the correct outcome: an absent column held no state to preserve.
--
-- `ON CONFLICT DO NOTHING` makes a re-run a no-op rather than a rollback of
-- state the cron has written since the first run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_data' AND column_name = 'notifState'
  ) THEN
    EXECUTE $copy$
      INSERT INTO notification_state (user_id, sent, last_high_priority_day, last_milestone)
      SELECT u.id::uuid,
             COALESCE(u."notifState" -> 'sent', '{}'::jsonb),
             u."notifState" ->> 'lastHighPriorityDay',
             NULLIF(u."notifState" ->> 'lastMilestone', '')::int
      FROM user_data u
      WHERE u."notifState" IS NOT NULL
        AND jsonb_typeof(u."notifState") = 'object'
      ON CONFLICT (user_id) DO NOTHING
    $copy$;
    RAISE NOTICE 'notification_state: copied from user_data."notifState"';
  ELSE
    RAISE NOTICE 'notification_state: user_data."notifState" absent — nothing to copy, table starts empty';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_data' AND column_name = 'parentAlerts'
  ) THEN
    EXECUTE $copy$
      INSERT INTO parent_alert_state (user_id, exam_alerts)
      SELECT u.id::uuid, COALESCE(u."parentAlerts" -> 'examAlerts', '{}'::jsonb)
      FROM user_data u
      WHERE u."parentAlerts" IS NOT NULL
        AND jsonb_typeof(u."parentAlerts") = 'object'
      ON CONFLICT (user_id) DO NOTHING
    $copy$;
    RAISE NOTICE 'parent_alert_state: copied from user_data."parentAlerts"';
  ELSE
    RAISE NOTICE 'parent_alert_state: user_data."parentAlerts" absent — nothing to copy, table starts empty';
  END IF;
END $$;

-- ── 5. Verification the founder can run after applying this file ───────────
DO $$
DECLARE
  n_pol INT;
  p_pol INT;
BEGIN
  SELECT count(*) INTO n_pol FROM pg_policies WHERE schemaname='public' AND tablename='notification_state';
  SELECT count(*) INTO p_pol FROM pg_policies WHERE schemaname='public' AND tablename='parent_alert_state';

  IF n_pol <> 0 OR p_pol <> 0 THEN
    RAISE EXCEPTION
      'service-state tables must carry ZERO RLS policies (found % and %) — a policy here would re-expose system state to the student role',
      n_pol, p_pol;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname='notification_state' AND c.relrowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname='parent_alert_state' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'RLS is not enabled on both service-state tables';
  END IF;

  RAISE NOTICE 'M4-3: notification_state and parent_alert_state present, RLS on, no policies. Service role only.';
END $$;

-- ── 6. THE FOLLOW-UP DROP — do not run with this file ──────────────────────
-- Run only after (a) the ledger records version 011 against this database, and
-- (b) the copied rows have been eyeballed against the old columns. Written here
-- so the follow-up migration is a paste, not a rewrite.
--
--   ALTER TABLE user_data DROP COLUMN IF EXISTS "notifState";
--   ALTER TABLE user_data DROP COLUMN IF EXISTS "parentAlerts";

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '011',
  '011_service_state.sql',
  '93b4fe36c9eea7830615b87c5947788aec4cb3f0fc2f186f8e6287d6229acb50',
  'self'
);
