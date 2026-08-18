-- ═══════════════════════════════════════════════════════════════════════════
-- 016_audit_entries.sql   ·   M7-4
--
-- EXECUTION_PLAN M7-4: *"`AuditEntry` with hash chaining, from day one. Done
-- when: O.6. Starting it later leaves a hole at the point of maximum change."*
--
-- Architecture O.6: *"`AuditEntry` (C.2) is append-only for everyone, including
-- the service role (`REVOKE DELETE`), carries `before_hash`/`after_hash` so
-- tampering is detectable, and is included in the student's export."*
--
--
-- WHY THIS IS A SEPARATE FILE FROM 015
--
-- The same reasoning 013/014 used to split schema from seed, applied to a
-- different axis: 015 and 016 FAIL DIFFERENTLY and must be re-runnable apart.
--
--   · 015 is the academic record's spine. Its risk is data shape.
--   · 016 is the tamper-evidence layer for the WHOLE product — corrections,
--     exports, parent reads, deletions, score restatements, compaction. It
--     audits `students`, `occurrences`, `score_history` and tables that do not
--     exist yet, and audits `academic_events` only incidentally.
--
-- Merging them would tie the audit trail's deployment to the event table's,
-- which is exactly backwards: O.6's whole argument is that the audit trail must
-- predate the things it audits. It is also why this is 016 and not 015b — it is
-- not a subset or a fix-up of 015, it is a peer.
--
-- ADDITIVE ONLY. Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THE CHAIN IS, AND WHAT IT IS NOT
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Each entry stores `before_hash` (the previous entry's `after_hash`) and
-- `after_hash` (SHA-256 over this entry's own content INCLUDING `before_hash`).
-- Removing, reordering or editing any historical entry therefore invalidates
-- every entry after it.
--
-- THE HASH IS COMPUTED IN TYPESCRIPT — `lib/audit.ts` — AND NOT HERE. This
-- migration does not recompute it and cannot: two implementations of one
-- canonicalisation is the drift M1 exists to prevent, one level down. What the
-- database does instead is INDEPENDENT and cheap: `append_audit_entry()`
-- refuses an insert whose `before_hash` is not the current tip. So a caller who
-- forges a hash still cannot forge a POSITION, and a caller who skips an entry
-- is refused at write time rather than discovered at audit time.
--
-- Division of labour, precisely:
--   · `verifyAuditChain()` (TypeScript, tested) detects an EDITED or REORDERED
--     entry after the fact.
--   · `append_audit_entry()` (here) refuses a GAP or a fork at write time.
--
-- WHAT IT DOES NOT CLAIM. A hash chain stored in the same database as the data
-- it protects proves internal consistency, not external immutability. Someone
-- with write access could rewrite the chain from the tampered entry onward.
-- Publishing the tip somewhere the database cannot reach is what would close
-- that, and it is not this milestone's job. Recorded here rather than implied
-- away — Law 7.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · AUDIT_ENTRIES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_entries (
  -- C.2: *"`audit_id UUID`, monotonic `seq BIGSERIAL`"*.
  audit_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq            BIGSERIAL   NOT NULL UNIQUE,

  -- C.2: actor ∈ {student, system, service_role, parent}.
  actor          TEXT        NOT NULL CHECK (actor IN ('student','system','service_role','parent')),

  -- O.6's enumeration, plus the two M7 owns. A closed set, mirroring
  -- `AUDIT_ACTIONS` in `lib/audit.ts` — an audit trail whose action is free
  -- text cannot be queried, and "show me every export" must not be a LIKE.
  action         TEXT        NOT NULL CHECK (action IN (
                   'correction_requested','correction_resolved',
                   'dispute_opened','dispute_resolved',
                   'deletion','export','parent_read','policy_change',
                   'score_restatement','compaction_run',
                   'event_superseded','event_quarantined')),

  -- NULL for a system-wide action: a compaction run spans students (D.5.a).
  student_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  target_table   TEXT,
  target_id      TEXT,
  reason         TEXT,

  -- Everything else worth keeping, INCLUDING the target row's before/after
  -- state. It travels here rather than in dedicated columns because it is
  -- covered by `after_hash` there, and therefore cannot be edited undetectably.
  details        JSONB       NOT NULL DEFAULT '{}'::jsonb,

  policy_version TEXT,

  -- The content timestamp, part of the hash preimage. Supplied by the caller
  -- so the row is reproducible from its own values; `written_at` below is the
  -- database's own, unhashed, observation.
  at             TIMESTAMPTZ NOT NULL,
  written_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── the chain ────────────────────────────────────────────────────────────
  hash_version   TEXT        NOT NULL,
  before_hash    CHAR(64)    NOT NULL CHECK (before_hash ~ '^[0-9a-f]{64}$'),
  after_hash     CHAR(64)    NOT NULL UNIQUE CHECK (after_hash ~ '^[0-9a-f]{64}$'),

  -- An entry cannot link to itself. Without this, one bad write makes the
  -- chain a one-element loop that verifies against nothing.
  CONSTRAINT audit_entries_no_self_link CHECK (before_hash <> after_hash)
);

-- `before_hash` is UNIQUE too, and this is the constraint that makes the chain
-- a CHAIN rather than a tree: two entries claiming the same predecessor would
-- be a fork, and a fork is exactly what an attacker rewriting history creates.
CREATE UNIQUE INDEX IF NOT EXISTS audit_entries_before_hash_unique
  ON public.audit_entries (before_hash);

CREATE INDEX IF NOT EXISTS audit_entries_student_idx
  ON public.audit_entries (student_id, seq DESC) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_entries_action_idx
  ON public.audit_entries (action, seq DESC);
CREATE INDEX IF NOT EXISTS audit_entries_target_idx
  ON public.audit_entries (target_table, target_id);

COMMENT ON TABLE public.audit_entries IS
  'Architecture O.6. Append-only for EVERYONE including the service role. before_hash/after_hash form a chain: editing or removing any entry invalidates every entry after it.';
COMMENT ON COLUMN public.audit_entries.before_hash IS
  'The previous entry''s after_hash, or 64 zeroes for the genesis entry. UNIQUE, so the chain cannot fork.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · APPEND-ONLY FOR EVERYONE, INCLUDING THE SERVICE ROLE
--
-- O.6: *"no UPDATE, no DELETE, for anyone including the service role (enforced
-- by policy omission plus a `REVOKE DELETE` grant)."*
--
-- Policy omission handles `authenticated`. REVOKE handles the grant. The
-- triggers handle the case neither does — a future migration, a psql session,
-- or an application bug running as the table's owner. This table is the reason
-- the others can be trusted, so it gets all three.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_entries_refuse_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_entries is append-only for everyone, including the service role (architecture O.6). % refused.',
    TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_entries_refuse_mutation_trg ON public.audit_entries;
CREATE TRIGGER audit_entries_refuse_mutation_trg
  BEFORE UPDATE OR DELETE ON public.audit_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_entries_refuse_mutation();

REVOKE UPDATE, DELETE ON public.audit_entries FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT           ON public.audit_entries FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · THE TIP, AND THE ONLY WAY TO EXTEND IT
-- ═══════════════════════════════════════════════════════════════════════════

-- What `lib/audit.ts` must be given before it can link a new entry. Returns the
-- genesis sentinel on an empty chain so the caller has no special case.
CREATE OR REPLACE FUNCTION public.audit_chain_tip()
RETURNS CHAR(64)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT after_hash FROM public.audit_entries ORDER BY seq DESC LIMIT 1),
    repeat('0', 64)
  )::CHAR(64);
$$;

REVOKE ALL     ON FUNCTION public.audit_chain_tip() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_chain_tip() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.audit_chain_tip() TO service_role;

-- The single write path.
--
-- THE ADVISORY LOCK IS LOAD-BEARING. Two concurrent appends that both read the
-- same tip would both compute `before_hash = tip`; the UNIQUE index on
-- `before_hash` would refuse the second, which is correct but is a lost audit
-- entry. A transaction-scoped advisory lock serialises read-tip-then-append, so
-- the second caller waits and links onto the first. The lock id is an arbitrary
-- constant reserved for this chain.
--
-- The `p_before_hash` check is what a caller cannot talk its way past: it may
-- compute any hash it likes, but it may not compute a POSITION.
CREATE OR REPLACE FUNCTION public.append_audit_entry(
  p_actor          TEXT,
  p_action         TEXT,
  p_student_id     UUID,
  p_target_table   TEXT,
  p_target_id      TEXT,
  p_reason         TEXT,
  p_details        JSONB,
  p_policy_version TEXT,
  p_at             TIMESTAMPTZ,
  p_hash_version   TEXT,
  p_before_hash    CHAR(64),
  p_after_hash     CHAR(64)
) RETURNS TABLE (audit_id UUID, seq BIGINT, after_hash CHAR(64))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tip CHAR(64);
BEGIN
  PERFORM pg_advisory_xact_lock(7761541);

  v_tip := public.audit_chain_tip();

  IF p_before_hash IS DISTINCT FROM v_tip THEN
    RAISE EXCEPTION
      'audit chain conflict: entry links to %, chain tip is % — recompute the hash against the current tip',
      p_before_hash, v_tip;
  END IF;

  RETURN QUERY
  INSERT INTO public.audit_entries (
    actor, action, student_id, target_table, target_id, reason,
    details, policy_version, at, hash_version, before_hash, after_hash
  ) VALUES (
    p_actor, p_action, p_student_id, p_target_table, p_target_id, p_reason,
    COALESCE(p_details, '{}'::jsonb), p_policy_version, p_at,
    p_hash_version, p_before_hash, p_after_hash
  )
  RETURNING public.audit_entries.audit_id,
            public.audit_entries.seq,
            public.audit_entries.after_hash;
END;
$$;

REVOKE ALL     ON FUNCTION public.append_audit_entry(TEXT,TEXT,UUID,TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ,TEXT,CHAR,CHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.append_audit_entry(TEXT,TEXT,UUID,TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ,TEXT,CHAR,CHAR) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.append_audit_entry(TEXT,TEXT,UUID,TEXT,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ,TEXT,CHAR,CHAR) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ROW LEVEL SECURITY
--
-- C.2: *"Service-role INSERT only; student SELECT-own"*. The student reads the
-- entries that name them — O.6 requires the trail to be *"included in the
-- student's export"*, and an export cannot include what the exporter's own
-- identity cannot read.
--
-- System-wide entries (`student_id IS NULL`) are NOT student-visible. A
-- compaction run over every student's attention events is operational history,
-- not this student's record, and showing it would leak the shape of other
-- students' data.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_entries_select_own ON public.audit_entries;
CREATE POLICY audit_entries_select_own ON public.audit_entries
  FOR SELECT TO authenticated
  USING (student_id IS NOT NULL AND auth.uid() = student_id);

-- No INSERT policy: the write path is public.append_audit_entry(), service role
-- only. No UPDATE policy. No DELETE policy. See §2 for why all three layers.


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · VERIFICATION — the file checks its own claims
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'audit_entries' AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'audit_entries has a non-SELECT policy (%) — O.6: service-role INSERT only, student SELECT-own', bad_policy;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.audit_entries'::regclass
      AND tgname = 'audit_entries_refuse_mutation_trg'
  ) THEN
    RAISE EXCEPTION 'the append-only trigger is missing — O.6 requires UPDATE and DELETE refused even to the service role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'audit_entries_before_hash_unique'
  ) THEN
    RAISE EXCEPTION 'before_hash is not UNIQUE — the chain could fork';
  END IF;

  IF public.audit_chain_tip() <> repeat('0', 64)
     AND NOT EXISTS (SELECT 1 FROM public.audit_entries) THEN
    RAISE EXCEPTION 'audit_chain_tip() disagrees with an empty table';
  END IF;

  RAISE NOTICE '016: audit_entries ready — chain tip is %', public.audit_chain_tip();
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not backfill history. There is none to backfill: nothing before
--   this file recorded a correction, an export or a parent read, and inventing
--   entries for actions no one observed would be fabrication (Law 7).
-- · It does not audit ordinary event appends. `academic_events` IS the record;
--   an audit row per event would double the stream to restate it. See the
--   AUDIT WRITES IN M7 note at the foot of `lib/audit.ts`.
-- · It does not publish the tip anywhere outside this database. See the header
--   for what that means for the strength of the claim.
-- · It does not add the correction/dispute/export call sites. Those subsystems
--   are M14, M17 and M18; `AUDIT_ACTIONS` already names their actions, so each
--   arrives as a call, not a schema change. That is the whole point of building
--   the mechanism now.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '016',
  '016_audit_entries.sql',
  'c1a25addb1c7b33ce18144059f72e7b87bd24e50e4f66294d3d3c6bd05c0cf00',
  'self'
);
