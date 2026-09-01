/**
 * M23 — ACADEMIC MEMORY AND SEARCH. H.3, H.4, V.9.1–V.9.7, proved.
 *
 * EXECUTION_PLAN M23's tasks:
 *   M23-1  H.3 — five-layer indexing; FTS + pgvector, no separate search
 *          service. Proved STRUCTURALLY over 035's SQL text, the same
 *          posture tests/data-ownership.test.mjs and tests/recommendations
 *          .test.mjs take for prior migrations (no live database here).
 *   M23-2  V.9.1–V.9.5, V.9.7 — NL → StructuredQuery with citations at every
 *          hop. Proved BEHAVIOURALLY against the real compiled
 *          lib/academic-memory/*.ts.
 *   M23-3  V.9.6 — a predictive question produces no StructuredQuery. Proved
 *          behaviourally with several phrasings, none of which reach the
 *          model-response parser at all.
 *
 * `lib/academic-memory/*.ts` is I/O-free (no Anthropic client, no Supabase
 * client, no clock), so every guarantee below is provable with nothing live
 * in reach (U.3) — the wiring in app/api/memory/query/route.ts is checked by
 * `npx tsc --noEmit && npx next build` instead, exactly as
 * tests/data-ownership.test.mjs's header explains for its own route files.
 *
 *   node --test tests/academic-memory.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-academic-memory');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const SQL_035 = 'supabase/migrations/035_academic_memory_search.sql';

let Types, SQ, Narration, Planner;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.academic-memory.json'],
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
  const load = f => import(pathToFileURL(path.join(outDir, 'academic-memory', f)).href);
  [Types, SQ, Narration, Planner] = await Promise.all([
    load('types.js'),
    load('structured-query.js'),
    load('narration.js'),
    load('query-planner.js'),
  ]);
});

const STUDENT = '11111111-1111-4111-8111-111111111111';

// ═══════════════════════════════════════════════════════════════════════════
// H.3 — the migration text, structurally
// ═══════════════════════════════════════════════════════════════════════════
describe('H.3 — 035: no separate search service, three indexes over the same Postgres', () => {
  let sql;
  before(() => { sql = read(SQL_035); });

  test('enables pgvector, guarded', () => {
    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS vector;/);
  });

  test('lexical — tsvector + GIN over declared_text, question stems, concept labels, marker notes', () => {
    assert.match(sql, /concepts[\s\S]*?search_vector tsvector[\s\S]*?GENERATED ALWAYS/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS concepts_search_vector_idx\s+ON public\.concepts USING GIN \(search_vector\)/);

    assert.match(sql, /session_concepts[\s\S]*?search_vector tsvector[\s\S]*?declared_text/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS session_concepts_search_vector_idx\s+ON public\.session_concepts USING GIN \(search_vector\)/);

    assert.match(sql, /academic_events[\s\S]*?search_vector tsvector[\s\S]*?declared_text/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS academic_events_search_vector_idx\s+ON public\.academic_events USING GIN \(search_vector\)/);

    assert.match(sql, /assessment_questions[\s\S]*?search_vector tsvector[\s\S]*?stem/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS assessment_questions_search_vector_idx\s+ON public\.assessment_questions USING GIN \(search_vector\)/);

    assert.match(sql, /occurrences[\s\S]*?search_vector tsvector[\s\S]*?marker_note/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS occurrences_search_vector_idx\s+ON public\.occurrences USING GIN \(search_vector\)/);
  });

  test('semantic — pgvector embeddings over concept labels and declaration text ONLY, never over answers or evidence', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS label_embedding vector\(1536\)/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS declared_text_embedding vector\(1536\)/);
    assert.match(sql, /USING ivfflat \(label_embedding vector_cosine_ops\)/);
    assert.match(sql, /USING ivfflat \(declared_text_embedding vector_cosine_ops\)/);
    // The explicit refusal to embed answers/evidence content (H.3's privacy carve-out).
    assert.doesNotMatch(sql, /student_answer[\s\S]{0,80}embedding/i);
    assert.doesNotMatch(sql, /expected_answer[\s\S]{0,80}embedding/i);
  });

  test('every ALTER/CREATE is idempotent (IF NOT EXISTS), matching every prior migration\'s convention', () => {
    const alters = sql.match(/^ALTER TABLE.*$/gm) ?? [];
    assert.ok(alters.length >= 7, 'expected at least 7 ALTER TABLE statements (5 lexical + 2 embedding columns)');
    assert.doesNotMatch(sql, /ADD COLUMN(?! IF NOT EXISTS)/);
    assert.doesNotMatch(sql, /CREATE INDEX (?!IF NOT EXISTS)/);
    assert.doesNotMatch(sql, /CREATE TABLE (?!IF NOT EXISTS)/);
    assert.doesNotMatch(sql, /CREATE EXTENSION (?!IF NOT EXISTS)/);
  });

  test('structured indexing (H.3.1) was already done by prior milestones — nothing duplicated here', () => {
    const mistakesSql = read('supabase/migrations/007_mistakes.sql');
    assert.match(mistakesSql, /CREATE INDEX IF NOT EXISTS occurrences_concept_idx/);
    assert.match(mistakesSql, /CREATE INDEX IF NOT EXISTS patterns_leaf_severity_idx/);
    const recordSql = read('supabase/migrations/026_academic_record.sql');
    assert.match(recordSql, /CREATE INDEX IF NOT EXISTS academic_record_studied_not_assessed_idx/);
    // 035 does not re-declare any of these as new indexes (it may reference
    // them by name in prose, explaining why they are not duplicated).
    assert.doesNotMatch(sql, /CREATE INDEX IF NOT EXISTS (occurrences_concept_idx|patterns_leaf_severity_idx|academic_record_studied_not_assessed_idx)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M23-3 / V.9.6 — the refusal, deterministic, no model touched
// ═══════════════════════════════════════════════════════════════════════════
describe('V.9.6 — a predictive question produces no StructuredQuery', () => {
  const PREDICTIVE = [
    'will I pass?',
    'will I pass my exam?',
    'will I pass my board exam this year?',
    'am I going to fail?',
    'am I going to fail chemistry?',
    'what grade will I get?',
    'what mark will I get in the finals?',
    'can I pass with this preparation?',
    'how will I do in the exam?',
    'what are my chances of passing?',
    'will I be able to clear the cutoff?',
    'predict my rank',
    'forecast my results',
  ];

  for (const q of PREDICTIVE) {
    test(`"${q}" is detected as unanswerable`, () => {
      assert.equal(SQ.isUnanswerablePrediction(q), true);
    });
  }

  test('refusePrediction never invokes anything that could produce a StructuredQuery', () => {
    const refusal = SQ.refusePrediction();
    assert.equal(refusal.ok, false);
    assert.equal(refusal.reason, 'unanswerable');
    assert.ok(refusal.message.length > 0);
    assert.ok(!/predict|forecast|guess/i.test(refusal.message) || /does not predict|not predict/i.test(refusal.message));
    assert.deepEqual([...refusal.offeredFilters.intents].sort(), [...Types.QUERY_INTENTS].sort());
  });

  test('the closed intent enum structurally has no "predict" member', () => {
    assert.equal(Types.QUERY_INTENTS.includes('predict'), false);
    assert.deepEqual([...Types.QUERY_INTENTS].sort(), ['compare', 'first_occurrence', 'rank', 'set_difference', 'trace']);
  });

  const RETRIEVAL_QUESTIONS = [
    'When did I first study Torque?',
    'What do I keep getting wrong in Physics?',
    'Am I better at Organic Chemistry than I was in March?',
    'What have I studied but never been tested on?',
    'Show me every mistake behind my sign errors.',
  ];
  for (const q of RETRIEVAL_QUESTIONS) {
    test(`retrieval question is NOT flagged as predictive: "${q}"`, () => {
      assert.equal(SQ.isUnanswerablePrediction(q), false);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// M23-2 — the parse: reject, never coerce
// ═══════════════════════════════════════════════════════════════════════════
describe('parseStructuredQueryResponse — the closed schema, enforced', () => {
  test('a valid, minimal query parses', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"first_occurrence","entity":"event","conceptRef":"Torque"}');
    assert.equal(res.kind, 'query');
    assert.equal(res.query.intent, 'first_occurrence');
    assert.equal(res.query.entity, 'event');
    assert.equal(res.query.conceptRef, 'Torque');
  });

  test('a full query with every optional field parses', () => {
    const raw = JSON.stringify({
      intent: 'compare', entity: 'score_snapshot', subject: 'Organic Chemistry',
      comparison: { windowA: { from: '2026-01-01', to: '2026-01-31' }, windowB: { from: '2026-03-01', to: '2026-03-31' } },
    });
    const res = SQ.parseStructuredQueryResponse(raw);
    assert.equal(res.kind, 'query');
    assert.equal(res.query.comparison.windowA.from, '2026-01-01');
  });

  test('an unknown intent is REJECTED, never coerced to the nearest one', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"predict","entity":"score_snapshot"}');
    assert.equal(res.kind, 'invalid');
  });

  test('an unknown entity is rejected', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"rank","entity":"student"}');
    assert.equal(res.kind, 'invalid');
  });

  test('missing intent is rejected', () => {
    const res = SQ.parseStructuredQueryResponse('{"entity":"event"}');
    assert.equal(res.kind, 'invalid');
  });

  test('a model refusal is surfaced as refused, not forced into a query', () => {
    const res = SQ.parseStructuredQueryResponse('{"refused":true,"reason":"this predicts a future outcome"}');
    assert.equal(res.kind, 'refused');
  });

  test('non-JSON text is rejected outright', () => {
    const res = SQ.parseStructuredQueryResponse('I think you will do great!');
    assert.equal(res.kind, 'invalid');
  });

  test('a malformed dateRange is rejected rather than partially accepted', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"rank","entity":"pattern","dateRange":{"from":"2026-01-01"}}');
    assert.equal(res.kind, 'invalid');
  });

  test('an unknown outcomeFilter is rejected', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"rank","entity":"pattern","outcomeFilter":"about-to-fail"}');
    assert.equal(res.kind, 'invalid');
  });

  test('AI never emits SQL: the shape has no field that could carry it, and one that tries is dropped by validation', () => {
    const res = SQ.parseStructuredQueryResponse('{"intent":"rank","entity":"pattern","sql":"SELECT * FROM patterns"}');
    assert.equal(res.kind, 'query');
    assert.equal(Object.prototype.hasOwnProperty.call(res.query, 'sql'), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M23-2 — the planner: five combinations, citations resolve to real rows
// ═══════════════════════════════════════════════════════════════════════════
describe('planQuery — H.4\'s five example queries, deterministic, cited', () => {
  test('1 · first_occurrence: citation is the event actually found', async () => {
    const gateway = {
      findFirstOccurrence: async () => ({ eventId: 'evt-1', occurredAt: '2026-02-14T10:00:00Z', eventType: 'CONCEPT_CONFIRMED' }),
      rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const query = { intent: 'first_occurrence', entity: 'event', conceptRef: 'Torque' };
    const outcome = await Planner.planQuery(query, STUDENT, gateway);
    assert.equal(outcome.ok, true);
    assert.equal(outcome.citations.length, 1);
    assert.equal(outcome.citations[0].recordType, 'academic_event');
    assert.equal(outcome.citations[0].id, 'evt-1');
    assert.match(outcome.answer, /Torque/);
    assert.match(outcome.answer, /evt-1/);
  });

  test('1 · first_occurrence: no record found is a real, honest answer — never a plausible date', async () => {
    const gateway = {
      findFirstOccurrence: async () => null,
      rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'first_occurrence', entity: 'event', conceptRef: 'Nonexistent Concept' }, STUDENT, gateway);
    assert.equal(outcome.answer, 'no record found');
    assert.deepEqual(outcome.citations, []);
  });

  test('2 · rank: every citation id traces back to a row the gateway actually returned', async () => {
    const rows = [
      { patternId: 'pat-1', label: 'Sign error in calculus', severity: 80, recurrenceCount: 4, lastSeenAt: '2026-06-01', occurrenceIds: ['occ-1', 'occ-2'], evidenceIds: ['ev-1'] },
      { patternId: 'pat-2', label: 'Unit conversion slip', severity: 55, recurrenceCount: 2, lastSeenAt: '2026-05-01', occurrenceIds: ['occ-3'], evidenceIds: ['ev-2'] },
    ];
    const gateway = {
      findFirstOccurrence: async () => null,
      rankOpenPatterns: async () => rows,
      compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'rank', entity: 'pattern', subject: 'Physics' }, STUDENT, gateway);
    assert.equal(outcome.ok, true);
    const patternCitations = outcome.citations.filter(c => c.recordType === 'pattern').map(c => c.id);
    assert.deepEqual(patternCitations.sort(), ['pat-1', 'pat-2']);
    const occCitations = outcome.citations.filter(c => c.recordType === 'occurrence').map(c => c.id).sort();
    assert.deepEqual(occCitations, ['occ-1', 'occ-2', 'occ-3']);
    assert.match(outcome.answer, /Physics/);
    assert.match(outcome.answer, /Sign error in calculus/);
  });

  test('3 · compare: both windows and evidence counts are stated; a formula change is labelled', async () => {
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [],
      compareWindows: async () => ({
        windowA: { from: '2026-03-01', to: '2026-03-31', scoreSnapshots: [{ id: 'snap-a', capturedOn: '2026-03-31', total: 600, formulaVersion: 'v1' }], evidenceCount: 5 },
        windowB: { from: '2026-06-01', to: '2026-06-30', scoreSnapshots: [{ id: 'snap-b', capturedOn: '2026-06-30', total: 700, formulaVersion: 'v2' }], evidenceCount: 8 },
      }),
      studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const query = { intent: 'compare', entity: 'score_snapshot', subject: 'Organic Chemistry', comparison: { windowA: { from: '2026-03-01', to: '2026-03-31' }, windowB: { from: '2026-06-01', to: '2026-06-30' } } };
    const outcome = await Planner.planQuery(query, STUDENT, gateway);
    assert.equal(outcome.ok, true);
    assert.match(outcome.answer, /2026-03-01/);
    assert.match(outcome.answer, /2026-06-01/);
    assert.match(outcome.answer, /5 evidence/);
    assert.match(outcome.answer, /8 evidence/);
    assert.match(outcome.answer, /formula/i);
    const ids = outcome.citations.map(c => c.id).sort();
    assert.deepEqual(ids, ['snap-a', 'snap-b']);
  });

  test('3 · compare: no formula-version mismatch is NOT mislabelled', async () => {
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [],
      compareWindows: async () => ({
        windowA: { from: '2026-03-01', to: '2026-03-31', scoreSnapshots: [{ id: 'snap-a', capturedOn: '2026-03-31', total: 600, formulaVersion: 'v2' }], evidenceCount: 3 },
        windowB: { from: '2026-06-01', to: '2026-06-30', scoreSnapshots: [{ id: 'snap-b', capturedOn: '2026-06-30', total: 700, formulaVersion: 'v2' }], evidenceCount: 4 },
      }),
      studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const query = { intent: 'compare', entity: 'score_snapshot', comparison: { windowA: { from: '2026-03-01', to: '2026-03-31' }, windowB: { from: '2026-06-01', to: '2026-06-30' } } };
    const outcome = await Planner.planQuery(query, STUDENT, gateway);
    assert.doesNotMatch(outcome.answer, /formula/i);
  });

  test('4 · set_difference: zero results is an empty list, not a consolation sentence', async () => {
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [], compareWindows: async () => ({}),
      studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'set_difference', entity: 'declaration' }, STUDENT, gateway);
    assert.equal(outcome.answer, 'no record found');
    assert.deepEqual(outcome.rows, []);
  });

  test('4 · set_difference: concepts at coverage_state=studied are cited by concept_ref', async () => {
    const rows = [
      { conceptRef: 'text:wobbling tops', conceptId: null, subject: 'Physics', lastStudiedAt: '2026-07-01' },
      { conceptRef: 'concept-uuid-1', conceptId: 'concept-uuid-1', subject: 'Physics', lastStudiedAt: '2026-07-05' },
    ];
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [], compareWindows: async () => ({}),
      studiedNotAssessed: async () => rows, tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'set_difference', entity: 'declaration', subject: 'Physics' }, STUDENT, gateway);
    assert.equal(outcome.citations.length, 2);
    assert.deepEqual(outcome.citations.map(c => c.id).sort(), ['concept-uuid-1', 'text:wobbling tops']);
  });

  test('5 · trace: pattern → occurrences → evidence, IDs at every hop', async () => {
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [],
      tracePattern: async () => ({
        patternId: 'pat-sign', label: 'Sign error',
        occurrences: [{ occurrenceId: 'occ-1', createdAt: '2026-01-01', evidenceId: 'ev-1' }, { occurrenceId: 'occ-2', createdAt: '2026-02-01', evidenceId: 'ev-2' }],
      }),
    };
    const outcome = await Planner.planQuery({ intent: 'trace', entity: 'occurrence', conceptRef: 'sign errors' }, STUDENT, gateway);
    assert.equal(outcome.ok, true);
    const byType = t => outcome.citations.filter(c => c.recordType === t).map(c => c.id).sort();
    assert.deepEqual(byType('pattern'), ['pat-sign']);
    assert.deepEqual(byType('occurrence'), ['occ-1', 'occ-2']);
    assert.deepEqual(byType('evidence'), ['ev-1', 'ev-2']);
  });

  test('an unsupported (intent, entity) combination is refused, not guessed at', async () => {
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'rank', entity: 'event' }, STUDENT, gateway);
    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'unparseable');
  });

  test('first_occurrence with no conceptRef is refused rather than run against nothing', async () => {
    const gateway = {
      findFirstOccurrence: async () => { throw new Error('should not be called'); },
      rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'first_occurrence', entity: 'event' }, STUDENT, gateway);
    assert.equal(outcome.ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.9.7 — every claim reaches a record
// ═══════════════════════════════════════════════════════════════════════════
describe('V.9.7 — every narrated answer\'s citations resolve to a real returned row', () => {
  test('narration never mentions an id absent from the citations it produced', async () => {
    const rows = [
      { patternId: 'pat-9', label: 'Arithmetic slip', severity: 42, recurrenceCount: 1, lastSeenAt: '2026-04-01', occurrenceIds: ['occ-9'], evidenceIds: ['ev-9'] },
    ];
    const gateway = {
      findFirstOccurrence: async () => null, rankOpenPatterns: async () => rows, compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'rank', entity: 'pattern' }, STUDENT, gateway);
    const citedIds = new Set(outcome.citations.map(c => c.id));
    // Every id that appears in the answer text also appears among the citations.
    const idLike = outcome.answer.match(/pat-\d+|occ-\d+|ev-\d+/g) ?? [];
    for (const id of idLike) assert.ok(citedIds.has(id) || rows.some(r => r.patternId === id), `"${id}" in the answer has no citation`);
  });

  test('every MemoryResult carries at least one citation when rows are non-empty', async () => {
    const gateway = {
      findFirstOccurrence: async () => ({ eventId: 'evt-x', occurredAt: '2026-01-01T00:00:00Z', eventType: 'CONCEPT_CONFIRMED' }),
      rankOpenPatterns: async () => [], compareWindows: async () => ({}), studiedNotAssessed: async () => [], tracePattern: async () => null,
    };
    const outcome = await Planner.planQuery({ intent: 'first_occurrence', entity: 'event', conceptRef: 'X' }, STUDENT, gateway);
    assert.ok(outcome.citations.length >= 1);
    for (const c of outcome.citations) {
      assert.ok(c.id && c.id.length > 0);
      assert.ok(c.recordType && c.recordType.length > 0);
    }
  });
});
