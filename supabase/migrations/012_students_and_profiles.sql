-- ═══════════════════════════════════════════════════════════════════════════
-- 012_students_and_profiles.sql   ·   M5-1
--
-- WHAT THIS CLOSES
--
-- Architecture C.2 (`Student`) and C.3 (`StudentProfile`), and S.1's row
-- *"`user_data` flat columns — ADAPT — profile columns migrate to versioned
-- `student_profiles`"*. The CURRENT FACT recorded at C.3 is exact:
--
--   > Profile lives in 18 flat `user_data` columns *and* in
--   > `localStorage["ledger-profile"]`, and `lib/user-data.ts:123` returns
--   > `{ ...(data as UserData), ...localProfile }` — **localStorage wins over
--   > Postgres.**
--
-- This migration builds the two tables that end that arrangement:
--
--   `students`          — the durable identity anchor. One row per
--                         `auth.users` row. Nothing about the student, only
--                         that the student exists.
--   `student_profiles`  — what the student has DECLARED about themselves,
--                         as an append-only version chain rather than a row
--                         that gets overwritten.
--
--
-- WHY THE PROFILE IS VERSIONED, IN ONE SENTENCE FROM C.3
--
--   > A board change retroactively reinterprets every prior event. Without a
--   > version chain, a student who switches CBSE→IB in Grade 11 silently
--   > rewrites the meaning of their Grade 10 record.
--
-- So there is no UPDATE path on a profile. A change is a new row at
-- `version + 1`, carrying `effective_from`, `changed_by` and `change_reason`,
-- and the previous row keeps its values forever with `is_current = FALSE`.
-- The identity of a version is `(student_id, version)`, exactly as C.3
-- specifies, and "which one is live" is a partial unique index — not a
-- convention, not application discipline, an index the database enforces.
--
--
-- WHY THERE IS NO INSERT OR UPDATE POLICY, AND WHAT REPLACES IT
--
-- This is the data-integrity half of M5-2 and the reason it lives in SQL
-- rather than in TypeScript.
--
-- Today `lib/user-data.ts:149-152` changes one profile field by loading the
-- whole row, spreading it, and upserting the result. Between the read and the
-- write, any other tab, device or cron write to a DIFFERENT field of the same
-- row is silently reverted — last writer wins, and the loser is never told.
-- Relocating that pattern onto a new table would have changed nothing.
--
-- So `student_profiles` grants the student SELECT and nothing else. There is
-- no INSERT policy, no UPDATE policy, no DELETE policy: under Postgres RLS
-- that denies each of those by construction. The one write path is
-- `public.set_student_profile()` below — `SECURITY DEFINER`, so it can write
-- past those policies, and it:
--
--   1. resolves the writer from `auth.uid()`, never from an argument, so a
--      caller cannot name someone else's `student_id`;
--   2. takes `FOR UPDATE` on the caller's `students` row first, so two
--      concurrent calls SERIALISE instead of racing;
--   3. reads the current version and appends `version + 1` inside that same
--      transaction, so the version chain is gapless and no field carried
--      forward can be a stale value read before someone else's write.
--
-- A NULL argument means "carry this field forward from the current version"
-- and never "set this field to NULL". Explicit clearing is `p_clear`, a list
-- of field names — because "unset" and "unchanged" must be distinguishable,
-- and a merge that cannot tell them apart is how the old code lost data.
--
-- The result is that a partial profile write is one statement in one
-- transaction under one lock. There is no window between the read and the
-- write in which anything can be lost.
--
--
-- ADDITIVE ONLY — THE `user_data` COLUMNS ARE NOT DROPPED HERE
--
-- Same reasoning as `011_service_state.sql`, and the same shape of follow-up:
-- this file is written to be applied to a database that is still serving the
-- old read path, so the old columns must keep working until the new path is
-- deployed and confirmed. The drop statements are written out, commented, at
-- the foot of this file. Section 6 backfills the existing flat columns into
-- version 1 of each student's chain, so nothing is stranded.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- NOT APPLIED to any database by the milestone that wrote it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. `students` — the identity anchor (architecture C.2) ─────────────────
-- Deliberately almost empty. C.2: "Key fields: `created_at`, `deleted_at
-- NULL`, `data_region`" and "partition key of every other student-scoped
-- table". Everything a student can CHANGE about themselves lives in the
-- profile chain, not here, so that this row can be the stable thing every
-- future foreign key points at.
--
-- Entitlement is NOT here, and must never be added: C.2 records as a CURRENT
-- FACT to keep verbatim that tier lives in `auth.users.app_metadata.tier`
-- (`lib/tier.ts:30-36`), deliberately outside the student-writable row.
CREATE TABLE IF NOT EXISTS students (
  student_id  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  data_region TEXT        NOT NULL DEFAULT 'in'
);

COMMENT ON TABLE students IS
  'The durable identity anchor (M5-1, architecture C.2). One row per auth.users row, created on first sign-in via public.ensure_student(). Deletion is a tombstone in deleted_at plus cascade (Part O.5), never an in-place edit.';
COMMENT ON COLUMN students.deleted_at IS
  'Soft-delete tombstone. A non-NULL value means the account is deleted; the row itself is never removed, so foreign keys from the academic record stay resolvable.';
COMMENT ON COLUMN students.data_region IS
  'Where this student''s data is held. Single-valued today; the column exists so a second region is a data change rather than a schema change.';

-- ── 2. `student_profiles` — the version chain (architecture C.3) ───────────
CREATE TABLE IF NOT EXISTS student_profiles (
  student_id     UUID        NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  version        INT         NOT NULL CHECK (version > 0),

  -- Declared curriculum. All nullable: a profile that does not yet know the
  -- answer must be representable, because §2.6 ratifies asking two questions
  -- and the rest of these fields are therefore usually unknown at first write.
  board          TEXT,
  grade          TEXT,
  stream         TEXT,
  target_exam    TEXT,
  subjects       TEXT[],
  interests      TEXT[],

  -- Retained so the backfill in section 6 is lossless. `PRODUCT_DECISIONS`
  -- §2.6 does not ratify asking a student for a learning or communication
  -- style, so the rebuilt onboarding never writes this; it exists to carry
  -- forward what the retired eight-step flow already collected.
  ai_profile     JSONB,

  -- Provenance of THIS version.
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by     TEXT        NOT NULL DEFAULT 'student'
                 CHECK (changed_by IN ('student', 'system', 'backfill:012')),
  change_reason  TEXT,

  is_current     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (student_id, version)
);

COMMENT ON TABLE student_profiles IS
  'Append-only profile version chain (M5-1, architecture C.3). A change is a new row at version+1, never an UPDATE: a board change retroactively reinterprets every prior event, so the value that was true at the time must remain readable. Written only through public.set_student_profile().';
COMMENT ON COLUMN student_profiles.subjects IS
  'The subjects the student declares they are studying. One of the two questions PRODUCT_DECISIONS §2.6 ratifies for onboarding.';
COMMENT ON COLUMN student_profiles.interests IS
  'Non-curricular interests, architecture C.3. Distinct from `subjects` and NOT asked at onboarding. Left NULL by the 012 backfill — see section 6.';
COMMENT ON COLUMN student_profiles.is_current IS
  'Exactly one TRUE row per student, enforced by the partial unique index below rather than by application discipline.';
COMMENT ON COLUMN student_profiles.changed_by IS
  'Who caused this version to exist. "backfill:012" marks a row derived from the pre-M5 user_data columns rather than from an act by the student.';

-- THE INVARIANT, AS AN INDEX. Two concurrent writers cannot both leave a
-- current row: the second one to commit violates this index and is rolled
-- back. This is the structural backstop behind the lock in
-- `set_student_profile()` — the lock makes the common case correct, the index
-- makes the impossible case impossible.
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_one_current
  ON student_profiles (student_id) WHERE is_current;

-- Reading a student's own history, newest first.
CREATE INDEX IF NOT EXISTS student_profiles_chain
  ON student_profiles (student_id, version DESC);

-- ── 3. RLS: read your own, write through the function or not at all ───────
ALTER TABLE students         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_select_own ON students;
CREATE POLICY students_select_own ON students
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- No INSERT policy: rows are created by public.ensure_student().
-- No UPDATE policy: nothing on this row is student-editable.
-- No DELETE policy: deletion is a tombstone written by the service role
--   (architecture O.5), never a row disappearing under the academic record.

DROP POLICY IF EXISTS student_profiles_select_own ON student_profiles;
CREATE POLICY student_profiles_select_own ON student_profiles
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- No INSERT policy. No UPDATE policy. No DELETE policy. See the header:
-- the single write path is public.set_student_profile(), and a student who
-- cannot UPDATE cannot rewrite what they declared last term.

-- ── 4. `ensure_student()` — idempotent identity creation ──────────────────
-- Called on first sign-in and again by `set_student_profile()`, so onboarding
-- is one round trip and a student whose row was never created (every account
-- that exists today) is repaired on their next write rather than erroring.
CREATE OR REPLACE FUNCTION public.ensure_student()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ensure_student: no authenticated caller'
      USING ERRCODE = '28000';
  END IF;

  INSERT INTO students (student_id) VALUES (v_uid)
  ON CONFLICT (student_id) DO NOTHING;

  RETURN v_uid;
END;
$$;

REVOKE ALL     ON FUNCTION public.ensure_student() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ensure_student() TO authenticated, service_role;

COMMENT ON FUNCTION public.ensure_student() IS
  'Creates the caller''s students row if absent and returns auth.uid(). SECURITY DEFINER because students carries no INSERT policy; the identity is taken from auth.uid() and never from an argument.';

-- ── 5. `set_student_profile()` — the ONLY profile write path ──────────────
-- This function is M5-2's done-when expressed in SQL: "no unguarded whole-row
-- read-modify-write remains". The read and the write are one transaction, the
-- caller's identity row is locked first so concurrent calls serialise, and a
-- field the caller did not mention is carried forward from the version that
-- is current AT THAT MOMENT — not from a value the client read seconds ago.
--
-- NULL argument  → carry the field forward unchanged.
-- Name in p_clear → set the field to NULL in the new version.
-- Both           → p_clear wins; it is the explicit instruction.
CREATE OR REPLACE FUNCTION public.set_student_profile(
  p_board         TEXT   DEFAULT NULL,
  p_grade         TEXT   DEFAULT NULL,
  p_stream        TEXT   DEFAULT NULL,
  p_target_exam   TEXT   DEFAULT NULL,
  p_subjects      TEXT[] DEFAULT NULL,
  p_interests     TEXT[] DEFAULT NULL,
  p_ai_profile    JSONB  DEFAULT NULL,
  p_change_reason TEXT   DEFAULT NULL,
  p_clear         TEXT[] DEFAULT '{}'
)
RETURNS student_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_cur  student_profiles;
  v_new  student_profiles;
  v_lock UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'set_student_profile: no authenticated caller'
      USING ERRCODE = '28000';
  END IF;

  PERFORM public.ensure_student();

  -- Serialise concurrent writers on the identity row. Everything below runs
  -- with this lock held, which is what makes the read-then-append safe.
  SELECT student_id INTO v_lock FROM students
   WHERE student_id = v_uid
     FOR UPDATE;

  SELECT * INTO v_cur FROM student_profiles
   WHERE student_id = v_uid AND is_current;

  -- Retire the outgoing version. Zero rows on the first write; exactly one
  -- thereafter, because of student_profiles_one_current.
  UPDATE student_profiles SET is_current = FALSE
   WHERE student_id = v_uid AND is_current;

  INSERT INTO student_profiles (
    student_id, version,
    board, grade, stream, target_exam, subjects, interests, ai_profile,
    effective_from, changed_by, change_reason, is_current
  ) VALUES (
    v_uid,
    COALESCE(v_cur.version, 0) + 1,
    CASE WHEN 'board'       = ANY(p_clear) THEN NULL ELSE COALESCE(p_board,       v_cur.board)       END,
    CASE WHEN 'grade'       = ANY(p_clear) THEN NULL ELSE COALESCE(p_grade,       v_cur.grade)       END,
    CASE WHEN 'stream'      = ANY(p_clear) THEN NULL ELSE COALESCE(p_stream,      v_cur.stream)      END,
    CASE WHEN 'target_exam' = ANY(p_clear) THEN NULL ELSE COALESCE(p_target_exam, v_cur.target_exam) END,
    CASE WHEN 'subjects'    = ANY(p_clear) THEN NULL ELSE COALESCE(p_subjects,    v_cur.subjects)    END,
    CASE WHEN 'interests'   = ANY(p_clear) THEN NULL ELSE COALESCE(p_interests,   v_cur.interests)   END,
    CASE WHEN 'ai_profile'  = ANY(p_clear) THEN NULL ELSE COALESCE(p_ai_profile,  v_cur.ai_profile)  END,
    now(), 'student', p_change_reason, TRUE
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

REVOKE ALL     ON FUNCTION public.set_student_profile(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], JSONB, TEXT, TEXT[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_student_profile(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], JSONB, TEXT, TEXT[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.set_student_profile(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], JSONB, TEXT, TEXT[]) IS
  'The only write path for a student profile (M5-2). Appends version+1 under FOR UPDATE on the caller''s students row; NULL means carry forward, p_clear means set NULL. Replaces the whole-row read-modify-write at lib/user-data.ts:139-142.';

-- ── 6. Backfill: the flat `user_data` columns become version 1 ────────────
-- Guarded by a catalogue probe, for the reason 011 gives: several `user_data`
-- columns in this repository were introduced by hand-run ALTERs and the
-- repository cannot assume any particular shape (Finding A.5.a, T1).
--
-- `changed_by = 'backfill:012'` so a derived row is never mistaken for an act
-- by the student. `ON CONFLICT DO NOTHING` makes a re-run a no-op rather than
-- a second version-1 attempt.
--
-- ON THE INTEREST → SUBJECT MAPPING. The retired onboarding asked *"Which
-- subjects interest you? Pick at least 2"* and stored the answer in
-- `user_data.interests`. That answer is a subject declaration, and §2.6
-- ratifies subjects as one of the two onboarding questions, so it lands in
-- `subjects`. `student_profiles.interests` — non-curricular interests per C.3
-- — is left NULL, because nothing was ever collected for it and inventing a
-- value would be a §7 violation.
DO $$
BEGIN
  IF to_regclass('public.user_data') IS NULL THEN
    RAISE NOTICE '012 backfill: user_data absent — students/student_profiles start empty';
    RETURN;
  END IF;

  -- Identity first: a profile row has a foreign key to it.
  INSERT INTO students (student_id, created_at)
  SELECT u.id, COALESCE(u.created_at, now())
  FROM user_data u
  WHERE EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)
  ON CONFLICT (student_id) DO NOTHING;

  INSERT INTO student_profiles (
    student_id, version, board, grade, stream, target_exam, subjects,
    ai_profile, effective_from, changed_by, change_reason, is_current
  )
  SELECT
    u.id,
    1,
    NULLIF(u.board,  ''),
    NULLIF(u.grade,  ''),
    NULLIF(u.stream, ''),
    NULLIF(u."targetExam", ''),
    CASE
      WHEN jsonb_typeof(u.interests) = 'array'
       AND jsonb_array_length(u.interests) > 0
      THEN ARRAY(SELECT jsonb_array_elements_text(u.interests))
      ELSE NULL
    END,
    CASE WHEN jsonb_typeof(u."aiProfile") = 'object' THEN u."aiProfile" ELSE NULL END,
    COALESCE(u.updated_at, u.created_at, now()),
    'backfill:012',
    'flat user_data columns, migrated by 012',
    TRUE
  FROM user_data u
  WHERE EXISTS (SELECT 1 FROM students s WHERE s.student_id = u.id)
    AND (
      NULLIF(u.board, '')  IS NOT NULL OR
      NULLIF(u.grade, '')  IS NOT NULL OR
      NULLIF(u.stream, '') IS NOT NULL OR
      NULLIF(u."targetExam", '') IS NOT NULL OR
      jsonb_typeof(u.interests) = 'array' OR
      jsonb_typeof(u."aiProfile") = 'object'
    )
  ON CONFLICT (student_id, version) DO NOTHING;

  RAISE NOTICE '012 backfill: students and version-1 profiles derived from user_data';
END $$;

-- ── 7. Verification the founder can run after applying this file ──────────
DO $$
DECLARE
  n_write_pol INT;
  n_multi     INT;
BEGIN
  -- The write posture is the whole point. A student-facing INSERT or UPDATE
  -- policy on the profile chain would reopen the read-modify-write path.
  SELECT count(*) INTO n_write_pol
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('students', 'student_profiles')
    AND cmd <> 'SELECT';

  IF n_write_pol <> 0 THEN
    RAISE EXCEPTION
      'students/student_profiles must carry SELECT policies only (found % write policies) — writes go through set_student_profile()',
      n_write_pol;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'student_profiles' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'students' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on both M5-1 tables';
  END IF;

  SELECT count(*) INTO n_multi FROM (
    SELECT student_id FROM student_profiles WHERE is_current
    GROUP BY student_id HAVING count(*) > 1
  ) x;

  IF n_multi <> 0 THEN
    RAISE EXCEPTION 'student_profiles: % students carry more than one current version', n_multi;
  END IF;

  RAISE NOTICE 'M5-1: students + student_profiles present, RLS on, SELECT-only policies, one current version per student.';
END $$;

-- ── 8. THE FOLLOW-UP DROP — do not run with this file ─────────────────────
-- Run only after (a) the ledger records version 012 against this database,
-- (b) the backfilled version-1 rows have been compared against the columns
-- they came from, and (c) the deployed build reads the profile through
-- `lib/student-context.ts` rather than through the flat columns. Written out
-- here so the follow-up migration is a paste, not a rewrite.
--
--   ALTER TABLE user_data DROP COLUMN IF EXISTS grade;
--   ALTER TABLE user_data DROP COLUMN IF EXISTS board;
--   ALTER TABLE user_data DROP COLUMN IF EXISTS stream;
--   ALTER TABLE user_data DROP COLUMN IF EXISTS interests;
--   ALTER TABLE user_data DROP COLUMN IF EXISTS "targetExam";
--   ALTER TABLE user_data DROP COLUMN IF EXISTS "aiProfile";
--   ALTER TABLE user_data DROP COLUMN IF EXISTS "onboardingDone";

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '012',
  '012_students_and_profiles.sql',
  '4944844d171ce82eac751295802186cd61fab3272230d6812cf8b94646be1644',
  'self'
);
