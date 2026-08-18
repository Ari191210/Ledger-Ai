// M14-1 · M14-2 · M14-3 · M14-4 — THE LEDGER SCORE REBUILD.
//
// Two instruments, the pairing `tests/record.test.mjs` and
// `tests/diagnosis.test.mjs` already use:
//
//   · BEHAVIOURAL proof over the real, compiled modules, because V.6.1, V.6.2,
//     V.6.5 and V.6.6 are claims about arithmetic, and the only honest way to
//     assert them is to build inputs that genuinely have the shape each test
//     describes and run the real formula over them.
//
//   · STRUCTURAL fences over source, because M14-2's done-when — *"the term is
//     **deleted, not renamed**"* — is a claim about code that must NOT EXIST.
//     There is no unit test for an absence; there is a grep that fails if it
//     comes back. This is the same instrument `tests/m0-integrity-fences.test.mjs`
//     uses, and its header says why: *"the safety of the product now rests on
//     certain code not existing."*
//
//   node --test tests/ledger-score.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-ledger-score');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/** Comments explain; only real code counts. Same convention as
 *  tests/m0-integrity-fences.test.mjs, and load-bearing here: every one of
 *  these files DISCUSSES the streak at length in order to record why it is
 *  gone. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let INPUTS;   // compiled lib/score-inputs
let ENGINE;   // compiled lib/score-engine
let CONT;     // compiled lib/score-continuity
let RECOV;    // compiled lib/score-recovery

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.ledger-score.json'],
    { cwd: root },
  );
  // tsc emits extensionless relative specifiers; Node's ESM loader requires
  // the extension. Same rewriter as tests/record.test.mjs and every other
  // compiled suite in this repository.
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
      ));
    }
  };
  walk(outDir);
});

const load = name => import(pathToFileURL(path.join(outDir, name)).href);

test('setup imports', async () => {
  INPUTS = await load('score-inputs.js');
  ENGINE = await load('score-engine.js');
  CONT = await load('score-continuity.js');
  RECOV = await load('score-recovery.js');
});

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES — rows shaped exactly as 021 / 024 / 026 / 007 / 020 / 025 write them
// ═══════════════════════════════════════════════════════════════════════════

const T0 = Date.parse('2026-08-01T09:00:00Z');
const DAY = 86_400_000;
const iso = ms => new Date(ms).toISOString();
const NOW = T0 + 40 * DAY;

let seq = 0;
const uid = p => `${p}-${(seq += 1).toString().padStart(4, '0')}`;

const sessionRow = (o = {}) => ({
  session_id: o.session_id ?? uid('s'),
  state: o.state ?? 'VERIFIED',
  origin: 'tool_activity',
  close_reason: o.close_reason ?? (o.state === 'VERIFIED' || !o.state ? 'assessment_completed' : null),
  opened_at: iso(o.at ?? T0),
  closed_at: iso((o.at ?? T0) + 3600_000),
});

const recordRow = (o = {}) => ({
  concept_ref: o.concept_ref ?? uid('c'),
  concept_id: o.concept_id ?? null,
  subject: o.subject ?? 'Physics',
  coverage_state: o.coverage_state ?? 'proven',
  last_studied_at: iso(o.at ?? T0),
  session_count: 1,
  assessed_count: o.coverage_state === 'studied' || o.coverage_state === 'declared' ? 0 : 1,
  evidence_refs: { studied_in_session_id: o.studied_in_session_id ?? null },
});

const attemptRow = (o = {}) => ({
  attempt_id: uid('a'),
  question_id: o.question_id ?? uid('q'),
  assessment_id: o.assessment_id ?? 'asmt-1',
  session_id: o.session_id ?? 'sess-1',
  concept_ref: o.concept_ref ?? 'c-1',
  subject: o.subject ?? 'Physics',
  depth: o.depth ?? 'application',
  is_correct: o.is_correct ?? true,
  attempt_no: o.attempt_no ?? 1,
  marks_awarded: 1,
  grader: 'deterministic',
  grade_rule: 'exact',
  graded_at: iso(o.at ?? T0),
  counts_toward_coverage: true,
});

const patternRow = (o = {}) => ({
  id: o.id ?? uid('p'),
  tier: 'concept',
  concept_id: o.concept_id ?? uid('k'),
  parent_pattern_id: null,
  subject: 'Physics',
  error_class: 'cognitive',
  error_type: 'misconception',
  label: 'sign error applying torque',
  status: o.status ?? 'open',
  severity: 40,
  severity_version: 'sev/1',
});

const occurrenceRow = (o = {}) => ({
  id: o.id ?? uid('o'),
  evidence_id: o.evidence_id ?? uid('e'),
  concept_id: o.concept_id ?? null,
  pattern_id: o.pattern_id ?? null,
  subject: 'Physics',
  chapter: 'Rotation',
  topic: 'Torque',
  question_ref: 'Q4',
  source: 'in-session-assessment',
  marks_lost: 2,
  marks_available: 4,
  cognitive_error: 'misconception',
  execution_error: null,
  confidence_before: 2,
  created_at: iso(o.at ?? T0),
  confirmed_at: iso(o.at ?? T0),
});

const resolutionRow = (o = {}) => ({
  id: uid('r'),
  pattern_id: o.pattern_id,
  student_id: 'stu-1',
  resolved_at: iso(o.at ?? T0 + 10 * DAY),
  proof_attempt_ids: o.proof_attempt_ids ?? [uid('pa'), uid('pa')],
  measured_from: iso(T0),
  cooling_days: o.cooling_days ?? 8,
  set_by: o.set_by ?? 'system',
});

const build = (rows = {}, asOfMs = NOW) =>
  INPUTS.buildScoreInputs({
    studentId: 'stu-1',
    asOfMs,
    declaredSubjects: rows.declaredSubjects ?? [],
    sessionRows: rows.sessions ?? [],
    recordRows: rows.records ?? [],
    attemptRows: rows.attempts ?? [],
    patternRows: rows.patterns ?? [],
    occurrenceRows: rows.occurrences ?? [],
    resolutionRows: rows.resolutions ?? [],
  }).inputs;

/** An account that has cleared baseline: three VERIFIED sessions in one
 *  subject, one full assessment, one proven concept, a declared syllabus. */
function establishedRows() {
  const s1 = 'sess-1', s2 = 'sess-2', s3 = 'sess-3';
  return {
    declaredSubjects: ['Physics', 'Maths'],
    sessions: [
      sessionRow({ session_id: s1, at: T0 }),
      sessionRow({ session_id: s2, at: T0 + 5 * DAY }),
      sessionRow({ session_id: s3, at: T0 + 10 * DAY }),
    ],
    records: [
      recordRow({ concept_ref: 'c-torque', concept_id: 'k-torque', coverage_state: 'proven', at: T0 }),
      recordRow({ concept_ref: 'c-moment', concept_id: 'k-moment', coverage_state: 'assessed', at: T0 + 5 * DAY }),
      recordRow({
        concept_ref: 'c-inertia', concept_id: 'k-inertia', coverage_state: 'studied',
        at: T0 + 10 * DAY, studied_in_session_id: s3,
      }),
    ],
    attempts: Array.from({ length: 8 }, (_, i) =>
      attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: s1, is_correct: i < 6, at: T0 })),
    patterns: [],
    occurrences: [],
    resolutions: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// M14-2 — STRUCTURAL: THE TERM IS DELETED, NOT RENAMED
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-2: the consecutive-day term is deleted from scoring', () => {
  test('lib/ledger-score.ts no longer computes a term from the streak', () => {
    const src = code('lib/ledger-score.ts');
    assert.doesNotMatch(src, /streak\s*\*/, 'a streak multiplication survived in the v1 engine');
    assert.doesNotMatch(src, /7\.5/, 'the streak coefficient survived');
    assert.match(src, /const consistencyScore = 0;/);
    assert.match(
      src,
      /Math\.min\(1000,\s*pqaScore \+ syllabusScore \+ mistakeScore\)/,
      'the total still has a fourth addend',
    );
  });

  test('lib/ledger-score-v2.ts no longer computes a term from the streak', () => {
    const src = code('lib/ledger-score-v2.ts');
    assert.doesNotMatch(src, /streak\s*\*/, 'a streak multiplication survived in the shadow engine');
    assert.doesNotMatch(src, /7\.5/);
    assert.match(src, /const consistency = 0;/);
    assert.match(src, /Math\.min\(1000,\s*pqa \+ syllabus \+ recovery\)/);
  });

  test('neither engine emits streak-framed copy any more', () => {
    for (const f of ['lib/ledger-score.ts', 'lib/ledger-score-v2.ts']) {
      assert.doesNotMatch(
        code(f),
        /day streak|open your streak|Protect your|break(ing)? your streak|days in a row/i,
        `${f} still says something streak-shaped to a student`,
      );
    }
  });

  // The done-when, as a fence. §9.3: *"Renaming the existing streak variable to
  // `continuity` is explicitly NOT an implementation of this decision."*
  test('Continuity contains no consecutive-day logic of any kind', () => {
    const src = code('lib/score-continuity.ts');
    const BANNED = [
      /ledger-focus-streak/i,
      /\bstreak\b/i,
      /lib\/streak|["']\.\/streak["']/,
      /consecutive/i,
      /toDateString|toLocaleDateString|getDate\(\)|getDay\(\)|setHours/,
      /lastDate|lastStudiedDay|dayCount|daysInARow|chain/i,
      /shield/i,
      /yesterday|today/i,
    ];
    for (const re of BANNED) {
      assert.doesNotMatch(src, re, `consecutive-day logic reappeared in Continuity: ${re}`);
    }
    // Positively: it reads verified sessions and assessment participation.
    assert.match(src, /VERIFIED/);
    assert.match(src, /assessment_completed/);
    assert.match(src, /assessment_skipped/);
  });

  test('no new score module reads the streak, the blob, or a browser', () => {
    for (const f of [
      'lib/score-inputs.ts', 'lib/score-engine.ts',
      'lib/score-continuity.ts', 'lib/score-recovery.ts',
    ]) {
      const src = code(f);
      for (const banned of [
        'ledger-focus-streak', 'localStorage', 'user_data', 'scoreInputsFromBlob',
        '@supabase', 'supabase-server', 'next/', 'Date.now(', 'Math.random(',
      ]) {
        assert.ok(!src.includes(banned), `${f} reaches for ${banned}`);
      }
      assert.doesNotMatch(src, /\bstreak\b/i, `${f} mentions a streak in real code`);
    }
  });

  test('J.2 — exactly four dimensions, and Momentum is not one of them', () => {
    assert.deepEqual([...ENGINE.DIMENSION_KEYS], [
      'verifiedPerformance', 'provenCoverage', 'recovery', 'continuity',
    ]);
    assert.equal(ENGINE.SCORE_MAX, 1000);
    assert.equal(ENGINE.VERIFIED_PERFORMANCE_MAX, 400);
    assert.equal(ENGINE.PROVEN_COVERAGE_MAX, 250);
    assert.equal(RECOV.RECOVERY_MAX, 200);
    assert.equal(CONT.CONTINUITY_MAX, 150);
    const s = ENGINE.computeLedgerScore(build(establishedRows()));
    assert.deepEqual(Object.keys(s.dimensions).sort(), [...ENGINE.DIMENSION_KEYS].sort());
    assert.ok(!('momentum' in s.dimensions) && !('consistency' in s.dimensions));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-1 — ONE FORMULA, ALL CONSUMERS, ZERO DUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-1: the event-derived input builder', () => {
  test('it reads the new substrate and nothing from the blob era', () => {
    assert.deepEqual([...INPUTS.SCORE_SOURCES], [
      'study_sessions', 'academic_record', 'assessment_attempts',
      'patterns', 'mistake_resolutions', 'confirmed_occurrences',
    ]);
  });

  test('the access layer has six reads and NO write verb', async () => {
    const src = code('lib/score-inputs.ts');
    const iface = src.match(/export interface ScoreInputsDb \{([\s\S]*?)\n\}/);
    assert.ok(iface, 'ScoreInputsDb is gone');
    const verbs = [...iface[1].matchAll(/^\s{2}(\w+)\(/gm)].map(m => m[1]);
    assert.equal(verbs.length, 6, `expected six verbs, got ${verbs.join(', ')}`);
    for (const v of verbs) assert.match(v, /^list/, `${v} is not a read`);
    for (const w of ['insert', 'update', 'delete', 'upsert', 'write']) {
      assert.ok(!iface[1].toLowerCase().includes(w), `a ${w} verb entered the score's access layer`);
    }
  });

  test('loadScoreInputs issues exactly six reads and no writes', async () => {
    const calls = [];
    const verb = name => async () => { calls.push(name); return { data: [], error: null }; };
    const db = {
      listSessions: verb('sessions'),
      listRecordedConcepts: verb('records'),
      listAssessedItems: verb('items'),
      listPatterns: verb('patterns'),
      listConfirmedOccurrences: verb('occurrences'),
      listResolutions: verb('resolutions'),
    };
    const r = await INPUTS.loadScoreInputs(db, 'stu-1', { asOfMs: NOW, declaredSubjects: ['Physics'] });
    assert.ok(r.ok);
    assert.equal(calls.length, 6);
    assert.deepEqual(r.built.inputs.declaredSubjects, ['Physics']);
  });

  test('a database error surfaces; it never becomes an empty score', async () => {
    const ok = async () => ({ data: [], error: null });
    const db = {
      listSessions: ok, listRecordedConcepts: ok, listAssessedItems: ok,
      listPatterns: ok, listConfirmedOccurrences: ok,
      listResolutions: async () => ({ data: null, error: { message: 'boom' } }),
    };
    const r = await INPUTS.loadScoreInputs(db, 'stu-1', { asOfMs: NOW });
    assert.equal(r.ok, false);
    assert.equal(r.error.message, 'boom');
  });

  test('unreadable rows are REFUSED and counted, never repaired', () => {
    const built = INPUTS.buildScoreInputs({
      studentId: 'stu-1',
      asOfMs: NOW,
      sessionRows: [{ session_id: 'x' }],                       // no state
      recordRows: [{ concept_ref: 'c', coverage_state: 'nonsense' }],
      attemptRows: [{ attempt_id: 'a', depth: 'vibes' }],
      patternRows: [{ id: 'p' }],                               // no tier
      occurrenceRows: [{ id: 'o' }],                            // no evidence
      resolutionRows: [resolutionRow({ pattern_id: 'p1', set_by: 'student' })],
    });
    assert.deepEqual(
      { s: built.counts.sessions, c: built.counts.concepts, i: built.counts.items,
        p: built.counts.patterns, o: built.counts.occurrences, r: built.counts.resolutions },
      { s: 0, c: 0, i: 0, p: 0, o: 0, r: 0 },
    );
    assert.equal(built.counts.refused['occurrence:no-evidence'], 1);
    assert.equal(built.counts.refused['resolution:not-system-set'], 1);
  });

  test('one formula: computeLedgerScore is the only thing that produces a total', () => {
    // Zero duplication is a claim about the tree, not about one file. No module
    // outside the engine may sum the four dimension ceilings.
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
      return /\.tsx?$/.test(e.name) ? [p] : [];
    });
    const offenders = walk(path.join(root, 'lib'))
      .concat(walk(path.join(root, 'app')), walk(path.join(root, 'components')))
      .filter(p => !p.endsWith(`${path.sep}score-engine.ts`))
      .filter(p => {
        const src = fs.readFileSync(p, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        return /VERIFIED_PERFORMANCE_MAX\s*\+|PROVEN_COVERAGE_MAX\s*\+/.test(src);
      });
    assert.deepEqual(offenders, [], 'a second place adds the dimensions up');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-4 — V.6.1 / V.6.2: A NEW ACCOUNT HAS NO SCORE, NOT ZERO
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-4: insufficient evidence and the baseline period', () => {
  test('V.6.1 — a new account has NO score, and every dimension says so', () => {
    const s = ENGINE.computeLedgerScore(INPUTS.emptyScoreInputs('stu-1', NOW));
    assert.equal(s.state, 'baseline');
    assert.equal(s.total, null, 'a brand-new account was given a number');
    assert.equal(s.confidence, null);
    assert.equal(s.measuredMax, 0);
    for (const k of ENGINE.DIMENSION_KEYS) {
      const d = s.dimensions[k];
      assert.equal(d.state, 'insufficient_evidence', `${k} was measured with no evidence`);
      assert.equal(d.points, null, `${k} rendered a missing measurement as a number`);
      assert.ok(d.needs.length > 0, `${k} does not say what it still needs`);
    }
    assert.equal(ENGINE.hasScore(s), false);
  });

  test('V.6.1 — zero and insufficient are DIFFERENT states, not the same number', () => {
    // A student with a full assessment they got entirely wrong is MEASURED at 0.
    const rows = establishedRows();
    rows.attempts = Array.from({ length: 8 }, (_, i) =>
      attemptRow({ question_id: `w${i}`, assessment_id: 'asmt-z', session_id: 'sess-1', is_correct: false, at: T0 }));
    const s = ENGINE.computeLedgerScore(build(rows));
    assert.equal(s.dimensions.verifiedPerformance.state, 'measured');
    assert.equal(s.dimensions.verifiedPerformance.points, 0);
    // …while Recovery, with no occurrence at all, is NOT measured.
    assert.equal(s.dimensions.recovery.state, 'insufficient_evidence');
    assert.equal(s.dimensions.recovery.points, null);
  });

  test('V.6.2 — an assessment below MIN_SESSION_QUESTIONS is not counted, and there is still no score', () => {
    assert.equal(ENGINE.MIN_SESSION_QUESTIONS, 5);
    const s = ENGINE.computeLedgerScore(build({
      declaredSubjects: ['Physics'],
      sessions: [sessionRow({ session_id: 'sess-1', at: T0 })],
      attempts: Array.from({ length: 4 }, (_, i) =>
        attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: 'sess-1', at: T0 })),
    }));
    assert.equal(s.dimensions.verifiedPerformance.state, 'insufficient_evidence');
    assert.equal(s.evidence.performance.qualifyingAssessments, 0);
    assert.equal(s.state, 'baseline');
    assert.equal(s.total, null);
    // J.4's elapsed clause reads *"elapsed WITH ANY VERIFIED EVIDENCE"*. A
    // closed session is not evidence — otherwise this account would mature into
    // a score forty days later on the strength of an assessment V.6.2 says is
    // not counted, which is V.6.1's lie arriving late.
    assert.equal(s.baseline.hasVerifiedEvidence, false);
    assert.equal(s.baseline.metBy, null);
    const muchLater = ENGINE.computeLedgerScore(build({
      declaredSubjects: ['Physics'],
      sessions: [sessionRow({ session_id: 'sess-1', at: T0 })],
      attempts: Array.from({ length: 4 }, (_, i) =>
        attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: 'sess-1', at: T0 })),
    }, T0 + 400 * DAY));
    assert.equal(muchLater.state, 'baseline', 'time alone turned an uncounted assessment into a score');
    assert.equal(muchLater.total, null);
  });

  test('J.4 — baseline is met by three verified sessions in a subject', () => {
    const s = ENGINE.computeLedgerScore(build(establishedRows()));
    assert.equal(s.baseline.met, true);
    assert.equal(s.baseline.metBy, 'sessions');
    assert.equal(s.state, 'scored');
    assert.equal(typeof s.total, 'number');
    assert.equal(typeof s.confidence, 'number');
    assert.equal(s.formulaVersion, 'ledger-score/3.0.0');
  });

  test('J.4 — or by BASELINE_DAYS elapsed with any verified evidence, whichever comes first', () => {
    const rows = establishedRows();
    rows.sessions = [sessionRow({ session_id: 'sess-1', at: T0 })]; // one only
    const early = ENGINE.computeLedgerScore(build(rows, T0 + 3 * DAY));
    assert.equal(early.state, 'baseline');
    assert.equal(early.baseline.metBy, null);

    const later = ENGINE.computeLedgerScore(build(rows, T0 + ENGINE.BASELINE_DAYS * DAY));
    assert.equal(later.state, 'scored');
    assert.equal(later.baseline.metBy, 'elapsed');
  });

  test('below baseline the score still reports the evidence collected so far (J.4)', () => {
    const s = ENGINE.computeLedgerScore(build({
      declaredSubjects: ['Physics'],
      sessions: [sessionRow({ session_id: 'sess-1', at: T0 })],
      attempts: Array.from({ length: 6 }, (_, i) =>
        attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: 'sess-1', at: T0 })),
    }, T0 + DAY));
    assert.equal(s.state, 'baseline');
    assert.equal(s.total, null);
    assert.equal(s.dimensions.verifiedPerformance.state, 'measured'); // measured, but not totalled
    assert.ok(s.baseline.needs.length > 0);
    assert.equal(s.baseline.verifiedSessions, 1);
  });

  test('V.6.4 — two students on the same total carry different confidence', () => {
    const thin = establishedRows();
    const thick = establishedRows();
    thick.attempts = Array.from({ length: 60 }, (_, i) =>
      attemptRow({ question_id: `t${i}`, assessment_id: `asmt-${Math.floor(i / 10)}`, session_id: 'sess-1',
        is_correct: i % 4 !== 0, at: T0 + Math.floor(i / 10) * DAY }));
    const a = ENGINE.computeLedgerScore(build(thin));
    const b = ENGINE.computeLedgerScore(build(thick));
    assert.ok(b.confidence > a.confidence, `${b.confidence} should exceed ${a.confidence}`);
    assert.ok(a.confidence >= 0 && b.confidence <= 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-3 — RECOVERY PAYS ONLY EVIDENCE-BACKED, SYSTEM-SET RESOLUTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-3: evidence-backed Recovery', () => {
  test('a client-set patterns.status = "resolved" earns NOTHING', () => {
    const rows = establishedRows();
    rows.patterns = [patternRow({ id: 'p-forged', status: 'resolved' })];
    rows.occurrences = [occurrenceRow({ pattern_id: 'p-forged', evidence_id: 'e1' })];
    rows.resolutions = []; // no proof row: 025 grants a client no INSERT here
    const s = ENGINE.computeLedgerScore(build(rows));
    const ev = s.evidence.recovery;
    assert.equal(ev.resolutionPoints, 0, 'a self-declared resolution was paid');
    assert.deepEqual([...ev.resolvedPatternIds], []);
    assert.deepEqual([...ev.unprovenResolutionClaims], ['p-forged']);
    // It is still paid for being FACED and for the evidence — §3.3, deliberately.
    assert.equal(ev.acknowledgementPoints, 5);
    assert.equal(ev.evidencePoints, 5);
  });

  test('a genuine mistake_resolutions row IS paid', () => {
    const rows = establishedRows();
    rows.patterns = [patternRow({ id: 'p-real', status: 'resolved' })];
    rows.occurrences = [occurrenceRow({ pattern_id: 'p-real', evidence_id: 'e1' })];
    rows.resolutions = [resolutionRow({ pattern_id: 'p-real' })];
    const ev = ENGINE.computeLedgerScore(build(rows)).evidence.recovery;
    assert.equal(ev.resolutionPoints, 20);
    assert.deepEqual([...ev.resolvedPatternIds], ['p-real']);
    assert.deepEqual([...ev.unprovenResolutionClaims], []);
  });

  test('the three proofs M11 built are re-checked here, one refusal each', () => {
    const cases = [
      [{ set_by: 'student' }, 'not-system-set'],
      [{ proof_attempt_ids: ['only-one'] }, 'insufficient-proof'],
      [{ cooling_days: 3 }, 'cooling-period-not-elapsed'],
    ];
    for (const [override, refusal] of cases) {
      const r = INPUTS.readResolution(resolutionRow({ pattern_id: 'p1', ...override }));
      assert.equal(r.ok, false);
      assert.equal(r.refusal, refusal);
    }
    assert.equal(INPUTS.readResolution(resolutionRow({ pattern_id: 'p1' })).ok, true);
    assert.equal(INPUTS.SCORE_RESOLUTION_MIN_PROOF, 2);
    assert.equal(INPUTS.SCORE_RESOLUTION_MIN_COOLING_DAYS, 7);
  });

  test('recurrence does not manufacture score — two resolutions on one pattern pay once', () => {
    const rows = establishedRows();
    rows.patterns = [patternRow({ id: 'p1', status: 'recurred' })];
    rows.occurrences = [occurrenceRow({ pattern_id: 'p1', evidence_id: 'e1' })];
    rows.resolutions = [
      resolutionRow({ pattern_id: 'p1', at: T0 + 10 * DAY }),
      resolutionRow({ pattern_id: 'p1', at: T0 + 30 * DAY }),
    ];
    const ev = ENGINE.computeLedgerScore(build(rows)).evidence.recovery;
    assert.equal(ev.resolutionPoints, 20);
  });

  test('evidence is counted DISTINCT — one photographed paper is one piece', () => {
    const rows = establishedRows();
    rows.patterns = [patternRow({ id: 'p1' })];
    rows.occurrences = Array.from({ length: 10 }, () =>
      occurrenceRow({ pattern_id: 'p1', evidence_id: 'one-paper' }));
    const ev = ENGINE.computeLedgerScore(build(rows)).evidence.recovery;
    assert.equal(ev.evidenceIds.length, 1);
    assert.equal(ev.evidencePoints, 5);
  });

  test('the three ceilings hold and sum to the dimension max', () => {
    assert.equal(RECOV.RESOLUTION_CEILING + RECOV.EVIDENCE_CEILING + RECOV.ACKNOWLEDGEMENT_CEILING,
      RECOV.RECOVERY_MAX);
    const rows = establishedRows();
    rows.patterns = Array.from({ length: 30 }, (_, i) => patternRow({ id: `p${i}`, status: 'practising' }));
    rows.occurrences = Array.from({ length: 30 }, (_, i) =>
      occurrenceRow({ pattern_id: `p${i}`, evidence_id: `e${i}` }));
    rows.resolutions = Array.from({ length: 30 }, (_, i) => resolutionRow({ pattern_id: `p${i}` }));
    const s = ENGINE.computeLedgerScore(build(rows));
    assert.equal(s.dimensions.recovery.points, 200);
  });

  test('Recovery is insufficient — not zero — before the first piece of evidence', () => {
    const s = ENGINE.computeLedgerScore(build(establishedRows()));
    assert.equal(s.dimensions.recovery.state, 'insufficient_evidence');
    assert.equal(RECOV.recoveryCanFallFromCapture(), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.6.5 — EIGHT NEW MISTAKES CAUSE NO DIMENSION TO FALL
// ═══════════════════════════════════════════════════════════════════════════

describe('V.6.5 / PRINCIPLES §3.3: capture never lowers a score', () => {
  const dimsOf = s => Object.fromEntries(
    ENGINE.DIMENSION_KEYS.map(k => [k, s.dimensions[k].points]));

  test('recording eight new, unresolved mistakes moves no dimension down', () => {
    const before = establishedRows();
    const beforeScore = ENGINE.computeLedgerScore(build(before));

    const after = establishedRows();
    after.patterns = Array.from({ length: 8 }, (_, i) => patternRow({ id: `np${i}`, status: 'open' }));
    after.occurrences = Array.from({ length: 8 }, (_, i) =>
      occurrenceRow({ pattern_id: `np${i}`, evidence_id: `ne${i}`, concept_id: `k${i}`, at: T0 + 20 * DAY }));
    const afterScore = ENGINE.computeLedgerScore(build(after));

    const b = dimsOf(beforeScore), a = dimsOf(afterScore);
    for (const k of ENGINE.DIMENSION_KEYS) {
      if (b[k] === null) continue;              // was not measured; nothing to fall
      assert.notEqual(a[k], null, `${k} stopped being measured when mistakes were recorded`);
      assert.ok(a[k] >= b[k], `${k} FELL: ${b[k]} → ${a[k]}`);
    }
    assert.ok(afterScore.total >= beforeScore.total,
      `total fell: ${beforeScore.total} → ${afterScore.total}`);
    // And the honest student is strictly better off, not merely no worse.
    assert.ok(afterScore.total > beforeScore.total);
  });

  test('the mistakes land on studied concepts and STILL move nothing down (J.7.3)', () => {
    // The hard case: the eight mistakes are recorded against the very concepts
    // Continuity's denominator would otherwise count.
    const before = establishedRows();
    const beforeScore = ENGINE.computeLedgerScore(build(before));

    const after = establishedRows();
    after.patterns = [patternRow({ id: 'np', concept_id: 'k-inertia', status: 'open' })];
    after.occurrences = Array.from({ length: 8 }, (_, i) =>
      occurrenceRow({ pattern_id: 'np', evidence_id: `x${i}`, concept_id: 'k-inertia', at: T0 + 20 * DAY }));
    const afterScore = ENGINE.computeLedgerScore(build(after));

    assert.ok(afterScore.dimensions.continuity.points >= beforeScore.dimensions.continuity.points);
    assert.deepEqual([...afterScore.evidence.continuity.excludedForMistake], ['c-inertia']);
    assert.ok(afterScore.total >= beforeScore.total);
  });

  test('Verified Performance is computed over assessed items only (J.7.2)', () => {
    const before = ENGINE.computeLedgerScore(build(establishedRows()));
    const rows = establishedRows();
    rows.occurrences = Array.from({ length: 40 }, (_, i) =>
      occurrenceRow({ evidence_id: `e${i}`, at: T0 + 20 * DAY }));
    const after = ENGINE.computeLedgerScore(build(rows));
    assert.equal(after.dimensions.verifiedPerformance.points,
      before.dimensions.verifiedPerformance.points);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-2 — CONTINUITY, BEHAVIOURALLY
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-2: Continuity measures verification keeping pace with study', () => {
  test('a student who verifies everything they study has full Continuity', () => {
    const s = ENGINE.computeLedgerScore(build({
      declaredSubjects: ['Physics'],
      sessions: [sessionRow({ session_id: 's1', at: T0 }), sessionRow({ session_id: 's2', at: T0 + 3 * DAY }),
        sessionRow({ session_id: 's3', at: T0 + 6 * DAY })],
      records: [
        recordRow({ concept_ref: 'a', coverage_state: 'proven', at: T0 }),
        recordRow({ concept_ref: 'b', coverage_state: 'proven', at: T0 + 3 * DAY }),
        recordRow({ concept_ref: 'c', coverage_state: 'assessed', at: T0 + 6 * DAY }),
      ],
    }));
    assert.equal(s.dimensions.continuity.points, 150);
  });

  test('a student who studies a lot and verifies none of it does not (J.2.a)', () => {
    const s = ENGINE.computeLedgerScore(build({
      declaredSubjects: ['Physics'],
      sessions: [
        sessionRow({ session_id: 's1', state: 'CLOSED_UNVERIFIED', close_reason: 'assessment_skipped', at: T0 }),
        sessionRow({ session_id: 's2', state: 'CLOSED_UNVERIFIED', close_reason: 'assessment_skipped', at: T0 + DAY }),
      ],
      records: [
        recordRow({ concept_ref: 'a', coverage_state: 'studied', at: T0, studied_in_session_id: 's1' }),
        recordRow({ concept_ref: 'b', coverage_state: 'studied', at: T0 + DAY, studied_in_session_id: 's2' }),
      ],
    }));
    assert.equal(s.dimensions.continuity.state, 'measured');
    assert.equal(s.dimensions.continuity.points, 0);
  });

  test('a REAPED session is neither a deduction nor a denominator (M9\'s contract)', () => {
    const c = CONT.computeContinuity(build({
      sessions: [
        sessionRow({ session_id: 's1', state: 'CLOSED_UNVERIFIED', close_reason: 'reaped', at: T0 }),
        sessionRow({ session_id: 's2', state: 'ABANDONED', close_reason: 'discarded', at: T0 }),
        sessionRow({ session_id: 's3', state: 'CLOSED_UNVERIFIED', close_reason: 'generation_failed', at: T0 }),
      ],
      records: [
        recordRow({ concept_ref: 'a', coverage_state: 'studied', at: T0, studied_in_session_id: 's1' }),
        recordRow({ concept_ref: 'b', coverage_state: 'studied', at: T0, studied_in_session_id: 's2' }),
        recordRow({ concept_ref: 'c', coverage_state: 'studied', at: T0, studied_in_session_id: 's3' }),
      ],
    }));
    assert.equal(c.state, 'insufficient_evidence');
    assert.equal(c.evidence.settledCount, 0);
  });

  test('declaring external study tonight and testing none of it moves nothing (E.5, §3.5)', () => {
    const rows = establishedRows();
    const beforeC = ENGINE.computeLedgerScore(build(rows)).dimensions.continuity.points;
    rows.sessions.push(sessionRow({ session_id: 's-decl', state: 'ACTIVE', close_reason: null, at: T0 + 39 * DAY }));
    for (let i = 0; i < 5; i += 1) {
      rows.records.push(recordRow({
        concept_ref: `decl-${i}`, coverage_state: 'declared',
        at: T0 + 39 * DAY, studied_in_session_id: 's-decl',
      }));
    }
    assert.equal(ENGINE.computeLedgerScore(build(rows)).dimensions.continuity.points, beforeC);
  });

  test('J.3 — below two settled concepts Continuity is insufficient, not zero', () => {
    const c = CONT.computeContinuity(build({
      sessions: [sessionRow({ session_id: 's1', at: T0 })],
      records: [recordRow({ concept_ref: 'a', coverage_state: 'proven', at: T0 })],
    }));
    assert.equal(c.state, 'insufficient_evidence');
    assert.equal(CONT.CONTINUITY_MIN_SETTLED, 2);
  });

  test('the ratio is monotone under capture — removing a denominator-only concept never lowers it', () => {
    const base = {
      sessions: [sessionRow({ session_id: 's1', at: T0 }),
        sessionRow({ session_id: 's2', state: 'CLOSED_UNVERIFIED', close_reason: 'assessment_skipped', at: T0 })],
      records: [
        recordRow({ concept_ref: 'v1', concept_id: 'kv1', coverage_state: 'proven', at: T0 }),
        recordRow({ concept_ref: 'v2', concept_id: 'kv2', coverage_state: 'assessed', at: T0 }),
        recordRow({ concept_ref: 'u1', concept_id: 'ku1', coverage_state: 'studied', at: T0, studied_in_session_id: 's2' }),
        recordRow({ concept_ref: 'u2', concept_id: 'ku2', coverage_state: 'studied', at: T0, studied_in_session_id: 's2' }),
      ],
    };
    const before = CONT.computeContinuity(build(base));
    const after = CONT.computeContinuity(build({
      ...base,
      occurrences: [occurrenceRow({ concept_id: 'ku1', evidence_id: 'e1' })],
    }));
    assert.equal(before.points, 75);            // 2 of 4
    assert.equal(after.points, 100);            // 2 of 3 — the mistake concept left
    assert.ok(after.points >= before.points);
  });

  test('a mistake on a VERIFIED concept leaves it in both sides — the carve-out is denominator-only', () => {
    const base = {
      sessions: [sessionRow({ session_id: 's1', at: T0 }),
        sessionRow({ session_id: 's2', state: 'CLOSED_UNVERIFIED', close_reason: 'assessment_skipped', at: T0 })],
      records: [
        recordRow({ concept_ref: 'v1', concept_id: 'kv1', coverage_state: 'proven', at: T0 }),
        recordRow({ concept_ref: 'u1', concept_id: 'ku1', coverage_state: 'studied', at: T0, studied_in_session_id: 's2' }),
      ],
    };
    const before = CONT.computeContinuity(build(base));
    const after = CONT.computeContinuity(build({
      ...base, occurrences: [occurrenceRow({ concept_id: 'kv1', evidence_id: 'e1' })],
    }));
    assert.equal(before.points, 75);
    assert.equal(after.points, 75, 'a mistake on a verified concept changed Continuity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.6.6 / V.6.7 — INACTIVITY, AND AN HONEST DECLINE
// ═══════════════════════════════════════════════════════════════════════════

describe('V.6.6 / V.6.7: what moves the score, and what does not', () => {
  test('V.6.6 — three weeks of inactivity neither raises nor lowers the score', () => {
    const rows = establishedRows();
    const now = ENGINE.computeLedgerScore(build(rows, NOW));
    const later = ENGINE.computeLedgerScore(build(rows, NOW + 21 * DAY));
    assert.equal(later.total, now.total, 'inactivity alone moved the score');
    for (const k of ENGINE.DIMENSION_KEYS) {
      assert.equal(later.dimensions[k].points, now.dimensions[k].points, `${k} moved`);
    }
    // There is nothing to break, because there is no chain.
    assert.equal(later.state, 'scored');
  });

  test('V.6.6 — confidence DOES decay, and that is a claim about the claim', () => {
    const rows = establishedRows();
    const now = ENGINE.computeLedgerScore(build(rows, NOW));
    const later = ENGINE.computeLedgerScore(build(rows, NOW + 60 * DAY));
    assert.ok(later.confidence < now.confidence);
  });

  test('V.6.7 — genuinely declining verified performance DOES lower the score', () => {
    const good = establishedRows();
    const bad = establishedRows();
    bad.attempts = Array.from({ length: 8 }, (_, i) =>
      attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: 'sess-1', is_correct: i < 2, at: T0 }));
    assert.ok(
      ENGINE.computeLedgerScore(build(bad)).total < ENGINE.computeLedgerScore(build(good)).total,
      'a real decline did not show',
    );
  });

  test('a correction is a new attempt, and only the latest one counts (F.5)', () => {
    const rows = establishedRows();
    rows.attempts = [
      ...Array.from({ length: 7 }, (_, i) =>
        attemptRow({ question_id: `q${i}`, assessment_id: 'asmt-1', session_id: 'sess-1', is_correct: true, at: T0 })),
      attemptRow({ question_id: 'qX', assessment_id: 'asmt-1', session_id: 'sess-1', is_correct: false, attempt_no: 1, at: T0 }),
      attemptRow({ question_id: 'qX', assessment_id: 'asmt-1', session_id: 'sess-1', is_correct: true, attempt_no: 2, at: T0 }),
    ];
    const s = ENGINE.computeLedgerScore(build(rows));
    assert.equal(s.evidence.performance.questionsCounted, 8);
    assert.equal(s.evidence.performance.decayedAccuracy, 1);
  });

  test('J.7 — the anti-gaming caps are v2\'s numbers, not new ones', () => {
    assert.equal(ENGINE.DAILY_QUESTION_CAP, 60);
    assert.equal(ENGINE.MIN_SESSION_QUESTIONS, 5);
    const v2 = read('lib/ledger-score-v2.ts');
    assert.match(v2, /DAILY_QUESTION_CAP = 60\b/);
    assert.match(v2, /MIN_SESSION_QUESTIONS = 5\b/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROVEN COVERAGE
// ═══════════════════════════════════════════════════════════════════════════

describe('Proven Coverage counts what is proven, not what is touched', () => {
  test('J.3 — a declared list AND one proven concept, or it is insufficient', () => {
    const noList = ENGINE.computeLedgerScore(build({
      ...establishedRows(), declaredSubjects: [],
    }));
    assert.equal(noList.dimensions.provenCoverage.state, 'insufficient_evidence');

    const rows = establishedRows();
    rows.records = rows.records.map(r =>
      r.coverage_state === 'proven' ? { ...r, coverage_state: 'assessed' } : r);
    const noProof = ENGINE.computeLedgerScore(build(rows));
    assert.equal(noProof.dimensions.provenCoverage.state, 'insufficient_evidence');
  });

  test('a proven subject outweighs an assessed one, which outweighs a studied one', () => {
    assert.ok(ENGINE.RUNG_WEIGHT.proven > ENGINE.RUNG_WEIGHT.assessed);
    assert.ok(ENGINE.RUNG_WEIGHT.assessed > ENGINE.RUNG_WEIGHT.studied);
    assert.equal(ENGINE.RUNG_WEIGHT.declared, 0, 'a declaration alone paid coverage points');
    const s = ENGINE.computeLedgerScore(build({
      ...establishedRows(), declaredSubjects: ['Physics'],
    }));
    assert.equal(s.dimensions.provenCoverage.points, 250);
  });

  test('J.8 — coverage is not a ten-item rolling window', () => {
    const rows = establishedRows();
    rows.declaredSubjects = Array.from({ length: 12 }, (_, i) => `Sub${i}`);
    rows.records = Array.from({ length: 12 }, (_, i) =>
      recordRow({ concept_ref: `c${i}`, subject: `Sub${i}`, coverage_state: 'proven', at: T0 }));
    const s = ENGINE.computeLedgerScore(build(rows));
    assert.equal(s.evidence.coverage.subjectsProven, 12, 'the eleventh subject stopped counting');
    assert.equal(s.dimensions.provenCoverage.points, 250);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LAW 7 — THE ENGINE CANNOT RETURN A ZERO IT DID NOT MEASURE
// ═══════════════════════════════════════════════════════════════════════════

describe('J.3.a: the engine has no catch that renders a bug as a zero', () => {
  test('there is no try/catch returning an EMPTY score', () => {
    const src = code('lib/score-engine.ts');
    assert.doesNotMatch(src, /catch\s*(\(|\{)/, 'a catch arm entered the formula');
    assert.doesNotMatch(src, /\bEMPTY\b/);
  });

  test('scoreTier is not re-exported where it could be called on a missing score', () => {
    assert.equal(ENGINE.scoreTier, undefined);
  });

  test('a measured dimension always names its evidence; an unmeasured one names what it needs', () => {
    const s = ENGINE.computeLedgerScore(build(establishedRows()));
    for (const k of ENGINE.DIMENSION_KEYS) {
      const d = s.dimensions[k];
      if (d.state === 'measured') assert.ok(typeof d.note === 'string' && d.note.length > 0);
      else assert.ok(typeof d.needs === 'string' && d.needs.length > 0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-5 — THE SNAPSHOT, AND V.6.8: EVERY SNAPSHOT REPRODUCES
//
// V.6.8: *"Replay the whole event stream into an empty database. **Every
// snapshot reproduces**, given its `formula_version` and watermark."*
//
// This is proved the only way it can be: build a snapshot from a set of rows,
// then hand the STORED ROW and a freshly-constructed copy of those rows to
// `replayScoreSnapshot` and require the recomputed row to be BIT-IDENTICAL. The
// replay is given nothing the snapshot does not carry — no clock, no `asOfMs`,
// no `capturedOn`, no watermark from the caller — which is what makes a pass
// mean "the row carries enough" rather than "the test remembered enough."
// ═══════════════════════════════════════════════════════════════════════════

/** Rows as the replay would see them: rebuilt from scratch, not the same
 *  objects. A replay into an EMPTY DATABASE shares no object identity with the
 *  run that wrote the snapshot, and neither does this. */
const WATERMARK = { eventId: '11111111-1111-1111-1111-111111111111', seq: 4242 };
const CAPTURED_ON = '2026-09-10';

const buildFull = (rows, asOfMs = NOW) =>
  INPUTS.buildScoreInputs({
    studentId: 'stu-1',
    asOfMs,
    declaredSubjects: rows.declaredSubjects ?? [],
    sessionRows: rows.sessions ?? [],
    recordRows: rows.records ?? [],
    attemptRows: rows.attempts ?? [],
    patternRows: rows.patterns ?? [],
    occurrenceRows: rows.occurrences ?? [],
    resolutionRows: rows.resolutions ?? [],
  });

const snapshotOf = (rows, extra = {}) => {
  const built = buildFull(rows);
  return ENGINE.buildScoreSnapshot({
    score: ENGINE.computeLedgerScore(built.inputs),
    counts: built.counts,
    capturedOn: CAPTURED_ON,
    watermark: WATERMARK,
    ...extra,
  });
};

const replayWith = (snapshot, rows) =>
  ENGINE.replayScoreSnapshot({
    snapshot,
    declaredSubjects: rows.declaredSubjects ?? [],
    sessionRows: rows.sessions ?? [],
    recordRows: rows.records ?? [],
    attemptRows: rows.attempts ?? [],
    patternRows: rows.patterns ?? [],
    occurrenceRows: rows.occurrences ?? [],
    resolutionRows: rows.resolutions ?? [],
  });

describe('M14-5: snapshot provenance', () => {
  test('every column M14-5 names is present and populated', () => {
    const snap = snapshotOf(establishedRows());

    // The four the task names, plus the fifth that makes them exact.
    assert.equal(snap.formula_version, ENGINE.FORMULA_VERSION);
    assert.equal(typeof snap.confidence, 'number');
    assert.equal(typeof snap.evidence_counts, 'object');
    assert.equal(snap.input_watermark_event_id, WATERMARK.eventId);
    assert.equal(snap.input_watermark_seq, WATERMARK.seq);
    assert.equal(snap.as_of, new Date(NOW).toISOString());

    // `captured_on` is a DATE and cannot carry the instant. If `as_of` ever
    // degrades to the day, this is the assertion that notices.
    assert.ok(snap.as_of.includes('T'), 'as_of lost its time-of-day and the replay stops being exact');
    assert.notEqual(snap.as_of.slice(0, 10), snap.as_of);
  });

  test('the snapshot type has no consecutive-day column to write (M14-2)', () => {
    const snap = snapshotOf(establishedRows());
    assert.ok(!('streak' in snap), 'the retired term has a writer again');
    assert.doesNotMatch(code('lib/score-engine.ts'), /streak:/);
  });

  test('V.6.8 — a snapshot replays into a bit-identical row', () => {
    const written = snapshotOf(establishedRows());
    // Fresh rows, fresh objects: this is the "empty database" half.
    const result = replayWith(written, establishedRows());

    assert.equal(result.ok, true);
    assert.equal(result.matches, true, 'the snapshot did not reproduce');
    assert.deepEqual(result.recomputed, written);
  });

  test('V.6.8 — a BASELINE snapshot reproduces too, and reproduces as NULL', () => {
    const empty = { declaredSubjects: [] };
    const written = ENGINE.buildScoreSnapshot({
      score: ENGINE.computeLedgerScore(buildFull(empty).inputs),
      counts: buildFull(empty).counts,
      capturedOn: CAPTURED_ON,
    });
    assert.equal(written.score_state, 'baseline');
    assert.equal(written.total, null, 'V.6.1 — a new account has no score, not zero');
    assert.equal(written.input_watermark_event_id, null, 'a student with no events got an invented watermark');

    const result = replayWith(written, empty);
    assert.equal(result.matches, true);
    assert.equal(result.recomputed.total, null);
  });

  test('V.6.8 — the replay reads `as_of` FROM THE ROW, which is why it is exact', () => {
    const written = snapshotOf(establishedRows());
    // Same rows, a stored instant thirty days later. If the replay took its
    // clock from anywhere but the row, this would still match.
    const moved = { ...written, as_of: new Date(NOW + 30 * DAY).toISOString() };
    const result = replayWith(moved, establishedRows());

    assert.equal(result.ok, true);
    assert.equal(result.matches, false, '`as_of` is not actually an input to the replay');
    assert.notEqual(result.recomputed.confidence, written.confidence,
      'confidence did not move with as_of, so storing the instant proves nothing');
  });

  test('J.6 — a row written by another formula is REFUSED, never silently recomputed', () => {
    const written = snapshotOf(establishedRows());
    const foreign = ENGINE.replayScoreSnapshot({ snapshot: { ...written, formula_version: 'ledger-score/2.0.0' } });
    assert.equal(foreign.ok, false);
    assert.equal(foreign.refusal, 'formula-version-mismatch');

    // And a pre-M14 row — NULL version — is refused on the same ground.
    assert.equal(
      ENGINE.replayScoreSnapshot({ snapshot: { ...written, formula_version: null } }).refusal,
      'formula-version-mismatch',
    );
  });

  test('an unreadable `as_of` is refused rather than defaulted to now', () => {
    const written = snapshotOf(establishedRows());
    const r = ENGINE.replayScoreSnapshot({ snapshot: { ...written, as_of: 'sometime last week' } });
    assert.equal(r.ok, false);
    assert.equal(r.refusal, 'unreadable-as-of');
  });

  test('evidence_counts says what the row is a sum of, and the counts are the ones the engine used', () => {
    const rows = establishedRows();
    const built = buildFull(rows);
    const score = ENGINE.computeLedgerScore(built.inputs);
    const snap = ENGINE.buildScoreSnapshot({ score, counts: built.counts, capturedOn: CAPTURED_ON });
    const ec = snap.evidence_counts;

    assert.equal(ec.qualifyingAssessments, score.evidence.performance.qualifyingAssessments);
    assert.equal(ec.questionsCounted, score.evidence.performance.questionsCounted);
    assert.equal(ec.conceptsProven, score.evidence.coverage.conceptsProven);
    assert.equal(ec.verifiedSessions, score.baseline.verifiedSessions);
    assert.equal(snap.papers_count, score.evidence.performance.qualifyingAssessments);
    // Every declared count is an integer — a derived FACTOR here would be a
    // second copy of the arithmetic rather than evidence for it.
    for (const [k, v] of Object.entries(ec)) {
      if (k === 'rows') continue;
      assert.ok(Number.isInteger(v), `evidence_counts.${k} = ${v} is not a count`);
    }
    // The refusal counts ride along: a refusal that moves between two replays
    // of the same data is a reader bug, and this is where it becomes visible.
    assert.equal(typeof ec.rows, 'object');
  });

  test('snapshotsIdentical compares content, not key order or JSON text', () => {
    const a = snapshotOf(establishedRows());
    const reordered = Object.fromEntries(Object.entries(a).reverse());
    assert.equal(ENGINE.snapshotsIdentical(a, reordered), true);
    assert.equal(ENGINE.snapshotsIdentical(a, { ...a, total: (a.total ?? 0) + 1 }), false);
    assert.equal(
      ENGINE.snapshotsIdentical(a, { ...a, evidence_counts: { ...a.evidence_counts, questionsCounted: 999 } }),
      false,
      'a snapshot with different evidence behind the same number compared equal',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M14-6 — THE CUTOVER. O.4.3: AN EXPLICIT RESTATEMENT, NEVER A SILENT
// RECOMPUTE.
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-6: restatement, and what the daily close now persists', () => {
  test('O.4.3 — the first row under a new formula carries a pointer AND a reason', () => {
    const d = ENGINE.decideRestatement(
      { id: 91, formulaVersion: 'ledger-score/2.0.0', capturedOn: '2026-09-09' },
      ENGINE.FORMULA_VERSION,
    );
    assert.equal(d.restatementOf, 91);
    assert.ok(typeof d.reason === 'string' && d.reason.length > 0);
    // 027's CHECK is `both or neither`; this is that constraint in TypeScript.
    assert.equal(d.restatementOf === null, d.reason === null);
    // States facts, never a verdict, and never blames the student.
    assert.doesNotMatch(d.reason, /you |your fault|failed|lost|penalt/i);
    assert.doesNotMatch(d.reason, /streak/i);
  });

  test('a PRE-M14 row has a NULL version, and NULL counts as a different formula', () => {
    const d = ENGINE.decideRestatement({ id: 4, formulaVersion: null, capturedOn: '2026-09-09' }, ENGINE.FORMULA_VERSION);
    assert.equal(d.restatementOf, 4, 'a pre-provenance row was treated as already on the new formula');
    assert.match(d.reason, /unversioned/);
  });

  test('it happens exactly once per student per formula change, and never on a first close', () => {
    assert.deepEqual(
      ENGINE.decideRestatement({ id: 4, formulaVersion: ENGINE.FORMULA_VERSION, capturedOn: '2026-09-09' }, ENGINE.FORMULA_VERSION),
      ENGINE.NO_RESTATEMENT,
      'the day after the cutover restated again',
    );
    assert.deepEqual(ENGINE.decideRestatement(null, ENGINE.FORMULA_VERSION), ENGINE.NO_RESTATEMENT,
      "a student's very first snapshot restated something that does not exist");
  });

  test('the restatement rides on the snapshot and survives replay unchanged', () => {
    const written = snapshotOf(establishedRows(), {
      restatement: ENGINE.decideRestatement({ id: 7, formulaVersion: null, capturedOn: '2026-09-09' }, ENGINE.FORMULA_VERSION),
    });
    assert.equal(written.restatement_of, 7);
    const result = replayWith(written, establishedRows());
    assert.equal(result.matches, true);
    // O.4.3: the OLD row is pointed at, not rewritten. A replay that "fixed"
    // the pointer would be editing history.
    assert.equal(result.recomputed.restatement_of, 7);
    assert.equal(result.recomputed.restatement_reason, written.restatement_reason);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // THE ROUTE ITSELF, TRACED OVER ITS SOURCE.
  //
  // J.9's CURRENT FACT was *"v2 is computed …, logged as a delta, and
  // **discarded** — the row written to `score_history` is v1."* M14-6's
  // done-when is that this stops being true. What is asserted below is the
  // whole write path, in order: what is computed, what reaches the array, what
  // the array is upserted as, and what is only ever logged.
  // ─────────────────────────────────────────────────────────────────────────
  const ROUTE = 'app/api/cron/score-snapshot/route.ts';
  const routeCode = () => code(ROUTE);

  test('THE CUTOVER: the NEW engine is what is persisted', () => {
    const src = routeCode();
    // 1. the new engine computes the score …
    assert.match(src, /const score = computeLedgerScore\(loaded\.built\.inputs\)/);
    // 2. … which is the ONLY thing built into a snapshot row …
    assert.match(src, /snapshots\.push\(\s*buildScoreSnapshot\(\{\s*score,/);
    // 3. … and the snapshots array is the ONLY thing upserted.
    assert.match(src, /const chunk = snapshots\.slice\(i, i \+ UPSERT_CHUNK\)/);
    assert.match(src, /\.from\("score_history"\)\s*\.upsert\(chunk,/);
    // Exactly one write verb in the whole route.
    assert.equal((src.match(/\.upsert\(|\.insert\(|\.update\(|\.delete\(/g) ?? []).length, 1);
  });

  test('THE CUTOVER: the v1 result is logged and CANNOT reach the row', () => {
    const src = routeCode();
    assert.match(src, /computeScoreFromInputs\(scoreInputsFromBlob\(blob\)\)/,
      'the shadow measurement T3 asks for is gone');

    // The v1 value is bound to `v1` and every use of it is a read. If it ever
    // reaches the snapshot it must first be written into one, and it is not.
    const uses = src.match(/\bv1\b[^\n]*/g) ?? [];
    assert.ok(uses.length > 0);
    for (const line of uses) {
      assert.doesNotMatch(line, /snapshots\.push|buildScoreSnapshot|upsert/,
        `the v1 shadow reaches the persisted row: ${line.trim()}`);
    }
    // And `buildScoreSnapshot`'s argument list names only new-engine values.
    const call = src.slice(src.indexOf('buildScoreSnapshot({'), src.indexOf('buildScoreSnapshot({') + 400);
    assert.doesNotMatch(call, /\bv1\b|scoreInputsFromBlob|computeScoreFromInputs/);
  });

  test('there are NOT two live formulas — v2 is not read here at all', () => {
    const src = routeCode();
    assert.ok(!src.includes('ledger-score-v2'), 'the retired shadow candidate is still imported');
    assert.ok(!src.includes('computeScoreV2'));
  });

  test('the restatement is decided from DATA, not from a deploy flag (T3)', () => {
    const src = routeCode();
    assert.match(src, /readPriorSnapshot\(studentId, capturedOn\)/);
    assert.match(src, /decideRestatement\(prior, FORMULA_VERSION\)/);
    // A flag can be forgotten in exactly the way T3 is about.
    assert.doesNotMatch(src, /process\.env\.[A-Z_]*CUTOVER|CUTOVER_ENABLED|FEATURE_FLAG/i);
    // The prior row is READ and never written to.
    assert.match(src, /\.from\("score_history"\)\s*\.select\(/);
  });

  test('every safety property of the shadow-mode route is preserved', () => {
    const src = routeCode();
    // Fail-closed auth, before anything is read.
    assert.match(src, /if \(!isInternalCaller\(req\)\)[\s\S]{0,120}401/);
    // Service role only — no client-scoped Supabase client anywhere.
    assert.match(src, /from "@\/lib\/supabase-server"/);
    assert.ok(!src.includes('supabase-browser') && !src.includes('createBrowserClient'));
    // Idempotency: 005's UNIQUE (user_id, captured_on), still the conflict target.
    assert.match(src, /onConflict: "user_id,captured_on"/);
    // Chunked upserts, unchanged.
    assert.match(src, /const UPSERT_CHUNK = 500/);
    assert.match(src, /for \(let i = 0; i < snapshots\.length; i \+= UPSERT_CHUNK\)/);
  });

  test('M14-8 — the close day is the DECLARED-ZONE day, not the UTC one', () => {
    const src = routeCode();
    assert.match(src, /const capturedOn = dayKeyInZone\(nowMs\)/);
    assert.doesNotMatch(src, /toISOString\(\)\.slice\(0,\s*10\)/,
      'the UTC day slice that made up a third of the IST/UTC bug survived');
    // The corroborated activity flag is given the SAME day key, so the stamp,
    // the evidence and the close can no longer disagree.
    assert.match(src, /corroborateActiveDay\(blob, capturedOn\)/);
  });

  test('the route derives no score dimension from the blob (J.7)', () => {
    const src = routeCode();
    // The blob is read for exactly two transitional purposes, and both are
    // named. It never reaches `loadScoreInputs`.
    assert.match(src, /loadScoreInputs\(db, studentId, \{/);
    const load = src.slice(src.indexOf('loadScoreInputs(db'), src.indexOf('loadScoreInputs(db') + 240);
    assert.doesNotMatch(load, /blob/);
    // Six reads, no write verb, in the injected interface.
    for (const verb of ['listSessions', 'listRecordedConcepts', 'listAssessedItems',
                        'listPatterns', 'listConfirmedOccurrences', 'listResolutions']) {
      assert.ok(src.includes(verb), `serviceScoreDb is missing ${verb}`);
    }
  });
});
