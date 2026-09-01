// Unit tests for the mistake engine (lib/mistakes/engine.ts).
//
// Covers PRODUCT_DECISIONS §4.6 (severity), §4.7 (merge), §4.8 (lifecycle),
// and PRODUCT_PRINCIPLES §3.1 (only evidence resolves a gap).
//
// Same self-contained pattern as the other suites: compile the pure module
// with the project's own TypeScript into a suite-private outDir, then run
// under node:test. No database, no network, no framework.
//
//   node --test tests/
//   node --test tests/mistakes-engine.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-mistakes');

let E; // the compiled engine

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.mistakes.json'],
    { cwd: root },
  );
});

test('setup imports', async () => {
  E = await import(pathToFileURL(path.join(outDir, 'mistakes', 'engine.js')).href);
  assert.equal(typeof E.mergeOccurrence, 'function');
  assert.equal(typeof E.computeSeverity, 'function');
  assert.equal(typeof E.canResolve, 'function');
});

// ── Fixtures ────────────────────────────────────────────────────────────────

const STUDENT = 'student-1';
const CONCEPT = 'concept-1';
const OTHER_CONCEPT = 'concept-2';

const T0 = '2026-01-01T00:00:00.000Z';
const plusDays = (iso, d) => new Date(Date.parse(iso) + d * 86400000).toISOString();

function leaf(over = {}) {
  return {
    id: 'leaf-1', studentId: STUDENT, tier: 'concept',
    conceptId: CONCEPT, parentPatternId: 'subject-1', subject: 'Physics',
    errorClass: 'execution', errorType: 'sign-error',
    label: 'Sign error applying the chain rule',
    occurrenceIds: [], recurrenceCount: 1,
    firstSeenAt: T0, lastSeenAt: T0,
    severity: 87, systemConfidence: 1, status: 'open',
    remediationPlan: null, history: [], resolvedAt: null,
    ...over,
  };
}

function parent(over = {}) {
  return {
    id: 'subject-1', studentId: STUDENT, tier: 'subject',
    conceptId: null, parentPatternId: 'global-1', subject: 'Physics',
    errorClass: 'execution', errorType: 'sign-error',
    label: 'You make sign errors in Physics',
    occurrenceIds: [], recurrenceCount: 0,
    firstSeenAt: T0, lastSeenAt: T0,
    severity: null, systemConfidence: null, status: 'open',
    remediationPlan: null, history: [], resolvedAt: null,
    ...over,
  };
}

function occurrence(over = {}) {
  return {
    id: 'occ-1', studentId: STUDENT, evidenceId: 'ev-1', source: 'school-exam',
    subject: 'Physics', chapter: 'Rotational Motion', topic: 'Angular Momentum',
    conceptId: CONCEPT, questionRef: 'Q7(b)',
    marksLost: 3, marksAvailable: 5,
    cognitiveError: null, executionError: 'sign-error',
    confidenceBefore: 2, studentAnswer: { kind: 'text', text: '-L' },
    expectedAnswer: null, markerNote: null,
    patternId: null, supersedes: null, createdAt: T0,
    ...over,
  };
}

const proof = (conceptId = CONCEPT, days = 8) => [
  { conceptId, answeredAt: plusDays(T0, days) },
  { conceptId, answeredAt: plusDays(T0, days + 1) },
];

// ══ MERGE RULES (§4.7) ══════════════════════════════════════════════════════

describe('§4.7 merge rules', () => {
  test('an occurrence with only an execution error yields an execution key', () => {
    const r = E.mergeKeyFor(occurrence());
    assert.equal(r.ok, true);
    assert.equal(r.value.errorClass, 'execution');
    assert.equal(r.value.errorType, 'sign-error');
  });

  test('an occurrence with only a cognitive error yields a cognitive key', () => {
    const r = E.mergeKeyFor(occurrence({ cognitiveError: 'misconception', executionError: null }));
    assert.equal(r.ok, true);
    assert.equal(r.value.errorClass, 'cognitive');
  });

  test('an occurrence with BOTH errors is explicitly ambiguous, never guessed', () => {
    const r = E.mergeKeyFor(occurrence({ cognitiveError: 'misconception' }));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'ambiguous-error-classification');
  });

  test('an occurrence with NO error is rejected', () => {
    const r = E.mergeKeyFor(occurrence({ cognitiveError: null, executionError: null }));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'no-error-classification');
  });

  test('matching concept + class + type joins the existing leaf', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf()]);
    assert.equal(r.ok, true);
    assert.equal(r.value.kind, 'joined');
    assert.equal(r.value.patternId, 'leaf-1');
  });

  test('no candidate produces a new leaf rather than an error', () => {
    const r = E.mergeOccurrence(occurrence(), []);
    assert.equal(r.ok, true);
    assert.equal(r.value.kind, 'new-leaf');
    assert.equal(r.value.key.conceptId, CONCEPT);
  });

  test('a different concept never merges', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf({ conceptId: OTHER_CONCEPT })]);
    assert.equal(r.value.kind, 'new-leaf');
  });

  test('a different errorType never merges', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf({ errorType: 'unit-error' })]);
    assert.equal(r.value.kind, 'new-leaf');
  });

  test('NEVER merges across errorClass, even on the same concept', () => {
    const cognitive = leaf({ errorClass: 'cognitive', errorType: 'sign-error' });
    const r = E.mergeOccurrence(occurrence(), [cognitive]);
    assert.equal(r.value.kind, 'new-leaf', 'a misconception and a slip are opposite fixes');
  });

  test('another student’s pattern never merges', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf({ studentId: 'student-2' })]);
    assert.equal(r.value.kind, 'new-leaf');
  });

  test('a PARENT pattern is never a merge candidate', () => {
    const impostor = parent({ conceptId: CONCEPT, tier: 'subject' });
    const r = E.mergeOccurrence(occurrence(), [impostor]);
    assert.equal(r.value.kind, 'new-leaf', 'parents never own evidence (§4.4.2)');
  });

  test('two leaves sharing a merge key is reported, not silently resolved', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf(), leaf({ id: 'leaf-2' })]);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'duplicate-leaf-patterns');
  });

  test('exact-key merges are not provisional', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf()]);
    assert.equal(r.value.provisional, false);
    assert.equal(r.value.reversibleUntil, null);
  });

  test('confidence below 0.8 makes the merge provisional for 30 days', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf()], { confidence: 0.5, now: T0 });
    assert.equal(r.value.provisional, true);
    assert.equal(r.value.reversibleUntil, plusDays(T0, E.PROVISIONAL_WINDOW_DAYS));
  });

  test('confidence exactly at the floor is NOT provisional', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf()], { confidence: E.PROVISIONAL_CONFIDENCE_FLOOR, now: T0 });
    assert.equal(r.value.provisional, false);
  });

  test('a provisional merge without `now` fails rather than inventing a date', () => {
    const r = E.mergeOccurrence(occurrence(), [leaf()], { confidence: 0.1 });
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'invalid-timestamp');
  });

  test('merge does not mutate its inputs', () => {
    const occ = occurrence();
    const candidates = [leaf()];
    const snapshot = JSON.stringify({ occ, candidates });
    E.mergeOccurrence(occ, candidates);
    assert.equal(JSON.stringify({ occ, candidates }), snapshot);
  });
});

// ══ SEVERITY (§4.6) ═════════════════════════════════════════════════════════

describe('§4.6 severity', () => {
  const F = (m, r, e, c) => ({ marksWeight: m, recurrenceWeight: r, examProximity: e, conceptExamWeight: c });

  test('all factors at 1 gives exactly 100', () => {
    assert.equal(E.computeSeverity(F(1, 1, 1, 1)).value, 100);
  });

  test('all factors at 0 gives exactly 0', () => {
    assert.equal(E.computeSeverity(F(0, 0, 0, 0)).value, 0);
  });

  test('the coefficients are 40/30/20/10', () => {
    assert.equal(E.computeSeverity(F(1, 0, 0, 0)).value, 40);
    assert.equal(E.computeSeverity(F(0, 1, 0, 0)).value, 30);
    assert.equal(E.computeSeverity(F(0, 0, 1, 0)).value, 20);
    assert.equal(E.computeSeverity(F(0, 0, 0, 1)).value, 10);
  });

  test('the coefficients sum to 100', () => {
    const w = E.SEVERITY_WEIGHTS;
    assert.equal(w.marksWeight + w.recurrenceWeight + w.examProximity + w.conceptExamWeight, 100);
  });

  test('the result is rounded to an integer', () => {
    const r = E.computeSeverity(F(0.333, 0.333, 0.333, 0.333));
    assert.equal(Number.isInteger(r.value), true);
  });

  test('a factor above 1 is rejected, not clamped', () => {
    const r = E.computeSeverity(F(1.5, 0, 0, 0));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'factor-out-of-range');
  });

  test('a negative factor is rejected', () => {
    assert.equal(E.computeSeverity(F(-0.1, 0, 0, 0)).ok, false);
  });

  test('NaN and Infinity are rejected', () => {
    assert.equal(E.computeSeverity(F(NaN, 0, 0, 0)).ok, false);
    assert.equal(E.computeSeverity(F(Infinity, 0, 0, 0)).ok, false);
  });

  test('a missing factor is rejected rather than defaulted to zero', () => {
    const r = E.computeSeverity({ marksWeight: 1, recurrenceWeight: 1, examProximity: 1 });
    assert.equal(r.ok, false, 'the engine never silently fills missing data');
  });

  test('severity is deterministic across repeated calls', () => {
    const f = F(0.7, 0.2, 0.9, 0.4);
    assert.equal(E.computeSeverity(f).value, E.computeSeverity(f).value);
  });

  // ── Parent severity (§4.6.2) ──
  test('parent severity is the MAX of descendant leaves', () => {
    const leaves = [leaf({ id: 'a', severity: 40 }), leaf({ id: 'b', severity: 91 }), leaf({ id: 'c', severity: 12 })];
    assert.equal(E.computeParentSeverity(leaves).value, 91);
  });

  test('parent severity is unaffected by adding a milder leaf — no dilution', () => {
    const before = E.computeParentSeverity([leaf({ id: 'a', severity: 80 })]).value;
    const after = E.computeParentSeverity([leaf({ id: 'a', severity: 80 }), leaf({ id: 'b', severity: 5 })]).value;
    assert.equal(after, before, 'averages dilute; MAX does not (§4.6.4)');
  });

  test('parent severity of one leaf equals that leaf', () => {
    assert.equal(E.computeParentSeverity([leaf({ severity: 63 })]).value, 63);
  });

  test('MAX composes — global of subjects equals max of all leaves', () => {
    const all = [leaf({ id: 'a', severity: 10 }), leaf({ id: 'b', severity: 55 }), leaf({ id: 'c', severity: 33 })];
    const subjectA = E.computeParentSeverity(all.slice(0, 2)).value;
    const subjectB = E.computeParentSeverity(all.slice(2)).value;
    assert.equal(Math.max(subjectA, subjectB), E.computeParentSeverity(all).value);
  });

  test('a parent with no descendants has no severity', () => {
    const r = E.computeParentSeverity([]);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'empty-descendants');
  });

  test('a non-leaf among the descendants is rejected', () => {
    const r = E.computeParentSeverity([leaf(), parent()]);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'not-a-leaf');
  });

  test('a leaf with null severity is rejected, not treated as zero', () => {
    const r = E.computeParentSeverity([leaf({ severity: null })]);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'missing-leaf-severity');
  });

  // ── Ordering (§4.6.3) ──
  test('ordering prefers highest severity first', () => {
    const a = { severity: 90, unresolvedLeafCount: 1, descendantMarksLost: 1 };
    const b = { severity: 50, unresolvedLeafCount: 9, descendantMarksLost: 99 };
    assert.ok(E.compareParentPatterns(a, b) < 0);
  });

  test('ties break on unresolved leaf count', () => {
    const a = { severity: 70, unresolvedLeafCount: 4, descendantMarksLost: 1 };
    const b = { severity: 70, unresolvedLeafCount: 2, descendantMarksLost: 99 };
    assert.ok(E.compareParentPatterns(a, b) < 0);
  });

  test('further ties break on descendant marks lost', () => {
    const a = { severity: 70, unresolvedLeafCount: 3, descendantMarksLost: 31 };
    const b = { severity: 70, unresolvedLeafCount: 3, descendantMarksLost: 12 };
    assert.ok(E.compareParentPatterns(a, b) < 0);
  });

  test('fully equal rankings compare as 0', () => {
    const a = { severity: 70, unresolvedLeafCount: 3, descendantMarksLost: 12 };
    assert.equal(E.compareParentPatterns(a, { ...a }), 0);
  });

  test('sorting a list is deterministic and descending', () => {
    const xs = [
      { severity: 10, unresolvedLeafCount: 1, descendantMarksLost: 1 },
      { severity: 90, unresolvedLeafCount: 1, descendantMarksLost: 1 },
      { severity: 50, unresolvedLeafCount: 1, descendantMarksLost: 1 },
    ];
    assert.deepEqual([...xs].sort(E.compareParentPatterns).map((x) => x.severity), [90, 50, 10]);
  });
});

// ══ RESOLUTION (§4.8 + PRINCIPLES §3.1) ═════════════════════════════════════

describe('§3.1 resolution — only evidence resolves a gap', () => {
  test('two correct answers ≥7 days after the last occurrence resolves', () => {
    assert.equal(E.canResolve(leaf(), proof()).ok, true);
  });

  test('one correct answer is not enough', () => {
    const r = E.canResolve(leaf(), [{ conceptId: CONCEPT, answeredAt: plusDays(T0, 10) }]);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'insufficient-correct-answers');
  });

  test('zero correct answers is not enough', () => {
    assert.equal(E.canResolve(leaf(), []).error.failure, 'insufficient-correct-answers');
  });

  test('two correct answers on the SAME DAY do not resolve — the cooling period is the point', () => {
    const r = E.canResolve(leaf(), proof(CONCEPT, 0));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'cooling-period-not-elapsed');
  });

  test('the 7-day boundary is exact — day 6 fails, day 7 passes', () => {
    const at = (d) => ({ conceptId: CONCEPT, answeredAt: plusDays(T0, d) });
    assert.equal(E.canResolve(leaf(), [at(5), at(6)]).ok, false, 'both answers inside the cooling period');
    assert.equal(E.canResolve(leaf(), [at(6), at(7)]).ok, true, 'one answer exactly on the boundary');
  });

  test('only ONE answer needs to clear the cooling period', () => {
    const at = (d) => ({ conceptId: CONCEPT, answeredAt: plusDays(T0, d) });
    assert.equal(E.canResolve(leaf(), [at(0), at(30)]).ok, true);
  });

  test('correct answers on a DIFFERENT concept do not count', () => {
    const r = E.canResolve(leaf(), proof(OTHER_CONCEPT));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'insufficient-correct-answers');
  });

  test('a leaf with no lastSeenAt cannot be resolved', () => {
    const r = E.canResolve(leaf({ lastSeenAt: null }), proof());
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'resolution-requires-evidence');
  });

  test('an unparseable lastSeenAt fails explicitly', () => {
    const r = E.canResolve(leaf({ lastSeenAt: 'not-a-date' }), proof());
    assert.equal(r.error.failure, 'invalid-timestamp');
  });

  test('canResolve refuses a parent — parent resolution is derived', () => {
    const r = E.canResolve(parent(), proof());
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'not-a-leaf');
  });

  test('the required thresholds match the spec', () => {
    assert.equal(E.RESOLUTION_MIN_CORRECT, 2);
    assert.equal(E.RESOLUTION_COOLING_DAYS, 7);
  });

  // ── Parent resolution (§4.4.4) ──
  test('a parent resolves only when every descendant leaf is resolved', () => {
    const leaves = [leaf({ id: 'a', status: 'resolved' }), leaf({ id: 'b', status: 'resolved' })];
    assert.equal(E.canResolveParent(parent(), leaves).ok, true);
  });

  test('ONE unresolved descendant blocks the parent', () => {
    const leaves = [leaf({ id: 'a', status: 'resolved' }), leaf({ id: 'b', status: 'practising' })];
    const r = E.canResolveParent(parent(), leaves);
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'unresolved-descendants');
  });

  test('a parent with no descendants cannot be resolved', () => {
    assert.equal(E.canResolveParent(parent(), []).error.failure, 'empty-descendants');
  });

  test('canResolveParent refuses a leaf', () => {
    assert.equal(E.canResolveParent(leaf(), []).error.failure, 'not-a-parent');
  });
});

// ══ LIFECYCLE (§4.8) ════════════════════════════════════════════════════════

describe('§4.8 lifecycle transitions', () => {
  const req = (to, over = {}) => ({ to, actor: 'system', cause: 'test', at: plusDays(T0, 30), ...over });

  test('every legal transition in the graph succeeds for the system', () => {
    let count = 0;
    for (const [from, tos] of Object.entries(E.ALLOWED_TRANSITIONS)) {
      for (const to of tos) {
        const extra = to === 'resolved' ? { correctAnswers: proof() } : {};
        const r = E.applyTransition(leaf({ status: from }), req(to, extra));
        assert.equal(r.ok, true, `${from} → ${to} should be legal: ${r.ok ? '' : r.error.detail}`);
        assert.equal(r.value.status, to);
        count += 1;
      }
    }
    assert.ok(count >= 12, `expected the full graph, walked ${count}`);
  });

  test('open → acknowledged is allowed for a student', () => {
    const r = E.applyTransition(leaf({ status: 'open' }), req('acknowledged', { actor: 'student' }));
    assert.equal(r.ok, true);
  });

  test('open → practising is allowed for a student', () => {
    assert.equal(E.applyTransition(leaf({ status: 'open' }), req('practising', { actor: 'student' })).ok, true);
  });

  test('a student may NOT resolve — the rule this product exists for', () => {
    const r = E.applyTransition(leaf({ status: 'practising' }), req('resolved', { actor: 'student', correctAnswers: proof() }));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'forbidden-for-student');
  });

  test('a student may NOT set dormant, recurred or open', () => {
    for (const [from, to] of [['open', 'dormant'], ['practising', 'recurred'], ['dormant', 'open']]) {
      const r = E.applyTransition(leaf({ status: from }), req(to, { actor: 'student' }));
      assert.equal(r.ok, false, `student must not set ${to}`);
      assert.equal(r.error.failure, 'forbidden-for-student');
    }
  });

  test('the system CAN resolve with evidence', () => {
    const r = E.applyTransition(leaf({ status: 'practising' }), req('resolved', { correctAnswers: proof() }));
    assert.equal(r.ok, true);
    assert.equal(r.value.status, 'resolved');
  });

  test('the system canNOT resolve without evidence', () => {
    const r = E.applyTransition(leaf({ status: 'practising' }), req('resolved'));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'resolution-requires-evidence');
  });

  test('the system canNOT resolve with insufficient evidence', () => {
    const r = E.applyTransition(leaf({ status: 'practising' }), req('resolved', { correctAnswers: proof(CONCEPT, 0) }));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'cooling-period-not-elapsed');
  });

  test('open → resolved is illegal even for the system with evidence', () => {
    const r = E.applyTransition(leaf({ status: 'open' }), req('resolved', { correctAnswers: proof() }));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'invalid-transition');
  });

  test('acknowledged → resolved is illegal', () => {
    const r = E.applyTransition(leaf({ status: 'acknowledged' }), req('resolved', { correctAnswers: proof() }));
    assert.equal(r.error.failure, 'invalid-transition');
  });

  test('resolved → open is illegal; only recurred follows resolved', () => {
    assert.equal(E.applyTransition(leaf({ status: 'resolved' }), req('open')).error.failure, 'invalid-transition');
    assert.equal(E.applyTransition(leaf({ status: 'resolved' }), req('acknowledged')).error.failure, 'invalid-transition');
    assert.equal(E.applyTransition(leaf({ status: 'resolved' }), req('recurred')).ok, true);
  });

  test('dormant never leads to recurred — it was never proven fixed', () => {
    const r = E.applyTransition(leaf({ status: 'dormant' }), req('recurred'));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'invalid-transition');
  });

  test('a transition to the current status is not a transition', () => {
    const r = E.applyTransition(leaf({ status: 'open' }), req('open'));
    assert.equal(r.ok, false);
    assert.equal(r.error.failure, 'invalid-transition');
  });

  test('an unparseable timestamp is rejected', () => {
    const r = E.applyTransition(leaf(), req('acknowledged', { at: 'whenever' }));
    assert.equal(r.error.failure, 'invalid-timestamp');
  });

  test('resolving a PARENT requires its descendants', () => {
    const p = parent({ status: 'practising' });
    assert.equal(E.applyTransition(p, req('resolved')).error.failure, 'resolution-requires-evidence');
    const good = E.applyTransition(p, req('resolved', { descendantLeaves: [leaf({ status: 'resolved' })] }));
    assert.equal(good.ok, true);
  });

  test('a parent with an unresolved descendant cannot transition to resolved', () => {
    const p = parent({ status: 'practising' });
    const r = E.applyTransition(p, req('resolved', { descendantLeaves: [leaf({ status: 'open' })] }));
    assert.equal(r.error.failure, 'unresolved-descendants');
  });

  test('resolvedAt is stamped on resolve and cleared on recur', () => {
    const at = plusDays(T0, 30);
    const resolved = E.applyTransition(leaf({ status: 'practising' }), req('resolved', { correctAnswers: proof(), at }));
    assert.equal(resolved.value.resolvedAt, at);
    const recurred = E.applyTransition(resolved.value, req('recurred'));
    assert.equal(recurred.value.resolvedAt, null);
  });
});

// ══ PURITY AND APPEND-ONLY HISTORY ══════════════════════════════════════════

describe('purity and mechanical append-only history', () => {
  const req = (to, over = {}) => ({ to, actor: 'system', cause: 'because', at: plusDays(T0, 30), ...over });

  test('applyTransition never mutates its input', () => {
    const p = leaf({ status: 'open' });
    const snapshot = JSON.stringify(p);
    E.applyTransition(p, req('acknowledged'));
    assert.equal(JSON.stringify(p), snapshot);
    assert.equal(p.status, 'open');
    assert.equal(p.history.length, 0);
  });

  test('history grows by exactly one entry per transition', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.equal(a.history.length, 1);
    const b = E.applyTransition(a, req('practising')).value;
    assert.equal(b.history.length, 2);
  });

  test('the entry records from, to, cause and time', () => {
    const at = plusDays(T0, 30);
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged', { at })).value;
    assert.deepEqual({ ...a.history[0] }, { at, from: 'open', to: 'acknowledged', cause: 'because' });
  });

  test('earlier entries are preserved byte-for-byte', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    const b = E.applyTransition(a, req('practising')).value;
    assert.equal(b.history[0], a.history[0], 'the same frozen object, not a copy');
    assert.equal(E.isHistoryAppendOnly(a, b), true);
  });

  test('history cannot be appended to outside the engine', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.throws(() => a.history.push({ at: T0, from: 'open', to: 'resolved', cause: 'cheating' }));
    assert.equal(a.history.length, 1);
  });

  test('history entries cannot be rewritten', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.throws(() => { a.history[0].to = 'resolved'; });
    assert.equal(a.history[0].to, 'acknowledged');
  });

  test('the returned pattern itself is frozen', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.throws(() => { a.status = 'resolved'; });
    assert.equal(a.status, 'acknowledged');
  });

  test('isHistoryAppendOnly detects a truncated history', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.equal(E.isHistoryAppendOnly(a, leaf({ history: [] })), false);
  });

  test('isHistoryAppendOnly detects a rewritten entry', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    const forged = leaf({ history: [{ at: T0, from: 'open', to: 'acknowledged', cause: 'forged' }] });
    assert.equal(E.isHistoryAppendOnly(a, forged), false, 'identity, not deep equality');
  });

  test('a full lifecycle walk accumulates an ordered audit trail', () => {
    let p = leaf({ status: 'open' });
    for (const [to, extra] of [
      ['acknowledged', {}], ['practising', {}],
      ['resolved', { correctAnswers: proof() }], ['recurred', {}], ['practising', {}],
    ]) {
      const r = E.applyTransition(p, req(to, extra));
      assert.equal(r.ok, true, `${p.status} → ${to}: ${r.ok ? '' : r.error.detail}`);
      p = r.value;
    }
    assert.deepEqual(p.history.map((h) => h.to),
      ['acknowledged', 'practising', 'resolved', 'recurred', 'practising']);
    assert.equal(p.history[0].from, 'open');
  });

  test('failed transitions leave no trace at all', () => {
    const p = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    const r = E.applyTransition(p, req('resolved', { actor: 'student' }));
    assert.equal(r.ok, false);
    assert.equal(p.history.length, 1, 'a rejected transition must not be recorded');
  });

  test('the engine has no clock — identical inputs give identical outputs', () => {
    const a = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    const b = E.applyTransition(leaf({ status: 'open' }), req('acknowledged')).value;
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  });
});
