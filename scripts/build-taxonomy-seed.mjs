/**
 * Generates supabase/migrations/014_concepts_cbse_physics_seed.sql from
 * lib/taxonomy/.
 *
 *   node scripts/build-taxonomy-seed.mjs
 *
 * The SQL is a BUILD ARTIFACT — never hand-edit it. Change the syllabus data
 * and re-run. Output is deterministic: identical input always produces an
 * identical file, so the seed diffs cleanly and can be reviewed like source.
 *
 *
 * WHY THIS NOW WRITES A MIGRATION (M6-1, 2026-08-14)
 *
 * It previously wrote `supabase/seed/001_concepts_cbse_physics.sql`, which no
 * tooling could see. M1 built a migration ledger for exactly one reason (T1):
 * *"which migrations are applied is unknowable"* without one. A 76KB seed
 * sitting outside `supabase/migrations/` has the identical problem one level
 * down — nothing could answer "does the `concepts` table have rows?", and
 * M6-1's done-when ("the seeded tree has production importers") is worthless if
 * the table the importers read is empty and unverifiably so.
 *
 * So the seed is now a numbered, checksummed, self-registering migration like
 * every other schema change. It carries its own ledger registration, computed
 * here with the same `checksumOf()` the CI gate uses, so `node
 * scripts/check-migrations.mjs` reports it UNAPPLIED until it is actually run
 * and DIVERGENT if the syllabus changes without a re-seed.
 *
 * It is a SEPARATE FILE from `013_concept_identity.sql` on purpose. 013 is a
 * schema change and 014 is a data load; they fail differently, they are re-run
 * for different reasons, and a single file would mean re-running the DDL to
 * refresh a chapter name. 014 depends on 013 because it writes
 * `taxonomy_version`.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { checksumOf, REGISTRATION_SENTINEL } from './migration-ledger.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, '.test-build-taxonomy');

/** The cut of the tree these rows come from — `concepts.taxonomy_version` (013).
 *  Bump this, and re-run, when the syllabus is re-cut. */
const TAXONOMY_VERSION = 1;

const MIGRATION_VERSION = '014';
const MIGRATION_NAME = '014_concepts_cbse_physics_seed.sql';

execFileSync(
  process.execPath,
  [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.taxonomy.json'],
  { cwd: root, stdio: 'inherit' },
);

const B = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'build.js')).href);
const { CBSE_PHYSICS } = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'cbse-physics.js')).href);

const rows = B.buildTaxonomy(CBSE_PHYSICS);
const result = B.validateTaxonomy(rows);

if (!result.ok) {
  console.error('Taxonomy validation FAILED — refusing to generate a seed.');
  for (const issue of result.issues.slice(0, 20)) console.error(`  ${issue.rule}: ${issue.detail}`);
  process.exit(1);
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (codes) => `ARRAY[${codes.map(q).join(', ')}]::TEXT[]`;
const num = (n) => Number(n.toFixed(6));

const lines = rows.map(r =>
  `  (${q(r.id)}::uuid, ${q(r.subject)}, ${q(r.chapter)}, ${q(r.topic)}, ${q(r.name)}, ` +
  `${r.parentId ? `${q(r.parentId)}::uuid` : 'NULL'}, ${arr(r.boardCodes)}, ${num(r.examWeight)}, ${TAXONOMY_VERSION})`
);

const byLevel = (lvl) => rows.filter(r => r.level === lvl).length;

const body = `-- ═══════════════════════════════════════════════════════════════════════════
-- ${MIGRATION_NAME} — CBSE Class 11 & 12 Physics taxonomy
--
-- GENERATED FILE. Do not hand-edit.
--   source:     lib/taxonomy/cbse-physics.ts
--   generator:  scripts/build-taxonomy-seed.mjs
--   regenerate: node scripts/build-taxonomy-seed.mjs
--
-- M6-1: the concept model is only real once the table has rows. This is the
-- DATA half of M6 — 013 is the schema half, and this migration depends on it
-- for the \`taxonomy_version\` column.
--
-- Implements PRODUCT_DECISIONS.md §4.2. Four levels in one table via parent_id:
-- subject → chapter → topic → concept. Ids are UUIDv5 over a fixed namespace
-- and the concept's canonical path (\`lib/taxonomy/build.ts\`), so re-running
-- this produces exactly the same rows on any machine, forever.
--
-- IDEMPOTENT. ON CONFLICT DO UPDATE refreshes names, codes and weights without
-- ever changing an id, so a concept keeps its identity across re-seeds and no
-- occurrence is orphaned.
--
-- IT DOES NOT TOUCH \`merged_into\`. A re-seed refreshes what a concept is
-- CALLED; it never un-merges one. A concept a curator superseded stays
-- superseded across every future regeneration of this file — which is the whole
-- point of M6-2 being a pointer rather than a rewrite.
--
--   ${byLevel('subject')} subject · ${byLevel('chapter')} chapters · ${byLevel('topic')} topics · ${byLevel('concept')} leaf concepts
--   ${rows.length} rows total · hierarchy depth ${result.counts.maxDepth} · taxonomy_version ${TAXONOMY_VERSION}
--
-- Run in: Supabase → SQL Editor. Requires 007 and 013.
-- ═══════════════════════════════════════════════════════════════════════════

-- Parents must exist before children. Rows below are ordered depth-first, and
-- this defers the self-referencing foreign key until the statement completes
-- so a single INSERT is safe regardless.
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO concepts (id, subject, chapter, topic, name, parent_id, board_codes, exam_weight, taxonomy_version) VALUES
${lines.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  subject          = EXCLUDED.subject,
  chapter          = EXCLUDED.chapter,
  topic            = EXCLUDED.topic,
  name             = EXCLUDED.name,
  parent_id        = EXCLUDED.parent_id,
  board_codes      = EXCLUDED.board_codes,
  exam_weight      = EXCLUDED.exam_weight,
  taxonomy_version = EXCLUDED.taxonomy_version;

-- The seed asserts its own arithmetic. A partial load is worse than a failed
-- one: it leaves a taxonomy that looks present and is not.
DO $$
DECLARE
  seeded INTEGER;
BEGIN
  SELECT count(*) INTO seeded FROM concepts WHERE taxonomy_version = ${TAXONOMY_VERSION};
  IF seeded < ${rows.length} THEN
    RAISE EXCEPTION 'concept seed incomplete: % rows at taxonomy_version ${TAXONOMY_VERSION}, expected at least ${rows.length}', seeded;
  END IF;
END $$;
`;

const sql = `${body}
${REGISTRATION_SENTINEL}
SELECT supabase_migrations.record_migration(
  '${MIGRATION_VERSION}',
  '${MIGRATION_NAME}',
  '${checksumOf(body)}',
  'self'
);
`;

const outPath = path.join(root, 'supabase', 'migrations', MIGRATION_NAME);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, 'utf8');

console.log(`Wrote ${path.relative(root, outPath)}`);
console.log(`  rows       ${rows.length}`);
console.log(`  subject    ${byLevel('subject')}`);
console.log(`  chapters   ${byLevel('chapter')}`);
console.log(`  topics     ${byLevel('topic')}`);
console.log(`  leaves     ${byLevel('concept')}`);
console.log(`  depth      ${result.counts.maxDepth}`);
console.log(`  version    ${TAXONOMY_VERSION}`);
console.log(`  checksum   ${checksumOf(body)}`);
console.log(`  validation ${result.ok ? 'PASSED' : 'FAILED'}`);
console.log('');
console.log('NOT APPLIED. Writing the file is the repository\'s half; running it');
console.log('against a database is a deliberate, human step.');
