-- ═══════════════════════════════════════════════════════════════════════════
-- 008_ingestion.sql — THE PIPELINE LEDGER
--
-- Additive. Touches nothing from 007_mistakes.sql: the mistake schema is
-- frozen, and this sits beside it rather than inside it.
--
-- Three tables, one job each:
--
--   ingestion_runs    one attempt to turn a paper into memory
--   ingestion_stages  APPEND-ONLY history of every stage attempt, forever
--   ingestion_review  what the pipeline refused to guess at
--
-- WHY THESE EXIST. The runner promises deterministic, resumable, idempotent,
-- observable, append-only, explainable execution. Every one of those is a
-- promise about STATE, and state has to live somewhere durable. Without this
-- ledger a crash at stage 7 means re-reading the paper from stage 1, and
-- "why did it say that?" has no answer.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- INGESTION_RUNS — one pass over one paper
--
-- A replay is a NEW row pointing at the original through replay_of. History is
-- never overwritten, so a paper ingested today can be re-interpreted in 2030
-- against a better model, and both readings survive side by side.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The paper. NULL only between run creation and intake completing.
  -- RESTRICT because evidence outlives everything built on it (§4.9).
  evidence_id  UUID REFERENCES evidence(id) ON DELETE RESTRICT,

  status       TEXT NOT NULL DEFAULT 'running' CHECK (
                 status IN ('running', 'awaiting-confirmation', 'awaiting-review',
                            'completed', 'failed')),

  -- THE CONFIRMATION GATE, persisted.
  -- Until this is set, no commit-phase stage may execute. The runner enforces
  -- it in code; this column is the durable record of WHEN the student decided.
  confirmed_at TIMESTAMPTZ,

  -- Points at the ORIGINAL run, not the immediate parent, so a chain of
  -- replays stays flat and every reading of one paper is trivially groupable.
  replay_of    UUID REFERENCES ingestion_runs(id) ON DELETE RESTRICT,

  -- Provenance: source filename, upload channel, client version.
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A replay must not claim to be its own original.
  CONSTRAINT ingestion_runs_replay_not_self CHECK (replay_of IS NULL OR replay_of <> id)
);

CREATE INDEX IF NOT EXISTS ingestion_runs_student_idx  ON ingestion_runs (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_evidence_idx ON ingestion_runs (evidence_id);
CREATE INDEX IF NOT EXISTS ingestion_runs_replay_idx   ON ingestion_runs (replay_of);
CREATE INDEX IF NOT EXISTS ingestion_runs_status_idx   ON ingestion_runs (status)
  WHERE status IN ('running', 'awaiting-confirmation', 'awaiting-review');


-- ═══════════════════════════════════════════════════════════════════════════
-- INGESTION_STAGES — append-only, one row per ATTEMPT
--
-- A retry appends attempt n+1; it never edits attempt n. The unique constraint
-- on (run, stage, attempt) is what makes that structural rather than a
-- convention the application has to remember.
--
-- `output` is stored verbatim. That is what makes replay free: resuming reads
-- the ledger instead of re-calling a model, and re-running an unchanged stage
-- costs nothing.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ingestion_stages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,

  stage          TEXT NOT NULL CHECK (stage IN (
                   'intake', 'preprocess', 'vision-read', 'segment', 'annotations',
                   'answers', 'candidates', 'concept-match', 'propose',
                   'occurrences', 'pattern-merge', 'score', 'next-action')),

  attempt        INTEGER NOT NULL CHECK (attempt >= 1),

  -- Bumped when a stage's logic changes. Combined with input_hash it forms the
  -- memo key, so a version bump forces honest re-execution.
  version        TEXT NOT NULL,

  -- Identifies the input. Equal hash + equal version = reuse, do not re-run.
  input_hash     TEXT NOT NULL,

  status         TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'review')),

  -- The stage's typed output, verbatim. NULL unless succeeded.
  output         JSONB,

  confidence     NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  model          TEXT,

  started_at     TIMESTAMPTZ NOT NULL,
  completed_at   TIMESTAMPTZ NOT NULL,
  duration_ms    INTEGER NOT NULL CHECK (duration_ms >= 0),

  failure_reason TEXT,

  -- One row per attempt. Re-writing an attempt is impossible, not discouraged.
  CONSTRAINT ingestion_stages_attempt_unique UNIQUE (run_id, stage, attempt),

  -- Succeeded means output; not-succeeded means a reason. No silent nulls.
  CONSTRAINT ingestion_stages_outcome_shape CHECK (
    (status = 'succeeded' AND output IS NOT NULL AND failure_reason IS NULL)
    OR
    (status <> 'succeeded' AND failure_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ingestion_stages_run_idx ON ingestion_stages (run_id, stage, attempt DESC);

-- Resume asks exactly one question: "what succeeded most recently?"
CREATE INDEX IF NOT EXISTS ingestion_stages_success_idx
  ON ingestion_stages (run_id, stage, attempt DESC)
  WHERE status = 'succeeded';


-- ═══════════════════════════════════════════════════════════════════════════
-- INGESTION_REVIEW — what the pipeline refused to guess
--
-- Reaching this table is a SUCCESS, not a failure. A stage that declines below
-- the confidence floor has done its job: PRODUCT_PRINCIPLES §3.2 forbids
-- storing a claim, and law 7 forbids inventing one.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ingestion_review (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  stage      TEXT NOT NULL,

  -- What could not be decided, and every option considered, with rationale.
  -- The student is shown the alternatives, never a silent best guess.
  items      JSONB NOT NULL,

  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingestion_review_open_idx
  ON ingestion_review (run_id) WHERE resolved_at IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- A student may SEE everything the pipeline did with their paper — that is the
-- explainability guarantee, and it would be hollow if the history were hidden.
--
-- They may write nothing. The pipeline runs as the service role. The single
-- exception is confirmation, which is the student's decision to make and
-- theirs alone; it is granted through a narrow UPDATE policy below.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE ingestion_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_review ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ingestion_runs_select_own ON ingestion_runs;
CREATE POLICY ingestion_runs_select_own ON ingestion_runs
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- The student confirms. Nothing else about a run is theirs to change, and the
-- WITH CHECK makes status the only other field they can move — never backwards
-- into a state that would re-open the gate.
DROP POLICY IF EXISTS ingestion_runs_confirm_own ON ingestion_runs;
CREATE POLICY ingestion_runs_confirm_own ON ingestion_runs
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND confirmed_at IS NULL)
  WITH CHECK (auth.uid() = student_id AND confirmed_at IS NOT NULL);

DROP POLICY IF EXISTS ingestion_stages_select_own ON ingestion_stages;
CREATE POLICY ingestion_stages_select_own ON ingestion_stages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM ingestion_runs r WHERE r.id = run_id AND r.student_id = auth.uid())
  );

-- No INSERT, UPDATE or DELETE policy on ingestion_stages, for anyone.
-- The history is written by the service role and is append-only by construction.

DROP POLICY IF EXISTS ingestion_review_select_own ON ingestion_review;
CREATE POLICY ingestion_review_select_own ON ingestion_review
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM ingestion_runs r WHERE r.id = run_id AND r.student_id = auth.uid())
  );
