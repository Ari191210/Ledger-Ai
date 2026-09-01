// M10 (part 2: M10-4 … M10-7) — the transition gate that refuses to verify,
// deterministic grading, provenance and revocation, and immediate mistake
// logging.
//
// The five kinds of assertion tests/assessment-engine.test.mjs uses, applied to
// the half of Part F that turns a generated question into evidence:
//
//   1. THE ACCEPTANCE TESTS THEMSELVES. V.3.4, V.3.5 and V.4.1 are transcribed
//      from STUDYLEDGER_SYSTEM_ARCHITECTURE Part V and named in the test titles.
//
//   2. ORDERING, PROVEN AS ORDERING. "The occurrence exists BEFORE the next
//      question renders" is a claim about time, so it is proven against time:
//      the occurrence write is held on a promise the test controls, and the
//      test asserts that permission to advance has NOT been granted while it is
//      still pending. A call-order assertion cannot see that; an await can.
//
//   3. FAIL-CLOSED, EXHAUSTIVELY. The gate is driven with every shape of
//      missing data — no assessment, no manifest, no row, a row with no
//      question, a question with no answer, a revoked question — and every one
//      refuses. There is no input in this file that produces `satisfied: true`
//      by accident.
//
//   4. ZERO MODEL CALLS, MEASURED. Grading runs with `fetch` replaced by a
//      function that throws, and with the generation module's model interfaces
//      asserted absent from the grading module's source. The same
//      zero-model-calls proof pattern M10-3 used for the bank path.
//
//   5. STRUCTURAL, over source. That no module here imports Supabase, a clock,
//      `next/*` or an SDK; that 024 is additive and registers with its own true
//      checksum; that `applySessionTransition(..., 'assessment_completed')` is
//      called from exactly one place in the repository.
//
//   node --test tests/assessment-grading.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-assessment-grading');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/** Comments name what a file deliberately does NOT do. Only real code counts. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_024 = 'supabase/migrations/024_assessment_attempts.sql';
const MOD_GRADING = 'lib/assessment-grading.ts';
const MOD_VERIFY = 'lib/assessment-verification.ts';
const MOD_REVOKE = 'lib/assessment-revocation.ts';
const MOD_MISTAKES = 'lib/assessment-mistakes.ts';
const NEW_MODULES = [MOD_GRADING, MOD_VERIFY, MOD_REVOKE, MOD_MISTAKES];
const ROUTE_ANSWER = 'app/api/assessment/answer/route.ts';
const ROUTE_VERIFY = 'app/api/assessment/verify/route.ts';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SESSION = '55555555-5555-4555-8555-555555555555';
const ASSESSMENT = '66666666-6666-4666-8666-666666666666';
const CONCEPT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const CONCEPT_B = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const CONCEPT_C = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const QUESTION_UUID = '99999999-9999-4999-8999-999999999991';
const EVIDENCE_UUID = '99999999-9999-4999-8999-999999999992';
const AT = '2026-08-16T18:30:00.000Z';

let GR; // lib/assessment-grading.ts
let VF; // lib/assessment-verification.ts
let RV; // lib/assessment-revocation.ts
let MK; // lib/assessment-mistakes.ts
let SS; // lib/study-session.ts
let EC; // lib/event-contract.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.assessment-grading.json'],
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
  [GR, VF, RV, MK, SS, EC] = await Promise.all([
    load('assessment-grading.js'),
    load('assessment-verification.js'),
    load('assessment-revocation.js'),
    load('assessment-mistakes.js'),
    load('study-session.js'),
    load('event-contract.js'),
  ]);
});

// ── fixtures ───────────────────────────────────────────────────────────────

const mcq = (over = {}) => ({
  question_id: 'q-mcq',
  format: 'mcq',
  answer_key: { kind: 'mcq', correct_indices: [1] },
  marks: 2,
  options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
  ...over,
});

const numeric = (over = {}) => ({
  question_id: 'q-num',
  format: 'numeric',
  answer_key: { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05 },
  marks: 3,
  options: null,
  ...over,
});

const provenance = (over = {}) => ({
  capability: 'assessment_generate',
  prompt_version: '1',
  model: 'generator-model',
  rederiver_model: 'rederiver-model',
  origin: 'generated',
  manifest_hash: 'a'.repeat(64),
  gates_passed: ['slot_binding'],
  ...over,
});

const admitted = (over = {}) => ({
  question_id: 'q-1',
  assessment_id: ASSESSMENT,
  session_id: SESSION,
  student_id: STUDENT,
  slot_index: 0,
  concept_ref: CONCEPT_A,
  concept_id: CONCEPT_A,
  counts_toward_coverage: true,
  targets_pattern_id: null,
  depth: 'recall',
  format: 'numeric',
  stem: 'State the torque in N m.',
  stem_hash: 'b'.repeat(64),
  options: null,
  answer_key: { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05 },
  marks: 2,
  admitted_at: AT,
  provenance: provenance(),
  ...over,
});

const entry = (ref, required = 1) => ({
  concept_ref: ref,
  concept_id: ref,
  questions_required: required,
  starting_depth: 'recall',
  targets_error_type: null,
});

const covRow = (ref, over = {}) => {
  const required = over.questions_required ?? 1;
  const bound = over.questions_bound ?? required;
  const answered = over.questions_answered ?? required;
  return {
    assessment_id: ASSESSMENT,
    session_id: SESSION,
    concept_ref: ref,
    questions_required: required,
    questions_bound: bound,
    questions_answered: answered,
    covered: bound >= required && answered >= required,
    ...over,
  };
};

const assessing = () => ({ state: 'ASSESSING', evidence_event_count: 3 });

const path3 = {
  concept_id: CONCEPT_A,
  subject: 'Physics',
  chapter: 'System of Particles and Rotational Motion',
  topic: 'Torque and Equilibrium',
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 · M10-5 — DETERMINISTIC GRADING (F.4.a, P.3.a)
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-5 — grading is deterministic, and a model opinion is never a grade', () => {
  test('F.4.a — an MCQ is graded by exact comparison against the stored key', () => {
    const right = GR.gradeAttempt(mcq(), { kind: 'mcq', selected_index: 1 });
    assert.equal(right.ok, true);
    assert.equal(right.grade.is_correct, true);
    assert.equal(right.grade.marks_awarded, 2);
    assert.equal(right.grade.rule, 'exact');
    assert.equal(right.grade.grader, 'deterministic');

    const wrong = GR.gradeAttempt(mcq(), { kind: 'mcq', selected_index: 2 });
    assert.equal(wrong.grade.is_correct, false);
    assert.equal(wrong.grade.marks_awarded, 0);
  });

  test('a numeric answer is graded against the QUESTION\'S tolerance, not a global one', () => {
    const q = numeric();
    for (const [value, expected] of [[3, true], [3.04, true], [2.96, true], [3.06, false], [2.9, false]]) {
      const g = GR.gradeAttempt(q, { kind: 'numeric', value, unit: 'Nm' });
      assert.equal(g.grade.is_correct, expected, `${value} against 3 ± 0.05`);
      assert.equal(g.grade.rule, 'tolerance');
    }

    // A different question with a different tolerance grades differently for
    // the same answer — which is what "the question's tolerance" means.
    const loose = numeric({ answer_key: { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.5 } });
    assert.equal(GR.gradeAttempt(loose, { kind: 'numeric', value: 3.4, unit: 'Nm' }).grade.is_correct, true);
  });

  test('the right number in the wrong unit is wrong, and says so by RULE', () => {
    const g = GR.gradeAttempt(numeric(), { kind: 'numeric', value: 3, unit: 'kg' });
    assert.equal(g.grade.is_correct, false);
    assert.equal(g.grade.rule, 'unit_mismatch');
  });

  test('an absent unit is not penalised — the surface supplies it, not the student', () => {
    assert.equal(GR.gradeAttempt(numeric(), { kind: 'numeric', value: 3 }).grade.is_correct, true);
    assert.equal(GR.gradeAttempt(numeric(), { kind: 'numeric', value: 3, unit: null }).grade.is_correct, true);
    // Whitespace and case are keyboard noise, not a different unit.
    assert.equal(GR.gradeAttempt(numeric(), { kind: 'numeric', value: 3, unit: 'N m' }).grade.is_correct, true);
    assert.equal(GR.gradeAttempt(numeric(), { kind: 'numeric', value: 3, unit: 'nm' }).grade.is_correct, true);
  });

  test('ordering is position-by-position; match is order-insensitive', () => {
    const ord = { question_id: 'q', format: 'ordering', marks: 1, options: ['a', 'b', 'c'],
      answer_key: { kind: 'ordering', order: [2, 0, 1] } };
    assert.equal(GR.gradeAttempt(ord, { kind: 'ordering', order: [2, 0, 1] }).grade.is_correct, true);
    assert.equal(GR.gradeAttempt(ord, { kind: 'ordering', order: [0, 2, 1] }).grade.is_correct, false);
    assert.equal(GR.gradeAttempt(ord, { kind: 'ordering', order: [2, 0] }).grade.is_correct, false);

    const mat = { question_id: 'q', format: 'match', marks: 1, options: ['a', 'b', 'c', 'd'],
      answer_key: { kind: 'match', pairs: [[0, 2], [1, 3]] } };
    assert.equal(GR.gradeAttempt(mat, { kind: 'match', pairs: [[1, 3], [0, 2]] }).grade.is_correct, true);
    assert.equal(GR.gradeAttempt(mat, { kind: 'match', pairs: [[0, 3], [1, 2]] }).grade.is_correct, false);
  });

  test('a blank is WRONG and answered=false — an absence the classifier can read', () => {
    const g = GR.gradeAttempt(mcq(), { kind: 'blank' });
    assert.equal(g.grade.is_correct, false);
    assert.equal(g.grade.answered, false);
    assert.equal(g.grade.rule, 'blank');
  });

  test('a submission that does not fit the question is REFUSED, never marked wrong', () => {
    const g = GR.gradeAttempt(numeric(), { kind: 'mcq', selected_index: 0 });
    assert.equal(g.ok, false);
    assert.equal(g.reason, 'format_mismatch');
    // T4, one door along: grading it wrong would put a mistake in the record
    // the student never made.
  });

  test('the grade is DETERMINISTIC — the same inputs give a byte-identical result', () => {
    const a = GR.gradeAttempt(numeric(), { kind: 'numeric', value: 2.98, unit: 'Nm' });
    const b = GR.gradeAttempt(numeric(), { kind: 'numeric', value: 2.98, unit: 'Nm' });
    assert.deepEqual(a, b);
  });

  test('ZERO MODEL CALLS — grading runs with fetch throwing, and is synchronous', () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('grading reached the network'); };
    try {
      const g = GR.gradeAttempt(mcq(), { kind: 'mcq', selected_index: 1 });
      assert.equal(g.ok, true);
      // Not a promise. An asynchronous grader is one that could have gone
      // somewhere; this one demonstrably cannot.
      assert.notEqual(typeof g?.then, 'function');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('the grading module names no model, no rederiver, no moderator and no SDK', () => {
    const src = code(MOD_GRADING);
    for (const banned of [
      'GenerationModel', 'Rederiver', 'Moderator', 'runGates', 'Anthropic',
      'fetch(', 'await ', 'async ', 'supabase',
    ]) {
      assert.ok(!src.includes(banned), `lib/assessment-grading.ts contains ${banned}`);
    }
  });

  test('F.3.a — the grading signature takes (question, attempt) and nothing else', () => {
    assert.equal(GR.gradeAttempt.length, 2);
    // The firewall as a source fact: the personal model is not importable here.
    assert.ok(!code(MOD_GRADING).includes('PersonalModelInput'));
    // And two students cannot grade differently, because there is no student.
    assert.ok(!/student_id/.test(code(MOD_GRADING).replace(/attemptRowFor[\s\S]*/, '')));
  });

  test('F.5 — attempt numbers append; there is no attempt zero', () => {
    assert.equal(GR.nextAttemptNo(0), 1);
    assert.equal(GR.nextAttemptNo(1), 2);
    assert.equal(GR.nextAttemptNo(7), 8);
  });

  test('the attempt row names its keys and never spreads its input', () => {
    const row = GR.attemptRowFor({
      attempt_id: 'at-1', question_id: 'q-1', assessment_id: ASSESSMENT,
      session_id: SESSION, student_id: STUDENT, attempt_no: 1,
      submitted: { kind: 'mcq', selected_index: 1 },
      grade: GR.gradeAttempt(mcq(), { kind: 'mcq', selected_index: 1 }).grade,
      time_ms: 4200, graded_at: AT,
    });
    assert.deepEqual(Object.keys(row).sort(), [
      'assessment_id', 'attempt_id', 'attempt_no', 'grade_rule', 'graded_at', 'grader',
      'is_correct', 'marks_awarded', 'question_id', 'session_id', 'student_id',
      'submitted_answer', 'time_ms',
    ]);
    assert.equal(row.grader, 'deterministic');
  });

  test('P.3.a — there is exactly one grader and it is not a model', () => {
    assert.deepEqual([...GR.GRADERS], ['deterministic']);
    assert.ok(!GR.GRADERS.includes('ai_proposed_student_confirmed'));
    assert.match(code(SQL_024), /grader\s+TEXT\s+NOT NULL DEFAULT 'deterministic'/);
    assert.match(code(SQL_024), /CHECK \(grader = 'deterministic'\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · M10-4 — THE TRANSITION GATE, AND IT FAILS CLOSED (T5, V.3.4, V.3.5)
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-4 — coverage failure refuses to verify, and the failure is CLOSED', () => {
  test('a fully covered and fully answered assessment verifies', () => {
    const manifest = [entry(CONCEPT_A), entry(CONCEPT_B), entry(CONCEPT_C)];
    const verdict = VF.evaluateVerificationGate({
      session_state: 'ASSESSING',
      assessment_id: ASSESSMENT,
      manifest,
      coverage: manifest.map(e => covRow(e.concept_ref)),
    });
    assert.equal(verdict.satisfied, true);
    assert.equal(verdict.entries, 3);
  });

  test('V.3.4 — the bank is empty for concept 3: THE SESSION CANNOT BECOME VERIFIED', () => {
    const manifest = [entry(CONCEPT_A), entry(CONCEPT_B), entry(CONCEPT_C)];
    // Concepts 1 and 2 filled; concept 3 has no question at all — F.2.a's
    // unfillable slot, arriving at the transition.
    const coverage = [covRow(CONCEPT_A), covRow(CONCEPT_B), covRow(CONCEPT_C, { questions_bound: 0, questions_answered: 0 })];

    const verdict = VF.evaluateVerificationGate({
      session_state: 'ASSESSING', assessment_id: ASSESSMENT, manifest, coverage,
    });
    assert.equal(verdict.satisfied, false);
    assert.equal(verdict.refusals.length, 1);
    assert.equal(verdict.refusals[0].reason, 'coverage_hole');
    assert.equal(verdict.refusals[0].concept_ref, CONCEPT_C, 'the refusal must name WHICH concept is unproven');

    // *"concepts 1, 2, 4 are `studied`, and nothing is presented as verified."*
    const states = VF.conceptAssessmentStates({ manifest, coverage });
    assert.equal(states[CONCEPT_A], 'assessed');
    assert.equal(states[CONCEPT_B], 'assessed');
    assert.equal(states[CONCEPT_C], 'studied');
    assert.ok(!Object.values(states).includes('proven'), 'M12-1 owns `proven`; M10 may not award it');
  });

  test('V.3.5 — forcing ASSESSING -> VERIFIED with concept 3 unanswered is REFUSED, with a typed error', () => {
    const manifest = [entry(CONCEPT_A), entry(CONCEPT_B), entry(CONCEPT_C)];
    // Concept 3 IS bound — the question was generated and shown — and simply
    // was not answered. F.2 layer 4 asks for an ANSWERED question.
    const coverage = [
      covRow(CONCEPT_A), covRow(CONCEPT_B),
      covRow(CONCEPT_C, { questions_bound: 1, questions_answered: 0 }),
    ];

    const out = VF.applyVerificationTransition(assessing(), {
      assessment_id: ASSESSMENT, manifest, coverage,
    });

    assert.equal(out.ok, false);
    assert.equal(out.state, 'ASSESSING', 'nothing moved');
    assert.deepEqual(out.refusals.map(r => r.reason), ['unanswered_coverage']);
    assert.equal(out.refusals[0].concept_ref, CONCEPT_C);
    // Not a coverage HOLE — the question exists. So this is not F.2.a's
    // unfillable ending and the session is not offered for closure.
    assert.equal(out.close_with, null);
    assert.equal(out.assessment_reason, null);
  });

  test('FAILS CLOSED — every shape of missing data refuses, and none of them satisfies', () => {
    const manifest = [entry(CONCEPT_A), entry(CONCEPT_B)];
    const good = manifest.map(e => covRow(e.concept_ref));

    const cases = [
      ['no assessment at all', { assessment_id: null, manifest, coverage: good }, 'no_assessment'],
      ['an empty manifest', { assessment_id: ASSESSMENT, manifest: [], coverage: [] }, 'empty_manifest'],
      ['no coverage rows at all', { assessment_id: ASSESSMENT, manifest, coverage: [] }, 'coverage_hole'],
      ['a manifest entry with no row', { assessment_id: ASSESSMENT, manifest, coverage: [covRow(CONCEPT_A)] }, 'coverage_hole'],
      ['a bound but unanswered entry', {
        assessment_id: ASSESSMENT, manifest,
        coverage: [covRow(CONCEPT_A), covRow(CONCEPT_B, { questions_bound: 1, questions_answered: 0 })],
      }, 'unanswered_coverage'],
      ['two rows for one entry', {
        assessment_id: ASSESSMENT, manifest, coverage: [...good, covRow(CONCEPT_A)],
      }, 'coverage_inconsistent'],
      ['a row for a concept the manifest does not name', {
        assessment_id: ASSESSMENT, manifest, coverage: [...good, covRow(CONCEPT_C)],
      }, 'coverage_inconsistent'],
      ['a row from another assessment', {
        assessment_id: ASSESSMENT, manifest,
        coverage: [covRow(CONCEPT_A), covRow(CONCEPT_B, { assessment_id: 'other' })],
      }, 'coverage_inconsistent'],
      ['a row whose verdict disagrees with its own counts', {
        assessment_id: ASSESSMENT, manifest,
        coverage: [covRow(CONCEPT_A), { ...covRow(CONCEPT_B), covered: false }],
      }, 'coverage_inconsistent'],
    ];

    for (const [label, input, expected] of cases) {
      const v = VF.evaluateVerificationGate({ session_state: 'ASSESSING', ...input });
      assert.equal(v.satisfied, false, `${label} SATISFIED the gate — the guarantee fails open (T5)`);
      assert.ok(v.refusals.some(r => r.reason === expected), `${label}: expected ${expected}, got ${v.refusals.map(r => r.reason)}`);
    }
  });

  test('a manifest entry needing two questions is not discharged by one', () => {
    const manifest = [entry(CONCEPT_A, 2)];
    const v = VF.evaluateVerificationGate({
      session_state: 'ASSESSING', assessment_id: ASSESSMENT, manifest,
      coverage: [covRow(CONCEPT_A, { questions_required: 2, questions_bound: 1, questions_answered: 1 })],
    });
    assert.equal(v.satisfied, false);
    assert.equal(v.refusals[0].reason, 'coverage_hole');
  });

  test('the gate has exactly ONE satisfied return, and it is guarded by an empty refusal list', () => {
    const src = code(MOD_VERIFY);
    const satisfiedReturns = [...src.matchAll(/return \{ satisfied: true/g)];
    assert.equal(satisfiedReturns.length, 1,
      'more than one way to satisfy the gate is more than one way for it to fail open');
    assert.match(src, /refusals\.length > 0/);
  });

  test('VERIFIED is reachable only through the gate — the brand cannot be forged', () => {
    const manifest = [entry(CONCEPT_A)];
    const ok = VF.applyVerificationTransition(assessing(), {
      assessment_id: ASSESSMENT, manifest, coverage: [covRow(CONCEPT_A)],
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.transition.outcome.to, 'VERIFIED');
    assert.equal(ok.transition.assessment_id, ASSESSMENT);
    // The brand is `declare`d and never emitted, so it is absent at runtime —
    // which is exactly why an object literal cannot carry it at compile time.
    assert.equal(Object.keys(ok.transition).sort().join(','), 'assessment_id,entries_covered,outcome');
  });

  test('M9\'s machine still decides the edge — the gate narrows and never widens', () => {
    const manifest = [entry(CONCEPT_A)];
    const coverage = [covRow(CONCEPT_A)];
    // Coverage is perfect. The session is not.
    for (const state of ['ACTIVE', 'DORMANT', 'REVIEWING', 'VERIFIED', 'CLOSED_UNVERIFIED', 'ABANDONED']) {
      const out = VF.applyVerificationTransition(
        { state, evidence_event_count: 1 },
        { assessment_id: ASSESSMENT, manifest, coverage },
      );
      assert.equal(out.ok, false, `${state} reached VERIFIED through the gate`);
      assert.equal(out.state, state, 'nothing moved');
    }
  });

  test('nothing outside lib/assessment-verification.ts asks for the assessment_completed edge', () => {
    // `lib/study-session.ts` OWNS the vocabulary — the action, the edge and the
    // close reason all live there, and naming them is not asking for them. What
    // is fenced is the CALL: `applySessionTransition(..., 'assessment_completed')`
    // is the one expression that moves a session to VERIFIED, and exactly one
    // file in the repository may write it.
    const CALL = /applySessionTransition\([\s\S]{0,400}?assessment_completed/;
    const hits = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx|mjs)$/.test(name)) continue;
        const rel = path.relative(root, p).split(path.sep).join('/');
        if (rel === MOD_VERIFY || rel.startsWith('tests/')) continue;
        if (CALL.test(code(rel))) hits.push(rel);
      }
    };
    for (const d of ['lib', 'app', 'components', 'hooks', 'scripts']) {
      const full = path.join(root, d);
      if (fs.existsSync(full)) walk(full);
    }
    assert.deepEqual(hits, [], `these reach for VERIFIED without the coverage gate: ${hits}`);
  });

  test('a refused verification moves no score, and no refusal note is a verdict', () => {
    const v = VF.evaluateVerificationGate({
      session_state: 'ASSESSING', assessment_id: null, manifest: [], coverage: [],
    });
    assert.deepEqual(VF.refusalScoreEffect(v), { kind: 'none' });

    const lexicon = Object.values(VF.REFUSAL_NOTE).join(' ').toLowerCase();
    for (const banned of [
      'fail', 'failed', 'gave up', 'behind', "didn't", 'incomplete', 'lost',
      'obituary', 'autopsy', 'coroner', 'trauma', 'forensic', '!',
    ]) {
      assert.ok(!lexicon.includes(banned), `the refusal lexicon says "${banned}"`);
    }
    for (const reason of ['not_assessing', 'no_assessment', 'empty_manifest', 'coverage_hole', 'unanswered_coverage', 'coverage_inconsistent']) {
      assert.equal(typeof VF.REFUSAL_NOTE[reason], 'string');
    }
  });

  test('F.2.a\'s reason is recorded, and its divergence from V.3.4\'s wording is explicit', () => {
    assert.equal(VF.COVERAGE_UNFILLABLE, 'coverage_unfillable');
    // It is deliberately NOT a session close reason — 021's CHECK and M9's
    // CLOSE_REASONS hold six values and this pass may not edit either.
    assert.ok(!SS.CLOSE_REASONS.includes('coverage_unfillable'));
    assert.ok(SS.CLOSE_REASONS.includes(VF.UNFILLABLE_CLOSE_ACTION));
    // The student-facing wording is identical either way, so nothing a student
    // sees depends on which table the precise reason lives in.
    assert.equal(SS.CLOSE_REASON_NOTE.generation_failed, 'Closed without an assessment');
    assert.match(read(SQL_024), /close_reason = 'coverage_unfillable'/);
  });

  test('a coverage HOLE offers F.2.a\'s ending; a wrong state does not', () => {
    const manifest = [entry(CONCEPT_A)];
    const hole = VF.applyVerificationTransition(assessing(), {
      assessment_id: ASSESSMENT, manifest, coverage: [covRow(CONCEPT_A, { questions_bound: 0, questions_answered: 0 })],
    });
    assert.equal(hole.close_with, 'generation_failed');
    assert.equal(hole.assessment_reason, 'coverage_unfillable');

    const wrongState = VF.applyVerificationTransition(
      { state: 'ACTIVE', evidence_event_count: 0 },
      { assessment_id: ASSESSMENT, manifest, coverage: [covRow(CONCEPT_A)] },
    );
    assert.equal(wrongState.close_with, null, 'a session in the wrong state is refused, not closed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · M10-6 — PROVENANCE AND REVOCATION (T4, F.4.b)
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-6 — provenance on every item, and revocation that appends', () => {
  test('every admitted question carries provenance a sweep can key on', () => {
    assert.equal(RV.hasRevocableProvenance(provenance()), true);
    assert.equal(RV.hasRevocableProvenance(provenance({ origin: 'bank', model: 'bank', rederiver_model: null })), true);
    // T4's mitigation is unusable without these three, so each absence refuses.
    assert.equal(RV.hasRevocableProvenance(provenance({ prompt_version: '' })), false);
    assert.equal(RV.hasRevocableProvenance(provenance({ model: '' })), false);
    assert.equal(RV.hasRevocableProvenance(provenance({ origin: 'somewhere' })), false);
    assert.equal(RV.hasRevocableProvenance(provenance({ manifest_hash: 'short' })), false);
    assert.equal(RV.hasRevocableProvenance(null), false);
  });

  test('F.4.b — prompt_version = v identifies every affected question, and only those', () => {
    const bank = admitted({ question_id: 'q-bank', provenance: provenance({ origin: 'bank', model: 'bank', rederiver_model: null }) });
    const v1a = admitted({ question_id: 'q-v1a' });
    const v1b = admitted({ question_id: 'q-v1b' });
    const v2 = admitted({ question_id: 'q-v2', provenance: provenance({ prompt_version: '2' }) });

    const swept = RV.selectForRevocation([bank, v1a, v1b, v2], 'prompt_version', '1');
    assert.deepEqual(swept.map(q => q.question_id).sort(), ['q-v1a', 'q-v1b']);
    // M10-3 wrote `model: "bank"` as a sentinel so *"a revocation of a prompt
    // the row never ran under cannot sweep it up"*. This is that promise kept —
    // and note the bank row DOES carry prompt_version '1', so the origin check
    // is what does the work.
    assert.equal(bank.provenance.prompt_version, '1');
    assert.ok(!swept.includes(bank));
  });

  test('a manifest_hash sweep takes bank and generated alike — they shared the manifest', () => {
    const bank = admitted({ question_id: 'q-bank', provenance: provenance({ origin: 'bank', model: 'bank' }) });
    const gen = admitted({ question_id: 'q-gen' });
    const other = admitted({ question_id: 'q-other', provenance: provenance({ manifest_hash: 'c'.repeat(64) }) });
    const swept = RV.selectForRevocation([bank, gen, other], 'manifest_hash', 'a'.repeat(64));
    assert.deepEqual(swept.map(q => q.question_id).sort(), ['q-bank', 'q-gen']);
  });

  test('a revocation APPENDS — the question it names is not touched', () => {
    const q = admitted();
    const before = JSON.stringify(q);
    const out = RV.buildRevocation({
      revocation_id: 'rev-1', question: q, scope: 'question', selector: q.question_id,
      reason: 'the keyed answer was wrong', revoked_by: 'operator', at: AT,
    });
    assert.equal(out.ok, true);
    assert.equal(JSON.stringify(q), before, 'buildRevocation mutated the question');
    assert.deepEqual(Object.keys(out.revocation).sort(), [
      'question_id', 'reason', 'revocation_id', 'revoked_at', 'revoked_by',
      'scope', 'selector', 'student_id', 'superseding_event_id',
    ]);
  });

  test('the only field that moves on the question is `retained` — F.8\'s withdrawal', () => {
    assert.deepEqual(Object.keys(RV.withdrawalPatch()), ['retained']);
    assert.equal(RV.withdrawalPatch().retained, false);
    // 023 §9's immutability trigger permits exactly this and refuses the rest.
    assert.match(read('supabase/migrations/023_assessments.sql'), /only `retained` may move/);
  });

  test('a revocation with no stated reason is REFUSED — it would be a deletion with paperwork', () => {
    for (const reason of ['', '   ', '\n']) {
      const out = RV.buildRevocation({
        revocation_id: 'r', question: admitted(), scope: 'question', selector: 'q-1',
        reason, revoked_by: 'operator', at: AT,
      });
      assert.equal(out.ok, false);
      assert.equal(out.refusal, 'empty_reason');
    }
  });

  test('a selector that does not select this question is REFUSED', () => {
    const out = RV.buildRevocation({
      revocation_id: 'r', question: admitted(), scope: 'prompt_version', selector: '2',
      reason: 'a sweep', revoked_by: 'system', at: AT,
    });
    assert.equal(out.ok, false);
    assert.equal(out.refusal, 'selector_does_not_match');
  });

  test('no model may revoke evidence, any more than it may award it', () => {
    assert.ok(!RV.REVOKED_BY.includes('ai'));
    assert.deepEqual([...RV.REVOKED_BY].sort(), ['operator', 'student_dispute', 'system']);
    const out = RV.buildRevocation({
      revocation_id: 'r', question: admitted(), scope: 'question', selector: 'q-1',
      reason: 'because a model said so', revoked_by: 'ai', at: AT,
    });
    assert.equal(out.ok, false);
    assert.equal(out.refusal, 'unknown_actor');
  });

  test('AN ALREADY-GRADED ANSWER IS NOT UN-GRADED — its STANDING changes, not its verdict', () => {
    const q = admitted();
    const rev = RV.buildRevocation({
      revocation_id: 'rev-1', question: q, scope: 'question', selector: q.question_id,
      reason: 'a bad key was discovered', revoked_by: 'operator', at: AT,
    }).revocation;

    const attempt = { attempt_id: 'at-1', question_id: q.question_id, is_correct: false, marks_awarded: 0 };
    assert.equal(RV.attemptEvidenceState(attempt, []), 'evidence');
    assert.equal(RV.attemptEvidenceState(attempt, [rev]), 'evidence_revoked');

    // The verdict itself is untouched: the state function returns a standing,
    // never a re-grade, and there is no word in its union that says otherwise.
    assert.equal(attempt.is_correct, false);
    const states = new Set(['evidence', 'evidence_revoked']);
    assert.ok(states.has(RV.attemptEvidenceState(attempt, [rev])));

    // And the occurrence it produced is SUPERSEDED, not deleted (F.8).
    const sup = RV.occurrenceSupersessionFor(rev, 'occ-1');
    assert.equal(sup.occurrence_id, 'occ-1');
    assert.equal(sup.reason, 'a bad key was discovered');
    assert.equal(sup.revocation_id, 'rev-1');
    assert.ok(!('delete' in sup) && !('deleted' in sup));
  });

  test('`evidence_revoked` is DERIVED in SQL too — there is no column to edit', () => {
    const sql = code(SQL_024);
    assert.match(sql, /AS evidence_revoked/);
    // It appears only inside the view, never as a table column.
    assert.ok(!/evidence_revoked\s+BOOLEAN/.test(sql));
    assert.match(sql, /CREATE OR REPLACE VIEW public\.assessment_attempt_evidence/);
  });

  test('the superseding event is a real D.2 EVENT_SUPERSEDED, judged by M7\'s own validator', () => {
    const rev = RV.buildRevocation({
      revocation_id: 'rev-1', question: admitted({ question_id: QUESTION_UUID }),
      scope: 'prompt_version', selector: '1',
      reason: 'prompt version 1 produced bad keys', revoked_by: 'operator', at: AT,
    }).revocation;

    const draft = RV.supersedingEventDraft({
      client_event_id: 'rev:rev-1:at-1', revocation: rev, attempt_id: 'at-1',
      supersedes_event_id: '77777777-7777-4777-8777-777777777777', occurred_at: AT,
    });

    const verdict = EC.validateEventDraft(draft);
    assert.equal(verdict.ok, true, `M7 refused the draft: ${JSON.stringify(verdict.problems ?? [])}`);
    assert.equal(draft.event_type, 'EVENT_SUPERSEDED');
    // D.2.a's SOURCE_RESTRICTIONS: only `system` or `migration` may supersede.
    assert.equal(draft.source, 'system');
    assert.equal(draft.payload.evidence_revoked, true);
  });

  test('the revocation row names its keys and never spreads', () => {
    const rev = RV.buildRevocation({
      revocation_id: 'rev-1', question: admitted(), scope: 'question', selector: 'q-1',
      reason: 'r', revoked_by: 'system', at: AT,
    }).revocation;
    assert.deepEqual(Object.keys(RV.revocationRowFor(rev)).sort(), [
      'question_id', 'reason', 'revocation_id', 'revoked_at', 'revoked_by',
      'scope', 'selector', 'student_id', 'superseding_event_id',
    ]);
  });

  test('the revocation module has no delete path, anywhere', () => {
    const src = code(MOD_REVOKE);
    for (const banned of ['delete(', 'DELETE', '.remove(', 'splice(']) {
      assert.ok(!src.includes(banned), `lib/assessment-revocation.ts contains ${banned}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · M10-7 — IMMEDIATE MISTAKE LOGGING (V.4.1, F.6)
// ═══════════════════════════════════════════════════════════════════════════

/** A store that records the order in which its writes RESOLVED, and can hold
 *  any of them open on a promise the test controls. */
function fakeMistakeDb(opts = {}) {
  const log = [];
  let gate = null;
  const db = {
    log,
    holdOccurrenceWrite() {
      let release;
      gate = new Promise(r => { release = r; });
      return () => release();
    },
    async insertAttemptEvidence(row) {
      if (opts.evidenceFails) return { data: null, error: { code: '500', message: 'evidence write failed' } };
      log.push('evidence');
      return { data: { ...row }, error: null };
    },
    async insertOccurrences(rows) {
      if (gate) await gate;
      if (opts.occurrenceFails) return { data: null, error: { code: '500', message: 'occurrence write failed' } };
      log.push('occurrence');
      return { data: rows.map((r, i) => ({ ...r, id: `occ-${i}`, confirmed_at: null })), error: null };
    },
    async confirm() { return { data: [], error: null }; },
    async confirmAsSystem(occurrenceId, studentId, at) {
      if (opts.confirmFails) return { data: null, error: { code: '500', message: 'confirm failed' } };
      log.push('confirm');
      return { data: [{ id: occurrenceId, student_id: studentId, confirmed_at: at, confirmed_by: 'assessment' }], error: null };
    },
    async listDrafts() { return { data: [], error: null }; },
    async listConfirmed() { return { data: [], error: null }; },
  };
  return db;
}

const wrongNumeric = (over = {}) => {
  const question = admitted({ marks: 2 });
  const submitted = over.submitted ?? { kind: 'numeric', value: -3, unit: 'Nm' };
  const grade = GR.gradeAttempt(
    { question_id: question.question_id, format: question.format, answer_key: question.answer_key, marks: question.marks, options: null },
    submitted,
  ).grade;
  return {
    question, attempt_id: 'at-1', evidence_id: 'ev-1', submitted, grade,
    time_ms: over.time_ms ?? 5_000, path: over.path === undefined ? path3 : over.path, at: AT,
    ...over,
  };
};

describe('M10-7 — the occurrence exists before the next question renders', () => {
  test('V.4.1 — a wrong numeric answer off by a sign is classified `sign-error` (execution)', () => {
    const input = wrongNumeric();
    assert.equal(input.grade.is_correct, false);
    const built = MK.buildAssessmentOccurrence(input);
    assert.equal(built.ok, true);
    assert.equal(built.classification.execution, 'sign-error');
    assert.equal(built.classification.cognitive, null);
    assert.equal(built.classification.deterministic, true);
    assert.equal(built.row.execution_error, 'sign-error');
    assert.equal(built.row.origin, 'assessment');
    assert.equal(built.row.source, 'self-test');
    assert.equal(built.row.assessment_attempt_id, 'at-1');
    assert.equal(built.row.evidence_id, 'ev-1');
    // *"a non-null `evidence_id` POINTING AT THE ATTEMPT"*.
    const ev = MK.attemptEvidenceRow({ evidence_id: 'ev-1', student_id: STUDENT, attempt_id: 'at-1', captured_at: AT });
    assert.equal(ev.storage_ref, 'attempt:at-1');
    assert.equal(ev.id, 'ev-1');
  });

  test('THE ORDERING — permission to advance is not granted while the write is in flight', async () => {
    const db = fakeMistakeDb();
    const release = db.holdOccurrenceWrite();

    let advanced = false;
    const running = MK.logAssessmentMistake(db, wrongNumeric()).then(r => { advanced = r.advance.permitted; return r; });

    // Let every already-resolvable microtask and macrotask run. The occurrence
    // write is still pending, so nothing downstream of it may have happened.
    await new Promise(r => setTimeout(r, 20));
    assert.equal(advanced, false, 'the student was advanced while the occurrence write was still in flight');
    assert.ok(!db.log.includes('occurrence'));

    release();
    const result = await running;
    assert.equal(result.advance.permitted, true);
    assert.equal(result.occurrence.id, 'occ-0');

    // And the trace records completion order, not source order.
    const steps = result.steps;
    assert.ok(steps.indexOf('occurrence_written') < steps.indexOf('advance'),
      `the occurrence must be written before advance: ${steps.join(' -> ')}`);
    assert.ok(steps.indexOf('evidence_written') < steps.indexOf('occurrence_written'));
    assert.deepEqual([...steps], ['graded', 'evidence_written', 'occurrence_written', 'occurrence_confirmed', 'advance']);
  });

  test('a FAILED occurrence write refuses to advance — F.6\'s evidence gap, closed', async () => {
    const db = fakeMistakeDb({ occurrenceFails: true });
    const result = await MK.logAssessmentMistake(db, wrongNumeric());
    assert.equal(result.advance.permitted, false);
    assert.equal(result.advance.reason, 'occurrence_write_failed');
    assert.equal(result.occurrence, null);
    assert.ok(!result.steps.includes('occurrence_written'));
  });

  test('a FAILED evidence write refuses too — no occurrence without proof (PRINCIPLES 3.2)', async () => {
    const db = fakeMistakeDb({ evidenceFails: true });
    const result = await MK.logAssessmentMistake(db, wrongNumeric());
    assert.equal(result.advance.permitted, false);
    assert.equal(result.advance.reason, 'evidence_write_failed');
    assert.deepEqual(db.log, [], 'no occurrence may be written without its evidence');
  });

  test('a CORRECT answer logs nothing and advances', async () => {
    const db = fakeMistakeDb();
    const right = wrongNumeric({ submitted: { kind: 'numeric', value: 3, unit: 'Nm' } });
    const result = await MK.logAssessmentMistake(db, right);
    assert.equal(result.advance.permitted, true);
    assert.equal(result.occurrence, null);
    assert.deepEqual(db.log, []);
  });

  test('an unresolved declaration does not strand the student — but writes no occurrence either', async () => {
    const db = fakeMistakeDb();
    const input = wrongNumeric();
    input.question = { ...input.question, concept_id: null, concept_ref: 'text:the thing about wobbling tops' };
    const result = await MK.logAssessmentMistake(db, input);
    // B.4 / V.2.4: the record does not guess a concept, so there is nothing to
    // hang an occurrence on. The ATTEMPT is already written; the student moves.
    assert.equal(result.advance.permitted, true);
    assert.equal(result.occurrence, null);
    assert.deepEqual(db.log, []);
    assert.equal(MK.buildAssessmentOccurrence(input).refusal, 'unresolved_concept');
  });

  test('a concept with no display path is REFUSED — an empty subject is not a value', () => {
    const input = wrongNumeric({ path: null });
    const built = MK.buildAssessmentOccurrence(input);
    assert.equal(built.ok, false);
    assert.equal(built.refusal, 'no_concept_path');
  });

  test('F.6 — the deterministic tier, exhaustively, and never both error classes', () => {
    const q = { format: 'numeric', answer_key: { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05 } };
    const cases = [
      ['blank, quickly', { kind: 'blank' }, { rule: 'blank', answered: false }, { time_ms: 1000 },
        { cognitive: 'not-known', execution: null, deterministic: true }],
      ['blank, after the timeout', { kind: 'blank' }, { rule: 'blank', answered: false }, { time_ms: 200_000 },
        { cognitive: null, execution: 'ran-out-of-time', deterministic: true }],
      ['blank, no timing at all', { kind: 'blank' }, { rule: 'blank', answered: false }, { time_ms: null },
        { cognitive: 'not-known', execution: null, deterministic: true }],
      ['the right number, the wrong unit', { kind: 'numeric', value: 3, unit: 'kg' }, { rule: 'unit_mismatch', answered: true }, { time_ms: 5000 },
        { cognitive: null, execution: 'unit-error', deterministic: true }],
      ['off by a sign', { kind: 'numeric', value: -3 }, { rule: 'tolerance', answered: true }, { time_ms: 5000 },
        { cognitive: null, execution: 'sign-error', deterministic: true }],
      ['simply wrong', { kind: 'numeric', value: 42 }, { rule: 'tolerance', answered: true }, { time_ms: 5000 },
        { cognitive: 'not-known', execution: null, deterministic: false }],
    ];

    for (const [label, submitted, grade, timing, expected] of cases) {
      const c = MK.classifyWrongAnswer(q, submitted, grade, timing);
      assert.equal(c.cognitive, expected.cognitive, `${label}: cognitive`);
      assert.equal(c.execution, expected.execution, `${label}: execution`);
      assert.equal(c.deterministic, expected.deterministic, `${label}: deterministic`);
      // F.6's OPEN ISSUE is that the merge rule does not say which wins when an
      // occurrence carries both. This classifier cannot produce that shape, so
      // the open decision stays open rather than being closed by accident.
      assert.ok(!(c.cognitive && c.execution), `${label} produced BOTH error classes`);
      assert.ok(c.cognitive || c.execution, `${label} produced neither — 007's occurrences_has_error`);
    }
  });

  test('a sign error is never claimed on a zero key', () => {
    const q = { format: 'numeric', answer_key: { kind: 'numeric', value: 0, unit: null, tolerance: 0.01 } };
    const c = MK.classifyWrongAnswer(q, { kind: 'numeric', value: 5 }, { rule: 'tolerance', answered: true }, { time_ms: 100 });
    assert.equal(c.execution, null);
    assert.equal(c.deterministic, false);
  });

  test('AUTO-CONFIRMED only where a rule decided; otherwise M8-5\'s gate is untouched', async () => {
    const decided = await MK.logAssessmentMistake(fakeMistakeDb(), wrongNumeric());
    assert.equal(decided.classification.deterministic, true);
    assert.equal(decided.confirmed, true, 'a computed classification is a fact, not a claim (F.4.a)');

    const undecided = await MK.logAssessmentMistake(
      fakeMistakeDb(),
      wrongNumeric({ submitted: { kind: 'numeric', value: 42, unit: 'Nm' } }),
    );
    assert.equal(undecided.classification.deterministic, false);
    assert.equal(undecided.confirmed, false, 'a guess must wait for the student (F.6 tier 2, M8-5)');
    assert.ok(!undecided.steps.includes('occurrence_confirmed'));
    // The occurrence still EXISTS, which is what V.4.1 asks for.
    assert.ok(undecided.occurrence);
    assert.equal(undecided.advance.permitted, true);
  });

  test('a failed confirmation leaves a DRAFT and still advances — nothing is lost', async () => {
    const result = await MK.logAssessmentMistake(fakeMistakeDb({ confirmFails: true }), wrongNumeric());
    assert.ok(result.occurrence, 'the occurrence exists');
    assert.equal(result.confirmed, false);
    assert.equal(result.advance.permitted, true);
  });

  test('the occurrence row carries NO confidence — a deterministic grade has none', () => {
    const built = MK.buildAssessmentOccurrence(wrongNumeric());
    assert.equal(built.row.proposal_confidence, null);
    assert.equal(built.row.ingestion_run_id, null);
    // 020's trigger refuses a born-confirmed row, so the builder must not carry
    // one — the key is ABSENT, not null.
    assert.ok(!('confirmed_at' in built.row));
    // M11 owns the merge; `pattern_id` is never set here.
    assert.ok(!('pattern_id' in built.row));
  });

  test('F.6 — QUESTION_WRONG is a real D.2 event, judged by M7\'s own validator', () => {
    const built = MK.buildAssessmentOccurrence(wrongNumeric());
    const draft = MK.questionWrongEventDraft({
      client_event_id: 'qw:at-1',
      question: { question_id: QUESTION_UUID, assessment_id: ASSESSMENT, concept_id: CONCEPT_A },
      attempt_id: 'at-1', evidence_id: EVIDENCE_UUID, occurred_at: AT,
      classification: built.classification,
    });
    const verdict = EC.validateEventDraft(draft);
    assert.equal(verdict.ok, true, `M7 refused the draft: ${JSON.stringify(verdict.problems ?? [])}`);
    assert.equal(draft.payload.question_id, QUESTION_UUID);
    assert.equal(draft.payload.attempt_id, 'at-1');
    assert.equal(draft.payload.execution_error, 'sign-error');
    assert.equal(draft.payload.classification_deterministic, true);
  });

  test('PRINCIPLES 3.3 — logging a mistake moves no score, and there is no arm that could', () => {
    assert.deepEqual(MK.mistakeScoreEffect(null), { kind: 'none' });
    assert.equal(MK.loggingAMistakeLowersScore(), false);
    const src = code(MOD_MISTAKES);
    assert.ok(!/score_delta|penalt|deduct/i.test(src));
  });

  test('the same attempt logged twice hashes to the same evidence — the write is idempotent', () => {
    const a = MK.attemptEvidenceRow({ evidence_id: 'ev-1', student_id: STUDENT, attempt_id: 'at-1', captured_at: AT });
    const b = MK.attemptEvidenceRow({ evidence_id: 'ev-2', student_id: STUDENT, attempt_id: 'at-1', captured_at: '2027-01-01T00:00:00.000Z' });
    assert.equal(a.content_hash, b.content_hash);
    // 007's `evidence_student_hash_unique` is what makes the second insert a
    // no-op — M8-2's argument, reused: the constraint decides.
    const c = MK.attemptEvidenceRow({ evidence_id: 'ev-3', student_id: STUDENT, attempt_id: 'at-2', captured_at: AT });
    assert.notEqual(a.content_hash, c.content_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 · STRUCTURAL — the modules, the routes and 024
// ═══════════════════════════════════════════════════════════════════════════

describe('the four modules hold decisions and no I/O', () => {
  test('none imports Supabase, a clock, next/*, an SDK or the score engine', () => {
    for (const rel of NEW_MODULES) {
      const src = code(rel);
      for (const banned of [
        '@supabase', 'supabase-server', 'next/', '@anthropic-ai', 'Anthropic',
        'ledger-score', 'new Date(', 'Date.now(', 'Math.random(',
      ]) {
        assert.ok(!src.includes(banned), `${rel} imports or calls ${banned}`);
      }
    }
  });

  test('the score engine is not opened, and does not know these modules exist', () => {
    for (const rel of ['lib/ledger-score.ts', 'lib/ledger-score-v2.ts']) {
      const src = read(rel);
      for (const m of ['assessment-grading', 'assessment-verification', 'assessment-revocation', 'assessment-mistakes', 'assessment_attempts']) {
        assert.ok(!src.includes(m), `${rel} mentions ${m}`);
      }
    }
  });

  test('the answer route grades and never reaches a model', () => {
    const src = code(ROUTE_ANSWER);
    for (const banned of ['Anthropic', '@anthropic-ai', 'guardModelCall', 'runAIModeration', 'ai-guard']) {
      assert.ok(!src.includes(banned), `${ROUTE_ANSWER} reaches for ${banned}`);
    }
    assert.ok(src.includes('gradeAttempt'));
    assert.ok(src.includes('logAssessmentMistake'));
  });

  test('the answer route never returns the key, the correct option or an explanation', () => {
    const src = code(ROUTE_ANSWER);
    const response = src.slice(src.lastIndexOf('return NextResponse.json'));
    for (const banned of ['answer_key', 'correct_indices', 'explanation', 'rubric', 'options']) {
      assert.ok(!response.includes(banned), `the answer response carries ${banned}`);
    }
    assert.ok(response.includes('is_correct'));
  });

  test('the verify route accepts a session id and no state — E.7.3', () => {
    const src = code(ROUTE_VERIFY);
    assert.ok(src.includes('session_id'));
    assert.ok(!/body\.state|body\.verified|body\.close_reason/.test(src));
    assert.ok(src.includes('applyVerificationTransition'));
  });
});

describe('024 — the migration', () => {
  const sql = () => read(SQL_024);

  test('it registers itself with a checksum of its own body', () => {
    const contents = sql();
    assert.ok(contents.includes(REGISTRATION_SENTINEL));
    const m = /record_migration\(\s*'024',\s*'024_assessment_attempts\.sql',\s*'([0-9a-f]{64})',\s*'self'\s*\)/.exec(contents);
    assert.ok(m, '024 must register itself');
    assert.equal(m[1], checksumOf(contents), '024 registers a checksum that is not its own body');
  });

  test('it is the next free version and no version is used twice', () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const names = fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort();
    assert.ok(names.includes('024_assessment_attempts.sql'));
    assert.equal(names.filter(n => n.startsWith('024')).length, 1);
    assert.ok(names.includes('023_assessments.sql'));
    const versions = names.map(n => n.split('_')[0]);
    assert.equal(new Set(versions).size, versions.length, 'a version number is used twice');
  });

  test('ADDITIVE — it drops nothing, alters no column and rewrites no constraint', () => {
    const body = code(SQL_024);
    assert.doesNotMatch(body, /DROP\s+TABLE/i);
    assert.doesNotMatch(body, /DROP\s+COLUMN/i);
    assert.doesNotMatch(body, /DROP\s+CONSTRAINT/i);
    assert.doesNotMatch(body, /ALTER\s+COLUMN/i);
    assert.doesNotMatch(body, /TRUNCATE/i);
    assert.doesNotMatch(body, /DELETE\s+FROM/i);
    assert.doesNotMatch(body, /RENAME/i);
    // Every ALTER TABLE either creates policy state on its own tables or ADDs.
    for (const m of body.match(/ALTER TABLE\s+(?:public\.)?(\w+)[^;]*/gi) ?? []) {
      assert.ok(
        /ENABLE ROW LEVEL SECURITY|ADD COLUMN IF NOT EXISTS|ADD CONSTRAINT/i.test(m),
        `024 alters rather than adds: ${m.slice(0, 90)}`,
      );
    }
    // Its DROP TRIGGER / DROP POLICY pairs are its own idempotency guards.
    for (const m of body.match(/DROP (POLICY|TRIGGER) IF EXISTS (\S+)/g) ?? []) {
      assert.match(m, /assessment_attempts|assessment_revocations|assessment_question_revocations|occurrences_confirmed_by_forward_only|study_sessions_verification_gate/);
    }
  });

  test('021\'s own guards are named as things that must survive, not replaced', () => {
    const body = code(SQL_024);
    assert.match(body, /study_sessions_transition_guard_trg/);
    assert.match(body, /study_sessions_birth_guard_trg/);
    // It drops neither.
    assert.ok(!/DROP TRIGGER IF EXISTS study_sessions_transition_guard_trg/.test(body));
    assert.ok(!/DROP TRIGGER IF EXISTS study_sessions_birth_guard_trg/.test(body));
    // 020's door too.
    assert.match(body, /occurrences_forward_only_trg/);
    assert.ok(!/DROP TRIGGER IF EXISTS occurrences_forward_only_trg/.test(body));
  });

  test('the transition gate is a trigger, it fails closed, and it has no default-permit', () => {
    const body = code(SQL_024);
    const fn = /CREATE OR REPLACE FUNCTION public\.study_sessions_verification_gate\(\)[\s\S]*?\$\$;/.exec(body);
    assert.ok(fn, 'the gate function is missing');
    const src = fn[0];
    // Three refusals, and the only unconditional RETURN NEWs are the
    // not-this-transition early exit and the end of a fully-checked path.
    assert.equal((src.match(/RAISE EXCEPTION/g) ?? []).length, 3);
    assert.match(src, /IF holes > 0 THEN/);
    assert.match(src, /IF entries = 0 THEN/);
    assert.match(src, /IF a_id IS NULL THEN/);
    assert.ok(!/ELSE\s+RETURN NEW/.test(src), 'a default-permit branch is a guarantee that fails open');
  });

  test('the coverage view requires an ANSWERED question and excludes revoked ones', () => {
    const body = code(SQL_024);
    assert.match(body, /CREATE OR REPLACE VIEW public\.assessment_verification_coverage/);
    assert.match(body, /questions_answered/);
    // It joins through the UNREVOKED view, not the raw table.
    assert.match(body, /LEFT JOIN public\.unrevoked_assessment_questions/);
    assert.ok(!/LEFT JOIN public\.assessment_questions q/.test(body));
  });

  test('attempts and revocations are append-only, from every writer', () => {
    const body = code(SQL_024);
    assert.match(body, /BEFORE INSERT OR UPDATE OR DELETE ON public\.assessment_attempts/);
    assert.match(body, /BEFORE INSERT OR UPDATE OR DELETE ON public\.assessment_question_revocations/);
    assert.match(body, /CONSTRAINT assessment_attempts_append_only UNIQUE \(question_id, attempt_no\)/);
  });

  test('no client may write a grade or a revocation', () => {
    const body = code(SQL_024);
    assert.match(body, /REVOKE INSERT, UPDATE, DELETE ON public\.assessment_attempts\s+FROM anon, authenticated/);
    assert.match(body, /REVOKE INSERT, UPDATE, DELETE ON public\.assessment_question_revocations FROM anon, authenticated/);
    for (const m of body.match(/CREATE POLICY [\s\S]*?;/g) ?? []) {
      assert.match(m, /FOR SELECT/, `024 creates a non-SELECT policy: ${m.slice(0, 80)}`);
    }
  });

  test('only an assessment-originated occurrence may be confirmed by the system', () => {
    const body = code(SQL_024);
    assert.match(body, /occurrences_system_confirm_is_assessment/);
    assert.match(body, /confirmed_by IS DISTINCT FROM 'assessment' OR origin = 'assessment'/);
    // M8-5's gate stays shut for extraction, which is the whole point.
    assert.match(body, /confirmed_by IS NULL OR confirmed_by IN \('student','assessment'\)/);
  });

  test('one occurrence per attempt — the retry is idempotent', () => {
    assert.match(code(SQL_024), /CREATE UNIQUE INDEX IF NOT EXISTS occurrences_one_per_attempt/);
  });

  test('it names what it does not do, including the coverage_unfillable divergence', () => {
    const contents = sql();
    assert.match(contents, /WHAT THIS MIGRATION DELIBERATELY DOES NOT DO/);
    assert.match(contents, /coverage_unfillable/);
    assert.match(contents, /NOT APPLIED TO ANY DATABASE/);
    assert.match(contents, /M11 owns Mistake DNA/);
    assert.match(contents, /M12-1 by name in the plan/);
  });

  test('it does not reach past 022\'s view, and touches no raw session-concept table', () => {
    // M9's fence, honoured here rather than tripped: 024 has no business with
    // concept confirmation at all.
    assert.ok(!code(SQL_024).includes('session_concepts'));
  });
});
