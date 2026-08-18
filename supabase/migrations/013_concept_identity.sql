-- ═══════════════════════════════════════════════════════════════════════════
-- 013_concept_identity.sql — MERGES, TAXONOMY VERSION, ALIASES
--
-- EXECUTION_PLAN M6-2: *"Add `merged_into` and `taxonomy_version`. Done when:
-- concept merges are representable without rewriting history."*
-- EXECUTION_PLAN M6-3 needs somewhere for the ALIAS tier to read from.
--
-- ADDITIVE ONLY, and it does not touch `007_mistakes.sql`. Architecture C.2
-- classes `Concept` as **CURRENT FACT — exists**, and names exactly two new
-- columns as TARGET DESIGN. Editing 007 in place is the drift M1 exists to
-- prevent: the ledger records "this exact text was run", so a shipped migration
-- is never revised — it is extended by a later one.
--
--   1. concepts.merged_into      — a superseded concept POINTS at its
--                                  replacement instead of being deleted
--   2. concepts.taxonomy_version — which cut of the seeded tree a row came from
--   3. concept_aliases           — curated surface forms, the M6-3 alias tier
--
-- WHY A POINTER AND NOT A REWRITE. Occurrences, patterns and (from M7) every
-- academic event address concepts by id. If a merge deleted the loser and
-- repointed its references, the record would be rewritten retroactively —
-- PRINCIPLES §3.2, *"facts are immutable and never deleted; a correction
-- appends a superseding fact rather than editing history."* With a pointer, a
-- 2026 occurrence keeps pointing at the concept it was actually recorded
-- against, and resolution follows the pointer forward at read time. Nothing
-- about the past changes; only what the present calls it does.
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · MERGED_INTO — supersession without deletion (C.2)
--
-- ON DELETE RESTRICT matches the existing `parent_id` posture in 007: a concept
-- that anything points at cannot be removed. B.4: *"Concepts are never
-- hard-deleted … they are superseded, with a `merged_into` pointer so
-- historical references stay resolvable."*
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES concepts(id) ON DELETE RESTRICT;

-- A concept cannot supersede itself. Without this, one bad write makes the
-- merge chain an infinite loop for every reader, forever.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'concepts_merge_not_self'
  ) THEN
    ALTER TABLE concepts
      ADD CONSTRAINT concepts_merge_not_self
      CHECK (merged_into IS NULL OR merged_into <> id);
  END IF;
END $$;

-- Reverse lookup: "what was merged into this concept?" A merge is a curation
-- act that has to be reviewable, so the inverse must be cheap.
CREATE INDEX IF NOT EXISTS concepts_merged_into_idx
  ON concepts (merged_into) WHERE merged_into IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · TAXONOMY_VERSION — which cut of the tree this row came from (C.2)
--
-- *"`taxonomy_version INT` so a re-cut of the tree is detectable."*
--
-- DEFAULT 1 and NOT NULL: every row that already exists came from the first
-- cut, and there is no honest "unknown" value — the seed is deterministic
-- (UUIDv5 over a fixed namespace), so the rows that exist are exactly the rows
-- version 1 produces. A later re-cut writes 2 and the difference is a query,
-- not an archaeology exercise.
--
-- NOT a per-concept revision counter. It answers "which taxonomy cut", never
-- "how many times has this concept been edited" — that belongs to the curation
-- audit trail, which is M7's AuditEntry and not this table's job.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS taxonomy_version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'concepts_taxonomy_version_positive'
  ) THEN
    ALTER TABLE concepts
      ADD CONSTRAINT concepts_taxonomy_version_positive
      CHECK (taxonomy_version >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS concepts_taxonomy_version_idx ON concepts (taxonomy_version);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · CONCEPT_ALIASES — the M6-3 alias tier (B.4, "hold aliases")
--
-- B.4 lists "hold aliases" as a responsibility of this subsystem and gives the
-- resolution order as exact → alias → semantic. Without a place to put them,
-- tier 2 has nothing to read and the order collapses to two tiers.
--
-- A SEPARATE TABLE, not a `TEXT[]` column on concepts, for three reasons:
--   · an alias carries its own provenance and admission time — B.4: *"AI may
--     propose a new concept or an alias; a human/curation step admits it"* —
--     and an array cannot carry per-element provenance;
--   · `normalised` must be UNIQUE across the whole taxonomy so that a duplicate
--     surface form is REJECTED at write time rather than discovered at read
--     time as an ambiguity; an array cannot be uniquely indexed across rows;
--   · the seeded tree is regenerated wholesale (see 014), and aliases must
--     survive that without being part of the generated artifact.
--
-- `normalised` is a STORED generated column so the database computes it, never
-- the caller. It mirrors `normaliseConceptText()` in `lib/concept-resolution.ts`
-- for the operations that are expressible in immutable SQL — lower, strip
-- apostrophes, `&` → " and ", collapse everything else to single spaces, trim.
-- Accent folding is deliberately NOT done here: `unaccent()` is not immutable
-- and cannot appear in a generated column without installing an extension, and
-- the application-side resolver folds accents before it queries. The column
-- exists to make DUPLICATES IMPOSSIBLE, not to be the resolver.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS concept_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  concept_id  UUID NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT,

  -- The surface form as a human would write it. Kept verbatim for display and
  -- for review; comparison uses `normalised`.
  alias       TEXT NOT NULL CHECK (length(btrim(alias)) > 0),

  normalised  TEXT GENERATED ALWAYS AS (
                btrim(
                  regexp_replace(
                    regexp_replace(
                      replace(
                        replace(replace(replace(lower(alias), '''', ''), '‘', ''), '’', ''),
                        '&', ' and '
                      ),
                      '[^a-z0-9]+', ' ', 'g'
                    ),
                    ' +', ' ', 'g'
                  )
                )
              ) STORED,

  -- Where it came from. `ai_proposed` exists so a proposal can be STORED
  -- without being trusted; the resolver reads admitted rows only.
  source      TEXT NOT NULL DEFAULT 'curated'
              CHECK (source IN ('seed', 'curated', 'ingestion', 'ai_proposed')),

  -- THE CURATION GATE (B.4). NULL means proposed but not admitted. An alias
  -- with no admission date never participates in resolution — the same shape
  -- as `ingestion_runs.confirmed_at` in 008: the column IS the record of when
  -- a human decided, and code that ignores it is visibly wrong.
  admitted_at TIMESTAMPTZ,
  admitted_by TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT concept_aliases_admission_shape CHECK (
    (admitted_at IS NULL AND admitted_by IS NULL)
    OR (admitted_at IS NOT NULL AND admitted_by IS NOT NULL)
  )
);

-- One surface form, one meaning. A second concept claiming the same normalised
-- alias is refused by the database rather than becoming a silent ambiguity in
-- every future resolution. Only ADMITTED aliases are constrained: two competing
-- proposals may coexist precisely because neither has been decided yet.
CREATE UNIQUE INDEX IF NOT EXISTS concept_aliases_normalised_unique
  ON concept_aliases (normalised) WHERE admitted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS concept_aliases_concept_idx ON concept_aliases (concept_id);
CREATE INDEX IF NOT EXISTS concept_aliases_pending_idx
  ON concept_aliases (created_at DESC) WHERE admitted_at IS NULL;

-- An alias may not restate the concept's own name: that is the EXACT tier's
-- job, and duplicating it there would turn a tier-1 hit into a tier-1/tier-2
-- collision the resolver would have to arbitrate.
CREATE OR REPLACE FUNCTION concept_aliases_not_own_name() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM concepts c
    WHERE c.id = NEW.concept_id
      AND btrim(regexp_replace(regexp_replace(
            replace(replace(replace(replace(lower(c.name), '''', ''), '‘', ''), '’', ''), '&', ' and '),
            '[^a-z0-9]+', ' ', 'g'), ' +', ' ', 'g')) = NEW.normalised
  ) THEN
    RAISE EXCEPTION 'alias % restates the concept''s own name; the exact tier already resolves it', NEW.alias;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS concept_aliases_not_own_name_trg ON concept_aliases;
CREATE TRIGGER concept_aliases_not_own_name_trg
  BEFORE INSERT OR UPDATE ON concept_aliases
  FOR EACH ROW EXECUTE FUNCTION concept_aliases_not_own_name();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · ROW LEVEL SECURITY
--
-- Identical posture to `concepts` in 007 (`:319-324`), and for the identical
-- reason: *"The taxonomy is seeded and curated by the service role. A student
-- reads it and can never write it: it is the company's asset, not user data."*
-- An alias is taxonomy, so it inherits that exactly.
--
-- SELECT is restricted to ADMITTED aliases. A pending proposal is curation
-- state, not published vocabulary, and a client that could read it could also
-- resolve against it.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE concept_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concept_aliases_select_admitted ON concept_aliases;
CREATE POLICY concept_aliases_select_admitted ON concept_aliases
  FOR SELECT TO authenticated USING (admitted_at IS NOT NULL);

-- No INSERT, UPDATE or DELETE policy. Under Postgres RLS that denies all three
-- to `authenticated` by construction — the same SELECT-only posture 012
-- established for `students` and `student_profiles`. The service role bypasses
-- RLS and is the only writer.


-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · VERIFICATION — the file checks its own claims
--
-- Same discipline as 012 §7: a migration that asserts a posture should fail
-- loudly if the posture is not what it just built.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  bad_policy TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'merged_into'
  ) THEN
    RAISE EXCEPTION '013 did not add concepts.merged_into';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'taxonomy_version'
  ) THEN
    RAISE EXCEPTION '013 did not add concepts.taxonomy_version';
  END IF;

  SELECT policyname INTO bad_policy
  FROM pg_policies
  WHERE tablename = 'concept_aliases' AND cmd <> 'SELECT'
  LIMIT 1;

  IF bad_policy IS NOT NULL THEN
    RAISE EXCEPTION 'concept_aliases has a non-SELECT policy (%): the taxonomy is service-role writable only', bad_policy;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not seed `concepts`. That is 014, kept separate because a schema
--   change and a data load fail differently and must be re-runnable apart.
-- · It does not add per-student state to `concepts`. B.4: *"Must NOT own
--   per-student state. Mastery. Difficulty for a given student."*
-- · It does not add an embedding column. B.4's third resolution tier is
--   embedding similarity; that is a model call, and every model call belongs to
--   the typed capability boundary (M15). Until then the third tier is lexical
--   and lives in `lib/concept-resolution.ts` — see that file's header.
-- · It does not add a merge-cycle trigger. Self-merge is refused above; a
--   longer loop needs a recursive check on every write, and the reader already
--   refuses a cycle rather than following it (`resolveMergeChain`). Revisit
--   when merges are performed by anything other than a curator.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '013',
  '013_concept_identity.sql',
  'bd36fb01bde03f25aef563c72ee00cc0924337d90113db912514c5de54831b21',
  'self'
);
