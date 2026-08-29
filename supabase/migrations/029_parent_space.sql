-- ═══════════════════════════════════════════════════════════════════════════
-- 029_parent_space.sql   ·   M17
--
-- Implements architecture Part N and PRODUCT_DECISIONS §9.2 (Option B —
-- structural privacy). Replaces the unauthenticated `parentCode` mechanism
-- (`app/api/parent/[code]/route.ts`) with:
--
--   parent_invitations     · student-initiated, single-use, hashed at rest
--   parent_connections     · real auth.users identity on both sides
--   parent_share_policies  · versioned, append-only, ALL CATEGORIES DEFAULT OFF
--   parent_access_log      · append-only, per-read, student-visible
--
-- and five VIEWS that are the structural enforcement N.5 requires: each
-- selects ONLY the columns N.4's `Shared` table names, from tables that never
-- carry `Private` data. A parent-facing read is scoped to these views alone —
-- `occurrences`, `evidence`, `patterns.label`, `patterns.concept_id`,
-- `academic_record.concept_ref` and every raw-answer column are never named
-- in this file. "Not filtered — absent" (V.8.3): there is no forbidden column
-- for a filtering bug to leak, because no query here ever selects one.
--
-- ADDITIVE ONLY. Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- NOT APPLIED to any database by the milestone that wrote it.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · PARENT_INVITATIONS — student-initiated, single-use, hashed at rest
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_invitations (
  invitation_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  email         TEXT        NOT NULL CHECK (email = lower(email) AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),

  -- The token itself is never stored. Only its SHA-256 travels here, computed
  -- in TypeScript (lib/parent-space.ts), so a leaked database row cannot be
  -- replayed as a live invitation.
  token_hash    CHAR(64)    NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),

  status        TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','cancelled','expired')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  accepted_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at  TIMESTAMPTZ,

  CONSTRAINT parent_invitations_accepted_shape CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL)
    OR (status <> 'accepted' AND accepted_at IS NULL AND accepted_by IS NULL)
  )
);

COMMENT ON TABLE public.parent_invitations IS
  'Architecture N.3: single-use token, hashed at rest, short expiry. The bare parentCode link this replaces required no authentication and no expiry at all.';

CREATE INDEX IF NOT EXISTS parent_invitations_student_idx
  ON public.parent_invitations (student_id, created_at DESC);

-- One live invitation per (student, email) at a time — re-inviting the same
-- address cancels-then-recreates in TypeScript rather than piling up rows.
CREATE UNIQUE INDEX IF NOT EXISTS parent_invitations_pending_unique
  ON public.parent_invitations (student_id, email) WHERE status = 'pending';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · PARENT_CONNECTIONS — a real authenticated identity on both sides
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_connections (
  connection_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  parent_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_id UUID        REFERENCES public.parent_invitations(invitation_id) ON DELETE SET NULL,

  state         TEXT        NOT NULL DEFAULT 'active' CHECK (state IN ('active','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  revoked_by    TEXT        CHECK (revoked_by IN ('student','system')),

  CONSTRAINT parent_connections_revoked_shape CHECK (
    (state = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    OR (state = 'active' AND revoked_at IS NULL AND revoked_by IS NULL)
  ),
  -- A parent cannot connect to their own student row under any circumstance.
  CONSTRAINT parent_connections_not_self CHECK (parent_id <> student_id)
);

COMMENT ON TABLE public.parent_connections IS
  'Architecture N.3/N.7. A parent is auth.users, not a URL fragment. Revocation is state=revoked with no cache/TTL — every projection read re-checks this row (V.8.6).';

-- At most one ACTIVE connection per (student, parent). A revoked row is kept
-- for history; reconnecting after a revoke is a new row, not a resurrection
-- of the old one, so the access log stays attributable to the right era.
CREATE UNIQUE INDEX IF NOT EXISTS parent_connections_active_unique
  ON public.parent_connections (student_id, parent_id) WHERE state = 'active';

CREATE INDEX IF NOT EXISTS parent_connections_parent_idx
  ON public.parent_connections (parent_id, state);
CREATE INDEX IF NOT EXISTS parent_connections_student_idx
  ON public.parent_connections (student_id, state);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · PARENT_SHARE_POLICIES — versioned, append-only, ALL CATEGORIES OFF
--
-- Same idiom as `student_profiles` (012): a change is a new row at
-- version+1, never an UPDATE, so "what was shared, when" is itself part of
-- the record (N.7) and V.8.5's old-report-unchanged guarantee has something
-- to point `policy_version` at.
--
-- SEVEN CATEGORIES, EXACTLY N.4'S SHARED TABLE. There is no eighth column
-- for "weak areas" or "assessment outcomes" — N.4.a: those are `Private`
-- permanently, not pending a decision, and the schema does not carry a
-- setting that could turn them on. `digest_enabled` is not a Shared category;
-- it is a delivery preference (does a report get emailed), gated by the
-- categories a student has already turned on.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_share_policies (
  student_id          UUID        NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  version             INT         NOT NULL CHECK (version > 0),

  score_trajectory    BOOLEAN     NOT NULL DEFAULT FALSE,
  dimension_breakdown BOOLEAN     NOT NULL DEFAULT FALSE,
  subject_state       BOOLEAN     NOT NULL DEFAULT FALSE,
  progress_fixing     BOOLEAN     NOT NULL DEFAULT FALSE,
  consistency         BOOLEAN     NOT NULL DEFAULT FALSE,
  upcoming_exams      BOOLEAN     NOT NULL DEFAULT FALSE,
  assessment_activity BOOLEAN     NOT NULL DEFAULT FALSE,

  digest_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,

  effective_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by          TEXT        NOT NULL DEFAULT 'student' CHECK (changed_by IN ('student','system')),
  change_reason       TEXT,
  is_current          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (student_id, version)
);

COMMENT ON TABLE public.parent_share_policies IS
  'Architecture N.4/N.6. Append-only version chain — a change is version+1, never an UPDATE, so an old report''s policy_version keeps pointing at exactly what was true when it was sent (V.8.5). Every column here defaults FALSE (V.8.1/V.8.2): a new connection starts fully Private within the Shared model.';

CREATE UNIQUE INDEX IF NOT EXISTS parent_share_policies_one_current
  ON public.parent_share_policies (student_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS parent_share_policies_chain
  ON public.parent_share_policies (student_id, version DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · PARENT_ACCESS_LOG — append-only, per-read, student-visible (V.8.6/V.8.7)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_access_log (
  access_id       BIGSERIAL   PRIMARY KEY,
  student_id      UUID        NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  parent_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id   UUID        NOT NULL REFERENCES public.parent_connections(connection_id) ON DELETE CASCADE,
  policy_version  INT         NOT NULL,
  categories_read TEXT[]      NOT NULL DEFAULT '{}',
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parent_access_log IS
  'Architecture N.7: "the student can see who accessed what, and when." Append-only for everyone including the service role — the accountability half of student-controlled sharing must not itself be editable.';

CREATE INDEX IF NOT EXISTS parent_access_log_student_idx
  ON public.parent_access_log (student_id, accessed_at DESC);

CREATE OR REPLACE FUNCTION public.parent_access_log_refuse_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'parent_access_log is append-only for everyone, including the service role. % refused.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS parent_access_log_refuse_mutation_trg ON public.parent_access_log;
CREATE TRIGGER parent_access_log_refuse_mutation_trg
  BEFORE UPDATE OR DELETE ON public.parent_access_log
  FOR EACH ROW EXECUTE FUNCTION public.parent_access_log_refuse_mutation();

REVOKE UPDATE, DELETE ON public.parent_access_log FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT           ON public.parent_access_log FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · THE PARENT-SAFE VIEWS — the structural enforcement itself
--
-- Every one of these is scoped to columns N.4 lists under `Shared`. None
-- selects a Private column, and none can be made to by a runtime bug, because
-- the SELECT list is fixed here, in schema, not assembled by application code.
-- ═══════════════════════════════════════════════════════════════════════════

-- Score + trajectory, and the dimension breakdown. Both draw from the same
-- row; N.4 splits them into two Shared categories because a parent may see
-- the total without the per-dimension detail.
CREATE OR REPLACE VIEW public.parent_score_view AS
SELECT
  user_id AS student_id,
  captured_on,
  total, pqa, syllabus, mistakes, consistency,
  confidence
FROM public.score_history;

COMMENT ON VIEW public.parent_score_view IS
  'N.4 "Score + trajectory" / "Dimension breakdown". No streak column — banned outright (PRODUCT_DECISIONS §9.3).';

-- Subject-level state: coverage counts only. `concept_ref`, `concept_id` and
-- every other identifying column on academic_record are absent from this
-- view — a parent reading it cannot recover which concept moved, only how
-- many did, per subject, per coverage bucket.
CREATE OR REPLACE VIEW public.parent_subject_view AS
SELECT
  student_id,
  subject,
  count(*) FILTER (WHERE coverage_state = 'proven')                  AS proven_count,
  count(*) FILTER (WHERE coverage_state IN ('studied','assessed'))   AS studied_count,
  count(*) FILTER (WHERE coverage_state IN ('untouched','declared')) AS untouched_count
FROM public.academic_record
WHERE subject IS NOT NULL
GROUP BY student_id, subject;

COMMENT ON VIEW public.parent_subject_view IS
  'N.4 "Subject-level state" — coverage counts, never the concept a count is about.';

-- Progress on what is being fixed: N.4.a's substitute for the banned "weak
-- areas" category. Counts only, from `patterns.status` — never `label`,
-- `concept_id`, `error_type` or `recurrence_count`, so no pattern can be
-- named, even in aggregate, through this view.
CREATE OR REPLACE VIEW public.parent_progress_view AS
SELECT
  student_id,
  count(*) FILTER (WHERE status IN ('practising','acknowledged'))                          AS being_worked_count,
  count(*) FILTER (WHERE status = 'resolved' AND resolved_at >= now() - interval '30 days') AS resolved_this_period_count
FROM public.patterns
WHERE tier = 'concept'
GROUP BY student_id;

COMMENT ON VIEW public.parent_progress_view IS
  'N.4 "Progress on what is being fixed" — counts of patterns worked and closed, without naming them (N.4.a). "Weak areas" and per-topic miss counts have no column here to be leaked from.';

-- Consistency of verification: a count, not a streak. No `state` other than
-- VERIFIED reaches this view, and no absence trigger is derivable from it —
-- an inactivity alert requires a "days since" figure this view does not emit.
CREATE OR REPLACE VIEW public.parent_consistency_view AS
SELECT
  student_id,
  count(*) FILTER (WHERE state = 'VERIFIED' AND closed_at >= now() - interval '30 days') AS verified_sessions_count
FROM public.study_sessions
GROUP BY student_id;

COMMENT ON VIEW public.parent_consistency_view IS
  'N.4 "Consistency of verification" — sessions verified in the trailing 30 days. Not a streak (PRODUCT_DECISIONS §9.3); no absence trigger is expressible from this shape.';

-- Assessment activity: volume only, never per-question data.
CREATE OR REPLACE VIEW public.parent_assessment_view AS
SELECT
  student_id,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS assessments_completed_count
FROM public.assessments
GROUP BY student_id;

COMMENT ON VIEW public.parent_assessment_view IS
  'N.4 "Assessment activity" — count completed, no per-question data. coverage_manifest and every scored answer are absent from this view.';

-- Upcoming exams: logistics only. `marks` (this student's entered percentage
-- scores) is NOT one of N.4's seven Shared categories and this view never
-- reads the `marks` column of `user_data` — only `exams`, and only four of
-- its own keys.
DO $$
BEGIN
  IF to_regclass('public.user_data') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.parent_exams_view AS
      SELECT
        u.id AS student_id,
        jsonb_agg(jsonb_build_object(
          'name',    e->>'name',
          'subject', e->>'subject',
          'date',    e->>'date',
          'board',   e->>'board'
        )) AS exams
      FROM public.user_data u
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(u.exams, '[]'::jsonb)) AS e
      GROUP BY u.id
    $view$;
  END IF;
END $$;

-- Every view here is read only by SECURITY DEFINER functions below (which
-- run as the owning role and are therefore unaffected by this REVOKE); it
-- exists so a compromised anon/authenticated session cannot query a view
-- directly and enumerate every student's aggregates.
DO $$
DECLARE v TEXT;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'parent_score_view','parent_subject_view','parent_progress_view',
    'parent_consistency_view','parent_assessment_view'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v);
  END LOOP;
  IF to_regclass('public.parent_exams_view') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.parent_exams_view FROM PUBLIC, anon, authenticated';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · WRITE PATHS — every one SECURITY DEFINER, every one the ONLY way in
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.parent_invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_share_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_access_log     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_invitations_select_own ON public.parent_invitations;
CREATE POLICY parent_invitations_select_own ON public.parent_invitations
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS parent_connections_select_student ON public.parent_connections;
CREATE POLICY parent_connections_select_student ON public.parent_connections
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
DROP POLICY IF EXISTS parent_connections_select_parent ON public.parent_connections;
CREATE POLICY parent_connections_select_parent ON public.parent_connections
  FOR SELECT TO authenticated USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS parent_share_policies_select_own ON public.parent_share_policies;
CREATE POLICY parent_share_policies_select_own ON public.parent_share_policies
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS parent_access_log_select_own ON public.parent_access_log;
CREATE POLICY parent_access_log_select_own ON public.parent_access_log
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- No INSERT/UPDATE/DELETE policy on any of the four tables. Every write below
-- goes through a SECURITY DEFINER function that resolves identity from
-- auth.uid(), never from an argument (M5-1's discipline, kept).

-- ── 6.1 create_parent_invitation() ─────────────────────────────────────────
-- The plaintext token is generated in TypeScript (crypto.getRandomValues, the
-- same discipline the retired SharePanel already used for parentCode) and
-- never reaches this function or this table — only its hash does.
CREATE OR REPLACE FUNCTION public.create_parent_invitation(
  p_email      TEXT,
  p_token_hash CHAR(64),
  p_expires_at TIMESTAMPTZ
) RETURNS public.parent_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.parent_invitations;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'create_parent_invitation: no authenticated caller' USING ERRCODE = '28000';
  END IF;
  PERFORM public.ensure_student();

  -- Re-inviting the same address cancels the old pending invite first, so the
  -- pending-unique index never blocks a legitimate retry.
  UPDATE public.parent_invitations
     SET status = 'cancelled', cancelled_at = now()
   WHERE student_id = v_uid AND email = lower(p_email) AND status = 'pending';

  INSERT INTO public.parent_invitations (student_id, email, token_hash, expires_at)
  VALUES (v_uid, lower(p_email), p_token_hash, p_expires_at)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_parent_invitation(TEXT, CHAR, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parent_invitation(TEXT, CHAR, TIMESTAMPTZ) TO authenticated, service_role;

-- ── 6.2 accept_parent_invitation() ─────────────────────────────────────────
-- Called by the PARENT, authenticated as themselves. Resolves the invitation
-- from the hash of the token they were sent; a caller who does not hold the
-- plaintext token cannot compute a matching hash.
CREATE OR REPLACE FUNCTION public.accept_parent_invitation(
  p_token_hash CHAR(64)
) RETURNS public.parent_connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent UUID := auth.uid();
  v_inv    public.parent_invitations;
  v_conn   public.parent_connections;
BEGIN
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'accept_parent_invitation: no authenticated caller' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_inv FROM public.parent_invitations
   WHERE token_hash = p_token_hash FOR UPDATE;

  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'invitation not found';
  END IF;

  IF v_inv.status = 'accepted' THEN
    RAISE EXCEPTION 'invitation already accepted' USING ERRCODE = '22023';
  END IF;

  IF v_inv.status <> 'pending' OR v_inv.expires_at < now() THEN
    UPDATE public.parent_invitations SET status = 'expired'
     WHERE invitation_id = v_inv.invitation_id AND status = 'pending';
    RAISE EXCEPTION 'invitation is no longer valid (expired or cancelled)';
  END IF;

  -- A parent cannot accept an invitation onto themselves.
  IF v_inv.student_id = v_parent THEN
    RAISE EXCEPTION 'a student cannot connect to themselves as a parent';
  END IF;

  UPDATE public.parent_invitations
     SET status = 'accepted', accepted_at = now(), accepted_by = v_parent
   WHERE invitation_id = v_inv.invitation_id;

  INSERT INTO public.parent_connections (student_id, parent_id, invitation_id, state)
  VALUES (v_inv.student_id, v_parent, v_inv.invitation_id, 'active')
  ON CONFLICT (student_id, parent_id) WHERE state = 'active' DO NOTHING
  RETURNING * INTO v_conn;

  IF v_conn IS NULL THEN
    SELECT * INTO v_conn FROM public.parent_connections
     WHERE student_id = v_inv.student_id AND parent_id = v_parent AND state = 'active';
  END IF;

  -- Every new connection starts with a fully-Private share policy (V.8.1,
  -- V.8.2) — version 1, every category FALSE — if the student has never set
  -- one. Idempotent: a re-connect after a revoke keeps the student's existing
  -- current policy rather than resetting it silently.
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_share_policies WHERE student_id = v_inv.student_id AND is_current
  ) THEN
    INSERT INTO public.parent_share_policies (student_id, version, changed_by, change_reason)
    VALUES (v_inv.student_id, 1, 'system', 'default policy on first parent connection — all categories OFF');
  END IF;

  RETURN v_conn;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_parent_invitation(CHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_parent_invitation(CHAR) TO authenticated, service_role;

-- ── 6.3 cancel_parent_invitation() ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_parent_invitation(
  p_invitation_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'cancel_parent_invitation: no authenticated caller' USING ERRCODE = '28000';
  END IF;
  UPDATE public.parent_invitations
     SET status = 'cancelled', cancelled_at = now()
   WHERE invitation_id = p_invitation_id AND student_id = v_uid AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_parent_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_parent_invitation(UUID) TO authenticated, service_role;

-- ── 6.4 revoke_parent_connection() — IMMEDIATE, no cache TTL (V.8.6) ───────
CREATE OR REPLACE FUNCTION public.revoke_parent_connection(
  p_connection_id UUID
) RETURNS public.parent_connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.parent_connections;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'revoke_parent_connection: no authenticated caller' USING ERRCODE = '28000';
  END IF;

  UPDATE public.parent_connections
     SET state = 'revoked', revoked_at = now(), revoked_by = 'student'
   WHERE connection_id = p_connection_id AND student_id = v_uid AND state = 'active'
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'connection not found, not yours, or already revoked';
  END IF;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_parent_connection(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_parent_connection(UUID) TO authenticated, service_role;

-- ── 6.5 set_parent_share_policy() — the only way categories change ────────
-- Same NULL-means-carry-forward / boolean-means-set discipline as
-- `set_student_profile()` (012), except every argument here already has an
-- unambiguous "unset" value (its own default), so there is no separate
-- p_clear list: passing NULL for a category means "leave it as it is."
CREATE OR REPLACE FUNCTION public.set_parent_share_policy(
  p_score_trajectory    BOOLEAN DEFAULT NULL,
  p_dimension_breakdown BOOLEAN DEFAULT NULL,
  p_subject_state       BOOLEAN DEFAULT NULL,
  p_progress_fixing     BOOLEAN DEFAULT NULL,
  p_consistency         BOOLEAN DEFAULT NULL,
  p_upcoming_exams      BOOLEAN DEFAULT NULL,
  p_assessment_activity BOOLEAN DEFAULT NULL,
  p_digest_enabled      BOOLEAN DEFAULT NULL,
  p_change_reason       TEXT    DEFAULT NULL
) RETURNS public.parent_share_policies
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_cur  public.parent_share_policies;
  v_new  public.parent_share_policies;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'set_parent_share_policy: no authenticated caller' USING ERRCODE = '28000';
  END IF;
  PERFORM public.ensure_student();

  PERFORM 1 FROM public.students WHERE student_id = v_uid FOR UPDATE;

  SELECT * INTO v_cur FROM public.parent_share_policies
   WHERE student_id = v_uid AND is_current;

  UPDATE public.parent_share_policies SET is_current = FALSE
   WHERE student_id = v_uid AND is_current;

  INSERT INTO public.parent_share_policies (
    student_id, version,
    score_trajectory, dimension_breakdown, subject_state, progress_fixing,
    consistency, upcoming_exams, assessment_activity, digest_enabled,
    changed_by, change_reason, is_current
  ) VALUES (
    v_uid, COALESCE(v_cur.version, 0) + 1,
    COALESCE(p_score_trajectory,    v_cur.score_trajectory,    FALSE),
    COALESCE(p_dimension_breakdown, v_cur.dimension_breakdown, FALSE),
    COALESCE(p_subject_state,       v_cur.subject_state,       FALSE),
    COALESCE(p_progress_fixing,     v_cur.progress_fixing,     FALSE),
    COALESCE(p_consistency,         v_cur.consistency,         FALSE),
    COALESCE(p_upcoming_exams,      v_cur.upcoming_exams,      FALSE),
    COALESCE(p_assessment_activity, v_cur.assessment_activity, FALSE),
    COALESCE(p_digest_enabled,      v_cur.digest_enabled,      FALSE),
    'student', p_change_reason, TRUE
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.set_parent_share_policy(BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_parent_share_policy(BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,TEXT) TO authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · get_parent_projection() — THE READ PATH, AND THE ONLY ONE
--
-- Called by the PARENT, authenticated as themselves. Every field it can
-- possibly return traces to one of the five views in §5 — there is no branch
-- of this function that selects from `occurrences`, `evidence`, `patterns`
-- (beyond `parent_progress_view`'s counts) or `academic_record` (beyond
-- `parent_subject_view`'s counts). Gating is by CATEGORY, assembled from the
-- current `parent_share_policies` row; a category left FALSE means its whole
-- key is absent from the returned object, not present-and-null.
--
-- Immediate revocation (V.8.6): the connection state is checked on every
-- call, not cached — a revoked connection fails here on its very next read.
-- Every call also appends a parent_access_log row (V.8.7) naming exactly
-- which categories were actually returned.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_parent_projection(
  p_student_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent UUID := auth.uid();
  v_conn   public.parent_connections;
  v_policy public.parent_share_policies;
  v_out    JSONB := '{}'::jsonb;
  v_cats   TEXT[] := '{}';
BEGIN
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'get_parent_projection: no authenticated caller' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_conn FROM public.parent_connections
   WHERE student_id = p_student_id AND parent_id = v_parent AND state = 'active';

  IF v_conn IS NULL THEN
    -- Deliberately one message for "never connected" and "revoked" — a
    -- distinguishing error would let a caller probe for which is true.
    RAISE EXCEPTION 'no active parent connection to this student' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_policy FROM public.parent_share_policies
   WHERE student_id = p_student_id AND is_current;

  -- No policy row is the same as every category FALSE. System-tier fields
  -- still populate below.
  v_out := jsonb_build_object(
    'system', jsonb_build_object(
      'connectionActive', TRUE,
      'connectionSince', v_conn.created_at,
      'policyVersion', COALESCE(v_policy.version, 0),
      'policyUpdatedAt', v_policy.effective_from
    )
  );

  IF COALESCE(v_policy.score_trajectory, FALSE) THEN
    v_out := v_out || jsonb_build_object('scoreTrajectory',
      (SELECT jsonb_agg(to_jsonb(s) - 'student_id' ORDER BY s.captured_on DESC)
         FROM (SELECT * FROM public.parent_score_view WHERE student_id = p_student_id
                ORDER BY captured_on DESC LIMIT 30) s));
    v_cats := v_cats || 'score_trajectory';
  END IF;

  IF COALESCE(v_policy.dimension_breakdown, FALSE) THEN
    v_out := v_out || jsonb_build_object('dimensionBreakdown',
      (SELECT to_jsonb(s) - 'student_id' FROM public.parent_score_view s
        WHERE student_id = p_student_id ORDER BY captured_on DESC LIMIT 1));
    v_cats := v_cats || 'dimension_breakdown';
  END IF;

  IF COALESCE(v_policy.subject_state, FALSE) THEN
    v_out := v_out || jsonb_build_object('subjectState',
      (SELECT jsonb_agg(to_jsonb(s) - 'student_id')
         FROM public.parent_subject_view s WHERE student_id = p_student_id));
    v_cats := v_cats || 'subject_state';
  END IF;

  IF COALESCE(v_policy.progress_fixing, FALSE) THEN
    v_out := v_out || jsonb_build_object('progressFixing',
      (SELECT to_jsonb(s) - 'student_id' FROM public.parent_progress_view s
        WHERE student_id = p_student_id));
    v_cats := v_cats || 'progress_fixing';
  END IF;

  IF COALESCE(v_policy.consistency, FALSE) THEN
    v_out := v_out || jsonb_build_object('consistency',
      (SELECT to_jsonb(s) - 'student_id' FROM public.parent_consistency_view s
        WHERE student_id = p_student_id));
    v_cats := v_cats || 'consistency';
  END IF;

  IF COALESCE(v_policy.upcoming_exams, FALSE) AND to_regclass('public.parent_exams_view') IS NOT NULL THEN
    v_out := v_out || jsonb_build_object('upcomingExams',
      (SELECT exams FROM public.parent_exams_view WHERE student_id = p_student_id));
    v_cats := v_cats || 'upcoming_exams';
  END IF;

  IF COALESCE(v_policy.assessment_activity, FALSE) THEN
    v_out := v_out || jsonb_build_object('assessmentActivity',
      (SELECT to_jsonb(s) - 'student_id' FROM public.parent_assessment_view s
        WHERE student_id = p_student_id));
    v_cats := v_cats || 'assessment_activity';
  END IF;

  INSERT INTO public.parent_access_log (student_id, parent_id, connection_id, policy_version, categories_read)
  VALUES (p_student_id, v_parent, v_conn.connection_id, COALESCE(v_policy.version, 0), v_cats);

  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.get_parent_projection(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_projection(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_parent_projection(UUID) IS
  'The only parent read path (architecture N.5). Every key it can emit traces to one of the five Shared views in §5; there is no branch that can select a Private column, because none is named anywhere in this function body. Logs every call to parent_access_log (V.8.7).';


-- ═══════════════════════════════════════════════════════════════════════════
-- 8 · VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE bad_policy TEXT;
BEGIN
  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('parent_invitations','parent_connections','parent_share_policies','parent_access_log')
    AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'a parent-space table has a non-SELECT policy (%) — every write must go through a SECURITY DEFINER function', bad_policy;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.parent_access_log'::regclass
      AND tgname = 'parent_access_log_refuse_mutation_trg'
  ) THEN
    RAISE EXCEPTION 'parent_access_log append-only trigger is missing';
  END IF;

  RAISE NOTICE '029: parent space ready — invitations, connections, share policies (all-off default), access log, and the five Shared views.';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · Does not touch `user_data.parentCode` / `.parentEmail` / `.parentDigestEnabled`.
--   Those columns are abandoned, not dropped — M17-1's done-when is that the
--   unauthenticated ROUTE is gone, and dropping columns from a live table is
--   a separate, riskier operation this milestone does not need to take.
-- · Does not backfill parent_connections from the old parentCode mechanism.
--   A bare code holder was never an authenticated identity, so there is
--   nothing honest to backfill — every existing "connection" was anonymous
--   access, not a relationship (Law 7: inventing one would be fabrication).
-- · Does not add a `parent_identities` table. A parent is exactly an
--   `auth.users` row; nothing about them needs a StudyLedger-specific
--   identity record beyond the connections that name their `parent_id`.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '029',
  '029_parent_space.sql',
  'd4916afef6966f472a9d24145515e449bd94395d9f92b80cc3b5ea2b8eb44768',
  'self'
);
