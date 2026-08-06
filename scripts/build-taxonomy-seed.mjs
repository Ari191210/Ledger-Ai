/**
 * Generates supabase/seed/001_concepts_cbse_physics.sql from lib/taxonomy/.
 *
 * The SQL is a BUILD ARTIFACT — never hand-edit it. Change the syllabus data
 * and re-run:
 *
 *   node scripts/build-taxonomy-seed.mjs
 *
 * Output is deterministic: identical input always produces an identical file,
 * so the seed diffs cleanly and can be reviewed like source.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, '.test-build-taxonomy');

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
  `${r.parentId ? `${q(r.parentId)}::uuid` : 'NULL'}, ${arr(r.boardCodes)}, ${num(r.examWeight)})`
);

const byLevel = (lvl) => rows.filter(r => r.level === lvl).length;

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
-- 001_concepts_cbse_physics.sql — CBSE Class 11 & 12 Physics taxonomy
--
-- GENERATED FILE. Do not hand-edit.
--   source:    lib/taxonomy/cbse-physics.ts
--   generator: scripts/build-taxonomy-seed.mjs
--   regenerate: node scripts/build-taxonomy-seed.mjs
--
-- Implements PRODUCT_DECISIONS.md §4.2. Four levels in one table via parent_id:
-- subject → chapter → topic → concept. Ids are UUIDv5 over a fixed namespace
-- and the concept's canonical path, so re-running this produces exactly the
-- same rows on any machine, forever.
--
-- IDEMPOTENT. ON CONFLICT DO UPDATE refreshes names, codes and weights without
-- ever changing an id, so a concept keeps its identity across re-seeds and no
-- occurrence is orphaned.
--
--   ${byLevel('subject')} subject · ${byLevel('chapter')} chapters · ${byLevel('topic')} topics · ${byLevel('concept')} leaf concepts
--   ${rows.length} rows total · hierarchy depth ${result.counts.maxDepth}
--
-- Run in: Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Parents must exist before children. Rows below are ordered depth-first, and
-- this defers the self-referencing foreign key until the statement completes
-- so a single INSERT is safe regardless.
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO concepts (id, subject, chapter, topic, name, parent_id, board_codes, exam_weight) VALUES
${lines.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  subject     = EXCLUDED.subject,
  chapter     = EXCLUDED.chapter,
  topic       = EXCLUDED.topic,
  name        = EXCLUDED.name,
  parent_id   = EXCLUDED.parent_id,
  board_codes = EXCLUDED.board_codes,
  exam_weight = EXCLUDED.exam_weight;
`;

const outPath = path.join(root, 'supabase', 'seed', '001_concepts_cbse_physics.sql');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, 'utf8');

console.log(`Wrote ${path.relative(root, outPath)}`);
console.log(`  rows      ${rows.length}`);
console.log(`  subject   ${byLevel('subject')}`);
console.log(`  chapters  ${byLevel('chapter')}`);
console.log(`  topics    ${byLevel('topic')}`);
console.log(`  leaves    ${byLevel('concept')}`);
console.log(`  depth     ${result.counts.maxDepth}`);
console.log(`  validation ${result.ok ? 'PASSED' : 'FAILED'}`);
