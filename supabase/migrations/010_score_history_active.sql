-- ═══════════════════════════════════════════════════════════════════════════
-- 010_score_history_active.sql   ·   M1-3
--
-- WHAT THIS RECONCILES
--
-- `app/api/cron/score-snapshot/route.ts` has written `score_history.active`
-- since the Integrity Sprint. **No migration in this repository ever created
-- that column.** 005 defines score_history without it and nothing after 005
-- alters the table; the column was introduced by an ALTER TABLE pasted into
-- the SQL editor and never written down. The route's own comment says so:
-- "The `active` column hasn't been added yet (hand-run migration)."
--
-- So the drift Finding A.5.a describes is worse than 004's: with 004, the repo
-- at least held the SQL and the doubt was whether it had been run. With
-- `score_history.active` the repo did not describe the deployed schema AT ALL,
-- and the only record that the column should exist was a runtime `catch`
-- branch in application code. That is T1 in its purest form — production
-- schema known only to whoever last used the SQL editor.
--
-- This migration writes the column down. `ADD COLUMN IF NOT EXISTS` makes it
-- correct in both worlds: a no-op where the hand-run ALTER already landed, the
-- fix where it did not.
--
--
-- WHY THE RUNTIME FALLBACK STAYS FOR NOW
--
-- M1-3's done-when is that the fallback at score-snapshot/route.ts:97-107 is
-- deleted "because it can no longer be needed". Writing this file does not
-- reach that state — it makes it reachable. The fallback may be deleted only
-- once the ledger shows version 010 recorded against production, which is a
-- query a human must run after applying this file. Deleting it before then
-- would trade a tolerated missing column for a hard 500 on the daily close,
-- and the close is the only writer of the score series. The exact verification
-- step is written into the route's comment.
--
--
-- DEFAULT SEMANTICS
--
-- DEFAULT FALSE, NOT NULL. `active` means "this user's blob showed corroborated
-- evidence of a qualifying academic event on this day" (`lib/active-close.ts`).
-- Rows written before the column existed have no such evidence recorded, and
-- backfilling them TRUE would fabricate activity — PRINCIPLES §7, "never lie".
-- FALSE is the honest reading of "we did not observe corroboration".
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE score_history
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN score_history.active IS
  'Corroborated academic activity on captured_on, per lib/active-close.ts. FALSE for rows written before the column existed — absence of evidence, never a claim of inactivity.';

-- ── Verification the founder can run after applying this file ──────────────
-- Confirms the column is really there before anyone deletes the runtime
-- fallback in app/api/cron/score-snapshot/route.ts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'score_history'
      AND column_name  = 'active'
  ) THEN
    RAISE EXCEPTION 'score_history.active still absent after ALTER — do not remove the runtime fallback';
  END IF;
  RAISE NOTICE 'score_history.active present. The score-snapshot missing-column fallback is now removable; see the M1-3 note in that route.';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '010',
  '010_score_history_active.sql',
  'cc8a5f5986a3defb2801f73cfd818ca3f07a463ea8af5be5d156f97c0ba64d74',
  'self'
);
