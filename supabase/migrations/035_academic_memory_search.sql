-- ═══════════════════════════════════════════════════════════════════════════
-- 035_academic_memory_search.sql   ·   M23-1
--
-- WHAT THIS CLOSES
--
-- Architecture Part H.3 ("Indexing and search") and EXECUTION_PLAN M23-1:
-- *"Five-layer indexing; FTS + pgvector — no separate search service (U.2)."*
--
-- H.3 IS NOT A NEW DATASTORE. It is three indexes over the SAME Postgres the
-- rest of the product already writes to:
--
--   1. Structured — B-tree/composite indexes matching the query shapes. This
--      one is ALREADY DONE. `occurrences_concept_idx`, `patterns_leaf_
--      severity_idx` (007_mistakes.sql:301,209), `academic_record_studied_
--      not_assessed_idx` (026), `academic_events_concept_idx` (015) already
--      cover the query shapes H.4's five example questions need. Nothing new
--      is added here for that reason.
--
--   2. Lexical — Postgres `tsvector` over `declared_text`, question stems,
--      concept labels, marker notes. NEW, this migration.
--
--   3. Semantic — `pgvector` embeddings over concept labels and declaration
--      text ONLY. Deliberately NOT over answers or evidence content: H.3's own
--      words — *"embedding the student's own wrong answers creates a
--      similarity surface with no academic query behind it and a real privacy
--      cost."* NEW, this migration.
--
-- `CREATE EXTENSION IF NOT EXISTS vector` is the one new capability this
-- database gains. Nothing else does — there is no second service, no second
-- source of truth for "what exists" (H.1.a), and the index is rebuildable
-- from L1 exactly the way H.3 requires: `search_vector` columns are
-- GENERATED ALWAYS, so a lexical index needs no backfill job and cannot drift
-- from the row it describes. The `*_embedding` columns are plain nullable
-- `vector` columns rather than generated, because an embedding requires a
-- model call this migration does not make (see the note at the bottom).
--
-- THIS FILE IS WRITTEN, NOT APPLIED (M23's ground rules). Verified structurally
-- by tests/academic-memory.test.mjs — the same posture tests/data-ownership
-- .test.mjs and tests/recommendations.test.mjs take for prior migrations: the
-- SQL text is read and asserted against, because there is no live database in
-- this environment to run it against.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── pgvector, guarded ────────────────────────────────────────────────────────
-- IF NOT EXISTS: some Supabase projects ship pgvector pre-enabled for other
-- reasons. This statement is a no-op on those, and the only new capability on
-- everything else.
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════
-- LEXICAL — tsvector + GIN, one per H.3's named field
-- ═══════════════════════════════════════════════════════════════════════════

-- `concepts` — "concept labels". One generated column over the full display
-- path (subject → chapter → topic → name), because a student's own words for
-- a concept rarely match only the leaf name ("the wobbling top thing" hits
-- `topic`, not `name`).
ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(topic, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(chapter, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(subject, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS concepts_search_vector_idx
  ON public.concepts USING GIN (search_vector);

-- `session_concepts.declared_text` — "declaration text", the student's own
-- words (022's V.2.1: immutable once written). NULL-tolerant: a resolved
-- session_concept with no declared_text produces a NULL tsvector, which GIN
-- simply omits, exactly the H.1.a-consistent behaviour — the index describes
-- what is there and invents nothing for what is not.
ALTER TABLE public.session_concepts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(declared_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS session_concepts_search_vector_idx
  ON public.session_concepts USING GIN (search_vector);

-- `academic_events.declared_text` — the same field, at the event layer (L1).
-- `session_concepts` is L2 (derived, rebuildable); this is the L1 fact it was
-- built from, so both carry the index rather than only the derivation, per
-- H.1.a's "may read downward" — a query answered from L1 directly does not
-- need L2 to exist first.
ALTER TABLE public.academic_events
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(declared_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS academic_events_search_vector_idx
  ON public.academic_events USING GIN (search_vector);

-- `assessment_questions.stem` — "question stems".
ALTER TABLE public.assessment_questions
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(stem, ''))) STORED;

CREATE INDEX IF NOT EXISTS assessment_questions_search_vector_idx
  ON public.assessment_questions USING GIN (search_vector);

-- `occurrences.marker_note` — "marker notes". `topic` is already covered by
-- the structured `occurrences_concept_idx` and by `concepts.search_vector`
-- through the FK, so only the free-text marker note is new here.
ALTER TABLE public.occurrences
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(marker_note, ''))) STORED;

CREATE INDEX IF NOT EXISTS occurrences_search_vector_idx
  ON public.occurrences USING GIN (search_vector);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEMANTIC — pgvector, over concept labels and declaration text ONLY (H.3)
--
-- 1536 dims: a conventional embedding width (matches, e.g., OpenAI
-- text-embedding-3-small and Voyage's `voyage-2` family) and NOT a figure
-- read off any embedding model already configured in this codebase — none
-- is, today (`lib/concept-resolution.ts:26-36` explains why concept
-- resolution deliberately stayed lexical rather than embedding-based). The
-- width is a placeholder the population job (below) must match to whichever
-- embedding model it actually calls; `vector(1536)` is not a commitment to a
-- specific provider. Nullable — an embedding is not knowable without a model
-- call, and H.1.a forbids this migration from fabricating one. Population is
-- a follow-on job (noted at the bottom of this file); querying and indexing
-- are ready the moment it runs.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS label_embedding vector(1536);

ALTER TABLE public.session_concepts
  ADD COLUMN IF NOT EXISTS declared_text_embedding vector(1536);

-- IVFFlat over cosine distance. `lists = 100` is the pgvector-recommended
-- starting point for a table in the tens-of-thousands-of-rows range this
-- product's concept taxonomy and per-student declarations sit in; re-tuning
-- `lists` as the table grows is an operational change, not a schema one.
-- `WHERE ... IS NOT NULL` because IVFFlat is built over populated rows only —
-- an index over an all-NULL column at migration time is legal but useless,
-- and Postgres will happily maintain it as rows are populated later.
CREATE INDEX IF NOT EXISTS concepts_label_embedding_idx
  ON public.concepts USING ivfflat (label_embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS session_concepts_declared_text_embedding_idx
  ON public.session_concepts USING ivfflat (declared_text_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · Does not embed `student_answer`, `expected_answer`, or `marker_note`.
--   H.3: "not over answers or evidence content ... a similarity surface with
--   no academic query behind it and a real privacy cost."
-- · Does not backfill `label_embedding` or `declared_text_embedding`. That
--   backfill calls an embedding model, which is an M23-follow-on job
--   (EXECUTION_PLAN, "jobs/cron additions ... additive; each lands with the
--   milestone that needs it") — not something a migration file can honestly
--   do, and this milestone does not apply migrations or call external models
--   from a job either. `lib/academic-memory/query-planner.ts` documents the
--   query this index serves once populated (`semanticConceptQuery`); it is
--   correct today and simply returns zero rows until the column is filled,
--   which is the honest state for an index with no data yet, not a defect.
-- · Does not touch `concept_resolution.ts`'s existing lexical/fuzzy resolver
--   (`resolveConceptText`, `SEMANTIC_THRESHOLD`). That resolver already
--   answers "which concept did the student mean" deterministically and
--   without a model; the planner uses it first and the FTS index here as the
--   second-line, broader-recall fallback.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '035',
  '035_academic_memory_search.sql',
  '80f334487e9484b75ffcc5c910a2b8425e6d75926b5e3987ba71ba8c78c5aacc',
  'self'
);
