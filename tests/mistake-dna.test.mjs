/**
 * M11 — MISTAKE DNA WIRING. Acceptance V.4.1 … V.4.9, proved.
 *
 * EXECUTION_PLAN M11's definition of done: *"V.4 in full, including V.4.8 (a
 * cognitive error never merges with an execution error) and V.4.9 (an ambiguous
 * classification is refused, not guessed)."*
 *
 * Every module under test is I/O-free — the database arrives as injected verbs
 * (`MistakeDnaDb`) — so the whole of V.4 is provable with no Supabase project
 * and no network in reach. That is U.3's determinism boundary, and it is the
 * reason these are assertions rather than a staging checklist.
 *
 * THE SOURCE FILES ARE READ AS TEXT in the schema and wiring sections, with
 * comments stripped, because a comment saying *"007 is not edited"* is not
 * evidence that 007 was not edited.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checksumOf } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-mistake-dna');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/**
 * Comments name what a file deliberately does NOT do. Only real code counts.
 *
 * LINE COMMENTS ARE STRIPPED FIRST, block comments second — the reverse of the
 * order the other suites use, and deliberately. These files quote paths like
 * `lib/mistakes/*` inside `//` headers, and a block-comment pass that ran first
 * would treat that `/*` as an opening delimiter and swallow everything down to
 * the next `*​/` — including the import block this suite needs to read.
 */
const code = rel =>
  read(rel)
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const SQL_007 = 'supabase/migrations/007_mistakes.sql';
const SQL_025 = 'supabase/migrations/025_mistake_dna.sql';
const MOD_STORE = 'lib/mistakes/store.ts';
const MOD_TYPES = 'lib/mistakes/types.ts';
const MOD_ENGINE = 'lib/mistakes/engine.ts';
const MOD_SEVERITY = 'lib/mistake-severity.ts';
const MOD_RETEST = 'lib/mistake-retest.ts';
const ROUTE_ANSWER = 'app/api/assessment/answer/route.ts';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const CONCEPT_TORQUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const EVIDENCE = '99999999-9999-4999-8999-999999999991';
const OCC_1 = '22222222-2222-4222-8222-222222222221';
const LEAF_ID = '33333333-3333-4333-8333-333333333331';
const SUBJ_ID = '33333333-3333-4333-8333-333333333332';
const GLOB_ID = '33333333-3333-4333-8333-333333333333';
const ATTEMPT_A = '44444444-4444-4444-8444-444444444441';
const ATTEMPT_B = '44444444-4444-4444-8444-444444444442';
const RES_ID = '55555555-5555-4555-8555-555555555551';

const DAY0 = '2026-08-01T10:00:00.000Z';
const DAY2 = '2026-08-03T10:00:00.000Z';
const DAY9 = '2026-08-10T10:00:00.000Z';

let ST; // lib/mistakes/store.ts
let EN; // lib/mistakes/engine.ts
let SV; // lib/mistake-severity.ts
let RT; // lib/mistake-retest.ts
let EC; // lib/event-contract.ts
let ML; // lib/mistakes/migrate-legacy.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.mistake-dna.json'],
    { cwd: root, stdio: 'inherit' },
  );
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.js')) continue;
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
      ));
    }
  };
  walk(outDir);
});

before(async () => {
  const load = f => import(pathToFileURL(path.join(outDir, f)).href);
  [ST, EN, SV, RT, EC, ML] = await Promise.all([
    load('mistakes/store.js'),
    load('mistakes/engine.js'),
    load('mistake-severity.js'),
    load('mistake-retest.js'),
    load('event-contract.js'),
    load('mistakes/migrate-legacy.js'),
  ]);
});

// ── fixtures ────────────────────────────────────────────────────────────────

/** An `occurrences` ROW, as PostgREST would hand it back. */
const occRow = (over = {}) => ({
  id: OCC_1,
  student_id: STUDENT,
  evidence_id: EVIDENCE,
  concept_id: CONCEPT_TORQUE,
  source: 'in-session-assessment',
  subject: 'Physics',
  chapter: 'Rotational Motion',
  topic: 'Torque',
  question_ref: 'q-1',
  marks_lost: 2,
  marks_available: 3,
  confidence_before: null,
  student_answer: { kind: 'text', text: '-12 Nm' },
  expected_answer: '12 Nm',
  marker_note: null,
  pattern_id: null,
  supersedes: null,
  created_at: DAY0,
  cognitive_error: null,
  execution_error: 'sign-error',
  ...over,
});

/** A `patterns` ROW. */
const patRow = (over = {}) => ({
  id: LEAF_ID,
  student_id: STUDENT,
  tier: 'concept',
  concept_id: CONCEPT_TORQUE,
  parent_pattern_id: SUBJ_ID,
  subject: 'Physics',
  error_class: 'execution',
  error_type: 'sign-error',
  label: 'Sign error: Torque',
  occurrence_ids: [],
  recurrence_count: 0,
  first_seen_at: DAY0,
  last_seen_at: DAY0,
  severity: 40,
  system_confidence: 1,
  status: 'open',
  remediation_plan: null,
  history: [],
  resolved_at: null,
  ...over,
});

/** A domain `Pattern`, for the engine/retest modules. */
const leaf = (over = {}) => ({
  id: LEAF_ID,
  studentId: STUDENT,
  tier: 'concept',
  conceptId: CONCEPT_TORQUE,
  parentPatternId: SUBJ_ID,
  subject: 'Physics',
  errorClass: 'execution',
  errorType: 'sign-error',
  label: 'Sign error: Torque',
  occurrenceIds: [OCC_1],
  recurrenceCount: 1,
  firstSeenAt: DAY0,
  lastSeenAt: DAY0,
  severity: 40,
  systemConfidence: 1,
  status: 'practising',
  remediationPlan: null,
  history: [],
  resolvedAt: null,
  ...over,
});

const okv = data => ({ data, error: null });

/**
 * A recording `MistakeDnaDb`. No database, no clock — every verb answers from
 * an in-memory fixture and every write is captured for assertion.
 */
function fakeDb(over = {}) {
  const writes = { patterns: [], derived: [], links: [], retests: [] };
  const db = {
    writes,
    candidates: over.candidates ?? [],
    parents: over.parents ?? new Map(),

    async listLeafCandidates() { return okv(db.candidates); },
    async findPattern(key) { return okv(db.parents.get(key.tier) ?? null); },
    async insertPattern(row) { writes.patterns.push(row); return okv({ ...row }); },
    async updatePatternDerived(id, patch) { writes.derived.push({ id, patch }); return okv({ id, ...patch }); },
    async linkOccurrence(id, patternId) { writes.links.push({ id, patternId }); return okv([{ id }]); },
    async leafMarksLost() { return okv(over.leafMarks ?? 2); },
    async openLeavesMarksLost() { return okv(over.openMarks ?? 8); },
    async countOccurrencesSince() { return okv(over.recurrence ?? 1); },
    async conceptExamWeights() { return okv(over.weights ?? { concept: 5, maxInSubject: 10 }); },
    async upsertRetestSchedule(row) { writes.retests.push(row); return okv(row); },
  };
  return db;
}

const ingest = (db, over = {}) =>
  ST.ingestOccurrenceIntoDna(db, {
    occurrence: occRow(over.occurrence ?? {}),
    ids: { leaf: LEAF_ID, subject: SUBJ_ID, global: GLOB_ID },
    at: DAY0,
    daysToGoalExam: over.daysToGoalExam ?? null,
  });

// ═══════════════════════════════════════════════════════════════════════════
// M11-1 — T12 RETIREMENT. THE ENGINE IS CALLED BY PRODUCTION.
// ═══════════════════════════════════════════════════════════════════════════

describe('M11-1 — T12 is retired for lib/mistakes/*', () => {
  test('a NON-TEST file imports the data-access layer — the T12 scan', () => {
    // Architecture T12 / G.1: *"CURRENT FACT: zero production importers."*
    // That fact is what this milestone changes, so it is asserted the same way
    // M8-3 asserted its own: by walking the shipped tree, not by reading a
    // comment that claims it.
    const importers = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (name === 'node_modules' || name.startsWith('.')) continue;
        if (fs.statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        const rel = path.relative(root, p).replace(/\\/g, '/');
        if (rel.startsWith('lib/mistakes/')) continue; // the module itself
        const src = fs.readFileSync(p, 'utf8');
        if (/from\s+["'][^"']*mistakes\/store["']/.test(src)) importers.push(rel);
      }
    };
    walk(path.join(root, 'lib'));
    walk(path.join(root, 'app'));

    assert.ok(importers.length > 0, 'lib/mistakes/store.ts has NO production importer — T12 is not retired');
    assert.ok(
      importers.includes(ROUTE_ANSWER),
      `expected ${ROUTE_ANSWER} among the importers, got ${importers.join(', ')}`,
    );
  });

  test('the data-access layer reaches the ENGINE — not a reimplementation of it', () => {
    const src = code(MOD_STORE);
    // G.1: *"What is missing is a server data-access layer and a capture path —
    // not domain logic."* So the store must CALL the engine's decisions.
    assert.match(src, /from\s+["']\.\/engine["']/);
    assert.match(src, /mergeOccurrence\(/);
    assert.match(src, /mergeKeyFor\(/);
    // And it must not have grown its own copy of the arithmetic the engine owns.
    assert.doesNotMatch(src, /SEVERITY_WEIGHTS\s*=/, 'the store re-declared the severity weights');
    assert.doesNotMatch(src, /ALLOWED_TRANSITIONS\s*=/, 'the store re-declared the transition graph');
  });

  test('the severity module reaches the engine too — computeSeverity is never re-implemented', () => {
    const src = code(MOD_SEVERITY);
    assert.match(src, /computeSeverity\(/);
    // G.6: *"The formula is fixed and must not be touched."* A second copy of
    // `40·marksWeight + 30·…` would be the first thing to drift.
    assert.doesNotMatch(src, /\b40\s*\*/);
    assert.doesNotMatch(src, /\b30\s*\*/);
  });

  test('SHIPPED PATH — one confirmed occurrence becomes Mistake DNA through the engine', async () => {
    const db = fakeDb();
    const r = await ingest(db);

    assert.equal(r.ok, true, r.ok ? '' : `${r.refusal}: ${r.detail}`);
    // The MERGE verdict came from `mergeOccurrence()`, which is the engine.
    assert.equal(r.value.merge, 'new-leaf');
    assert.equal(r.value.patternId, LEAF_ID);
    // The severity came from `computeSeverity()`, which is also the engine.
    assert.ok(r.value.severity > 0 && r.value.severity <= 100);
    assert.equal(r.value.severityVersion, SV.SEVERITY_FACTORS_VERSION);
    // The occurrence was LINKED — the inference is attached to the fact.
    assert.equal(db.writes.links.length, 1);
    assert.deepEqual(db.writes.links[0], { id: OCC_1, patternId: LEAF_ID });
  });

  test('the route runs Mistake DNA AFTER the answer is already advanceable', () => {
    const src = read(ROUTE_ANSWER);
    // F.6's ordering guarantee is about the OCCURRENCE (M10-7, V.4.1), which is
    // written by `logAssessmentMistake`. Mistake DNA is an INFERENCE over that
    // fact (G.2) and must never be able to withhold the student's answer.
    const logged = src.indexOf('logAssessmentMistake(');
    const dna = src.indexOf('ingestOccurrenceIntoDna(');
    assert.ok(logged > 0 && dna > logged, 'Mistake DNA must run after the occurrence is written');
    // And it must be gated on CONFIRMATION — a pattern drawn from a draft would
    // infer recurrence from a proposal the student has not agreed with.
    assert.match(src, /logged\.occurrence\s*&&\s*logged\.confirmed/);
  });

  test('a refused inference never costs the student their answer', async () => {
    // The DB read fails outright. The route must still be able to answer.
    const db = fakeDb();
    db.listLeafCandidates = async () => ({ data: null, error: { message: 'connection reset' } });
    const r = await ingest(db);
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'read-failed');
    // NOTHING PARTIAL: no pattern, no link.
    assert.equal(db.writes.patterns.length, 0);
    assert.equal(db.writes.links.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.4.1 / V.4.2 — THE OCCURRENCE, THE LEAF, AND THE TWO NULL PARENTS
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.2 — a new leaf, plus subject and global parents', () => {
  test('no matching leaf yields `new-leaf` and creates three patterns', async () => {
    const db = fakeDb();
    const r = await ingest(db);
    assert.equal(r.ok, true);
    assert.equal(r.value.merge, 'new-leaf');

    const tiers = db.writes.patterns.map(p => p.tier).sort();
    assert.deepEqual(tiers, ['concept', 'global', 'subject']);
  });

  test('PARENT severity and system_confidence are NULL', async () => {
    const db = fakeDb();
    await ingest(db);
    for (const p of db.writes.patterns.filter(p => p.tier !== 'concept')) {
      assert.equal(p.severity, null, `${p.tier} parent carries a severity`);
      assert.equal(p.system_confidence, null, `${p.tier} parent carries a confidence`);
      // §4.6.2 — parent severity is the MAX of descendants, derived on demand
      // and never persisted. G.5 — parent attachment is deterministic and
      // therefore carries `system_confidence = NULL` BY DESIGN.
      assert.equal(p.concept_id, null, `${p.tier} parent carries a concept`);
    }
  });

  test('the LEAF carries both, and exact-key matching is confidence 1', async () => {
    const db = fakeDb();
    await ingest(db);
    const l = db.writes.patterns.find(p => p.tier === 'concept');
    assert.equal(l.system_confidence, 1);
    assert.notEqual(l.severity, null);
    assert.equal(l.status, 'open'); // a pattern is BORN open
  });

  test('the global parent is the subject parent’s parent — the chain is built, not implied', async () => {
    const db = fakeDb();
    await ingest(db);
    const g = db.writes.patterns.find(p => p.tier === 'global');
    const s = db.writes.patterns.find(p => p.tier === 'subject');
    assert.equal(g.parent_pattern_id, null);
    assert.equal(s.parent_pattern_id, g.id);
    assert.equal(db.writes.patterns.find(p => p.tier === 'concept').parent_pattern_id, s.id);
  });

  test('parents that already exist are REUSED, never duplicated (§4.7.1 idempotence)', async () => {
    const db = fakeDb({
      parents: new Map([
        ['global', { ...patRow({ id: GLOB_ID, tier: 'global', concept_id: null, subject: null, severity: null, system_confidence: null }) }],
        ['subject', { ...patRow({ id: SUBJ_ID, tier: 'subject', concept_id: null, severity: null, system_confidence: null }) }],
      ]),
    });
    await ingest(db);
    assert.deepEqual(db.writes.patterns.map(p => p.tier), ['concept']);
  });

  test('a second occurrence on the same key JOINS rather than creating a second leaf', async () => {
    const db = fakeDb({ candidates: [patRow()] });
    const r = await ingest(db, { occurrence: { id: '22222222-2222-4222-8222-222222222229' } });
    assert.equal(r.ok, true);
    assert.equal(r.value.merge, 'joined');
    assert.equal(r.value.patternId, LEAF_ID);
    // G.4: *"Occurrence dedup: occurrences are NOT deduplicated. Two identical
    // wrong answers on two dates are two facts."* Two facts, one pattern.
    assert.equal(db.writes.patterns.filter(p => p.tier === 'concept').length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.4.8 — A COGNITIVE ERROR NEVER MERGES WITH AN EXECUTION ERROR
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.8 — the error-class boundary is never crossed', () => {
  test('a cognitive misconception on the SAME concept creates a SEPARATE leaf', async () => {
    // An execution `sign-error` leaf already exists on Torque. The incoming
    // occurrence is a COGNITIVE `misconception` on the very same concept.
    const EXISTING_EXECUTION_LEAF = '33333333-3333-4333-8333-33333333330e';
    const db = fakeDb({ candidates: [patRow({ id: EXISTING_EXECUTION_LEAF })] });
    const r = await ingest(db, {
      occurrence: { cognitive_error: 'misconception', execution_error: null },
    });

    assert.equal(r.ok, true);
    assert.equal(r.value.merge, 'new-leaf', 'it merged across the error-class boundary');
    const created = db.writes.patterns.find(p => p.tier === 'concept');
    assert.equal(created.error_class, 'cognitive');
    assert.equal(created.error_type, 'misconception');
    // Two leaves on one concept, and the occurrence went to the NEW one — the
    // existing execution leaf is untouched.
    assert.notEqual(r.value.patternId, EXISTING_EXECUTION_LEAF);
    assert.equal(db.writes.links[0].patternId, created.id);
  });

  test('the ENGINE’s merge key already carries the class — the store did not invent this', () => {
    const a = EN.mergeKeyFor({ ...occToDomain(), cognitiveError: null, executionError: 'sign-error' });
    const b = EN.mergeKeyFor({ ...occToDomain(), cognitiveError: 'misconception', executionError: null });
    assert.equal(a.ok && a.value.errorClass, 'execution');
    assert.equal(b.ok && b.value.errorClass, 'cognitive');
    assert.notEqual(a.value.errorClass, b.value.errorClass);
  });

  test('assertNoClassMixing REFUSES a leaf of the wrong class outright', () => {
    const bad = ST.assertNoClassMixing('cognitive', 'misconception', {
      ...leaf(), errorClass: 'execution', errorType: 'sign-error',
    });
    assert.equal(bad.ok, false);
    assert.match(bad.detail, /V\.4\.8|never mixed/);

    const good = ST.assertNoClassMixing('execution', 'sign-error', leaf());
    assert.equal(good.ok, true);
  });

  test('a mixed-class candidate reaching the engine is refused, not fixed up', async () => {
    // The candidate query is deliberately widened to return a cognitive leaf
    // for an execution occurrence — the failure mode the store's header names.
    const db = fakeDb({ candidates: [patRow({ error_class: 'cognitive', error_type: 'misconception' })] });
    const r = await ingest(db);
    // The class filter drops it, so the engine sees no candidate and says
    // `new-leaf`. The two patterns stay separate, which is the whole point.
    assert.equal(r.ok, true);
    assert.equal(r.value.merge, 'new-leaf');
    assert.equal(db.writes.patterns.find(p => p.tier === 'concept').error_class, 'execution');
  });
});

/** The fixture row, mapped through the store's own reader. */
function occToDomain(over = {}) {
  return ST.rowToOccurrence(occRow(over));
}

// ═══════════════════════════════════════════════════════════════════════════
// V.4.9 — AN AMBIGUOUS CLASSIFICATION IS REFUSED, NOT GUESSED
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.9 — ambiguity is a legal state, never a guess', () => {
  test('BOTH arms set returns `ambiguous` and names neither', () => {
    const c = ST.classifyOccurrence(occToDomain({ cognitive_error: 'misconception', execution_error: 'sign-error' }));
    assert.equal(c.kind, 'ambiguous');
    assert.equal(c.errorClass, undefined, 'an ambiguous classification named a class anyway');
    assert.equal(c.errorType, undefined);
  });

  test('an ambiguous occurrence WRITES NOTHING — no pattern, no link, no severity', async () => {
    const db = fakeDb();
    const r = await ingest(db, {
      occurrence: { cognitive_error: 'misconception', execution_error: 'sign-error' },
    });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'ambiguous-classification');
    assert.equal(db.writes.patterns.length, 0);
    assert.equal(db.writes.links.length, 0);
    assert.equal(db.writes.derived.length, 0);
    assert.equal(db.writes.retests.length, 0);
  });

  test('the occurrence keeps `pattern_id = NULL` — a legal, permanent, queryable state', () => {
    // `007` declares `pattern_id` nullable precisely so an occurrence may exist
    // before merge assigns it. The refusal above leaves it exactly there: the
    // FACT stands and no inference has been drawn from it.
    const sql = code(SQL_007);
    assert.match(sql, /pattern_id\s+UUID/i);
    assert.doesNotMatch(sql, /pattern_id\s+UUID\s+NOT\s+NULL/i);
  });

  test('NEITHER arm set is `unclassified`, and is also refused rather than defaulted', async () => {
    const c = ST.classifyOccurrence(occToDomain({ cognitive_error: null, execution_error: null }));
    assert.equal(c.kind, 'unclassified');

    const db = fakeDb();
    const r = await ingest(db, { occurrence: { cognitive_error: null, execution_error: null } });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'unclassified');
    assert.equal(db.writes.patterns.length, 0);
  });

  test('the two refusals are DISTINCT — "both" is not reported as "neither"', async () => {
    const both = await ingest(fakeDb(), { occurrence: { cognitive_error: 'misconception', execution_error: 'sign-error' } });
    const neither = await ingest(fakeDb(), { occurrence: { cognitive_error: null, execution_error: null } });
    assert.notEqual(both.refusal, neither.refusal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M11-2 — SEVERITY. G.6's SPECIFICATION GAP, CLOSED AND VERSIONED.
// ═══════════════════════════════════════════════════════════════════════════

describe('M11-2 — severity factor derivation is versioned', () => {
  test('a version exists, is stamped on every derivation, and travels with the number', () => {
    const r = SV.deriveSeverity({
      leafMarksLost: 2, openLeavesMarksLost: 8, occurrencesInWindow: 1,
      daysToGoalExam: null, conceptExamWeight: 5, maxSubjectExamWeight: 10, at: DAY0,
    });
    assert.equal(r.ok, true);
    assert.equal(r.value.provenance.factorsVersion, SV.SEVERITY_FACTORS_VERSION);
    assert.equal(typeof SV.SEVERITY_FACTORS_VERSION, 'string');
    assert.ok(SV.SEVERITY_FACTORS_VERSION.length > 0);
    assert.equal(r.value.provenance.derivedAt, DAY0);
  });

  test('the FOUR factors are stored, not just the output — so a severity is explainable', () => {
    const r = SV.deriveSeverity({
      leafMarksLost: 4, openLeavesMarksLost: 8, occurrencesInWindow: 2,
      daysToGoalExam: 3, conceptExamWeight: 10, maxSubjectExamWeight: 10, at: DAY0,
    });
    assert.deepEqual(Object.keys(r.value.provenance.factors).sort(),
      ['conceptExamWeight', 'examProximity', 'marksWeight', 'recurrenceWeight']);
    assert.equal(r.value.provenance.factors.marksWeight, 0.5);
    assert.equal(r.value.provenance.factors.recurrenceWeight, 0.5);
    assert.equal(r.value.provenance.factors.examProximity, 1);
    assert.equal(r.value.provenance.factors.conceptExamWeight, 1);
    // 40·0.5 + 30·0.5 + 20·1 + 10·1 = 20 + 15 + 20 + 10 = 65
    assert.equal(r.value.severity, 65);
  });

  test('the version is written to the ROW, so a recompute can be detected', async () => {
    const db = fakeDb();
    await ingest(db);
    const patch = db.writes.derived.at(-1).patch;
    assert.equal(patch.severity_version, SV.SEVERITY_FACTORS_VERSION);
    assert.equal(patch.severity_factors.factorsVersion, SV.SEVERITY_FACTORS_VERSION);
    // §4.6: *"formula improvements upgrade every existing pattern
    // retroactively"* — which is `WHERE severity_version <> 'sf_v1'`.
    assert.equal(SV.isSeverityCurrent(patch.severity_version), true);
    assert.equal(SV.isSeverityCurrent('sf_v0_unknown'), false);
    assert.equal(SV.isSeverityVersionSupported('sf_v0_unknown'), false);
  });

  test('G.6 — each factor is derived exactly as the table specifies', () => {
    // marksWeight: Σ on this leaf ÷ Σ across open leaves, clamped.
    assert.equal(SV.marksWeightFactor(2, 8), 0.25);
    assert.equal(SV.marksWeightFactor(8, 8), 1);
    assert.equal(SV.marksWeightFactor(1, 0), 0, '0/0 must not put a NaN in a column');

    // recurrenceWeight: min(1, occurrences_in_180d / RECURRENCE_FULL_AT).
    assert.equal(SV.RECURRENCE_WINDOW_DAYS, 180, 'the window must match Pattern.recurrenceCount');
    assert.equal(SV.recurrenceWeightFactor(0), 0);
    assert.equal(SV.recurrenceWeightFactor(SV.RECURRENCE_FULL_AT), 1);
    assert.equal(SV.recurrenceWeightFactor(SV.RECURRENCE_FULL_AT * 3), 1, 'must saturate at 1');
    assert.ok(SV.RECURRENCE_FULL_AT > 2, 'a pattern is "more than once"; 2 must not already saturate');

    // examProximity: 1 at ≤3 days, decaying to 0 at ≥60.
    assert.equal(SV.examProximityFactor(0), 1);
    assert.equal(SV.examProximityFactor(3), 1);
    assert.equal(SV.examProximityFactor(60), 0);
    assert.equal(SV.examProximityFactor(200), 0);
    assert.ok(SV.examProximityFactor(30) > 0 && SV.examProximityFactor(30) < 1);
    assert.ok(SV.examProximityFactor(10) > SV.examProximityFactor(40), 'proximity must decay, not grow');

    // conceptExamWeight: normalised against the max in the subject.
    assert.equal(SV.conceptExamWeightFactor(5, 10), 0.5);
    assert.equal(SV.conceptExamWeightFactor(0, 0), 0);
  });

  test('"no exam is near" and "we have no idea" are DISTINGUISHABLE on the row', () => {
    const unknown = SV.deriveSeverity({
      leafMarksLost: 1, openLeavesMarksLost: 1, occurrencesInWindow: 0,
      daysToGoalExam: null, conceptExamWeight: 0, maxSubjectExamWeight: 0, at: DAY0,
    });
    const far = SV.deriveSeverity({
      leafMarksLost: 1, openLeavesMarksLost: 1, occurrencesInWindow: 0,
      daysToGoalExam: 400, conceptExamWeight: 0, maxSubjectExamWeight: 0, at: DAY0,
    });
    // Both produce examProximity 0 …
    assert.equal(unknown.value.provenance.factors.examProximity, 0);
    assert.equal(far.value.provenance.factors.examProximity, 0);
    // … and the row still says which zero it is. V.4.9's posture, as a number.
    assert.equal(unknown.value.provenance.examProximityKnown, false);
    assert.equal(far.value.provenance.examProximityKnown, true);
  });

  test('incoherent inputs are REFUSED, never clamped into a plausible number', () => {
    const base = {
      leafMarksLost: 2, openLeavesMarksLost: 8, occurrencesInWindow: 1,
      daysToGoalExam: null, conceptExamWeight: 5, maxSubjectExamWeight: 10, at: DAY0,
    };
    const cases = [
      [{ leafMarksLost: -1 }, 'negative-marks'],
      [{ occurrencesInWindow: -1 }, 'negative-occurrences'],
      [{ conceptExamWeight: -1 }, 'negative-exam-weight'],
      [{ conceptExamWeight: 20 }, 'concept-weight-exceeds-subject-max'],
      [{ leafMarksLost: 99 }, 'leaf-marks-exceed-open-total'],
      [{ leafMarksLost: Number.NaN }, 'not-a-number'],
    ];
    for (const [over, refusal] of cases) {
      const r = SV.deriveSeverity({ ...base, ...over });
      assert.equal(r.ok, false, `${refusal} was accepted`);
      assert.equal(r.refusal, refusal);
    }
  });

  test('a refused severity refuses the whole ingest — no leaf is left with a placeholder', async () => {
    // A concept whose exam weight exceeds the maximum across its own subject.
    // The concept is INSIDE the subject, so its weight is one of the values the
    // max was taken over — greater means the two were read over different sets,
    // and clamping would produce a plausible 1 from an incoherent pair.
    const db = fakeDb({ weights: { concept: 20, maxInSubject: 10 } });
    const r = await ingest(db);
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'severity-refused');
    assert.match(r.detail, /concept-weight-exceeds-subject-max/);
    assert.equal(db.writes.links.length, 0, 'the occurrence was linked to an unscored leaf');
  });

  test('the store NORMALISES a leaf/open-total pair rather than refusing it', async () => {
    // `openLeavesMarksLost` is `max(open, leaf)` in the store: the leaf is one
    // of the open leaves, so a total that excludes it is a read-ordering
    // artefact and not an incoherent pair. The DERIVATION still refuses the
    // pair if it ever arrives unnormalised.
    const db = fakeDb({ leafMarks: 99, openMarks: 1 });
    const r = await ingest(db);
    assert.equal(r.ok, true);
    // marksWeight 1 (the leaf IS the whole open total after normalisation),
    // recurrenceWeight 0.25, examProximity 0 (no goal exam), conceptExamWeight
    // 0.5 → 40 + 7.5 + 0 + 5 = 52.5, which `computeSeverity` rounds to 53.
    assert.equal(r.value.severity, 53);

    const direct = SV.deriveSeverity({
      leafMarksLost: 99, openLeavesMarksLost: 1, occurrencesInWindow: 1,
      daysToGoalExam: null, conceptExamWeight: 5, maxSubjectExamWeight: 10, at: DAY0,
    });
    assert.equal(direct.ok, false);
    assert.equal(direct.refusal, 'leaf-marks-exceed-open-total');
  });

  test('G.6.a — the double-weighting defect is RECORDED, not silently fixed', () => {
    // *"Flagged for founder decision before ranking ships."* A plan may not
    // silently amend a decision (CLAUDE.md's precedence rule), so the defect
    // must still be readable at the site that produces the factor.
    assert.match(read(MOD_SEVERITY), /G\.6\.a/);
    assert.match(read(MOD_SEVERITY), /§4\.10/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M11-3 — ADDITIVE EXTENSION ONLY. 007 IS NOT REWRITTEN.
// ═══════════════════════════════════════════════════════════════════════════

describe('M11-3 — the schema is extended, never rewritten', () => {
  test('007_mistakes.sql is BYTE-UNCHANGED — its checksum is pinned', () => {
    // M1's ledger records *"this exact text was run"*, not *"something like
    // this was run"*, and `check-migrations.mjs` reports DIVERGENT the moment
    // the body changes. Editing 007 to add an enum value is precisely the drift
    // class T1 exists to catch.
    assert.equal(
      checksumOf(read(SQL_007)),
      '46ae6e0b862a85c330f7cd7e448e0ca89603eb968d42fa844931f6ac4e40162a',
      '007_mistakes.sql WAS EDITED — M11-3 requires it be extended by a NEW migration',
    );
  });

  test('007 contains none of M11’s additions — the extension really did go into 025', () => {
    const sql = read(SQL_007);
    for (const added of ['in-session-assessment', 'assessment_attempt', 'declaration', 'severity_version']) {
      assert.doesNotMatch(sql, new RegExp(added), `007 was edited to add '${added}'`);
    }
  });

  test('025 is the next free number and self-registers with a correct checksum', () => {
    const files = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('.sql'));
    assert.ok(files.includes('025_mistake_dna.sql'));
    assert.equal(files.filter(f => f.startsWith('025')).length, 1, '025 is claimed twice');

    // NARROWED BY M12, AND RECORDED RATHER THAN SILENTLY EDITED.
    //
    // This line read `assert.ok(!files.some(f => /^02[6-9]|^0[3-9]\d/.test(f)),
    // '025 is not the highest migration')`. It asserted a fact about the
    // FUTURE — that no later milestone would ever add a migration — and it
    // became false the moment M12-1 needed `026_academic_record.sql`. Every
    // subsequent milestone would have had to delete it, so it is narrowed here
    // to the invariant it was actually standing in for: 025's NUMBER is its own
    // and no later file may take it. Uniqueness across the whole directory is
    // already `validateRepoMigrations()`'s job (M1), asserted in
    // `tests/migration-ledger.test.mjs`.
    //
    // What M11 cared about — that 025 is registered once, with its own true
    // checksum, and that 007 was never edited — is untouched and still checked
    // by the two assertions either side of this comment.
    const later = files.filter(f => /^0(2[6-9]|[3-9]\d)_/.test(f));
    for (const f of later) {
      assert.notEqual(f.slice(0, 3), '025', `${f} re-claims 025's number`);
    }

    const body = read(SQL_025);
    const declared = (body.match(/'([a-f0-9]{64})'/) ?? [])[1];
    assert.equal(declared, checksumOf(body), '025 self-registers a stale checksum');
  });

  test('025 re-states 007’s ORIGINAL values verbatim and only ADDS to them', () => {
    const sql = read(SQL_025);
    // Every value that passed the CHECK before must still pass it.
    for (const original of ['board-exam', 'school-exam', 'mock', 'coaching-test', 'homework', 'past-paper', 'self-test']) {
      assert.match(sql, new RegExp(`'${original}'`), `the widened source CHECK dropped '${original}'`);
    }
    for (const original of ["'photo'", "'pdf'", "'manual'"]) {
      assert.match(sql, new RegExp(original), `the widened evidence CHECK dropped ${original}`);
    }
    assert.match(sql, /'in-session-assessment'/);
    assert.match(sql, /'assessment_attempt'/);
    assert.match(sql, /'declaration'/);
  });

  test('types.ts KEPT every pre-existing enum value — the additions are additive', () => {
    const src = read(MOD_TYPES);
    for (const v of ['board-exam', 'school-exam', 'mock', 'coaching-test', 'homework', 'past-paper', 'self-test']) {
      assert.match(src, new RegExp(`'${v}'`), `OccurrenceSource lost '${v}'`);
    }
    for (const v of ['photo', 'pdf', 'manual']) {
      assert.match(src, new RegExp(`'${v}'`), `EvidenceType lost '${v}'`);
    }
    assert.match(src, /'in-session-assessment'/);
    assert.match(src, /'assessment_attempt'/);
    assert.match(src, /'declaration'/);
    // The has-error invariant that mirrors the SQL CHECK must survive intact.
    assert.match(src, /cognitiveError/);
    assert.match(src, /executionError/);
  });

  test('NO ENUM PATCH — the pattern status CHECK gains nothing', () => {
    // PRODUCT_DECISIONS §9.4, ratified: *"The status-enum patch is REJECTED
    // OUTRIGHT — it would convert a dead pillar into a self-awardable one."*
    const sql025 = read(SQL_025);
    assert.doesNotMatch(sql025, /patterns_status_check/i, '025 touches the status CHECK');
    assert.doesNotMatch(sql025, /ALTER\s+TABLE\s+patterns[\s\S]{0,80}DROP\s+CONSTRAINT[\s\S]{0,40}status/i);
    // The six statuses are still exactly six, and they are the engine's.
    assert.deepEqual(
      Object.keys(EN.ALLOWED_TRANSITIONS).sort(),
      ['acknowledged', 'dormant', 'open', 'practising', 'recurred', 'resolved'],
    );
  });

  test('025 DROPS nothing that carries data or narrows nothing that was permitted', () => {
    const sql = code(SQL_025);
    assert.doesNotMatch(sql, /DROP\s+TABLE/i);
    assert.doesNotMatch(sql, /DROP\s+COLUMN/i);
    assert.doesNotMatch(sql, /TRUNCATE/i);
    assert.doesNotMatch(sql, /DELETE\s+FROM/i);
  });

  test('025 does not apply itself and does not backfill', () => {
    const sql = code(SQL_025);
    assert.doesNotMatch(sql, /UPDATE\s+occurrences/i, '025 re-points M10 rows — that is a data correction (O.4)');
    assert.doesNotMatch(sql, /UPDATE\s+patterns\s+SET/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M11-4 — RETEST SCHEDULING AND THE 7-DAY COOLING GATE
// ═══════════════════════════════════════════════════════════════════════════

describe('M11-4 — the cooling gate is a constraint, not a named constant', () => {
  test('the first retest rung IS the engine’s cooling constant — they cannot disagree', () => {
    assert.equal(EN.RESOLUTION_COOLING_DAYS, 7);
    assert.equal(RT.RETEST_INTERVALS_DAYS[0], EN.RESOLUTION_COOLING_DAYS);
    assert.equal(RT.RETEST_RESET_INTERVAL_DAYS, 7);
  });

  test('dueAt is measured from `lastSeenAt`, the same origin canResolve measures from', () => {
    const s = RT.scheduleFirstRetest(leaf({ lastSeenAt: DAY0 }));
    assert.equal(s.ok, true);
    assert.equal(s.schedule.dueAt, new Date(Date.parse(DAY0) + 7 * 86400000).toISOString());
    assert.equal(s.schedule.intervalDays, 7);
    assert.equal(s.schedule.attemptCount, 0);
    assert.equal(s.schedule.lastResult, null);
  });

  test('the ingest schedules a retest whose due date clears the cooling window', async () => {
    const db = fakeDb();
    const r = await ingest(db);
    assert.equal(db.writes.retests.length, 1);
    const written = db.writes.retests[0];
    assert.ok(
      Date.parse(written.due_at) - Date.parse(DAY0) >= 7 * 86400000,
      'a retest was scheduled inside the cooling window',
    );
    assert.equal(r.value.retest.intervalDays, 7);
  });

  test('intervals EXPAND on success and RESET on failure (G.8)', () => {
    let s = RT.scheduleFirstRetest(leaf()).schedule;
    assert.equal(s.intervalDays, 7);

    s = RT.recordRetest(s, { result: 'pass', at: DAY9 }).schedule;
    assert.equal(s.intervalDays, 14);
    assert.equal(s.attemptCount, 1);
    assert.equal(s.lastResult, 'pass');

    s = RT.recordRetest(s, { result: 'pass', at: DAY9 }).schedule;
    assert.equal(s.intervalDays, 30);

    s = RT.recordRetest(s, { result: 'fail', at: DAY9 }).schedule;
    assert.equal(s.intervalDays, 7, 'a failed retest must reset to the first rung');
    assert.equal(s.attemptCount, 3, 'the attempt count is append-only');
  });

  test('the ladder saturates rather than inventing a retirement policy', () => {
    const top = RT.RETEST_INTERVALS_DAYS.at(-1);
    assert.equal(RT.nextIntervalDays(top), top);
  });

  test('a retest is never scheduled for a resolved or dormant leaf', () => {
    for (const status of ['resolved', 'dormant']) {
      const s = RT.scheduleFirstRetest(leaf({ status }));
      assert.equal(s.ok, false);
      assert.equal(s.refusal, 'pattern-not-retestable');
    }
    for (const status of ['open', 'acknowledged', 'practising', 'recurred']) {
      assert.equal(RT.scheduleFirstRetest(leaf({ status })).ok, true);
    }
  });

  test('parents are never retested, and a leaf with no occurrence has nothing to cool from', () => {
    assert.equal(RT.scheduleFirstRetest(leaf({ tier: 'subject' })).refusal, 'not-a-leaf');
    assert.equal(RT.scheduleFirstRetest(leaf({ lastSeenAt: null })).refusal, 'no-last-occurrence');
  });

  test('the DATABASE enforces the seven days too — a trigger, not a comment', () => {
    const sql = code(SQL_025);
    assert.match(sql, /CREATE\s+TABLE[\s\S]*mistake_retest_schedule/i);
    assert.match(sql, /mistake_retest_cooling_gate/);
    assert.match(sql, /INTERVAL\s+'7\s+days'/i);
    assert.match(sql, /BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.mistake_retest_schedule/i);
    // ONE schedule per pattern — two would let a pattern be resolved by
    // whichever schedule was looser.
    assert.match(sql, /pattern_id\s+UUID\s+PRIMARY\s+KEY/i);
    assert.match(sql, /interval_days\s+INTEGER\s+NOT\s+NULL\s+CHECK\s*\(\s*interval_days\s*>=\s*7\s*\)/i);
  });

  test('due retests are ordered oldest-debt-first', () => {
    const mk = (id, dueAt) => ({ ...RT.scheduleFirstRetest(leaf()).schedule, patternId: id, dueAt });
    const due = RT.dueRetests(
      [mk('c', DAY9), mk('a', DAY0), mk('b', DAY2)],
      '2026-09-01T00:00:00.000Z',
    );
    assert.deepEqual(due.map(s => s.patternId), ['a', 'b', 'c']);
    assert.deepEqual(RT.dueRetests([mk('a', DAY9)], DAY0), [], 'a future retest is not due');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.4.3 / V.4.5 / V.4.6 — THE RESOLUTION WALK, DAY BY DAY
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.3 / V.4.5 / V.4.6 — resolution requires evidence and time', () => {
  const attempt = (over = {}) => ({
    attemptId: ATTEMPT_A, conceptId: CONCEPT_TORQUE, answeredAt: DAY0, isCorrect: true, ...over,
  });

  const resolve = (over = {}) => RT.attemptResolution({
    pattern: leaf(), attempts: [], schedule: null, actor: 'system',
    resolutionId: RES_ID, at: DAY9, ...over,
  });

  test('V.4.3 — an IMMEDIATE RETRY is a signal and never proof', () => {
    const r = resolve({ attempts: [attempt({ immediateRetry: true })] });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'immediate-retry-is-not-proof');
    assert.match(r.detail, /zero days|RESOLUTION_COOLING_DAYS/);

    // And it is RECORDED rather than discarded — both halves of V.4.3 at once.
    const rec = RT.recordImmediateRetry(true);
    assert.equal(rec.immediateRetryCorrect, true);
    assert.equal(rec.resolves, false);
    assert.match(rec.reason, /7/);
  });

  test('V.4.5 — ONE correct answer two days later is `insufficient-correct-answers`', () => {
    const r = resolve({ attempts: [attempt({ answeredAt: DAY2 })] });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'insufficient-correct-answers');
    assert.equal(EN.RESOLUTION_MIN_CORRECT, 2);
  });

  test('V.4.5 — TWO correct answers, both inside the window, is `cooling-period-not-elapsed`', () => {
    const r = resolve({
      attempts: [
        attempt({ attemptId: ATTEMPT_A, answeredAt: DAY0 }),
        attempt({ attemptId: ATTEMPT_B, answeredAt: DAY2 }),
      ],
    });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'cooling-period-not-elapsed');
    // The ORDER of the two refusals is the specification's: count first, then
    // time. V.4.5 — *"`insufficient-correct-answers` → then
    // `cooling-period-not-elapsed`"*.
  });

  test('V.4.6 — day 9, a second correct answer ≥7 days later, RESOLVES', () => {
    const r = resolve({
      attempts: [
        attempt({ attemptId: ATTEMPT_A, answeredAt: DAY2 }),
        attempt({ attemptId: ATTEMPT_B, answeredAt: DAY9 }),
      ],
    });
    assert.equal(r.ok, true, r.ok ? '' : `${r.refusal}: ${r.detail}`);
    assert.equal(r.value.pattern.status, 'resolved');
    assert.equal(r.value.pattern.resolvedAt, DAY9);
  });

  test('V.4.6 — the resolution NAMES ITS PROOF, and the system is what set it', () => {
    const r = resolve({
      attempts: [
        attempt({ attemptId: ATTEMPT_A, answeredAt: DAY2 }),
        attempt({ attemptId: ATTEMPT_B, answeredAt: DAY9 }),
      ],
    });
    const res = r.value.resolution;
    // G.8: *"a resolution that cannot name them is not constructible."*
    assert.deepEqual(res.proofAttemptIds.sort(), [ATTEMPT_A, ATTEMPT_B].sort());
    assert.ok(res.proofAttemptIds.length >= EN.RESOLUTION_MIN_CORRECT);
    assert.equal(res.setBy, 'system');
    assert.equal(res.measuredFrom, DAY0);
    assert.ok(res.coolingDaysElapsed >= 7);
  });

  test('an immediate retry is STRIPPED from the proof, never counted toward it', () => {
    const r = resolve({
      attempts: [
        attempt({ attemptId: ATTEMPT_A, answeredAt: DAY0, immediateRetry: true }),
        attempt({ attemptId: ATTEMPT_B, answeredAt: DAY9 }),
      ],
    });
    // Only ONE admissible answer remains, so the count gate fires.
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'insufficient-correct-answers');
  });

  test('a leaf that is not `practising` cannot reach resolved — the graph refuses it', () => {
    const r = resolve({
      pattern: leaf({ status: 'open' }),
      attempts: [attempt({ answeredAt: DAY2 }), attempt({ attemptId: ATTEMPT_B, answeredAt: DAY9 })],
    });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'invalid-transition');
    // G.7: `resolved` is reachable ONLY from `practising`.
    assert.deepEqual([...EN.ALLOWED_TRANSITIONS.open].sort(), ['acknowledged', 'dormant', 'practising']);
    assert.ok(!EN.ALLOWED_TRANSITIONS.open.includes('resolved'));
  });

  test('the SCHEDULE is a second, independent floor under the cooling period', () => {
    const schedule = { ...RT.scheduleFirstRetest(leaf()).schedule, dueAt: '2026-09-01T00:00:00.000Z' };
    const r = resolve({
      schedule,
      attempts: [attempt({ answeredAt: DAY2 }), attempt({ attemptId: ATTEMPT_B, answeredAt: DAY9 })],
    });
    // canResolve passes (day 9 is ≥7 days after day 0), but the schedule says
    // the retest is not due until September. A failed retest resets the ladder,
    // so an old correct answer must not resolve a freshly-broken pattern.
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'retest-not-yet-due');
  });

  test('G.7 — dormant reopens, it never "recurs"', () => {
    assert.deepEqual([...EN.ALLOWED_TRANSITIONS.dormant], ['open']);
    assert.ok(!EN.ALLOWED_TRANSITIONS.dormant.includes('recurred'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.4.4 — THREE INDEPENDENT REFUSALS OF CLIENT-SET RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.4 — three refusals, each independently sufficient', () => {
  test('REFUSAL 1 of 3 — THE DATABASE (RLS + grant + trigger)', () => {
    // 007's UPDATE policy is the original and must survive untouched.
    assert.match(code(SQL_007), /status\s+IN\s*\(\s*'acknowledged'\s*,\s*'practising'\s*\)/i);

    const sql = code(SQL_025);
    // The hole 007 left is INSERT: a pattern could be BORN resolved.
    assert.match(sql, /CREATE\s+POLICY\s+patterns_insert_own[\s\S]*?status\s*=\s*'open'/i);
    assert.match(sql, /resolved_at\s+IS\s+NULL/i);
    // A column grant, because severity is not a row-shaped question.
    assert.match(sql, /REVOKE\s+UPDATE\s+ON\s+patterns\s+FROM\s+authenticated/i);
    assert.match(sql, /GRANT\s+UPDATE\s*\(\s*status\s*,\s*history\s*\)\s+ON\s+patterns/i);
    // And a trigger, because RLS does not bind the service role.
    assert.match(sql, /patterns_resolution_requires_proof/);
    assert.match(sql, /mistake_resolutions/);
    // The proof table is service-role-write only.
    assert.match(sql, /CREATE\s+POLICY\s+mistake_resolutions_select_own[\s\S]*?FOR\s+SELECT/i);
    assert.doesNotMatch(sql, /CREATE\s+POLICY[^\n]*mistake_resolutions[^\n]*FOR\s+INSERT/i);
  });

  test('REFUSAL 2 of 3 — applyTransition refuses a STUDENT actor, before any evidence', () => {
    const r = EN.applyTransition(leaf(), {
      to: 'resolved', actor: 'student', cause: 'I fixed it', at: DAY9,
      correctAnswers: [
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY2 },
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY9 },
      ],
    });
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'forbidden-for-student');
    // Even with PERFECT proof attached. §3.1 is a rule about WHO MAY ASK.
    assert.deepEqual([...EN.STUDENT_SETTABLE].sort(), ['acknowledged', 'practising']);

    // The same request as the system succeeds — so the refusal is about the
    // actor and nothing else.
    const asSystem = EN.applyTransition(leaf(), {
      to: 'resolved', actor: 'system', cause: 'proof', at: DAY9,
      correctAnswers: [
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY2 },
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY9 },
      ],
    });
    assert.equal(asSystem.ok, true);
  });

  test('REFUSAL 2 also refuses the SYSTEM when it cannot name proof', () => {
    const r = EN.applyTransition(leaf(), { to: 'resolved', actor: 'system', cause: 'trust me', at: DAY9 });
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'resolution-requires-evidence');
  });

  test('REFUSAL 3 of 3 — EVENT INGEST refuses MISTAKE_RESOLVED from any non-system source', () => {
    const draft = (source) => ({
      client_event_id: 'e1_resolve',
      schema_version: 1,
      occurred_at: DAY9,
      event_type: 'MISTAKE_RESOLVED',
      surface: 'web',
      source,
      payload: { pattern_id: LEAF_ID, resolution_id: RES_ID },
    });

    for (const source of ['student_declaration', 'tool']) {
      const v = EC.validateEventDraft(draft(source));
      assert.equal(v.ok, false, `${source} was allowed to emit MISTAKE_RESOLVED`);
      assert.ok(v.problems.some(p => p.code === 'SOURCE_MAY_NOT_EMIT'));
    }
    // `system` is the only source that may.
    const sys = EC.validateEventDraft(draft('system'));
    assert.ok(!sys.problems?.some(p => p.code === 'SOURCE_MAY_NOT_EMIT'));
  });

  test('the three refusals are INDEPENDENT — one file cannot disable two of them', () => {
    // A Postgres policy, a pure TypeScript function with no I/O, and a
    // validation table on the event contract. Each catches what the others
    // cannot see: RLS never sees a service-role write, `applyTransition` never
    // sees a raw POST, ingest never sees a direct PostgREST call.
    const homes = [SQL_025, MOD_ENGINE, 'lib/event-contract.ts'];
    assert.equal(new Set(homes).size, 3);
    // The engine's refusal must not be reachable from the migration, and the
    // contract's must not be reachable from the engine.
    assert.doesNotMatch(code(MOD_ENGINE), /event-contract/);
    assert.doesNotMatch(code('lib/event-contract.ts'), /mistakes\/engine/);
  });

  test('NO STUDENT-FACING RESOLVE ACTION EXISTS ANYWHERE (G.8)', () => {
    // *"There is therefore no student-facing resolve action, in any surface, at
    // any tier — not a button, not a dismissal, not a swipe, not a bulk clear."*
    // The store's only status writes are through the engine, and its DB
    // interface has no general update verb that could reach `status`.
    const src = code(MOD_STORE);
    assert.doesNotMatch(src, /status:\s*["']resolved["']/);
    assert.match(src, /updatePatternDerived/);
    // The derived-column patch never carries a status.
    assert.doesNotMatch(src, /updatePatternDerived\([^)]*status/);
  });

  test('the ingest path never writes a status other than the born state', async () => {
    const db = fakeDb();
    await ingest(db);
    for (const p of db.writes.patterns) assert.equal(p.status, 'open');
    for (const d of db.writes.derived) {
      assert.ok(!('status' in d.patch), 'a derived-column update carried a status');
      assert.ok(!('resolved_at' in d.patch));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.4.7 — RECURRENCE. THE PRIOR RESOLUTION SURVIVES.
// ═══════════════════════════════════════════════════════════════════════════

describe('V.4.7 — fixed, lost, and the record says so', () => {
  test('resolved → recurred is the ONLY edge out of resolved', () => {
    assert.deepEqual([...EN.ALLOWED_TRANSITIONS.resolved], ['recurred']);
    const r = EN.applyTransition(leaf({ status: 'resolved', resolvedAt: DAY9 }), {
      to: 'recurred', actor: 'system', cause: 'a new sign error on Torque', at: '2026-09-10T10:00:00.000Z',
    });
    assert.equal(r.ok, true);
    assert.equal(r.value.status, 'recurred');
  });

  test('history is APPEND-ONLY across the whole walk — nothing is rewritten', () => {
    const start = leaf({ status: 'practising' });
    const resolved = EN.applyTransition(start, {
      to: 'resolved', actor: 'system', cause: 'proof', at: DAY9,
      correctAnswers: [
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY2 },
        { conceptId: CONCEPT_TORQUE, answeredAt: DAY9 },
      ],
    }).value;
    const recurred = EN.applyTransition(resolved, {
      to: 'recurred', actor: 'system', cause: 'day 40', at: '2026-09-10T10:00:00.000Z',
    }).value;

    assert.equal(start.history.length, 0);
    assert.equal(resolved.history.length, 1);
    assert.equal(recurred.history.length, 2);
    assert.deepEqual(recurred.history[0], resolved.history[0], 'an earlier entry was rewritten');
    assert.equal(recurred.history[1].from, 'resolved');
    assert.equal(recurred.history[1].to, 'recurred');
    assert.ok(Object.isFrozen(recurred));
  });

  test('the MistakeResolution row is a SEPARATE entity that recurrence cannot delete', () => {
    const sql = code(SQL_025);
    // C.3 / G.8: *"the prior resolution is not deleted — its MistakeResolution
    // row stands, which is why that entity is separate from the pattern."*
    assert.match(sql, /CREATE\s+TABLE[\s\S]{0,80}mistake_resolutions/i);
    assert.match(sql, /proof_attempt_ids\s+UUID\[\]\s+NOT\s+NULL/i);
    assert.match(sql, /array_length\(proof_attempt_ids,\s*1\)\s*>=\s*2/i);
    assert.match(sql, /set_by[\s\S]{0,60}CHECK\s*\(\s*set_by\s*=\s*'system'\s*\)/i);
    // No DELETE policy and no UPDATE policy, anywhere.
    assert.doesNotMatch(sql, /mistake_resolutions[\s\S]{0,200}FOR\s+DELETE/i);
    assert.doesNotMatch(sql, /mistake_resolutions[\s\S]{0,200}FOR\s+UPDATE/i);
  });

  test('a resolution stores what it was proven against, because last_seen_at moves', () => {
    const sql = code(SQL_025);
    assert.match(sql, /measured_from\s+TIMESTAMPTZ\s+NOT\s+NULL/i);
    assert.match(sql, /cooling_days\s+NUMERIC\s+NOT\s+NULL\s+CHECK\s*\(\s*cooling_days\s*>=\s*7\s*\)/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M11-6 — THE LEGACY BACKFILL REFUSES TO FABRICATE EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════

describe('M11-6 — legacy rows are marked, never invented (T2)', () => {
  test('the migration creates NO occurrences — it cannot, and it says so', () => {
    const src = code('lib/mistakes/migrate-legacy.ts');
    assert.doesNotMatch(src, /occurrences/i);
    assert.doesNotMatch(src, /evidence_id/);
    assert.doesNotMatch(src, /supabase/i, 'the legacy migration must not reach a database');
  });

  test('a legacy `cleared` becomes `acknowledged`, NEVER `resolved`', () => {
    const r = ML.migrateLegacyMistakes(
      [{ id: 'x', date: DAY0, subject: 'Physics', topic: 'Torque', category: 'sign', status: 'cleared' }],
      DAY9,
    );
    assert.equal(r.records.length, 1);
    assert.equal(r.records[0].status, 'acknowledged');
    assert.notEqual(r.records[0].status, 'resolved');
    // A self-report is not proof (§3.1). Importing it as `resolved` would carry
    // the fluency illusion straight into the new record.
    assert.ok(r.report.log.some(e => /self-report is not proof|acknowledged/.test(e.detail)));
  });

  test('every migrated record is MARKED as evidence-less and unpromoted', () => {
    const r = ML.migrateLegacyMistakes([{ id: 'x', status: 'open' }], DAY9);
    const meta = r.records[0].legacy;
    assert.equal(meta.hasEvidence, false);
    assert.equal(meta.promoted, false);
    assert.equal(meta.source, ML.LEGACY_SOURCE);
    assert.equal(meta.version, ML.MIGRATION_VERSION);
  });

  test('verification FAILS if anything was promoted to resolved', () => {
    const r = ML.migrateLegacyMistakes([{ id: 'x', status: 'open' }], DAY9);
    const tampered = { ...r, records: [{ ...r.records[0], status: 'resolved' }] };
    const v = ML.verifyMigration([{ id: 'x', status: 'open' }], tampered);
    assert.equal(v.ok, false);
    assert.match(v.error, /resolved/);
  });

  test('nothing is dropped — a record it cannot map is preserved, not discarded', () => {
    const raw = [{ id: 'a', status: 'open' }, { id: 'b' }, { nonsense: true }];
    const r = ML.migrateLegacyMistakes(raw, DAY9);
    assert.equal(r.report.dropped, 0);
    assert.equal(r.report.total, raw.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BOUNDARIES — what this milestone deliberately did not build
// ═══════════════════════════════════════════════════════════════════════════

describe('M11 — the determinism and scope boundaries hold', () => {
  test('every module under test is I/O-free, clock-free and randomness-free (U.3)', () => {
    for (const rel of [MOD_STORE, MOD_SEVERITY, MOD_RETEST, MOD_ENGINE]) {
      const src = code(rel);
      assert.doesNotMatch(src, /from\s+["']@supabase/, `${rel} imports Supabase`);
      assert.doesNotMatch(src, /from\s+["']next\//, `${rel} imports next/*`);
      assert.doesNotMatch(src, /Math\.random|crypto\.randomUUID/, `${rel} generates randomness`);
      assert.doesNotMatch(src, /Date\.now\(\)|new Date\(\)/, `${rel} reads a clock`);
    }
  });

  test('no model is reachable from the Mistake DNA path', () => {
    for (const rel of [MOD_STORE, MOD_SEVERITY, MOD_RETEST]) {
      const src = code(rel);
      assert.doesNotMatch(src, /anthropic|openai|ai-guard/i, `${rel} reaches a model`);
    }
  });

  test('M11 supplies no score term — that is M14', () => {
    for (const rel of [MOD_STORE, MOD_SEVERITY, MOD_RETEST]) {
      assert.doesNotMatch(code(rel), /ledger-score/i, `${rel} reaches the score`);
    }
    // G.9's rule, honoured by absence: no term whose denominator grows with
    // capture leaves this milestone, because no term leaves it at all.
    assert.doesNotMatch(code(SQL_025), /coverage_state|score_/i);
  });

  test('the label is built from the row, never generated', () => {
    assert.equal(ST.labelFor('global', 'sign-error', null, null), 'Sign error');
    assert.equal(ST.labelFor('subject', 'sign-error', 'Physics', null), 'Sign error in Physics');
    assert.equal(ST.labelFor('concept', 'sign-error', 'Physics', 'Torque'), 'Sign error: Torque');
  });

  test('an unreadable occurrence row is refused rather than half-mapped', async () => {
    const db = fakeDb();
    const r = await ingest(db, { occurrence: { evidence_id: null } });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'unreadable-occurrence');
    assert.equal(ST.rowToOccurrence({ id: OCC_1 }), null);
  });

  test('M11-3’s vocabulary is readable from the store, and both M10 and 025 spellings are accepted', () => {
    assert.equal(ST.IN_SESSION_ASSESSMENT_SOURCE, 'in-session-assessment');
    assert.equal(ST.ASSESSMENT_ATTEMPT_EVIDENCE_TYPE, 'assessment_attempt');
    assert.equal(ST.isAssessmentOriginated({ origin: 'assessment', source: 'self-test' }), true);
    assert.equal(ST.isAssessmentOriginated({ source: 'in-session-assessment' }), true);
    assert.equal(ST.isAssessmentOriginated({ source: 'homework' }), false);
  });
});
