-- ═══════════════════════════════════════════════════════════════════════════
-- 030_data_ownership.sql   ·   M18
--
-- EXECUTION_PLAN M18: "Export: L1, L3, L5, the L2 derivation manifest, dispute
-- markers, audit trail. Correction and dispute: append and supersede, never
-- edit in place — no UPDATE path exists. Replay-from-checkpoint on correction;
-- snapshots carry `restatement_of`. Deletion: binaries destroyed, content_hash
-- tombstones retained. Account deletion; parent connections revoke; reports
-- invalidate."
--
-- Architecture Part O in full.
--
-- NOT APPLIED to any database. Same posture as every migration since 015.
--
--
-- WHAT THIS FILE ADDS, AND WHY IT IS ONE FILE
--
--   1 · CORRECTION_REQUESTS         O.3's one entry point. Append-only.
--   2 · ASSESSMENT_ATTEMPT_DISPUTES O.3's third outcome — the one M10 never
--                                    built, because M10 only ever upholds.
--   3 · assessment_attempt_full_state  a view layering §2's dispute state onto
--                                    024's `assessment_attempt_evidence`
--                                    (`evidence_revoked`), so a reader asks one
--                                    place for "evidence | evidence_revoked |
--                                    disputed" (V.10.1, O.3.a).
--   4 · EVIDENCE TOMBSTONES         `binary_deleted_at` / `binary_deleted_reason`
--                                    on `evidence` (007, frozen for Mistake DNA,
--                                    extended additively exactly as 024 already
--                                    extended `occurrences`). O.5's "delete a
--                                    category": binaries destroyed, the row and
--                                    its `content_hash` remain, so `occurrences`
--                                    — which reference `evidence` with
--                                    `ON DELETE RESTRICT` — never orphan.
--   5 · revoke_all_parent_connections_for_deletion()  O.5's "delete the
--                                    account": every active connection revokes
--                                    in the same act, reusing 029's own
--                                    `revoked`/`revoked_by` shape rather than a
--                                    new one.
--
-- Every table here is append-only by the SAME THREE LAYERS 016 and 024 already
-- established: policy omission (no UPDATE/DELETE policy for `authenticated`),
-- a REVOKE for the service role's own client-library path, and a trigger that
-- refuses UPDATE/DELETE outright — because RLS does not bind the service role,
-- and everything M18's own server code writes through runs as it (024's own
-- stated reason, reused verbatim).
--
-- ADDITIVE ONLY. Idempotent; safe to re-run. Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · CORRECTION_REQUESTS — O.3's one entry point, append-only
--
-- The OUTCOME is decided by `lib/correction.ts`'s `classifyOutcome()` before
-- this row is ever built, and travels here as data rather than being
-- recomputed by a later reader — two implementations of "which of the three
-- arms did this take" is exactly the drift M1 exists to prevent.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.correction_requests (
  correction_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  target_type   TEXT        NOT NULL
                 CHECK (target_type IN ('question','assessment_attempt','occurrence','declaration')),
  target_id     TEXT        NOT NULL,

  claim         TEXT        NOT NULL CHECK (length(trim(claim)) > 0),
  reason        TEXT        NOT NULL CHECK (length(trim(reason)) > 0),
  claim_kind    TEXT        NOT NULL CHECK (claim_kind IN ('mechanical','judgement')),

  -- O.3's three arms, exactly. A correction that could not classify into one
  -- of these is not a correction this table can hold.
  outcome       TEXT        NOT NULL
                 CHECK (outcome IN ('auto_accepted','accepted_mechanical','disputed')),

  -- Set once, by whatever completed the append this outcome required — the
  -- superseding EVENT_SUPERSEDED for an accepted correction, or the dispute
  -- row's id for a disputed one. NULL only in the instant between the request
  -- being classified and the append it demands actually landing.
  resolution_ref TEXT,

  requested_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- O.2: a student-declared target is always auto_accepted; a verified target
  -- is never auto_accepted (it is either mechanically checked, or disputed).
  -- Stated here as a constraint so the two tables (this and `lib/correction.ts`'s
  -- `evidenceClassFor`) cannot silently disagree about which targets may
  -- self-accept.
  CONSTRAINT correction_requests_declaration_autoaccepts CHECK (
    (target_type = 'declaration' AND outcome = 'auto_accepted')
    OR (target_type <> 'declaration' AND outcome <> 'auto_accepted')
  )
);

CREATE INDEX IF NOT EXISTS correction_requests_student_idx
  ON public.correction_requests (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS correction_requests_target_idx
  ON public.correction_requests (target_type, target_id);

COMMENT ON TABLE public.correction_requests IS
  'Architecture O.3. Append-only. outcome is decided once, by lib/correction.ts, before the row is written, and never recomputed by a reader.';

ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS correction_requests_select_own ON public.correction_requests;
CREATE POLICY correction_requests_select_own ON public.correction_requests
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- No INSERT/UPDATE/DELETE policy for `authenticated` — every write is
-- server-side, under the student's identity taken from their verified session
-- and never from a request body (D.1.a), the same posture 024 uses for
-- `assessment_attempts` and 029 uses for every parent-space table.
REVOKE INSERT, UPDATE, DELETE ON public.correction_requests FROM anon, authenticated;

-- The one legal movement after INSERT: attaching `resolution_ref` once, and
-- only forward. Every other column, and every DELETE, is refused — including
-- to the service role, per 024 §6's own reasoning.
CREATE OR REPLACE FUNCTION public.correction_requests_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.resolution_ref IS NULL
     AND NEW.resolution_ref IS NOT NULL
     AND NEW.correction_id  IS NOT DISTINCT FROM OLD.correction_id
     AND NEW.student_id     IS NOT DISTINCT FROM OLD.student_id
     AND NEW.target_type    IS NOT DISTINCT FROM OLD.target_type
     AND NEW.target_id      IS NOT DISTINCT FROM OLD.target_id
     AND NEW.claim          IS NOT DISTINCT FROM OLD.claim
     AND NEW.reason         IS NOT DISTINCT FROM OLD.reason
     AND NEW.claim_kind     IS NOT DISTINCT FROM OLD.claim_kind
     AND NEW.outcome        IS NOT DISTINCT FROM OLD.outcome
     AND NEW.requested_at   IS NOT DISTINCT FROM OLD.requested_at THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'correction_request %: append-only (O.3, PRINCIPLES 3.2). A correction is appended and never edited or removed.',
    OLD.correction_id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS correction_requests_append_only_trg ON public.correction_requests;
CREATE TRIGGER correction_requests_append_only_trg
  BEFORE UPDATE OR DELETE ON public.correction_requests
  FOR EACH ROW EXECUTE FUNCTION public.correction_requests_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · ASSESSMENT_ATTEMPT_DISPUTES — O.3's third outcome
--
-- F.8's third row, the arm M10 never built: "target is verified and the claim
-- is a judgement → DISPUTE. The original stands." Mirrors
-- `assessment_question_revocations` (024) in shape and in append-only
-- discipline, for a DIFFERENT purpose — a revocation says the evidence was
-- WITHDRAWN; a dispute says the evidence STANDS, MARKED. V.10.1: "the attempt
-- is marked disputed and excluded from every dimension in both directions."
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assessment_attempt_disputes (
  dispute_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id UUID        NOT NULL REFERENCES public.correction_requests(correction_id) ON DELETE RESTRICT,
  student_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Either the attempt or the question the dispute stands against — a
  -- `question` correction may predate any attempt existing at all.
  attempt_id    UUID        REFERENCES public.assessment_attempts(attempt_id) ON DELETE RESTRICT,
  question_id   UUID        REFERENCES public.assessment_questions(question_id) ON DELETE RESTRICT,

  reason        TEXT        NOT NULL CHECK (length(trim(reason)) > 0),

  -- O.3.a: "never silently rejected, never silently wins." `open` is the
  -- standing state — the ONLY state a correction can create. `upheld` and
  -- `stood_down` exist as the shape a human/curation resolution would take
  -- (O.3.b), and this migration writes no path that reaches either: nothing
  -- in M18 adjudicates a judgement claim, so the schema can HOLD a resolution
  -- without this pass being able to MANUFACTURE one.
  status        TEXT        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','upheld','stood_down')),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT        CHECK (resolved_by IS NULL OR resolved_by IN ('operator')),

  opened_at     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT assessment_attempt_disputes_names_one CHECK (
    attempt_id IS NOT NULL OR question_id IS NOT NULL
  ),
  CONSTRAINT assessment_attempt_disputes_resolution_shape CHECK (
    (status = 'open' AND resolved_at IS NULL AND resolved_by IS NULL)
    OR (status <> 'open' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS assessment_attempt_disputes_attempt_idx
  ON public.assessment_attempt_disputes (attempt_id) WHERE attempt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS assessment_attempt_disputes_question_idx
  ON public.assessment_attempt_disputes (question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS assessment_attempt_disputes_student_idx
  ON public.assessment_attempt_disputes (student_id, opened_at DESC);

COMMENT ON TABLE public.assessment_attempt_disputes IS
  'Architecture O.3.a / F.8 row 3 / V.10.1. A judgement claim against verified evidence. The original attempt is never edited — this table only ever ADDS a standing marker, visible in the record, in memory, and in export.';

ALTER TABLE public.assessment_attempt_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessment_attempt_disputes_select_own ON public.assessment_attempt_disputes;
CREATE POLICY assessment_attempt_disputes_select_own ON public.assessment_attempt_disputes
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

REVOKE INSERT, UPDATE, DELETE ON public.assessment_attempt_disputes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.assessment_attempt_disputes_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;

  -- The one permitted movement: open -> {upheld, stood_down}, once, with both
  -- resolution fields set together. Everything else, and DELETE, is refused.
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'open' AND NEW.status IN ('upheld','stood_down')
     AND NEW.resolved_at IS NOT NULL AND NEW.resolved_by IS NOT NULL
     AND NEW.dispute_id    IS NOT DISTINCT FROM OLD.dispute_id
     AND NEW.correction_id IS NOT DISTINCT FROM OLD.correction_id
     AND NEW.student_id    IS NOT DISTINCT FROM OLD.student_id
     AND NEW.attempt_id    IS NOT DISTINCT FROM OLD.attempt_id
     AND NEW.question_id   IS NOT DISTINCT FROM OLD.question_id
     AND NEW.reason        IS NOT DISTINCT FROM OLD.reason
     AND NEW.opened_at     IS NOT DISTINCT FROM OLD.opened_at THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'dispute %: a dispute is opened and only ever resolved forward, once (O.3.a). It is never edited back to open, and never removed.',
    OLD.dispute_id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS assessment_attempt_disputes_append_only_trg ON public.assessment_attempt_disputes;
CREATE TRIGGER assessment_attempt_disputes_append_only_trg
  BEFORE UPDATE OR DELETE ON public.assessment_attempt_disputes
  FOR EACH ROW EXECUTE FUNCTION public.assessment_attempt_disputes_append_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · assessment_attempt_full_state — evidence | evidence_revoked | disputed,
-- IN ONE PLACE
--
-- 024's `assessment_attempt_evidence` already derives `evidence_revoked` from
-- `assessment_question_revocations`. This view adds the dispute half without
-- touching that one (024 is registered in the ledger with its own checksum).
-- V.10.1: an OPEN dispute excludes the attempt from every dimension IN BOTH
-- DIRECTIONS — so `disputed` outranks `evidence` here, but NEVER outranks
-- `evidence_revoked`: a revoked question's attempt was already withdrawn, and
-- a later dispute against it cannot un-withdraw it into merely "disputed".
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.assessment_attempt_full_state
  WITH (security_invoker = true)
AS
  SELECT
    e.*,
    EXISTS (
      SELECT 1 FROM public.assessment_attempt_disputes d
      WHERE d.status = 'open'
        AND (d.attempt_id = e.attempt_id OR d.question_id = e.question_id)
    ) AS disputed,
    CASE
      WHEN e.evidence_revoked THEN 'evidence_revoked'
      WHEN EXISTS (
        SELECT 1 FROM public.assessment_attempt_disputes d
        WHERE d.status = 'open'
          AND (d.attempt_id = e.attempt_id OR d.question_id = e.question_id)
      ) THEN 'disputed'
      ELSE 'evidence'
    END AS evidence_state
  FROM public.assessment_attempt_evidence e;

COMMENT ON VIEW public.assessment_attempt_full_state IS
  'V.10.1 / O.3.a. evidence_state distinguishes disputed (verified attempt, standing challenge, EXCLUDED from scoring in both directions) from evidence_revoked (withdrawn) and evidence (counts). Every score reader (M14) and every parent/export reader must filter through this view or assessment_attempt_evidence, never assessment_attempts directly.';

GRANT SELECT ON public.assessment_attempt_full_state TO authenticated;

-- V.10.1's SCORING half: "excluded from every dimension in both directions."
-- `unrevoked_assessment_questions` (024) already excludes a withdrawn question
-- from coverage/scoring; this view is the same predicate PLUS "and has no open
-- dispute", so `lib/score-recompute-server.ts` (M18-3) and the M14 daily close
-- read ONE view for "may this question's answer count right now" rather than
-- two predicates a caller could apply out of order or forget one of.
CREATE OR REPLACE VIEW public.assessment_score_eligible_questions
  WITH (security_invoker = true)
AS
  SELECT q.*
  FROM public.unrevoked_assessment_questions q
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_attempt_disputes d
    WHERE d.status = 'open' AND d.question_id = q.question_id
  );

COMMENT ON VIEW public.assessment_score_eligible_questions IS
  'V.10.1: a disputed attempt is excluded from every score dimension in BOTH directions. unrevoked_assessment_questions (024) minus any question with an open dispute. The score engine (M14) and the parent projection (029) must both read this view, or the exclusion is one-directional in practice.';

GRANT SELECT ON public.assessment_score_eligible_questions TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · EVIDENCE TOMBSTONES — O.5 / V.10.6
--
-- "Delete a category (e.g. all evidence images). Binaries are destroyed;
-- metadata and content_hash are retained as tombstones so the occurrences
-- that reference them stay valid. Occurrences are not orphaned — ON DELETE
-- RESTRICT makes cascade deletion of referenced evidence structurally
-- impossible, and must not be worked around."
--
-- So the row is NEVER deleted by this path — that RESTRICT already makes it
-- impossible while any occurrence exists, and this migration does not add a
-- second door around it. What "delete a category" can do to a row is exactly
-- two nullable columns, additive to 007 exactly as 024 additively extended
-- `occurrences`.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS binary_deleted_at TIMESTAMPTZ;

ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS binary_deleted_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evidence_tombstone_shape'
  ) THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_tombstone_shape CHECK (
      (binary_deleted_at IS NULL AND binary_deleted_reason IS NULL)
      OR (binary_deleted_at IS NOT NULL AND binary_deleted_reason IS NOT NULL)
    );
  END IF;
END $$;

COMMENT ON COLUMN public.evidence.binary_deleted_at IS
  'O.5 / V.10.6. Set when the underlying storage object was destroyed by a category deletion. The ROW is never deleted — occurrences reference it with ON DELETE RESTRICT (007) — so this is the tombstone: the fact of the binary existing survives without the bytes.';
COMMENT ON COLUMN public.evidence.binary_deleted_reason IS
  'Plain language, set together with binary_deleted_at. Never both null and one set — same both-or-neither discipline as score_history.restatement_of/_reason (027).';

-- `binary_deleted_at` moves once, forwards, and nothing else on the row moves
-- at all — 007's own comment already establishes evidence has no UPDATE
-- policy for `authenticated`; this trigger is the same third layer 016/024
-- install, binding the service role too, since the deletion endpoint runs as
-- it.
CREATE OR REPLACE FUNCTION public.evidence_tombstone_forward_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'evidence %: rows are never deleted (O.5) — only the binary, via binary_deleted_at. occurrences reference this row with ON DELETE RESTRICT and must never orphan.',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.binary_deleted_at IS NOT NULL AND NEW.binary_deleted_at IS DISTINCT FROM OLD.binary_deleted_at THEN
    RAISE EXCEPTION
      'evidence %: binary_deleted_at is written once and never changed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.id             IS DISTINCT FROM OLD.id
     OR NEW.student_id   IS DISTINCT FROM OLD.student_id
     OR NEW.type         IS DISTINCT FROM OLD.type
     OR NEW.storage_ref  IS DISTINCT FROM OLD.storage_ref
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
    RAISE EXCEPTION
      'evidence %: only binary_deleted_at/binary_deleted_reason may move on an existing row (PRINCIPLES 3.2)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evidence_tombstone_forward_only_trg ON public.evidence;
CREATE TRIGGER evidence_tombstone_forward_only_trg
  BEFORE UPDATE OR DELETE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.evidence_tombstone_forward_only();


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · ACCOUNT DELETION'S PARENT-SPACE HALF — O.5 / V.10.8
--
-- "Parent connections revoke; parent-held reports are invalidated
-- server-side." 029's `revoke_parent_connection()` already does the immediate,
-- no-cache-TTL revoke (V.8.6) for ONE connection, called by the student
-- naming it. Account deletion needs the same act for EVERY active connection
-- at once, and `get_parent_projection()` (029 §7) already re-checks
-- `state = 'active'` on every single call — so the moment this function runs,
-- the very next parent read 404s. There is no separate "report" row to
-- invalidate (029's reports are generated live from this same check, never
-- persisted); revoking the connection IS invalidating every report that would
-- ever be generated from it, structurally, not as a second step that could be
-- forgotten.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.revoke_all_parent_connections_for_deletion(
  p_student_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_count INT;
BEGIN
  -- Callable only by the account owner or the service role performing the
  -- deletion on their behalf — never by an arbitrary authenticated caller
  -- naming someone else's id.
  IF auth.uid() IS DISTINCT FROM p_student_id AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'revoke_all_parent_connections_for_deletion: caller does not own this account' USING ERRCODE = '42501';
  END IF;

  UPDATE public.parent_connections
     SET state = 'revoked', revoked_at = now(), revoked_by = 'system'
   WHERE student_id = p_student_id AND state = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_all_parent_connections_for_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_all_parent_connections_for_deletion(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.revoke_all_parent_connections_for_deletion(UUID) IS
  'O.5 / V.10.8. Every active parent_connections row for the student revokes in one act. get_parent_projection (029 §7) re-checks state=active on every call with no cache, so the next parent read 404s immediately — there is no separate report artefact to invalidate.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5b · THE EXPORTS BUCKET — O.1's bundle, at rest, exactly as private as
-- evidence
--
-- Same posture as 019's `evidence` bucket, for the same reason: an export
-- bundle contains everything evidence does, plus the record's full shape.
-- `<student_id>/<export_job_id>.json` — no public URL, ever; reads are signed
-- or server-side (`lib/storage.ts`'s own discipline, restated here for a
-- second bucket rather than assumed to travel with it).
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exports', 'exports', FALSE, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS exports_objects_select_own ON storage.objects;
CREATE POLICY exports_objects_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- No client INSERT/UPDATE/DELETE policy. Written only by the export job,
-- which runs as the service role.


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · VERIFICATION — the file checks its own claims
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE bad_policy TEXT;
BEGIN
  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('correction_requests','assessment_attempt_disputes')
    AND cmd <> 'SELECT'
  LIMIT 1;
  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'a data-ownership table has a non-SELECT policy (%) — every write must be server-side (D.1.a)', bad_policy;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'correction_requests_append_only_trg') THEN
    RAISE EXCEPTION '030 did not install the append-only guard on correction_requests (M18-2)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_attempt_disputes_append_only_trg') THEN
    RAISE EXCEPTION '030 did not install the append-only guard on assessment_attempt_disputes (V.10.1)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'evidence_tombstone_forward_only_trg') THEN
    RAISE EXCEPTION '030 did not install the tombstone guard on evidence (V.10.6)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'assessment_attempt_full_state'
  ) THEN
    RAISE EXCEPTION '030 did not create assessment_attempt_full_state — V.10.1 has nowhere to read disputed from';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'assessment_score_eligible_questions'
  ) THEN
    RAISE EXCEPTION '030 did not create assessment_score_eligible_questions — V.10.1''s bidirectional exclusion has no scoring-side view';
  END IF;

  -- 024's own guards must still be standing; this file is additive only.
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assessment_attempts_append_only_trg') THEN
    RAISE EXCEPTION '030 has disturbed 024''s append-only guard on assessment_attempts; it is additive and must not';
  END IF;

  RAISE NOTICE '030: data ownership ready — correction_requests, assessment_attempt_disputes, evidence tombstones, and account-deletion parent revocation.';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · NO UPDATE PATH on assessment_attempts or assessment_questions. Both
--   remain exactly as 023/024 left them — a correction against either always
--   proceeds through lib/assessment-revocation.ts's existing append (a NEW
--   attempt row, or a revocation row), never an edit to the graded row.
-- · NO auto-adjudication of a dispute. §2's `upheld`/`stood_down` states exist
--   in the schema because O.3.b anticipates a human/curation process; this
--   migration writes no function that can reach either. A dispute this build
--   creates stays `open` until a later, explicitly human-operated migration
--   or admin tool resolves it.
-- · NO stored `ParentReport` table. 029 never persisted one — every parent
--   read is generated live by get_parent_projection() — so "reports
--   invalidate" is the connection-state check that function already performs,
--   made total by §5's bulk revoke, not a new artefact to expire.
-- · NO DELETE path anywhere in this file, for anything, except the one this
--   file explicitly REFUSES (evidence rows) and the one 007/024 already
--   refuse (attempts, occurrences via RESTRICT).
-- · IT DOES NOT APPLY ITSELF. scripts/check-migrations.mjs reports 030
--   UNAPPLIED until a human runs it in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '030',
  '030_data_ownership.sql',
  'b3f509c71a69e517dc0486b64608ae033eb9170e316e6e770ff7419670b1b1d9',
  'self'
);
