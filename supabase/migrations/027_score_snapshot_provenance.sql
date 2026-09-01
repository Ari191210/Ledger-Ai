-- ═══════════════════════════════════════════════════════════════════════════
-- 027_score_snapshot_provenance.sql   ·   M14-5 / M14-6
--
-- WHAT THIS IS FOR
--
-- EXECUTION_PLAN M14-5: *"Snapshots: `formula_version`, `confidence`,
-- `evidence_counts`, `input_watermark_event_id`. **ADAPT.** Done when: V.6.3,
-- V.6.8 — replay into an empty database reproduces every snapshot."*
--
-- Architecture R.9: *"Snapshots carry `formula_version`, `confidence`,
-- `evidence_counts` and `input_watermark_event_id`, making every historical row
-- reproducible."*
--
-- Architecture V.6.8: *"Replay the whole event stream into an empty database.
-- **Every snapshot reproduces**, given its `formula_version` and watermark."*
--
-- The verdict is **ADAPT**, so `score_history` (005) is extended rather than
-- replaced. Its best properties are the reason: it is written only by the
-- service role, it has no client INSERT/UPDATE/DELETE policy, and
-- `UNIQUE (user_id, captured_on)` already makes the daily close idempotent.
-- R.9 calls that write-posture *"the correct model"*. A new table would have
-- had to re-earn all three.
--
--
-- WHAT REPRODUCIBILITY ACTUALLY REQUIRES — the four columns, and a fifth
--
-- A snapshot reproduces only if a replay can recover EVERY argument the formula
-- saw. Four of those are M14-5's named columns:
--
--   formula_version           which arithmetic produced the row (J.6: a bulk
--                             recompute on a change of it writes NEW rows)
--   confidence                J.5's first-class output, stored beside the number
--   evidence_counts           what the row is a sum of — the counts the engine
--                             actually consumed, per dimension
--   input_watermark_event_id  the event-stream position it was computed FROM
--
-- The fifth is `as_of`, and leaving it out would have made the other four
-- decorative. `captured_on` is a DATE, and the engine's accuracy term is an
-- exponential decay in `asOfMs` (`lib/score-engine.ts`, v2's invariant I2).
-- Two computations of the same student on the same calendar day, eight hours
-- apart, produce different numbers — both correct. Without the exact instant, a
-- replay can reproduce the day but not the row, and V.6.8 says *"every
-- snapshot reproduces"*, not "every day approximately does". So `as_of` is
-- stored to the millisecond and the replay is exact.
--
--
-- WHY THE DIMENSION COLUMNS BECOME NULLABLE — J.3.a, in the schema
--
--   > Zero means *measured, and the measurement is zero.* Insufficient means
--   > *not measured.* Rendering the second as the first is a lie in the strict
--   > sense of Law 7.
--
-- 005 declared `total`, `pqa`, `syllabus`, `mistakes` and `consistency` NOT
-- NULL, which left the daily close no way to say *"not measured"* — the only
-- available value was `0`, which is the exact lie J.3.a names. `lib/score-engine.ts`
-- makes `insufficient evidence` an arm of a union with `points: null`, and a
-- column that cannot hold NULL would flatten that back into a zero on the way
-- to disk. So the NOT NULL constraints are dropped.
--
-- **No row loses data and no existing row becomes invalid.** Dropping NOT NULL
-- widens the domain; every historical row still satisfies the column. The range
-- CHECKs are untouched and stay correct, because `NULL BETWEEN 0 AND 1000` is
-- NULL, which a CHECK admits.
--
-- `score_state` records which of the two J.4 states the row is in, so a reader
-- never has to infer *"no score yet"* from a NULL it might mistake for a gap.
--
--
-- RESTATEMENT — V.6.9 and O.4.3, and what M14-6 needs from this file
--
-- O.4.3: *"**L3 snapshots are NOT rewritten.** A new snapshot is appended with
-- a `restatement_of` pointer and a reason. The history shows both the number we
-- believed and the correction — which is how a financial ledger handles a
-- restatement, and it is the only treatment compatible with Law 7."*
--
-- V.6.9: *"A month-old question is successfully disputed. Intervening snapshots
-- are **unchanged**; a new snapshot is appended with `restatement_of`."*
--
-- T3 names the cutover itself as the case this exists for: *"Some students will
-- move by hundreds of points in either direction, and the score's credibility
-- is the product's credibility. Mitigation: `formula_version` on snapshots, an
-- explicit restatement rather than a silent recompute (O.4.3)."*
--
-- So `restatement_of` and `restatement_reason` are added here, and M14-6's
-- cutover is the first thing that writes them: the first row a student receives
-- under `ledger-score/3.0.0` points at their last row under the old formula and
-- says, in the data, why the number moved. A score that changes formula without
-- that pointer is the silent recompute O.4.3 forbids.
--
-- **The daily UNIQUE constraint is deliberately NOT touched.** O.4.a's own
-- worked example puts the restatement on *"today's snapshot"* — one row per
-- user per day still holds, and the pointer rides on it. Relaxing the
-- constraint to admit a second row per day would trade the cron's idempotency
-- (a retried or double-fired close cannot corrupt the series) for a case the
-- architecture does not actually ask for.
--
--
-- WHAT THIS FILE DOES NOT DO
--
-- · NO BACKFILL. Pre-M14 rows get NULL `formula_version`, NULL `as_of`, NULL
--   `confidence` and an empty `evidence_counts`. Stamping them with a version
--   string would claim they were produced by an engine that did not exist when
--   they were written — PRINCIPLES §7. A NULL `formula_version` is the honest
--   reading: *"this row predates provenance and is not replayable."* M14-6's
--   restatement logic treats exactly that NULL as "the previous formula was
--   something else", which is true.
-- · NO CHANGE TO RLS. 005's posture is already R.9's model: SELECT-own only,
--   no client write policy of any kind. Nothing here widens it.
-- · NO DROP of `streak`, `pqa`, `syllabus`, `mistakes` or `consistency`. Five
--   surfaces outside M14's scope read those column names; the columns are
--   re-documented below rather than renamed, and the dimension they now carry
--   is stated in the COMMENT so a reader is not left mapping J.2 names onto
--   005 names by memory.
-- · IT DOES NOT APPLY ITSELF. `scripts/check-migrations.mjs` reports 027
--   UNAPPLIED until a human runs it in the Supabase SQL editor.
--
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Provenance: what produced this row, and from where ──────────────────

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS formula_version TEXT;

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS as_of TIMESTAMPTZ;

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3)
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS evidence_counts JSONB NOT NULL DEFAULT '{}'::jsonb;

-- R.10: *"Ordering: by server `seq`, never by client `occurred_at`."* The
-- watermark therefore carries BOTH the identity of the last event consumed and
-- its `seq`, because the identity alone does not tell a replay where to stop.
-- `academic_events` is HASH-partitioned on `student_id` with PRIMARY KEY
-- (student_id, event_id) (015), so a single-column FK to `event_id` is not
-- expressible; the pair is stored as data, exactly as `occurrences.supersedes`
-- already does for the same reason.
ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS input_watermark_event_id UUID;

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS input_watermark_seq BIGINT;

-- ── 2. J.3.a: `insufficient evidence` must be representable ────────────────

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS score_state TEXT
    CHECK (score_state IS NULL OR score_state IN ('baseline', 'scored'));

ALTER TABLE public.score_history ALTER COLUMN total       DROP NOT NULL;
ALTER TABLE public.score_history ALTER COLUMN pqa         DROP NOT NULL;
ALTER TABLE public.score_history ALTER COLUMN syllabus    DROP NOT NULL;
ALTER TABLE public.score_history ALTER COLUMN mistakes    DROP NOT NULL;
ALTER TABLE public.score_history ALTER COLUMN consistency DROP NOT NULL;

-- A scored row must have a total; a baseline row must not. This is V.6.1 as a
-- constraint rather than as a convention: *"a new account has no score, not
-- zero"*, and the database refuses to hold the other shape.
ALTER TABLE public.score_history
  DROP CONSTRAINT IF EXISTS score_history_state_total_agree;
ALTER TABLE public.score_history
  ADD CONSTRAINT score_history_state_total_agree CHECK (
    score_state IS NULL
    OR (score_state = 'scored'   AND total IS NOT NULL)
    OR (score_state = 'baseline' AND total IS NULL)
  );

-- ── 3. O.4.3 / V.6.9: restatement, never a silent recompute ────────────────

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS restatement_of BIGINT
    REFERENCES public.score_history(id) ON DELETE SET NULL;

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS restatement_reason TEXT;

-- A pointer with no reason is half a restatement. Either both or neither.
ALTER TABLE public.score_history
  DROP CONSTRAINT IF EXISTS score_history_restatement_complete;
ALTER TABLE public.score_history
  ADD CONSTRAINT score_history_restatement_complete CHECK (
    (restatement_of IS NULL AND restatement_reason IS NULL)
    OR (restatement_of IS NOT NULL AND restatement_reason IS NOT NULL)
  );

-- ── 4. Indexes ─────────────────────────────────────────────────────────────

-- "Which of this student's rows were produced by which formula" is the question
-- a cutover audit and a trajectory guard both ask (J.5: trajectory is
-- comparable only within one formula_version).
CREATE INDEX IF NOT EXISTS score_history_user_formula_idx
  ON public.score_history (user_id, formula_version, captured_on DESC);

-- "Show me every restatement" — the audit O.4.4 asks for.
CREATE INDEX IF NOT EXISTS score_history_restatement_idx
  ON public.score_history (restatement_of)
  WHERE restatement_of IS NOT NULL;

-- ── 5. What the columns mean ───────────────────────────────────────────────

COMMENT ON COLUMN public.score_history.formula_version IS
  'The engine that produced this row (lib/score-engine.ts FORMULA_VERSION). NULL for pre-M14 rows: honest, and not replayable. J.6 requires a change of this to write NEW rows, never to edit old ones.';

COMMENT ON COLUMN public.score_history.as_of IS
  'The exact instant the score is AS OF, to the millisecond. Required for V.6.8: the accuracy term decays in this value, so captured_on alone cannot reproduce the row.';

COMMENT ON COLUMN public.score_history.confidence IS
  'J.5. 0..1, computed from evidence volume, recency and breadth. Displayed beside the number: a 700 built on three assessments and a 700 built on forty are not the same claim.';

COMMENT ON COLUMN public.score_history.evidence_counts IS
  'What this row is a sum of — the per-dimension counts the engine consumed, plus the rows it refused. R.9. A figure that cannot say what it counted is a claim.';

COMMENT ON COLUMN public.score_history.input_watermark_event_id IS
  'The last academic_events row consumed. R.9 / O.4.2: a projection at or beyond an affected event is rebuilt by replay from here.';

COMMENT ON COLUMN public.score_history.input_watermark_seq IS
  'The server seq of input_watermark_event_id. R.10: ordering is by server seq, never by client occurred_at.';

COMMENT ON COLUMN public.score_history.score_state IS
  'J.4. `baseline` = no score yet and total IS NULL; `scored` = measured. NULL for pre-M14 rows.';

COMMENT ON COLUMN public.score_history.restatement_of IS
  'O.4.3 / V.6.9. The snapshot this row restates. Set on the first row a student receives under a new formula_version, so a cutover is an explicit restatement and never a silent recompute (T3).';

COMMENT ON COLUMN public.score_history.restatement_reason IS
  'Plain language, stored beside the pointer: why the number moved. PRINCIPLES: never let a figure move without the student being able to find out why.';

COMMENT ON COLUMN public.score_history.total IS
  'J.2, 0-1000. NULL means the student is below baseline and has NO score — J.3.a: not measured is not zero.';

COMMENT ON COLUMN public.score_history.pqa IS
  'J.2 Verified Performance, 0-400. Column name retained from 005 because five surfaces outside M14 read it. NULL = insufficient evidence.';

COMMENT ON COLUMN public.score_history.syllabus IS
  'J.2 Proven Coverage, 0-250. NULL = insufficient evidence.';

COMMENT ON COLUMN public.score_history.mistakes IS
  'J.2 Recovery, 0-200. NULL = insufficient evidence.';

COMMENT ON COLUMN public.score_history.consistency IS
  'J.2 Continuity, 0-150. NOT the retired Momentum/streak term, which PRODUCT_DECISIONS 9.3 deleted from scoring (M14-2). NULL = insufficient evidence.';

COMMENT ON COLUMN public.score_history.streak IS
  'RETIRED as a scoring input (PRODUCT_DECISIONS 9.3, M14-2). Written as 0 from ledger-score/3.0.0 onward and read by no dimension. Retained only because pre-M14 rows hold real values and PRINCIPLES 3.2 forbids erasing them.';

-- ── 6. Verification the founder can run after applying this file ───────────
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(c.name, ', ')
    INTO missing
    FROM (VALUES
      ('formula_version'), ('as_of'), ('confidence'), ('evidence_counts'),
      ('input_watermark_event_id'), ('input_watermark_seq'),
      ('score_state'), ('restatement_of'), ('restatement_reason')
    ) AS c(name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'score_history'
        AND column_name  = c.name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'score_history is missing: % — M14-5 snapshots are not reproducible', missing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'score_history'
       AND column_name = 'total' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'score_history.total is still NOT NULL — insufficient evidence cannot be stored as anything but a zero (J.3.a)';
  END IF;

  RAISE NOTICE 'score_history carries provenance. M14-5 snapshots are replayable; M14-6 may write restatements.';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '027',
  '027_score_snapshot_provenance.sql',
  'aed7e29f262b25214a5d2184725088f461dc4bdcadf4d3024310c33bb98e5dda',
  'self'
);
