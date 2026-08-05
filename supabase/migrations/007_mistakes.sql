-- ═══════════════════════════════════════════════════════════════════════════
-- 007_mistakes.sql
--
-- THE MISTAKE ENGINE — concepts, evidence, occurrences, patterns.
--
-- Implements PRODUCT_DECISIONS.md §4 (ratified 2026-08-06, D1 closed).
-- Mirrors lib/mistakes/types.ts field-for-field.
--
-- The record moves to the server because localStorage cannot be the moat.
--
-- Four invariants are enforced by the SCHEMA, not by application discipline,
-- because each implements a product principle that must not be bypassable:
--
--   1. No occurrence without evidence          → evidence_id NOT NULL
--                                                (PRINCIPLES §3.2)
--   2. Every occurrence classifies its error   → CHECK at least one error
--                                                (DECISIONS §4.3)
--   3. Occurrences attach only to LEAF patterns → composite FK on (id, tier)
--                                                (DECISIONS §4.4.2)
--   4. A student may never self-resolve        → RLS WITH CHECK on status
--                                                (PRINCIPLES §3.1)
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- CONCEPTS — the taxonomy spine (§4.2)
--
-- Global, not per-student. This is the company's durable asset: it cannot be
-- generated from textbooks, because textbooks describe success and this
-- describes failure. Built by hand, refined forever, shared by every student.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS concepts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display path: subject → chapter → topic → name
  subject     TEXT NOT NULL,
  chapter     TEXT NOT NULL,
  topic       TEXT NOT NULL,
  name        TEXT NOT NULL,

  -- Tree link. Enables roll-up to any level (§4.2).
  parent_id   UUID REFERENCES concepts(id) ON DELETE RESTRICT,

  -- CBSE/ICSE/state syllabus references.
  board_codes TEXT[] NOT NULL DEFAULT '{}',

  -- Historical marks allocation. Feeds severity (§4.6.1).
  exam_weight NUMERIC NOT NULL DEFAULT 0 CHECK (exam_weight >= 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS concepts_parent_idx  ON concepts (parent_id);
CREATE INDEX IF NOT EXISTS concepts_subject_idx ON concepts (subject, chapter, topic);


-- ═══════════════════════════════════════════════════════════════════════════
-- EVIDENCE — immutable (§4.9)
--
-- What makes the record trustworthy in 2036. Never deleted while any
-- occurrence references it: deleting it retroactively invalidates every
-- diagnosis built on it. Enforced by ON DELETE RESTRICT from occurrences.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS evidence (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type               TEXT NOT NULL CHECK (type IN ('photo', 'pdf', 'manual')),
  storage_ref        TEXT NOT NULL,

  -- Dedupes re-uploads of the same paper (M2-2).
  content_hash       TEXT NOT NULL,

  -- Array of {x, y, width, height}, normalised 0–1 against the source image.
  crop_regions       JSONB NOT NULL DEFAULT '[]'::jsonb,

  captured_at        TIMESTAMPTZ NOT NULL,
  source_description TEXT NOT NULL DEFAULT '',
  verified_by        TEXT NOT NULL CHECK (verified_by IN ('ai', 'student', 'both')),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The same paper photographed twice is one piece of evidence.
  CONSTRAINT evidence_student_hash_unique UNIQUE (student_id, content_hash)
);

CREATE INDEX IF NOT EXISTS evidence_student_idx ON evidence (student_id, captured_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- PATTERNS — the revisable inference (§4.4)
--
-- A three-tier hierarchy. Parents derive their meaning from children; children
-- never derive from parents (§4.4.1).
--
--   GLOBAL    "You make sign errors"                concept_id NULL, subject NULL
--     └─ SUBJECT  "...in Physics"                   concept_id NULL, subject SET
--          └─ CONCEPT "...applying the chain rule"  concept_id SET      ← LEAF
--
-- Parent patterns exist SOLELY to group and present descendant leaves. They
-- never participate in scoring, recommendation computation or evidence
-- ownership (§4.4.5). Two columns enforce that structurally:
--   · severity          — NULL on parents. Parent severity is MAX of descendant
--                         leaves, derived on demand, NEVER persisted (§4.6.2).
--   · system_confidence — NULL on parents. Attachment is deterministic and
--                         asks no question, so it has no confidence (§4.7.1).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patterns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tier              TEXT NOT NULL CHECK (tier IN ('concept', 'subject', 'global')),

  -- Non-null on leaves only.
  concept_id        UUID REFERENCES concepts(id) ON DELETE RESTRICT,

  -- Null only on the root (global tier).
  parent_pattern_id UUID REFERENCES patterns(id) ON DELETE RESTRICT,

  -- Null on global tier only.
  subject           TEXT,

  -- Never mixed across this boundary (§4.7).
  error_class       TEXT NOT NULL CHECK (error_class IN ('cognitive', 'execution')),
  error_type        TEXT NOT NULL,

  -- Human sentence: "Sign error when applying the chain rule"
  label             TEXT NOT NULL,

  -- Occurrences in the trailing 180 days. Leaves: counted.
  -- Parents: derived from descendants, so this stays 0 (§4.4).
  recurrence_count  INTEGER NOT NULL DEFAULT 0 CHECK (recurrence_count >= 0),

  first_seen_at     TIMESTAMPTZ,
  last_seen_at      TIMESTAMPTZ,

  -- 0–100, derived by §4.6.1. LEAVES ONLY — see tier shape constraint below.
  severity          INTEGER CHECK (severity BETWEEN 0 AND 100),

  -- 0–1. Leaf merges only (§4.7.1).
  system_confidence NUMERIC CHECK (system_confidence BETWEEN 0 AND 1),

  status            TEXT NOT NULL DEFAULT 'open' CHECK (
                      status IN ('open', 'acknowledged', 'practising',
                                 'dormant', 'resolved', 'recurred')),

  remediation_plan  UUID,

  -- Append-only. Every status transition, with cause.
  history           JSONB NOT NULL DEFAULT '[]'::jsonb,

  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── The tier shape. Makes every illegal combination unrepresentable. ──────
  CONSTRAINT patterns_tier_shape CHECK (
    (tier = 'concept'
       AND concept_id        IS NOT NULL
       AND subject           IS NOT NULL
       AND parent_pattern_id IS NOT NULL
       AND severity          IS NOT NULL)
    OR
    (tier = 'subject'
       AND concept_id        IS NULL
       AND subject           IS NOT NULL
       AND parent_pattern_id IS NOT NULL
       AND severity          IS NULL
       AND system_confidence IS NULL)
    OR
    (tier = 'global'
       AND concept_id        IS NULL
       AND subject           IS NULL
       AND parent_pattern_id IS NULL
       AND severity          IS NULL
       AND system_confidence IS NULL)
  ),

  -- Referenced by the composite FK from occurrences. Redundant against the
  -- primary key, but required as an FK target so that "occurrences attach only
  -- to leaves" can be declared rather than triggered.
  CONSTRAINT patterns_id_tier_unique UNIQUE (id, tier)
);

-- ── The merge rule, made structural (§4.7) ──────────────────────────────────
-- "Two occurrences join one leaf pattern iff same concept, same errorClass,
--  and same errorType." A duplicate leaf therefore cannot exist.
CREATE UNIQUE INDEX IF NOT EXISTS patterns_leaf_unique
  ON patterns (student_id, concept_id, error_class, error_type)
  WHERE tier = 'concept';

-- ── Parent attachment keys (§4.7.1) ─────────────────────────────────────────
-- Attachment is deterministic: a parent is created on demand and there is
-- exactly one per key. These indexes are what make "on demand" idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS patterns_subject_unique
  ON patterns (student_id, subject, error_class, error_type)
  WHERE tier = 'subject';

CREATE UNIQUE INDEX IF NOT EXISTS patterns_global_unique
  ON patterns (student_id, error_class, error_type)
  WHERE tier = 'global';

CREATE INDEX IF NOT EXISTS patterns_student_status_idx ON patterns (student_id, status);
CREATE INDEX IF NOT EXISTS patterns_parent_idx         ON patterns (parent_pattern_id);
CREATE INDEX IF NOT EXISTS patterns_student_tier_idx   ON patterns (student_id, tier);

-- Ranking reads open leaves by severity, descending (§4.4.5).
CREATE INDEX IF NOT EXISTS patterns_leaf_severity_idx
  ON patterns (student_id, severity DESC)
  WHERE tier = 'concept';


-- ═══════════════════════════════════════════════════════════════════════════
-- OCCURRENCES — the immutable fact (§4.3)
--
-- One mark lost, one time. A FACT, not an inference. Never updated after
-- verification, never deleted — enforced by the absence of UPDATE and DELETE
-- policies below. A correction appends a superseding row rather than editing
-- history.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS occurrences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- REQUIRED. No occurrence without proof: an unevidenced mistake is a claim,
  -- and the product does not store claims (PRINCIPLES §3.2).
  -- RESTRICT because evidence outlives everything built on it (§4.9).
  evidence_id       UUID NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT,

  source            TEXT NOT NULL CHECK (source IN (
                      'board-exam', 'school-exam', 'mock', 'coaching-test',
                      'homework', 'past-paper', 'self-test')),

  -- Denormalised from concepts for query speed (§4.3).
  subject           TEXT NOT NULL,
  chapter           TEXT NOT NULL,
  topic             TEXT NOT NULL,

  concept_id        UUID NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT,

  question_ref      TEXT NOT NULL,

  marks_lost        INTEGER NOT NULL CHECK (marks_lost >= 0),
  marks_available   INTEGER NOT NULL CHECK (marks_available > 0),

  -- COGNITIVE — you did not know. Fix by learning (§4.5).
  cognitive_error   TEXT CHECK (cognitive_error IN (
                      'not-known', 'misconception', 'wrong-method',
                      'incomplete-understanding', 'misapplied-rule',
                      'cannot-recall-formula')),

  -- EXECUTION — you knew and lost the mark anyway. Fix by process (§4.5).
  execution_error   TEXT CHECK (execution_error IN (
                      'misread-question', 'arithmetic-slip', 'sign-error',
                      'unit-error', 'ran-out-of-time', 'incomplete-answer',
                      'missed-working', 'transcription', 'presentation')),

  -- What the student thought before answering. Feeds calibration.
  confidence_before SMALLINT CHECK (confidence_before BETWEEN 0 AND 3),

  -- {"kind":"text","text":...} | {"kind":"crop","region":{...}}
  student_answer    JSONB NOT NULL,

  expected_answer   TEXT,
  marker_note       TEXT,

  -- Assigned by merge (§4.7). Must point at a LEAF — see composite FK below.
  pattern_id        UUID,

  -- Constant discriminator. Exists only so the FK below can assert tier.
  pattern_tier      TEXT NOT NULL DEFAULT 'concept'
                      CHECK (pattern_tier = 'concept'),

  -- Corrections append, never edit (§4.3).
  supersedes        UUID REFERENCES occurrences(id) ON DELETE RESTRICT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── At least one classification is mandatory (§4.3) ──────────────────────
  -- A mark lost with neither classification is not a diagnosable event.
  CONSTRAINT occurrences_has_error CHECK (
    cognitive_error IS NOT NULL OR execution_error IS NOT NULL
  ),

  CONSTRAINT occurrences_marks_sane CHECK (marks_lost <= marks_available),

  -- ── Occurrences attach ONLY to leaf patterns (§4.4.2) ────────────────────
  -- Declarative rather than triggered: because pattern_tier is pinned to
  -- 'concept', this FK can only ever resolve against a leaf. Parent patterns
  -- are therefore incapable of owning evidence.
  -- NULL pattern_id passes under MATCH SIMPLE — an occurrence may exist before
  -- merge assigns it.
  CONSTRAINT occurrences_pattern_is_leaf
    FOREIGN KEY (pattern_id, pattern_tier)
    REFERENCES patterns (id, tier) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS occurrences_student_idx  ON occurrences (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS occurrences_pattern_idx  ON occurrences (pattern_id);
CREATE INDEX IF NOT EXISTS occurrences_concept_idx  ON occurrences (student_id, concept_id);
CREATE INDEX IF NOT EXISTS occurrences_evidence_idx ON occurrences (evidence_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Every table is student-scoped except concepts, which is a shared taxonomy.
--
-- The critical asymmetry: occurrences and evidence have SELECT and INSERT
-- policies and NO update or delete policy. Immutability is therefore a
-- property of the database, not a convention the application remembers.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE concepts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

-- ── concepts — shared, read-only to clients ─────────────────────────────────
-- The taxonomy is seeded and curated by the service role. A student reads it
-- and can never write it: it is the company's asset, not user data.
DROP POLICY IF EXISTS concepts_select_all ON concepts;
CREATE POLICY concepts_select_all ON concepts
  FOR SELECT TO authenticated USING (true);

-- ── evidence — own rows, append-only ────────────────────────────────────────
DROP POLICY IF EXISTS evidence_select_own ON evidence;
CREATE POLICY evidence_select_own ON evidence
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS evidence_insert_own ON evidence;
CREATE POLICY evidence_insert_own ON evidence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- No UPDATE policy. No DELETE policy. Evidence is immutable (§4.9).

-- ── occurrences — own rows, append-only ─────────────────────────────────────
DROP POLICY IF EXISTS occurrences_select_own ON occurrences;
CREATE POLICY occurrences_select_own ON occurrences
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS occurrences_insert_own ON occurrences;
CREATE POLICY occurrences_insert_own ON occurrences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- No UPDATE policy. No DELETE policy. An occurrence is a fact (§4.3).

-- ── patterns — own rows, revisable, but resolution is NOT the student's ─────
DROP POLICY IF EXISTS patterns_select_own ON patterns;
CREATE POLICY patterns_select_own ON patterns
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS patterns_insert_own ON patterns;
CREATE POLICY patterns_insert_own ON patterns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- THE RESOLUTION RULE, ENFORCED IN THE DATABASE (PRINCIPLES §3.1).
--
-- A student may say "I've seen it" (acknowledged) and "I'm working on it"
-- (practising). They may NOT say "I've fixed it".
--
-- WITH CHECK constrains the row AFTER the update, so a client can never leave
-- a pattern in 'resolved', 'dormant', 'recurred' or 'open'. Those transitions
-- belong to the system, which writes via the service role and bypasses RLS.
--
-- Self-reported mastery is the fluency illusion — the exact broken instrument
-- this product exists to replace. It is refused at the data layer so that no
-- future client bug can grant it.
DROP POLICY IF EXISTS patterns_update_own ON patterns;
CREATE POLICY patterns_update_own ON patterns
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (
    auth.uid() = student_id
    AND status IN ('acknowledged', 'practising')
  );

-- No DELETE policy. Patterns are revised, never destroyed.
