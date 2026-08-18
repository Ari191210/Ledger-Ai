/**
 * M12 — ACADEMIC RECORD PROJECTION. V.2.7, proved end to end.
 *
 * EXECUTION_PLAN M12-1: *"`coverage_state` per concept: declared → studied →
 * proven. Done when: V.2.7 — a concept becomes `proven` only after
 * assessment."*
 * EXECUTION_PLAN M12-2: *"Per-concept accuracy, watermarked and incremental.
 * Done when: U.2 qualification 1: no queue is introduced."*
 * EXECUTION_PLAN M12-3: *"Consistency job verifying each projection's watermark
 * against the stream. Done when: T8 mitigation."*
 *
 * V.2.7 IS RUN THROUGH THE REAL M9 AND M10 MODULES, NOT PAST THEM. The
 * end-to-end section builds a declaration's session concepts with
 * `buildProposal`/`applyConceptDecision`, derives the manifest with
 * `buildCoverageManifest`, freezes it with `freezeBlueprint`, verifies with
 * `applyVerificationTransition`, and only then asks `deriveCoverageState` for
 * the state. If any of those refused, `proven` would be unreachable — which is
 * the point: M12 awards the rung, and M9 and M10 are what make it expensive.
 *
 * Every module under test is I/O-free, so the whole of this file runs with no
 * Supabase project and no network in reach (U.3, the determinism boundary).
 *
 * THE SQL IS READ AS TEXT where a claim is about the schema, with comments
 * stripped, because a comment saying *"this view derives coverage_state"* is not
 * evidence that it does.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checksumOf } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-academic-record');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/** Comments name what a file deliberately does NOT do. Only real code counts.
 *  Line comments first, block comments second — `tests/mistake-dna.test.mjs`
 *  explains why that order and not the other. */
const code = rel =>
  read(rel)
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const SQL_026 = 'supabase/migrations/026_academic_record.sql';
const MOD_COVERAGE = 'lib/coverage-state.ts';
const MOD_ACCURACY = 'lib/concept-accuracy.ts';
const MOD_CONSISTENCY = 'lib/projection-consistency.ts';
const ROUTE_CRON = 'app/api/cron/projection-consistency/route.ts';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SESSION = '66666666-6666-4666-8666-666666666661';
const ASSESSMENT = '77777777-7777-4777-8777-777777777771';
const TORQUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const MOI = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

const T0 = '2026-08-01T10:00:00.000Z';
const T1 = '2026-08-01T10:30:00.000Z';
const T2 = '2026-08-01T11:00:00.000Z';

let CS; // lib/coverage-state.ts
let CA; // lib/concept-accuracy.ts
let PC; // lib/projection-consistency.ts
let AV; // lib/assessment-verification.ts
let AB; // lib/assessment-blueprint.ts
let SC; // lib/session-concepts.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.academic-record.json'],
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
  [CS, CA, PC, AV, AB, SC] = await Promise.all([
    load('coverage-state.js'),
    load('concept-accuracy.js'),
    load('projection-consistency.js'),
    load('assessment-verification.js'),
    load('assessment-blueprint.js'),
    load('session-concepts.js'),
  ]);
});

// ── fixtures ────────────────────────────────────────────────────────────────

const conceptRow = (over = {}) => ({
  session_id: SESSION,
  student_id: STUDENT,
  concept_ref: TORQUE,
  concept_id: TORQUE,
  confirmation_state: 'confirmed',
  confirmed_at: T1,
  ...over,
});

const sessionRow = (over = {}) => ({
  session_id: SESSION,
  state: 'VERIFIED',
  evidence_event_count: 3,
  opened_at: T0,
  closed_at: T2,
  ...over,
});

const coverageRow = (over = {}) => ({
  assessment_id: ASSESSMENT,
  session_id: SESSION,
  concept_ref: TORQUE,
  questions_required: 1,
  questions_bound: 1,
  questions_answered: 1,
  covered: true,
  ...over,
});

const answerRow = (over = {}) => ({
  assessment_id: ASSESSMENT,
  concept_ref: TORQUE,
  correct_questions: 1,
  answered_questions: 1,
  ...over,
});

const input = (over = {}) => ({
  student_id: STUDENT,
  concept_ref: TORQUE,
  concept_id: TORQUE,
  subject: 'Physics',
  concepts: [conceptRow()],
  sessions: [sessionRow()],
  coverage: [coverageRow()],
  answers: [answerRow()],
  ...over,
});

const ev = (seq, type, over = {}) => ({
  event_id: `ee000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
  seq,
  event_type: type,
  concept_id: TORQUE,
  concept_ref: TORQUE,
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
describe('M12-1 · coverage_state is a ladder, and every rung needs its evidence', () => {
// ═══════════════════════════════════════════════════════════════════════════

  test('C.3 enum verbatim, in ascending order of evidence', () => {
    assert.deepEqual(CS.COVERAGE_STATES, ['untouched', 'declared', 'studied', 'assessed', 'proven']);
    const ranks = CS.COVERAGE_STATES.map(CS.coverageRank);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  });

  test('untouched — a concept nobody confirmed is not in the record (V.2.2)', () => {
    for (const state of ['proposed', 'rejected']) {
      const r = CS.deriveCoverageState(input({ concepts: [conceptRow({ confirmation_state: state })] }));
      assert.equal(r.coverage_state, 'untouched', `${state} reached the record`);
      assert.equal(r.evidence.declared_in_session_id, null);
      assert.equal(r.session_count, 0);
    }
  });

  test('declared — confirmed, but the session has not happened yet', () => {
    const r = CS.deriveCoverageState(input({
      sessions: [sessionRow({ state: 'ACTIVE', evidence_event_count: 0 })],
      coverage: [],
      answers: [],
    }));
    assert.equal(r.coverage_state, 'declared');
    assert.equal(r.evidence.declared_in_session_id, SESSION);
    assert.equal(r.evidence.studied_in_session_id, null);
  });

  test('studied — the episode happened: evidence attached, or the session left the open states', () => {
    const viaEvidence = CS.deriveCoverageState(input({
      sessions: [sessionRow({ state: 'ACTIVE', evidence_event_count: 2 })],
      coverage: [], answers: [],
    }));
    assert.equal(viaEvidence.coverage_state, 'studied');

    for (const state of CS.EPISODE_CONCLUDED_STATES) {
      const r = CS.deriveCoverageState(input({
        sessions: [sessionRow({ state, evidence_event_count: 0 })],
        coverage: [], answers: [],
      }));
      assert.equal(r.coverage_state, 'studied', `${state} did not reach studied`);
    }
  });

  test('an ABANDONED session with no evidence never reaches studied (E.2.b)', () => {
    assert.ok(!CS.EPISODE_CONCLUDED_STATES.includes('ABANDONED'));
    const r = CS.deriveCoverageState(input({
      sessions: [sessionRow({ state: 'ABANDONED', evidence_event_count: 0 })],
      coverage: [], answers: [],
    }));
    assert.equal(r.coverage_state, 'declared');
  });

  test('assessed — 024 §3 says covered, and F.2.a\'s studied/assessed line holds', () => {
    const r = CS.deriveCoverageState(input({
      sessions: [sessionRow({ state: 'CLOSED_UNVERIFIED' })],
    }));
    assert.equal(r.coverage_state, 'assessed');
    assert.equal(r.evidence.assessed_in_assessment_id, ASSESSMENT);
    assert.equal(r.evidence.proven_by_assessment_id, null);
  });

  test('an uncovered obligation stops at studied — V.3.4\'s concepts 1, 2, 4', () => {
    const r = CS.deriveCoverageState(input({
      sessions: [sessionRow({ state: 'CLOSED_UNVERIFIED' })],
      coverage: [coverageRow({ questions_answered: 0, covered: false })],
      answers: [],
    }));
    assert.equal(r.coverage_state, 'studied');
    assert.equal(r.assessed_count, 0);
  });

  test('a view row whose `covered` disagrees with its own counts promotes nothing', () => {
    // The same cross-check `evaluateVerificationGate` makes, one layer later.
    const r = CS.deriveCoverageState(input({
      coverage: [coverageRow({ questions_answered: 0, covered: true })],
    }));
    assert.equal(r.coverage_state, 'studied');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('M12-1 · `proven` — the one rung this milestone adds', () => {
// ═══════════════════════════════════════════════════════════════════════════

  test('proven requires ALL THREE conditions, and drops a rung when any is missing', () => {
    assert.equal(CS.deriveCoverageState(input()).coverage_state, 'proven');

    // 1 · no coverage → not even assessed.
    assert.equal(
      CS.deriveCoverageState(input({ coverage: [coverageRow({ covered: false, questions_answered: 0 })] })).coverage_state,
      'studied',
    );
    // 2 · the session is not VERIFIED.
    assert.equal(
      CS.deriveCoverageState(input({ sessions: [sessionRow({ state: 'CLOSED_UNVERIFIED' })] })).coverage_state,
      'assessed',
    );
    // 3 · answered, but not correctly.
    assert.equal(
      CS.deriveCoverageState(input({ answers: [answerRow({ correct_questions: 0 })] })).coverage_state,
      'assessed',
    );
  });

  test('proven honours the manifest\'s own questions_required, not a constant', () => {
    const two = input({
      coverage: [coverageRow({ questions_required: 2, questions_bound: 2, questions_answered: 2 })],
      answers: [answerRow({ correct_questions: 1, answered_questions: 2 })],
    });
    assert.equal(CS.deriveCoverageState(two).coverage_state, 'assessed');

    two.answers = [answerRow({ correct_questions: 2, answered_questions: 2 })];
    assert.equal(CS.deriveCoverageState(two).coverage_state, 'proven');
  });

  test('a proven row NAMES the assessment and session that proved it (C.3)', () => {
    const r = CS.deriveCoverageState(input());
    assert.equal(r.evidence.proven_by_assessment_id, ASSESSMENT);
    assert.equal(r.evidence.proven_in_session_id, SESSION);
  });

  test('every state below proven leaves proven_by_assessment_id null', () => {
    const cases = [
      input({ concepts: [conceptRow({ confirmation_state: 'proposed' })] }),
      input({ sessions: [sessionRow({ state: 'ACTIVE', evidence_event_count: 0 })], coverage: [], answers: [] }),
      input({ sessions: [sessionRow({ state: 'CLOSED_UNVERIFIED' })], coverage: [], answers: [] }),
      input({ sessions: [sessionRow({ state: 'CLOSED_UNVERIFIED' })] }),
    ];
    for (const c of cases) {
      const r = CS.deriveCoverageState(c);
      assert.notEqual(r.coverage_state, 'proven');
      assert.equal(r.evidence.proven_by_assessment_id, null);
      assert.equal(r.evidence.proven_in_session_id, null);
    }
  });

  test('M10 still refuses to award proven — its union has no such arm', () => {
    // The fence M10 wrote and this milestone must not remove: a second module
    // deciding when a concept is proven is the second source of truth H.1.a
    // forbids.
    const states = AV.conceptAssessmentStates({
      manifest: [{ concept_ref: TORQUE, concept_id: TORQUE, questions_required: 1, starting_depth: 'recall', targets_error_type: null }],
      coverage: [coverageRow()],
    });
    assert.equal(states[TORQUE], 'assessed');
    assert.doesNotMatch(code('lib/assessment-verification.ts'), /["']proven["']/);
  });

  test('`proven` is a value in exactly one module', () => {
    assert.match(code(MOD_COVERAGE), /"proven"/);
    for (const f of ['lib/study-session.ts', 'lib/session-concepts.ts', 'lib/assessment-blueprint.ts', 'lib/assessment-grading.ts']) {
      assert.doesNotMatch(code(f), /["']proven["']/, `${f} names a coverage state it does not own`);
    }
  });

  test('the projection moves no score — one arm, no number (M14 owns J.2)', () => {
    assert.deepEqual(CS.coverageScoreEffect(CS.deriveCoverageState(input())), { kind: 'none' });
    assert.equal(CS.coverageStateMovesScore(), false);
    assert.doesNotMatch(code(MOD_COVERAGE), /ledger-score|computeLedgerScore/);
  });

  test('no note judges — §4', () => {
    for (const note of Object.values(CS.COVERAGE_STATE_NOTE)) {
      assert.doesNotMatch(note, /\b(only|still|fail|failed|incomplete|behind|weak|poor)\b/i, note);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('V.2.7 · END TO END, through the real M9 and M10 modules', () => {
// ═══════════════════════════════════════════════════════════════════════════

  /**
   * V.2.1–V.2.7 in one run.
   *
   *   1 · a declaration opens a session with `origin = 'declaration'`;
   *   2 · AI proposes Torque and Moment of Inertia — both `proposed`;
   *   3 · the student confirms Torque and rejects Moment of Inertia;
   *   4 · "the thing about wobbling tops" resolves to nothing and keeps a
   *       `text:` ref with `concept_id = NULL`;
   *   5 · the declaration alone moves no score;
   *   6 · the manifest names Torque AND the unresolved declaration;
   *   7 · the student passes both, the gate verifies the session, and
   *       `coverage_state` for Torque becomes `proven`.
   */
  const buildV27 = () => {
    // ── V.2.2 · two AI proposals, neither confirmed ────────────────────────
    const torque = SC.buildProposal({
      session_id: SESSION, student_id: STUDENT, concept_id: TORQUE, declared_text: 'Torque',
      detection_source: 'ai_proposed', origin: 'declaration', at: T0, source_client_event_id: 'esd:1',
    });
    const moi = SC.buildProposal({
      session_id: SESSION, student_id: STUDENT, concept_id: MOI, declared_text: 'Moment of Inertia',
      detection_source: 'ai_proposed', origin: 'declaration', at: T0, source_client_event_id: 'esd:1',
    });
    // ── V.2.4 · no taxonomy match, and the system does not guess ───────────
    const tops = SC.buildProposal({
      session_id: SESSION, student_id: STUDENT, concept_id: null,
      declared_text: 'and the thing about wobbling tops',
      detection_source: 'student_declared', origin: 'declaration', at: T0,
      source_client_event_id: 'esd:2', decision_client_event_id: 'cc:auto',
    });
    assert.ok(torque.ok && moi.ok && tops.ok);
    assert.equal(torque.draft.confirmation_state, 'proposed');
    assert.equal(moi.draft.confirmation_state, 'proposed');
    assert.equal(tops.draft.concept_id, null);
    assert.ok(SC.isUnresolvedRef(tops.draft.concept_ref));

    // ── V.2.3 · one confirmation, one rejection, both retained ─────────────
    const yes = SC.applyConceptDecision(torque.draft, true, T1, 'cc:1');
    const no = SC.applyConceptDecision(moi.draft, false, T1, 'cc:2');
    assert.equal(yes.kind, 'decided');
    assert.equal(no.kind, 'decided');

    const rows = [
      { ...torque.draft, ...yes.patch, session_concept_id: 'sc1' },
      { ...moi.draft, ...no.patch, session_concept_id: 'sc2' },
      { ...tops.draft, session_concept_id: 'sc3' },
    ];
    return { rows, topsRef: tops.draft.concept_ref };
  };

  test('V.2.5 — the declaration and its confirmations move no score', () => {
    const { rows } = buildV27();
    for (const r of rows) assert.deepEqual(SC.conceptScoreEffect(r), { kind: 'none' });
    assert.equal(SC.confirmingAConceptMovesScore(), false);
    assert.equal(SC.rejectingAConceptMovesScore(), false);
  });

  test('V.2.6 — the manifest names Torque AND the unresolved declaration; the rejection is absent', () => {
    const { rows, topsRef } = buildV27();
    const m = AB.buildCoverageManifest({ concepts: rows });
    assert.ok(m.ok);
    const refs = m.manifest.map(e => e.concept_ref);
    assert.ok(refs.includes(TORQUE), 'Torque is not an obligation');
    assert.ok(refs.includes(topsRef), 'the unresolved declaration is not an obligation');
    assert.ok(!refs.includes(MOI), 'a REJECTED concept became an obligation');
  });

  test('V.2.7 — the student passes both, the session verifies, and Torque becomes `proven`', () => {
    const { rows, topsRef } = buildV27();

    // ── M10-1 · the manifest, frozen before any model call ─────────────────
    const m = AB.buildCoverageManifest({ concepts: rows });
    assert.ok(m.ok);
    const blueprint = AB.buildBlueprint({ manifest: m.manifest });
    const frozen = AB.freezeBlueprint({
      assessment_id: ASSESSMENT, session_id: SESSION, student_id: STUDENT,
      manifest: m.manifest, blueprint, frozen_at: T1,
    });
    assert.ok(frozen.ok, 'the freeze refused a manifest M9 produced');
    assert.ok(AB.verifyFrozen(frozen.frozen));

    // ── the student answers every slot, correctly ──────────────────────────
    const coverage = m.manifest.map(e => ({
      assessment_id: ASSESSMENT, session_id: SESSION, concept_ref: e.concept_ref,
      questions_required: e.questions_required,
      questions_bound: e.questions_required,
      questions_answered: e.questions_required,
      covered: true,
    }));
    const answers = m.manifest.map(e => ({
      assessment_id: ASSESSMENT, concept_ref: e.concept_ref,
      correct_questions: e.questions_required, answered_questions: e.questions_required,
    }));

    // ── M10-4 · the transition gate is the only route to VERIFIED ──────────
    const session = {
      state: 'ASSESSING', origin: 'declaration', lastActivityAtMs: Date.parse(T1),
      nowMs: Date.parse(T2), evidenceEventCount: 3,
    };
    const verified = AV.applyVerificationTransition(session, {
      assessment_id: ASSESSMENT, manifest: m.manifest, coverage,
    });
    assert.ok(verified.ok, `the gate refused: ${JSON.stringify(verified.refusals ?? [])}`);
    assert.equal(verified.transition.outcome.to, 'VERIFIED');

    // ── M12-1 · and NOW the record moves ───────────────────────────────────
    const projected = CS.projectCoverage({
      student_id: STUDENT,
      concepts: rows,
      sessions: [{ session_id: SESSION, state: 'VERIFIED', evidence_event_count: 3, opened_at: T0, closed_at: T2 }],
      coverage,
      answers,
      subjects: { [TORQUE]: 'Physics' },
    });

    const byRef = Object.fromEntries(projected.map(p => [p.concept_ref, p]));
    assert.equal(byRef[TORQUE].coverage_state, 'proven', 'V.2.7 clause 4 failed');
    assert.equal(byRef[TORQUE].evidence.proven_by_assessment_id, ASSESSMENT);
    assert.equal(byRef[topsRef].coverage_state, 'proven', 'the unresolved declaration was not carried');
    assert.equal(byRef[MOI], undefined, 'a rejected concept reached the record');
    assert.equal(CS.provenOnly(projected).length, 2);
  });

  test('V.2.7 fails closed — the SAME run with one unanswered slot proves nothing', () => {
    const { rows } = buildV27();
    const m = AB.buildCoverageManifest({ concepts: rows });
    assert.ok(m.ok);

    const coverage = m.manifest.map((e, i) => ({
      assessment_id: ASSESSMENT, session_id: SESSION, concept_ref: e.concept_ref,
      questions_required: e.questions_required,
      questions_bound: e.questions_required,
      // The FIRST obligation is left unanswered — V.3.4's concept 3.
      questions_answered: i === 0 ? 0 : e.questions_required,
      covered: i !== 0,
    }));

    const refused = AV.applyVerificationTransition(
      { state: 'ASSESSING', origin: 'declaration', lastActivityAtMs: Date.parse(T1), nowMs: Date.parse(T2), evidenceEventCount: 3 },
      { assessment_id: ASSESSMENT, manifest: m.manifest, coverage },
    );
    assert.equal(refused.ok, false, 'the gate verified a session with a coverage hole');

    // The session therefore closes UNVERIFIED, and NOTHING is proven.
    const projected = CS.projectCoverage({
      student_id: STUDENT,
      concepts: rows,
      sessions: [{ session_id: SESSION, state: 'CLOSED_UNVERIFIED', evidence_event_count: 3, opened_at: T0, closed_at: T2 }],
      coverage,
      answers: m.manifest.map(e => ({
        assessment_id: ASSESSMENT, concept_ref: e.concept_ref,
        correct_questions: e.questions_required, answered_questions: e.questions_required,
      })),
    });
    assert.equal(CS.provenOnly(projected).length, 0, 'a concept was proven without a verified session');
    for (const p of projected) assert.ok(['studied', 'assessed'].includes(p.coverage_state), p.coverage_state);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('M12-2 · the accuracy projection is watermarked, and does no redundant work', () => {
// ═══════════════════════════════════════════════════════════════════════════

  const batch = [ev(1, 'QUESTION_CORRECT'), ev(2, 'QUESTION_WRONG'), ev(3, 'QUESTION_CORRECT')];

  test('a cold fold counts what it saw and marks where it stopped', () => {
    const r = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), batch);
    assert.equal(r.processed, 3);
    assert.equal(r.changed, true);
    assert.equal(r.state.watermark.last_seq, 3);
    assert.equal(r.state.watermark.events_processed, 3);
    assert.equal(r.state.concepts[TORQUE].answered, 3);
    assert.equal(r.state.concepts[TORQUE].correct, 2);
    assert.equal(r.state.concepts[TORQUE].wrong, 1);
  });

  test('THE PROOF OF INCREMENTALITY — a second run over the same stream does no work', () => {
    const first = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), batch);
    const second = CA.advanceAccuracy(first.state, batch);

    assert.equal(second.processed, 0, 'the second run folded events it had already folded');
    assert.equal(second.skipped_at_or_below_watermark, 3, 'the watermark did not skip the old batch');
    assert.equal(second.changed, false);
    // The IDENTICAL object, not an equal one: a caller that persists on
    // `changed` (or on identity) cannot write a redundant row.
    assert.equal(second.state, first.state);
    assert.equal(second.state.concepts[TORQUE].answered, 3, 'the counters doubled');
  });

  test('only events PAST the mark are folded; the counters are not recomputed', () => {
    const first = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), batch);
    const withTail = [...batch, ev(4, 'QUESTION_WRONG')];
    const second = CA.advanceAccuracy(first.state, withTail);

    assert.equal(second.processed, 1, 'more than the tail was folded');
    assert.equal(second.skipped_at_or_below_watermark, 3);
    assert.equal(second.state.concepts[TORQUE].answered, 4);
    assert.equal(second.state.watermark.events_processed, 4);
    assert.equal(second.state.watermark.last_seq, 4);
  });

  test('an out-of-order page cannot leave the mark behind what it consumed', () => {
    const r = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), [ev(5, 'QUESTION_CORRECT'), ev(2, 'QUESTION_WRONG')]);
    assert.equal(r.state.watermark.last_seq, 5);
    assert.equal(r.processed, 2);
  });

  test('the mark advances past events this projection does not consume', () => {
    const r = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), [
      ev(1, 'CONCEPT_VIEWED'), ev(2, 'SESSION_STARTED'), ev(3, 'QUESTION_CORRECT'),
    ]);
    assert.equal(r.ignored, 2);
    assert.equal(r.processed, 3);
    assert.equal(r.state.concepts[TORQUE].answered, 1);
    assert.equal(r.state.watermark.last_seq, 3);
  });

  test('an unrecognised type contributes nothing — a positive list, not a denylist', () => {
    assert.equal(CA.isAccuracyEvent('QUESTION_CORRECT'), true);
    assert.equal(CA.isAccuracyEvent('QUESTION_WRONG'), true);
    for (const t of ['PRACTICE_COMPLETED', 'ASSESSMENT_COMPLETED', 'MISTAKE_RESOLVED', 'CONCEPT_CONFIRMED']) {
      assert.equal(CA.isAccuracyEvent(t), false, `${t} would be scored`);
    }
  });

  test('a correction asks for a REBUILD rather than being folded backwards (O.4)', () => {
    const first = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), batch);
    const second = CA.advanceAccuracy(first.state, [ev(4, 'EVENT_SUPERSEDED')]);
    assert.equal(second.rebuild_required, true);
    assert.equal(second.state.concepts[TORQUE].answered, 3, 'a forward fold silently changed a counter');

    const rebuilt = CA.rebuildAccuracyFrom(STUDENT, [ev(1, 'QUESTION_CORRECT')]);
    assert.equal(rebuilt.state.concepts[TORQUE].answered, 1);
    assert.equal(rebuilt.state.watermark.events_processed, 1);
  });

  test('zero answers is NO accuracy, never zero accuracy (J.4, V.6.1)', () => {
    assert.equal(CA.accuracyOf(undefined), null);
    assert.equal(CA.accuracyOf({ answered: 0, correct: 0 }), null);
    assert.equal(CA.accuracyOf({ answered: 4, correct: 3 }), 0.75);
    assert.equal(CA.priorAccuracyFor(CA.emptyAccuracyState(STUDENT), TORQUE), undefined);
  });

  test('the projection is keyed on concept_ref, so unresolved concepts do not merge', () => {
    const a = ev(1, 'QUESTION_WRONG', { concept_id: null, concept_ref: 'text:wobbling tops' });
    const b = ev(2, 'QUESTION_WRONG', { concept_id: null, concept_ref: 'text:banked curves' });
    const r = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), [a, b]);
    assert.equal(Object.keys(r.state.concepts).length, 2);
  });

  test('U.2 qualification 1 — NO QUEUE. The module has no transport at all', () => {
    const src = code(MOD_ACCURACY);
    for (const banned of ['await ', 'Promise', 'fetch(', 'subscribe', 'publish', 'channel(', 'queue', 'kafka', 'redis', 'sqs']) {
      assert.ok(!src.toLowerCase().includes(banned.toLowerCase()), `the accuracy projection reaches for ${banned}`);
    }
    assert.doesNotMatch(src, /import .* from ["']@supabase|next\//);
  });

  test('rows are emitted in a deterministic order (U.3)', () => {
    const r = CA.advanceAccuracy(CA.emptyAccuracyState(STUDENT), [
      ev(1, 'QUESTION_WRONG', { concept_ref: 'zz', concept_id: null }),
      ev(2, 'QUESTION_CORRECT', { concept_ref: 'aa', concept_id: null }),
    ]);
    assert.deepEqual(CA.accuracyRows(r.state).map(x => x.concept_ref), ['aa', 'zz']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('M12-3 · the consistency job detects drift, and never repairs it (T8)', () => {
// ═══════════════════════════════════════════════════════════════════════════

  const wm = (over = {}) => ({
    projection: CA.ACCURACY_PROJECTION,
    student_id: STUDENT,
    last_seq: 100,
    last_event_id: 'ee000000-0000-4000-8000-000000000100',
    events_processed: 100,
    ...over,
  });
  const stream = (over = {}) => ({
    student_id: STUDENT,
    max_seq: 100,
    event_count: 100,
    has_event_id: true,
    watermark_event_seq: 100,
    ...over,
  });

  test('a projection at the head of its stream is clean', () => {
    const r = PC.runConsistencyCheck({ watermarks: [wm()], streams: [stream()] });
    assert.equal(r.ok, true);
    assert.deepEqual(r.findings, []);
    assert.equal(r.checked.watermarks, 1);
  });

  test('DRIFT, ARTIFICIALLY INTRODUCED — a mark that trails the stream past tolerance', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm({ last_seq: 10, last_event_id: 'ee000000-0000-4000-8000-000000000010', events_processed: 10 })],
      streams: [stream({ max_seq: 9000, event_count: 9000, watermark_event_seq: 10 })],
    });
    const f = r.findings.find(x => x.kind === 'behind');
    assert.ok(f, 'lag of 8990 events was not reported');
    assert.equal(f.detail.lag, 8990);
    // Lag is EXPECTED between scheduled catch-ups (U.2 qualification 1), so it
    // is a warning and the run is still `ok`.
    assert.equal(f.severity, 'warn');
    assert.equal(r.ok, true);
  });

  test('lag within tolerance is not a finding — a job that always fires is unread', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm({ last_seq: 90, last_event_id: 'ee000000-0000-4000-8000-000000000090', events_processed: 90 })],
      streams: [stream({ watermark_event_seq: 90 })],
    });
    assert.deepEqual(r.findings, []);
  });

  test('DRIFT — a mark PAST the stream is an error, not lag', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm({ last_seq: 500 })],
      streams: [stream({ max_seq: 100, watermark_event_seq: null, has_event_id: false })],
    });
    assert.ok(r.findings.some(f => f.kind === 'ahead_of_stream' && f.severity === 'error'));
    assert.equal(r.ok, false);
  });

  test('DRIFT — the mark names an event the stream does not contain', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm()],
      streams: [stream({ has_event_id: false, watermark_event_seq: null })],
    });
    assert.ok(r.findings.some(f => f.kind === 'dangling_watermark'));
    assert.equal(r.ok, false);
  });

  test('DRIFT — the mark and the event it names disagree on order (R.10)', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm()],
      streams: [stream({ watermark_event_seq: 42 })],
    });
    const f = r.findings.find(x => x.kind === 'watermark_mismatch');
    assert.ok(f);
    assert.equal(f.detail.event_seq, 42);
    assert.equal(f.detail.watermark_seq, 100);
  });

  test('DRIFT — T8\'s "missing a required update": at the head, but undercounted', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm({ events_processed: 60 })],
      streams: [stream()],
    });
    const f = r.findings.find(x => x.kind === 'undercounted');
    assert.ok(f, 'a fold that skipped 40 events at the head was not reported');
    assert.equal(f.detail.events_processed, 60);
    assert.equal(f.detail.stream_event_count, 100);
  });

  test('DRIFT — an advanced mark that names no event cannot be verified at all', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [wm({ last_event_id: null })],
      streams: [stream()],
    });
    assert.ok(r.findings.some(f => f.kind === 'missing_watermark'));
  });

  test('DRIFT — the cache disagrees with the derivation (T8\'s invisible inconsistency)', () => {
    const r = PC.runConsistencyCheck({
      watermarks: [], streams: [],
      coverage: [
        { student_id: STUDENT, concept_ref: TORQUE, cached: 'studied', derived: 'proven' },
        { student_id: STUDENT, concept_ref: MOI, cached: 'proven', derived: 'studied' },
        { student_id: STUDENT, concept_ref: 'text:x', cached: null, derived: 'declared' },
        { student_id: STUDENT, concept_ref: 'text:ok', cached: 'assessed', derived: 'assessed' },
      ],
    });
    assert.equal(r.findings.length, 3, 'an agreeing row was reported, or a disagreeing one was not');
    assert.ok(r.findings.every(f => f.kind === 'state_disagrees' && f.severity === 'error'));
    assert.equal(r.ok, false);
  });

  test('the cache and the derivation are wired to the SAME derivation in a real case', () => {
    // The end-to-end proof that `state_disagrees` fires on a real drift rather
    // than only on a hand-written pair: derive the truth, then stale the cache.
    const derived = CS.deriveCoverageState(input()).coverage_state;
    assert.equal(derived, 'proven');
    const r = PC.runConsistencyCheck({
      watermarks: [], streams: [],
      coverage: [{ student_id: STUDENT, concept_ref: TORQUE, cached: 'declared', derived }],
    });
    assert.equal(r.errors, 1);
    assert.equal(r.findings[0].detail.derived, 'proven');
    assert.equal(r.findings[0].detail.cached, 'declared');
  });

  test('a watermark whose stream could not be read is reported, never skipped', () => {
    const r = PC.runConsistencyCheck({ watermarks: [wm()], streams: [] });
    assert.equal(r.findings.length, 1);
    assert.equal(r.findings[0].kind, 'missing_watermark');
  });

  test('an unknown projection is named rather than passed silently', () => {
    const r = PC.runConsistencyCheck({ watermarks: [wm({ projection: 'today_state' })], streams: [stream()] });
    assert.ok(r.findings.some(f => f.kind === 'unregistered_projection'));
  });

  test('IT DETECTS AND DOES NOT REPAIR — the policy is a value, and there is no write path', () => {
    assert.equal(PC.REPAIR_POLICY, 'report_only');
    assert.equal(PC.runConsistencyCheck({ watermarks: [], streams: [] }).policy, 'report_only');

    const src = code(MOD_CONSISTENCY);
    for (const banned of ['update(', 'upsert(', 'insert(', 'delete(', 'repair', 'heal', 'fix(']) {
      assert.ok(!src.includes(banned), `the consistency module contains a write path: ${banned}`);
    }
    // The remedies are TEXT for a human, never calls.
    assert.equal(typeof PC.FINDING_REMEDY.dangling_watermark, 'string');
    assert.match(PC.FINDING_REMEDY.ahead_of_stream, /STOP/);
  });

  test('the cron route reports too — no write beyond observability', () => {
    const src = code(ROUTE_CRON);
    assert.match(src, /isInternalCaller/);
    for (const banned of ['.update(', '.upsert(', '.insert(', '.delete(']) {
      assert.ok(!src.includes(banned), `the cron route writes: ${banned}`);
    }
    assert.match(src, /runConsistencyCheck/);
  });

  test('every checked projection is named once, and the three exist', () => {
    assert.deepEqual([...PC.CHECKED_PROJECTIONS].sort(), ['concept_accuracy', 'concept_coverage', 'study_session']);
    assert.ok(PC.CHECKED_PROJECTIONS.includes(CA.ACCURACY_PROJECTION));
    assert.ok(PC.CHECKED_PROJECTIONS.includes(CS.COVERAGE_PROJECTION));
  });

  test('no finding note is about a student', () => {
    for (const note of Object.values(PC.FINDING_NOTE)) {
      assert.doesNotMatch(note, /\byou\b|\byour\b|student/i, note);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('026 · the schema half', () => {
// ═══════════════════════════════════════════════════════════════════════════

  test('it registers itself with its own true checksum', () => {
    const sql = read(SQL_026);
    const idx = sql.indexOf('-- >>> MIGRATION LEDGER REGISTRATION <<<');
    assert.notEqual(idx, -1);
    assert.ok(sql.slice(idx).includes(checksumOf(sql)),
      '026 registers a checksum that will never match its own body');
  });

  test('the evidence is a VIEW, and the cache is a separate table', () => {
    const sql = code(SQL_026);
    assert.match(sql, /CREATE OR REPLACE VIEW public\.concept_assessment_evidence/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.academic_record/);
    assert.equal(CS.CONCEPT_ASSESSMENT_EVIDENCE_VIEW, 'concept_assessment_evidence');
  });

  test('the SQL `proven` predicate carries the same three conditions as the TypeScript', () => {
    const sql = code(SQL_026);
    assert.match(sql, /s\.state = 'VERIFIED'/);
    assert.match(sql, /ca\.correct_questions >= GREATEST\(v\.questions_required, 1\)/);
    assert.match(sql, /WHERE v\.covered = TRUE/);
  });

  test('026 never names M9\'s fenced session-concept relation — the split is real', () => {
    // 022 fences the relation BY SUBSTRING, its own view name included, and
    // M9's suite fails if any file outside 022 and lib/session-concepts.ts
    // spells it. So rungs 1 and 2 live in TypeScript and rungs 3 and 4 in SQL.
    assert.ok(!code(SQL_026).includes('session_concepts'));
    assert.ok(!code(ROUTE_CRON).includes('session_concepts'));
    assert.ok(!code(MOD_COVERAGE).includes('session_concepts'));
    // And the TypeScript half still carries all four rungs.
    assert.deepEqual(CS.COVERAGE_STATES.length, 5);
  });

  test('the SQL evidence view and the TypeScript agree on the assessed/proven pair', () => {
    // Same fixture, both halves: the module says `proven`, and the SQL's
    // ceiling for the same evidence is `proven` too.
    assert.equal(CS.deriveCoverageState(input()).coverage_state, 'proven');
    assert.match(code(SQL_026), /END\s+AS evidence_state/);
    assert.match(code(SQL_026), /ELSE 'assessed'/);
  });

  test('the enum in SQL is C.3\'s five and matches COVERAGE_STATES', () => {
    const sql = code(SQL_026);
    const m = /coverage_state IN \(([^)]+)\)/.exec(sql);
    assert.ok(m);
    const inSql = m[1].split(',').map(s => s.trim().replace(/'/g, ''));
    assert.deepEqual(inSql.sort(), [...CS.COVERAGE_STATES].sort());
  });

  test('a cached `proven` must name the assessment that proved it', () => {
    assert.match(code(SQL_026), /CONSTRAINT academic_record_proven_needs_assessment CHECK/);
    assert.match(code(SQL_026), /proven_by_assessment_id/);
  });

  test('an advanced watermark must name an event, or it cannot be verified', () => {
    assert.match(code(SQL_026), /CONSTRAINT projection_watermarks_named CHECK/);
  });

  test('no client may write a projection — SELECT-own or nothing', () => {
    const sql = code(SQL_026);
    assert.match(sql, /CREATE POLICY academic_record_select_own[\s\S]*?FOR SELECT TO authenticated/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.academic_record\s+FROM anon, authenticated/);
    assert.match(sql, /REVOKE ALL ON public\.projection_watermarks FROM anon, authenticated/);
    assert.doesNotMatch(sql, /FOR (INSERT|UPDATE|DELETE) .*academic_record/);
  });

  test('it self-heals nothing — no trigger, rule or function writes the cache', () => {
    const sql = code(SQL_026);
    assert.doesNotMatch(sql, /CREATE (OR REPLACE )?TRIGGER/);
    assert.doesNotMatch(sql, /CREATE RULE/);
    assert.doesNotMatch(sql, /INSERT INTO public\.academic_record/);
    assert.doesNotMatch(sql, /UPDATE public\.academic_record/);
  });

  test('drift is a VIEW anyone can read — T8\'s "no user can see" answered', () => {
    const sql = code(SQL_026);
    assert.match(sql, /CREATE OR REPLACE VIEW public\.academic_record_drift/);
    assert.match(sql, /LEFT JOIN public\.concept_assessment_evidence/);
    // It flags a cache claiming MORE than the evidence supports — the
    // fabricated direction. Staleness is the watermark check's business.
    assert.match(sql, /r\.coverage_state = 'proven'\s+AND COALESCE\(e\.proven, FALSE\) = FALSE/);
    assert.equal(CS.ACADEMIC_RECORD_DRIFT_VIEW, 'academic_record_drift');
  });

  test('every view is security_invoker — a view is a name, never an escalation', () => {
    const sql = code(SQL_026);
    const views = sql.match(/CREATE OR REPLACE VIEW public\.\w+/g) ?? [];
    assert.equal(views.length, 3, `expected three views, saw ${views}`);
    assert.equal((sql.match(/WITH \(security_invoker = true\)/g) ?? []).length, views.length);
  });

  test('additive only — 026 alters and drops nothing that already exists', () => {
    const sql = code(SQL_026);
    assert.doesNotMatch(sql, /DROP (TABLE|COLUMN|CONSTRAINT|VIEW)/);
    assert.doesNotMatch(sql, /ALTER TABLE public\.(session_concepts|study_sessions|assessments|assessment_attempts|academic_events)/);
  });

  test('015–025 are untouched, so no applied checksum moves (T1)', () => {
    // The ledger records "this exact text was run". If an earlier migration were
    // edited to make room for 026, this suite would be the only place it showed.
    const dir = path.join(root, 'supabase/migrations');
    for (const name of fs.readdirSync(dir).filter(n => /^0(1[5-9]|2[0-5])_/.test(n))) {
      const sql = fs.readFileSync(path.join(dir, name), 'utf8');
      const idx = sql.indexOf('-- >>> MIGRATION LEDGER REGISTRATION <<<');
      assert.notEqual(idx, -1, `${name} lost its registration footer`);
      assert.ok(sql.slice(idx).includes(checksumOf(sql)),
        `${name} was EDITED after it registered — the ledger would report DIVERGENT`);
    }
  });

  test('026 is not applied by anything in this repository', () => {
    const sql = code(SQL_026);
    assert.doesNotMatch(sql, /^\s*BEGIN;/m);
    // The only place a version number is executed is the SQL editor, by a human.
    const scripts = fs.readdirSync(path.join(root, 'scripts'));
    for (const s of scripts.filter(n => n.endsWith('.mjs'))) {
      const src = fs.readFileSync(path.join(root, 'scripts', s), 'utf8');
      assert.doesNotMatch(src, /026_academic_record/, `scripts/${s} references 026`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('M12 · the layering rule (H.1.a) is not broken by any of it', () => {
// ═══════════════════════════════════════════════════════════════════════════

  test('no M12 module writes downward into L1', () => {
    for (const f of [MOD_COVERAGE, MOD_ACCURACY, MOD_CONSISTENCY]) {
      const src = code(f);
      assert.doesNotMatch(src, /academic_events|ingestEvents|appendEvent|writeAuditEntry/,
        `${f} reaches into L1`);
    }
  });

  test('every M12 module is I/O-free — no client, no clock, no randomness', () => {
    for (const f of [MOD_COVERAGE, MOD_ACCURACY, MOD_CONSISTENCY]) {
      const src = code(f);
      assert.doesNotMatch(src, /from ["']@supabase|from ["']next\/|Date\.now\(\)|Math\.random\(\)|new Date\(\)/,
        `${f} is not deterministic`);
    }
  });

  test('M0–M11 files were not edited by this milestone', () => {
    // A structural check rather than a diff: the modules M12 reads are typed as
    // exporting exactly what they exported before, and the two fences M10 and
    // M9 wrote are still present and still assert-able.
    assert.match(code('lib/assessment-verification.ts'), /ConceptAssessmentState = "assessed" \| "studied"/);
    assert.match(code('lib/session-concepts.ts'), /CONFIRMED_SESSION_CONCEPTS_VIEW = "confirmed_session_concepts"/);
    assert.match(code('lib/study-session.ts'), /sessionCanLowerScore/);
  });
});
