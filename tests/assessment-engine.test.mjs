// M10 (part 1: M10-1 … M10-3) — the blueprint frozen before any model call,
// the seven generation gates, and the question-bank fallback.
//
// The five kinds of assertion tests/session-concepts.test.mjs uses, applied to
// the subsystem Part F calls *"the only manufacturer of verified academic
// evidence"*:
//
//   1. THE ACCEPTANCE TESTS THEMSELVES. V.3.1, V.3.2 and V.3.3 are transcribed
//      from STUDYLEDGER_SYSTEM_ARCHITECTURE Part V and named in the test titles.
//      V.3.4, V.3.5 and the transition gate are M10-4 and are deliberately
//      absent — this pass ships the predicate `manifestIsCovered()` and the
//      `assessment_coverage` view that gate will read, and moves no session
//      state.
//
//   2. ORDERING, PROVEN TWICE. *"The coverage manifest is frozen BEFORE ANY
//      MODEL CALL"* is a claim about time, so it is proven against time: once by
//      a recorded call log in which the write precedes every generate, and once
//      by a store whose write FAILS, after which the model is never reached at
//      all. A type-level guarantee nobody exercises is a guarantee nobody has.
//
//   3. EXHAUSTIVE OVER THE GATES. There are seven, in Part F's order, and each
//      one is shown rejecting a candidate that only it disqualifies — with the
//      `passed` list asserted, so "rejected at gate 1" is a checkable claim
//      about WHICH gate rather than a log line.
//
//   4. DEFENCE IN DEPTH, DEMONSTRATED. `admit()` is handed a candidate that
//      never met a gate at all, and refuses it anyway. The gates and the bind
//      are deliberately different functions over different inputs, and this is
//      what makes that separation worth its cost.
//
//   5. STRUCTURAL, over source. That the fallback path reaches no model, in the
//      source rather than in a mock; that no module here imports Supabase, a
//      clock, `next/*` or an SDK; that 023 is additive and registers with its
//      own true checksum; that the closed-form-only posture holds identically in
//      TypeScript and in SQL.
//
//   node --test tests/assessment-engine.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-assessment');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/** Comments name what a file deliberately does NOT do. Only real code counts. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_023 = 'supabase/migrations/023_assessments.sql';
const MOD_BLUEPRINT = 'lib/assessment-blueprint.ts';
const MOD_GENERATION = 'lib/assessment-generation.ts';
const MOD_BANK = 'lib/question-bank.ts';
const ROUTE = 'app/api/assessment/generate/route.ts';
const NEW_MODULES = [MOD_BLUEPRINT, MOD_GENERATION, MOD_BANK];

const SESSION = '55555555-5555-4555-8555-555555555555';
const STUDENT = '11111111-1111-4111-8111-111111111111';
const ASSESSMENT = '66666666-6666-4666-8666-666666666666';

let B; // lib/assessment-blueprint.ts
let G; // lib/assessment-generation.ts
let Q; // lib/question-bank.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.assessment.json'],
    { cwd: root, stdio: 'inherit' },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. The same post-compile rewrite the M9 suites use.
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
  [B, G, Q] = await Promise.all([
    load('assessment-blueprint.js'),
    load('assessment-generation.js'),
    load('question-bank.js'),
  ]);
});

// ── fixtures ───────────────────────────────────────────────────────────────

const AT = '2026-08-16T18:30:00.000Z';

/** A concept that really is in the compiled taxonomy, so the seed tier is
 *  exercised against concept identity rather than against a string. */
const SEEDED = [
  'Physics', 11, 'System of Particles and Rotational Motion',
  'Torque and Equilibrium', 'Sign convention for torque',
];

/** Resolved lazily — `Q` does not exist until the compile-and-load hooks run. */
const seeded = () => Q.conceptIdOf(SEEDED);

const row = (ref, over = {}) => ({
  session_concept_id: `sc-${ref}`,
  session_id: SESSION,
  student_id: STUDENT,
  concept_id: ref.startsWith('text:') ? null : ref,
  declared_text: null,
  concept_ref: ref,
  detection_source: 'ai_proposed',
  confirmation_state: 'confirmed',
  origin: 'declaration',
  proposed_at: AT,
  confirmed_at: AT,
  rejected_at: null,
  confirmed_by: 'student',
  assessment_required: true,
  source_client_event_id: `ev-${ref}`,
  decision_client_event_id: `dv-${ref}`,
  ...over,
});

const REF_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const REF_B = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const REF_C = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const REF_D = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const OFF_MANIFEST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9';

/** V.3.1's *"session with four confirmed concepts"*. */
const fourConcepts = () => [row(REF_A), row(REF_B), row(REF_C), row(REF_D)];

/** Freeze a blueprint over an arbitrary confirmed set. Returns the FrozenBlueprint. */
function frozenOver(concepts, extra = {}) {
  const m = B.buildCoverageManifest({ concepts, ...extra });
  assert.equal(m.ok, true, `the manifest was refused: ${m.reason}`);
  const bp = B.buildBlueprint({ manifest: m.manifest, retests: extra.retests });
  const f = B.freezeBlueprint({
    assessment_id: ASSESSMENT, session_id: SESSION, student_id: STUDENT,
    manifest: m.manifest, blueprint: bp, frozen_at: AT,
  });
  assert.equal(f.ok, true, `the freeze was refused: ${f.reason}`);
  return f.frozen;
}

/** A candidate that clears all seven gates. `n` varies the stem so two slots in
 *  one assessment never collide on gate 6. */
const goodCandidate = (ref, n = 0, depth = 'recall') => ({
  concept_ref: ref,
  depth,
  format: 'mcq',
  stem: `Which reading best describes the quantity measured in trial number ${n}?`,
  options: ['Alpha reading', 'Beta reading', 'Gamma reading', 'Delta reading'],
  answer_key: { kind: 'mcq', correct_indices: [1] },
  marks: 1,
});

const agreeingRederiver = (id = 'rederiver-model') => ({
  id,
  async rederive(c) {
    if (c.answer_key.kind === 'mcq') return { kind: 'mcq', correct_index: c.answer_key.correct_indices[0] };
    if (c.answer_key.kind === 'numeric') return { kind: 'numeric', value: c.answer_key.value };
    if (c.answer_key.kind === 'ordering') return { kind: 'ordering', order: c.answer_key.order };
    return { kind: 'match', pairs: c.answer_key.pairs };
  },
});

const safeModerator = () => ({ async classify() { return { safe: true }; } });

const gateCtx = (slot, over = {}) => ({
  slot,
  novelty: { seen_stem_hashes: new Set(), declaration_texts: [] },
  rederiver: agreeingRederiver(),
  moderator: safeModerator(),
  generator_id: 'generator-model',
  ...over,
});

const fillCtx = frozen => ({
  committed: { frozen, committed_at: AT },
  declaration_texts: [],
  seen_stem_hashes: new Set(),
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-1 · V.3.1 — THE COVERAGE MANIFEST, FROZEN BEFORE ANY MODEL CALL
//
// *"Session with four confirmed concepts. `coverage_manifest` is frozen with all
//   four BEFORE ANY MODEL CALL."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-1 · V.3.1 — the manifest', () => {
  test('four confirmed concepts produce a manifest naming all four', () => {
    const m = B.buildCoverageManifest({ concepts: fourConcepts() });
    assert.equal(m.ok, true);
    assert.deepEqual(m.manifest.map(e => e.concept_ref).sort(), [REF_A, REF_B, REF_C, REF_D]);
    for (const e of m.manifest) {
      assert.ok(e.questions_required >= B.MIN_QUESTIONS_PER_CONCEPT,
        'F.2 — every confirmed concept gets at least one question');
    }
  });

  test('a proposal is not coverage, and a rejection is not coverage', () => {
    // M9-5's gate, honoured at its first downstream reader. The manifest derives
    // the confirmed set itself rather than trusting the caller to have filtered.
    const m = B.buildCoverageManifest({
      concepts: [
        row(REF_A),
        row(REF_B, { confirmation_state: 'proposed', confirmed_at: null }),
        row(REF_C, { confirmation_state: 'rejected', confirmed_at: null, rejected_at: AT }),
      ],
    });
    assert.equal(m.ok, true);
    assert.deepEqual(m.manifest.map(e => e.concept_ref), [REF_A]);
  });

  test('an empty confirmed set is REFUSED, not turned into an empty manifest', () => {
    // T5's shape exactly: a manifest that names nothing makes "every confirmed
    // concept is covered" vacuously true.
    const m = B.buildCoverageManifest({
      concepts: [row(REF_A, { confirmation_state: 'proposed' })],
    });
    assert.equal(m.ok, false);
    assert.equal(m.reason, 'no_confirmed_concepts');
  });

  test('V.2.6 — an unresolved declaration is still an obligation', () => {
    // B.4 / V.2.4: the taxonomy refused to guess, so `concept_id` is NULL and
    // the ref is `text:…`. V.2.6 requires a question for it all the same.
    const ref = 'text:the thing about wobbling tops';
    const m = B.buildCoverageManifest({ concepts: [row(REF_A), row(ref)] });
    assert.equal(m.ok, true);
    const entry = m.manifest.find(e => e.concept_ref === ref);
    assert.ok(entry, 'an unresolved concept must appear on the manifest');
    assert.equal(entry.concept_id, null);
    assert.ok(entry.questions_required >= 1);
  });

  test('the manifest is a function of the confirmed SET, not of row order', () => {
    const a = frozenOver(fourConcepts());
    const b = frozenOver([...fourConcepts()].reverse());
    assert.equal(a.manifest_hash, b.manifest_hash);
    assert.equal(a.blueprint_hash, b.blueprint_hash);
  });

  test('the freeze is deep — a manifest entry cannot be mutated afterwards', () => {
    const frozen = frozenOver(fourConcepts());
    assert.ok(Object.isFrozen(frozen.manifest[0]), 'a shallow freeze leaves the field that matters writable');
    assert.throws(() => { frozen.manifest[0].questions_required = 99; }, TypeError);
    assert.equal(B.verifyFrozen(frozen), true);
  });

  test('verifyFrozen refuses a manifest whose contents no longer match its hash', () => {
    const frozen = frozenOver(fourConcepts());
    // The mutation `Object.freeze` cannot stop: a JSON round trip through a row
    // somebody edited.
    const rehydrated = { ...JSON.parse(JSON.stringify(frozen)) };
    assert.equal(B.verifyFrozen(rehydrated), true);
    rehydrated.manifest[0].questions_required = 99;
    assert.equal(B.verifyFrozen(rehydrated), false);
  });

  test('exam_weight raises the slot count, and the cap holds', () => {
    const heavy = B.questionsRequiredFor({ exam_weight: 7.0 });
    const mid = B.questionsRequiredFor({ exam_weight: 5.5 });
    const light = B.questionsRequiredFor({ exam_weight: 1.0 });
    assert.equal(heavy, 3);
    assert.equal(mid, 2);
    assert.equal(light, B.MIN_QUESTIONS_PER_CONCEPT);
    assert.ok(heavy <= B.MAX_QUESTIONS_PER_CONCEPT);
    assert.equal(B.questionsRequiredFor(undefined), B.MIN_QUESTIONS_PER_CONCEPT,
      'nothing known is the floor, never a guess');
  });

  test('starting depth is a deterministic function of prior evidence', () => {
    assert.equal(B.startingDepthFor(undefined), 'recall');
    assert.equal(B.startingDepthFor({ prior_accuracy: 0.2 }), 'recall');
    assert.equal(B.startingDepthFor({ prior_accuracy: 0.7 }), 'application');
    assert.equal(B.startingDepthFor({ prior_accuracy: 0.9 }), 'transfer');
    // F.3: an open pattern *"forces at least one question at the failing depth"*
    // — it wins over prior accuracy, because that is where the evidence says the
    // gap is.
    assert.equal(B.startingDepthFor({ prior_accuracy: 0.95, open_pattern_depth: 'recall' }), 'recall');
  });

  test('monotone in accuracy — a student who did better never starts lower', () => {
    const rung = d => B.DEPTH_LADDER.indexOf(d);
    let last = -1;
    for (let acc = 0; acc <= 1.0001; acc += 0.05) {
      const here = rung(B.startingDepthFor({ prior_accuracy: acc }));
      assert.ok(here >= last, `accuracy ${acc} started lower than the accuracy below it`);
      last = here;
    }
  });

  test('F.3.a — the personal model shifts the START and touches nothing else', () => {
    const concepts = [row(REF_A)];
    const per = { [REF_A]: { prior_accuracy: 0.7 } };
    const base = B.buildCoverageManifest({ concepts, per_concept: per });
    const harder = B.buildCoverageManifest({
      concepts, per_concept: per, personal_model: { explicit_difficulty: 'harder' },
    });
    const easier = B.buildCoverageManifest({
      concepts, per_concept: per, personal_model: { explicit_difficulty: 'easier' },
    });
    assert.equal(base.manifest[0].starting_depth, 'application');
    assert.equal(harder.manifest[0].starting_depth, 'transfer');
    assert.equal(easier.manifest[0].starting_depth, 'recall');
    // It never touches coverage or the count — F.3.a's firewall.
    for (const m of [base, harder, easier]) {
      assert.equal(m.manifest.length, 1);
      assert.equal(m.manifest[0].concept_ref, REF_A);
      assert.equal(m.manifest[0].questions_required, base.manifest[0].questions_required);
    }
  });

  test('F.3 — the time budget trims retests and NEVER coverage breadth', () => {
    const manifest = B.buildCoverageManifest({ concepts: fourConcepts() }).manifest;
    const retests = [
      { concept_ref: OFF_MANIFEST, concept_id: OFF_MANIFEST, depth: 'recall', pattern_id: 'p1', error_type: 'sign-error' },
      { concept_ref: OFF_MANIFEST, concept_id: OFF_MANIFEST, depth: 'recall', pattern_id: 'p2', error_type: null },
    ];
    const coverageCount = manifest.reduce((n, e) => n + e.questions_required, 0);

    const roomy = B.buildBlueprint({ manifest, retests, slot_budget: coverageCount + 2 });
    assert.equal(roomy.filter(s => !s.counts_toward_coverage).length, 2);

    // A budget BELOW the coverage count. The assessment gets longer than asked
    // for — the honest failure — and not one coverage slot is dropped.
    const tight = B.buildBlueprint({ manifest, retests, slot_budget: 1 });
    assert.equal(tight.filter(s => !s.counts_toward_coverage).length, 0);
    assert.equal(tight.filter(s => s.counts_toward_coverage).length, coverageCount);
    assert.deepEqual(
      [...new Set(tight.filter(s => s.counts_toward_coverage).map(s => s.concept_ref))].sort(),
      [REF_A, REF_B, REF_C, REF_D],
    );
  });

  test('F.2.b — a retest is attributed to its pattern and not to session coverage', () => {
    const manifest = B.buildCoverageManifest({ concepts: [row(REF_A)] }).manifest;
    const bp = B.buildBlueprint({
      manifest,
      retests: [{ concept_ref: OFF_MANIFEST, concept_id: OFF_MANIFEST, depth: 'recall', pattern_id: 'p1', error_type: 'sign-error' }],
    });
    const retest = bp.find(s => !s.counts_toward_coverage);
    assert.ok(retest);
    assert.equal(retest.targets_pattern_id, 'p1');
    assert.equal(B.isOnManifest(frozenOver([row(REF_A)]), OFF_MANIFEST), false,
      'the retest concept is legitimately off the coverage manifest');
    for (const s of bp.filter(s => s.counts_toward_coverage)) {
      assert.equal(s.targets_pattern_id, null, 'a coverage slot is never attributed to a pattern');
    }
  });

  test('the freeze refuses every way a blueprint could be born unable to satisfy F.2', () => {
    const manifest = B.buildCoverageManifest({ concepts: [row(REF_A), row(REF_B)] }).manifest;
    const good = B.buildBlueprint({ manifest });
    const base = { assessment_id: ASSESSMENT, session_id: SESSION, student_id: STUDENT, frozen_at: AT };
    const refuse = (over, reason) => {
      const r = B.freezeBlueprint({ ...base, manifest, blueprint: good, ...over });
      assert.equal(r.ok, false, `expected a refusal for ${reason}`);
      assert.equal(r.reason, reason);
    };

    refuse({ manifest: [], blueprint: [] }, 'empty_manifest');
    // A manifest entry with no slot — the coverage hole T5 names, present from
    // the first millisecond.
    refuse({ blueprint: good.filter(s => s.concept_ref !== REF_B).map((s, i) => ({ ...s, slot_index: i })) },
      'uncovered_manifest_entry');
    refuse({ blueprint: good.map((s, i) => (i === 0 ? { ...s, concept_ref: OFF_MANIFEST } : s)) },
      'slot_off_manifest');
    refuse({ blueprint: good.map((s, i) => ({ ...s, slot_index: i + 5 })) }, 'slot_index_disordered');
    refuse({ blueprint: [...good, { slot_index: good.length, concept_ref: OFF_MANIFEST, concept_id: null, depth: 'recall', counts_toward_coverage: false, targets_pattern_id: null, targets_error_type: null }] },
      'retest_without_pattern');
    refuse({ blueprint: good.map((s, i) => (i === 0 ? { ...s, targets_pattern_id: 'p1' } : s)) },
      'coverage_slot_with_pattern');

    // …and the good one is accepted, so the six refusals are not vacuous.
    assert.equal(B.freezeBlueprint({ ...base, manifest, blueprint: good }).ok, true);
  });

  test('the row 023 stores carries the manifest, its hash and nothing extra', () => {
    const r = B.assessmentRowFor(frozenOver(fourConcepts()));
    assert.deepEqual(Object.keys(r).sort(), [
      'assessment_id', 'blueprint', 'blueprint_hash', 'coverage_manifest',
      'frozen_at', 'manifest_hash', 'session_id', 'status', 'student_id',
    ]);
    assert.equal(r.status, 'blueprinted', 'the row is born before any model call');
    assert.equal(r.manifest_hash.length, 64);
    assert.equal(r.blueprint_hash.length, 64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-1 · V.3.1 — THE ORDERING ITSELF, PROVEN TWICE
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-1 · V.3.1 — frozen BEFORE any model call', () => {
  /** Drives the real pipeline with everything recorded into one shared log. */
  async function runRecorded({ persistOk = true } = {}) {
    const log = [];
    const frozen = frozenOver(fourConcepts());

    const store = {
      async persist() { log.push('persist'); return { ok: persistOk, detail: persistOk ? undefined : 'refused' }; },
      async markGenerationStarted() { log.push('mark'); },
    };

    let n = 0;
    const model = {
      id: 'generator-model',
      async generate(request) {
        log.push('generate');
        return { ok: true, raw: goodCandidate(request.slot.concept_ref, n++) };
      },
    };

    const committed = await G.commitManifest(store, frozen, AT, B.verifyFrozen);
    if (!committed.ok) return { log, committed, filled: null };

    const filled = await Q.fillBlueprint(
      {
        model,
        rederiver: agreeingRederiver(),
        moderator: { async classify() { log.push('moderate'); return { safe: true }; } },
        retained: Q.EMPTY_RETAINED_BANK,
        newQuestionId: i => `q-${i}`,
        now: () => AT,
      },
      // The REAL committed manifest — the branded value `commitManifest` minted
      // after the write, not a hand-built stand-in.
      { committed: committed.committed, declaration_texts: [], seen_stem_hashes: new Set() },
    );
    return { log, committed, filled, frozen };
  }

  test('THE CALL LOG — the manifest is written first, and every model call follows it', async () => {
    const { log, filled } = await runRecorded();
    assert.equal(log[0], 'persist', 'the very first recorded act is the manifest becoming durable');
    const firstGenerate = log.indexOf('generate');
    assert.ok(firstGenerate > 0, 'a model was in fact called, so the ordering claim is not vacuous');
    assert.ok(log.indexOf('persist') < firstGenerate);
    for (let i = 0; i < log.length; i++) {
      if (log[i] === 'generate' || log[i] === 'moderate') {
        assert.ok(log.lastIndexOf('persist') < i, `a model was reached at step ${i} before the manifest was written`);
      }
    }
    assert.equal(filled.unfillable.length, 0);
  });

  test('A STORE THAT REFUSES TO WRITE PRODUCES ZERO MODEL CALLS', async () => {
    // The ordering, proven from the other side. There is no expression a caller
    // can write that reaches the model without the manifest already committed,
    // so a failed commit ends the pipeline rather than degrading it.
    const { log, committed, filled } = await runRecorded({ persistOk: false });
    assert.equal(committed.ok, false);
    assert.equal(committed.reason, 'persist_failed');
    assert.equal(filled, null);
    assert.equal(log.filter(e => e === 'generate').length, 0);
    assert.equal(log.filter(e => e === 'moderate').length, 0);
  });

  test('commitManifest re-verifies the hashes and refuses a manifest mutated since the freeze', async () => {
    const frozen = frozenOver(fourConcepts());
    let persisted = false;
    const store = { async persist() { persisted = true; return { ok: true }; }, async markGenerationStarted() {} };
    const r = await G.commitManifest(store, frozen, AT, () => false);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'not_frozen');
    assert.equal(persisted, false, 'a manifest that did not verify is never written');
  });

  test('requestFor is the only constructor of a model input, and it binds to the frozen blueprint', () => {
    const frozen = frozenOver(fourConcepts());
    const committed = { frozen, committed_at: AT };
    const slot = frozen.blueprint[0];

    const ok = G.requestFor(committed, slot, 1);
    assert.ok(ok);
    assert.equal(ok.capability, G.GENERATION_CAPABILITY);
    assert.equal(ok.prompt_version, G.GENERATION_PROMPT_VERSION);
    assert.equal(ok.manifest_hash, frozen.manifest_hash);
    // F.2: the model *"is never asked 'which concepts should this cover?'"* —
    // there is no field on the request that could carry the question.
    assert.deepEqual(Object.keys(ok).sort(), ['attempt', 'capability', 'manifest_hash', 'prompt_version', 'slot']);

    // A slot that disagrees with the frozen blueprint yields nothing at all.
    assert.equal(G.requestFor(committed, { ...slot, concept_ref: OFF_MANIFEST }, 1), null);
    assert.equal(G.requestFor(committed, { ...slot, slot_index: 999 }, 1), null);
  });

  test('023 makes the ordering a property of the schema, not of a comment', () => {
    const sql = read(SQL_023);
    for (const col of ['coverage_manifest', 'manifest_hash', 'blueprint', 'blueprint_hash']) {
      assert.match(sql, new RegExp(`${col}\\s+\\w+\\s+NOT NULL`),
        `${col} must be NOT NULL — the row cannot exist without a frozen manifest`);
    }
    assert.match(sql, /generation_started_at IS NULL OR generation_started_at >= frozen_at/,
      'V.3.1 as a database CHECK');
    assert.match(sql, /assessments_freeze_guard_trg/);
    assert.match(sql, /the coverage manifest and blueprint are frozen before any model call/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-2 · V.3.2 — THE SEVEN GENERATION GATES
//
// *"Generation returns a question for a fifth concept. REJECTED AT GATE 1
//   (slot binding); it never reaches the student."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-2 · V.3.2 — there are seven gates, in Part F\'s order', () => {
  test('exactly seven, named and ordered as F.4\'s table reads', () => {
    assert.deepEqual([...G.GATES], [
      'slot_binding', 'schema', 'structure', 'answerability',
      'self_consistency', 'novelty', 'moderation',
    ]);
    assert.equal(G.GATES.length, 7);
    // Every gate states what it rejects, so a refusal can cite F.4 rather than
    // a paraphrase of it.
    assert.deepEqual(Object.keys(G.GATE_REJECTS).sort(), [...G.GATES].sort());
  });

  test('a good candidate passes all seven, in order', async () => {
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    const r = await G.runGates(goodCandidate(slot.concept_ref), gateCtx(slot));
    assert.equal(r.ok, true, r.ok ? '' : `${r.gate}: ${r.detail}`);
    assert.deepEqual([...r.passed], [...G.GATES]);
  });
});

describe('M10-2 · V.3.2 — each gate rejects a candidate only it disqualifies', () => {
  /** Runs one candidate and asserts the gate that stopped it, and that every
   *  EARLIER gate passed — which is what makes "rejected at gate N" checkable. */
  async function rejectedAt(candidate, gate, over = {}) {
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    const r = await G.runGates(candidate(slot.concept_ref), gateCtx(slot, over));
    assert.equal(r.ok, false, 'this candidate must not be admitted');
    assert.equal(r.gate, gate, `expected gate ${gate}, got ${r.gate}: ${r.detail}`);
    assert.deepEqual([...r.passed], G.GATES.slice(0, G.GATES.indexOf(gate)),
      'every earlier gate must have passed, and no later one may have run');
    return r;
  }

  // ── 1 · slot binding ──────────────────────────────────────────────────────
  test('V.3.2 — A QUESTION FOR A FIFTH CONCEPT IS REJECTED AT GATE 1', async () => {
    const r = await rejectedAt(() => goodCandidate(OFF_MANIFEST), 'slot_binding');
    assert.deepEqual([...r.passed], [], 'nothing ran; it never reached the student');
    assert.match(r.detail, /slot 0 asked for/);
  });

  test('gate 1 also refuses a candidate that names no concept at all', async () => {
    await rejectedAt(ref => ({ ...goodCandidate(ref), concept_ref: undefined }), 'slot_binding');
    await rejectedAt(ref => ({ ...goodCandidate(ref), concept_ref: 42 }), 'slot_binding');
  });

  // ── 2 · schema ────────────────────────────────────────────────────────────
  test('gate 2 rejects a depth that is not on the ladder', async () => {
    await rejectedAt(ref => ({ ...goodCandidate(ref), depth: 'mastery' }), 'schema');
  });

  test('gate 2 rejects short_text — F.4.a\'s closed-form-only V1 posture', async () => {
    // Not "unsupported for now". A format whose grading needs a model is a
    // format whose results are not E-class (P.3.a).
    const r = await rejectedAt(ref => ({ ...goodCandidate(ref), format: 'short_text' }), 'schema');
    assert.match(r.detail, /not a closed-form format/);
  });

  test('gate 2 rejects an empty stem, a missing key, a mismatched key and bad marks', async () => {
    await rejectedAt(ref => ({ ...goodCandidate(ref), stem: '   ' }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), answer_key: undefined }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), answer_key: { kind: 'numeric', value: 1, unit: null, tolerance: 0.1 } }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), marks: 0 }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), marks: 1.5 }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), options: null }), 'schema');
    await rejectedAt(ref => ({ ...goodCandidate(ref), options: ['only one'] }), 'schema');
  });

  test('gate 2 rejects a numeric question carrying options', async () => {
    await rejectedAt(ref => ({
      ...goodCandidate(ref), format: 'numeric', options: ['a', 'b'],
      answer_key: { kind: 'numeric', value: 5, unit: 'm', tolerance: 0.1 },
    }), 'schema');
  });

  test('gate 2 rejects a non-object candidate outright', async () => {
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    // A string that happens to satisfy nothing. Gate 1 sees no concept_ref.
    const r = await G.runGates('not a candidate', gateCtx(slot));
    assert.equal(r.ok, false);
    assert.equal(r.gate, 'slot_binding');
  });

  // ── 3 · structure ─────────────────────────────────────────────────────────
  test('gate 3 rejects an MCQ with zero or two keyed-correct options', async () => {
    const zero = await rejectedAt(ref => ({ ...goodCandidate(ref), answer_key: { kind: 'mcq', correct_indices: [] } }), 'structure');
    assert.match(zero.detail, /exactly one keyed-correct option/);
    await rejectedAt(ref => ({ ...goodCandidate(ref), answer_key: { kind: 'mcq', correct_indices: [0, 2] } }), 'structure');
  });

  test('gate 3 rejects duplicate options — including ones differing only in case and punctuation', async () => {
    await rejectedAt(ref => ({ ...goodCandidate(ref), options: ['Alpha reading', 'alpha  reading!', 'Gamma reading', 'Delta reading'] }), 'structure');
  });

  test('gate 3 rejects the answer appearing verbatim in the stem', async () => {
    // Well-typed and worthless as evidence — exactly what a model produces when
    // handed a definition and asked to write about it.
    const r = await rejectedAt(ref => ({
      ...goodCandidate(ref),
      stem: 'A body in rotational equilibrium has a net turning effect that is nil. What is its net turning effect?',
      options: ['Net turning effect that is nil', 'Twice the applied force', 'Half the applied force', 'Equal to the mass'],
      answer_key: { kind: 'mcq', correct_indices: [0] },
    }), 'structure');
    assert.match(r.detail, /verbatim in the stem/);
  });

  test('gate 3 rejects a keyed numeric answer that is printed in the stem', async () => {
    await rejectedAt(ref => ({
      ...goodCandidate(ref), format: 'numeric', options: null,
      stem: 'A trolley travels for a time such that its displacement is 42 m. Give that displacement in metres.',
      answer_key: { kind: 'numeric', value: 42, unit: 'm', tolerance: 0.5 },
    }), 'structure');
  });

  // ── 4 · answerability ─────────────────────────────────────────────────────
  test('gate 4 rejects a key that is not in the option set', async () => {
    const r = await rejectedAt(ref => ({ ...goodCandidate(ref), answer_key: { kind: 'mcq', correct_indices: [9] } }), 'answerability');
    assert.match(r.detail, /not in a set of 4/);
  });

  test('gate 4 rejects numeric answers that fail a units or precision parse', async () => {
    const numeric = (over) => ref => ({
      ...goodCandidate(ref), format: 'numeric', options: null,
      stem: 'A spanner of some length is turned by a perpendicular force. Give the resulting torque in newton metres.',
      answer_key: { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05, ...over },
    });
    // Precision, in both directions: an exact-float demand no student will ever
    // type, and a tolerance that makes every answer correct.
    await rejectedAt(numeric({ tolerance: 0 }), 'answerability');
    await rejectedAt(numeric({ tolerance: 5 }), 'answerability');
    await rejectedAt(numeric({ unit: 'per !! second' }), 'answerability');
    // …and the well-formed one is admitted, so the three refusals are not vacuous.
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    const good = await G.runGates(numeric({})(slot.concept_ref), gateCtx(slot));
    assert.equal(good.ok, true, good.ok ? '' : `${good.gate}: ${good.detail}`);
  });

  test('gate 4 rejects a malformed ordering and a malformed match', async () => {
    await rejectedAt(ref => ({
      ...goodCandidate(ref), format: 'ordering',
      answer_key: { kind: 'ordering', order: [0, 1] },
    }), 'answerability');
    await rejectedAt(ref => ({
      ...goodCandidate(ref), format: 'ordering',
      answer_key: { kind: 'ordering', order: [0, 0, 1, 2] },
    }), 'answerability');
    await rejectedAt(ref => ({
      ...goodCandidate(ref), format: 'match',
      answer_key: { kind: 'match', pairs: [[0, 9]] },
    }), 'answerability');
  });

  // ── 5 · self-consistency ──────────────────────────────────────────────────
  test('gate 5 discards when an independent re-derivation disagrees', async () => {
    const r = await rejectedAt(ref => goodCandidate(ref), 'self_consistency', {
      rederiver: { id: 'rederiver-model', async rederive() { return { kind: 'mcq', correct_index: 3 }; } },
    });
    assert.match(r.detail, /disagrees with the key/);
  });

  test('gate 5 treats "I could not tell" as disagreement, never as agreement', async () => {
    await rejectedAt(ref => goodCandidate(ref), 'self_consistency', {
      rederiver: { id: 'rederiver-model', async rederive() { return { kind: 'undecidable' }; } },
    });
  });

  test('B.20 — gate 5 refuses a re-deriver that IS the generator', async () => {
    // The same model asked twice with the same context is one opinion stated
    // twice. *"The model does not validate its own output."*
    const r = await rejectedAt(ref => goodCandidate(ref), 'self_consistency', {
      rederiver: agreeingRederiver('generator-model'),
    });
    assert.match(r.detail, /B\.20/);
  });

  test('agreement is checked against the key\'s own tolerance and shape', () => {
    const key = { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05 };
    assert.equal(G.agreesWithKey(key, { kind: 'numeric', value: 3.02 }), true);
    assert.equal(G.agreesWithKey(key, { kind: 'numeric', value: 3.5 }), false);
    assert.equal(G.agreesWithKey(key, { kind: 'mcq', correct_index: 0 }), false, 'a different shape is not agreement');
    assert.equal(G.agreesWithKey(key, { kind: 'undecidable' }), false);
    // Ordering is ordered; matching is not.
    assert.equal(G.agreesWithKey({ kind: 'ordering', order: [0, 1] }, { kind: 'ordering', order: [1, 0] }), false);
    assert.equal(G.agreesWithKey({ kind: 'match', pairs: [[0, 1], [1, 0]] }, { kind: 'match', pairs: [[1, 0], [0, 1]] }), true);
  });

  // ── 6 · novelty / leakage ─────────────────────────────────────────────────
  test('gate 6 rejects a stem the student has already seen', async () => {
    const stem = goodCandidate(REF_A).stem;
    await rejectedAt(ref => goodCandidate(ref), 'novelty', {
      novelty: { seen_stem_hashes: new Set([G.stemHash(stem)]), declaration_texts: [] },
    });
  });

  test('gate 6 sees through rewording that changes only spacing and case', async () => {
    const stem = goodCandidate(REF_A).stem;
    await rejectedAt(ref => ({ ...goodCandidate(ref), stem: `  ${stem.toUpperCase()}  ` }), 'novelty', {
      novelty: { seen_stem_hashes: new Set([G.stemHash(stem)]), declaration_texts: [] },
    });
  });

  test('gate 6 rejects a stem that merely restates the declaration', async () => {
    const r = await rejectedAt(ref => ({
      ...goodCandidate(ref),
      stem: 'I did Torque in coaching tonight and it went fine',
    }), 'novelty', {
      novelty: { seen_stem_hashes: new Set(), declaration_texts: ['I did Torque in coaching tonight'] },
    });
    assert.match(r.detail, /restates the declaration/);
  });

  // ── 7 · moderation ────────────────────────────────────────────────────────
  test('gate 7 blocks at the regex layer, before any classifier call', async () => {
    let classifierCalled = false;
    const r = await rejectedAt(ref => ({
      ...goodCandidate(ref),
      stem: 'Explain how to make a bomb using the rotational quantities above.',
    }), 'moderation', {
      moderator: { async classify() { classifierCalled = true; return { safe: true }; } },
    });
    assert.match(r.detail, /regex layer/);
    assert.equal(classifierCalled, false, 'the free layer runs first — /api/ai\'s order, kept');
  });

  test('gate 7 blocks on the classifier when the regex layer passes', async () => {
    const r = await rejectedAt(ref => goodCandidate(ref), 'moderation', {
      moderator: { async classify() { return { safe: false, reason: 'weapons' }; } },
    });
    assert.match(r.detail, /classifier: weapons/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-2 — SLOT BINDING AT BIND TIME: DEFENCE IN DEPTH
//
// Gate 1 checks the candidate against the SLOT. `admit()` checks the finished
// question against the FROZEN MANIFEST, independently. Two functions, two
// inputs, so one bug cannot silence both.
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-2 — admit() re-verifies membership independently of the gates', () => {
  const admitting = (frozen, slot, candidate) => G.admit({
    committed: { frozen, committed_at: AT },
    slot,
    candidate,
    question_id: 'q-1',
    admitted_at: AT,
    provenance: {
      capability: G.GENERATION_CAPABILITY, prompt_version: G.GENERATION_PROMPT_VERSION,
      model: 'generator-model', rederiver_model: 'rederiver-model',
      origin: 'generated', gates_passed: [...G.GATES],
    },
  });

  test('WITH THE GATES BYPASSED ENTIRELY, an off-slot question is still refused', () => {
    // Nothing below ran a single gate. This is the "gate 1 has a bug", "somebody
    // reordered GATES", "a future caller skipped runGates" case, and it is the
    // reason the two checks are not the same function.
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    const r = admitting(frozen, slot, goodCandidate(OFF_MANIFEST));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'slot_mismatch');
    assert.match(r.detail, new RegExp(OFF_MANIFEST));
  });

  test('a question bound to a slot that is not in the frozen blueprint is refused', () => {
    const frozen = frozenOver(fourConcepts());
    const slot = { ...frozen.blueprint[0], slot_index: 999 };
    const r = admitting(frozen, slot, goodCandidate(slot.concept_ref));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'unknown_slot');
  });

  test('OFF-MANIFEST COVERAGE IS REFUSED even when the blueprint itself was tampered with', () => {
    // The freeze already refuses a coverage slot for a concept the manifest does
    // not name (`slot_off_manifest`), so this state cannot arise through
    // `freezeBlueprint()`. It is built here by hand — the shape a corrupted row,
    // a bad migration or a future caller with its own blueprint would present —
    // because a last checkpoint that is only reachable through the checks before
    // it is not a last checkpoint.
    const manifest = B.buildCoverageManifest({ concepts: [row(REF_A)] }).manifest;
    const forged = {
      assessment_id: ASSESSMENT, session_id: SESSION, student_id: STUDENT,
      manifest,
      blueprint: [{
        slot_index: 0, concept_ref: OFF_MANIFEST, concept_id: OFF_MANIFEST,
        depth: 'recall', counts_toward_coverage: true,
        targets_pattern_id: null, targets_error_type: null,
      }],
      manifest_hash: B.hashOf(manifest),
      blueprint_hash: 'x'.repeat(64),
      frozen_at: AT,
    };
    const r = admitting(forged, forged.blueprint[0], goodCandidate(OFF_MANIFEST));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'off_manifest');
  });

  test('a manifest whose hash no longer matches its contents is refused before anything else', () => {
    const frozen = frozenOver(fourConcepts());
    const tampered = { ...JSON.parse(JSON.stringify(frozen)) };
    tampered.manifest[0].questions_required = 99;
    const r = admitting(tampered, tampered.blueprint[0], goodCandidate(tampered.blueprint[0].concept_ref));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'manifest_tampered');
  });

  test('V.3.6 — a retest is admitted off-manifest, and counts toward its pattern only', () => {
    const manifest = B.buildCoverageManifest({ concepts: [row(REF_A)] }).manifest;
    const bp = B.buildBlueprint({
      manifest,
      retests: [{ concept_ref: OFF_MANIFEST, concept_id: OFF_MANIFEST, depth: 'recall', pattern_id: 'p1', error_type: 'sign-error' }],
    });
    const frozen = B.freezeBlueprint({
      assessment_id: ASSESSMENT, session_id: SESSION, student_id: STUDENT,
      manifest, blueprint: bp, frozen_at: AT,
    }).frozen;

    const retestSlot = frozen.blueprint.find(s => !s.counts_toward_coverage);
    const r = admitting(frozen, retestSlot, goodCandidate(OFF_MANIFEST));
    assert.equal(r.ok, true, r.ok ? '' : `${r.reason}: ${r.detail}`);
    assert.equal(r.question.counts_toward_coverage, false);
    assert.equal(r.question.targets_pattern_id, 'p1');
  });

  test('an admitted question carries its provenance, its slot and its stem hash', () => {
    const frozen = frozenOver(fourConcepts());
    const slot = frozen.blueprint[0];
    const c = goodCandidate(slot.concept_ref);
    const r = admitting(frozen, slot, c);
    assert.equal(r.ok, true);
    const q = r.question;
    assert.equal(q.slot_index, slot.slot_index);
    assert.equal(q.concept_id, slot.concept_id, 'identity comes from the FROZEN slot, never from the candidate');
    assert.equal(q.stem_hash, G.stemHash(c.stem));
    // F.4.b's revocation handle. Provenance added retroactively is not provenance.
    assert.equal(q.provenance.prompt_version, G.GENERATION_PROMPT_VERSION);
    assert.equal(q.provenance.manifest_hash, frozen.manifest_hash);
    assert.equal(q.provenance.origin, 'generated');
    assert.ok(q.admitted_at, 'F.4 — admitted_at is written only after all seven');
  });

  test('F.4 — nothing is repaired: a rejected candidate yields no question at all', async () => {
    const frozen = frozenOver(fourConcepts());
    const model = {
      id: 'generator-model',
      // Always the wrong concept. The tempting repair is to file it under the
      // slot it was asked for; that is the coverage hole T5 describes.
      async generate() { return { ok: true, raw: goodCandidate(OFF_MANIFEST) }; },
    };
    const filled = await Q.fillBlueprint({
      model, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(filled.questions.length, 0, 'not one mis-bound question was reassigned into a slot');
    assert.ok(filled.rejections.every(r => r.gate === 'slot_binding'));
    assert.equal(filled.unfillable.length, frozen.blueprint.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-3 · V.3.3 — THE QUESTION BANK FALLBACK
//
// *"Generation fails N times for concept 3. THE BANK SUPPLIES A PRIOR QUESTION
//   FOR CONCEPT 3."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-3 · V.3.3 — the fallback', () => {
  test('V.3.3 — generation fails N times for one concept and the bank fills THAT slot', async () => {
    const concepts = [row(REF_A), row(seeded())];
    const frozen = frozenOver(concepts);
    const failing = frozen.blueprint.find(s => s.concept_ref === seeded());
    assert.ok(failing, 'the seeded concept must have a slot');

    let attemptsOnFailing = 0;
    let n = 0;
    const model = {
      id: 'generator-model',
      async generate(request) {
        if (request.slot.concept_ref === seeded()) {
          attemptsOnFailing++;
          return { ok: false, detail: 'the model declined' };
        }
        return { ok: true, raw: goodCandidate(request.slot.concept_ref, n++) };
      },
    };

    const filled = await Q.fillBlueprint({
      model, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(attemptsOnFailing, G.MAX_GENERATION_ATTEMPTS,
      'F.2.a — the bank is reached AFTER N retries, not instead of them');

    const supplied = filled.questions.find(q => q.slot_index === failing.slot_index);
    assert.ok(supplied, 'the bank must supply a question for the concept generation could not fill');
    assert.equal(supplied.concept_ref, seeded());
    assert.equal(supplied.provenance.origin, 'bank');
    assert.equal(filled.unfillable.length, 0, 'no coverage hole survived the fallback');
    assert.equal(Q.manifestIsCovered(fillCtx(frozen), filled.questions), true);
  });

  test('ZERO MODEL CALLS — with no model at all, the bank still fills and covers', async () => {
    // A refused guard, an absent API key, a timed-out route: all of them arrive
    // here as `model: null`. M10-3's claim, measured rather than asserted.
    const frozen = frozenOver([row(seeded())]);
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(),
      // A moderator that would throw if it were ever reached. It never is.
      moderator: { async classify() { throw new Error('the fallback path called a model'); } },
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(filled.model_calls, 0);
    assert.ok(filled.questions.length > 0);
    assert.equal(filled.unfillable.length, 0);
    assert.equal(Q.manifestIsCovered(fillCtx(frozen), filled.questions), true);
  });

  test('a bank question is MANIFEST-COMPLIANT and bound like any other', async () => {
    const frozen = frozenOver([row(seeded())]);
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    for (const q of filled.questions) {
      assert.ok(B.isOnManifest(frozen, q.concept_ref), 'a bank question is on the frozen manifest');
      assert.equal(q.counts_toward_coverage, true);
      assert.equal(q.concept_ref, frozen.blueprint[q.slot_index].concept_ref);
      assert.equal(q.assessment_id, ASSESSMENT);
      assert.equal(q.provenance.origin, 'bank');
      assert.equal(q.provenance.model, 'bank', 'a revocation of a prompt it never ran under must not sweep it up');
      assert.equal(q.provenance.rederiver_model, null);
      assert.deepEqual([...q.provenance.gates_passed], [...Q.BANK_GATES]);
      assert.ok(B.CLOSED_FORM_FORMATS.includes(q.format), 'closed-form only (F.4.a)');
      assert.equal(q.stem_hash.length, 64);
    }
  });

  test('the fallback has no shortcut — a malformed bank question is refused, not admitted', async () => {
    const frozen = frozenOver([row(REF_A)]);
    const retained = {
      async forConcept() {
        return [
          // Two keyed-correct options: gate 3's rejection, applied to the bank.
          { ...goodCandidate(REF_A, 1), answer_key: { kind: 'mcq', correct_indices: [0, 1] } },
          // …then a well-formed one, which IS admitted.
          goodCandidate(REF_A, 2),
        ];
      },
    };
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(filled.model_calls, 0);
    assert.equal(filled.questions.length, 1);
    assert.equal(filled.questions[0].stem, goodCandidate(REF_A, 2).stem);
    assert.ok(filled.rejections.some(r => r.gate === 'structure'));
  });

  test('the bank never repeats a stem inside one assessment (F.5)', async () => {
    // Two slots on one concept, and a retained bank offering the same stem twice.
    const frozen = frozenOver([row(REF_A)], { per_concept: { [REF_A]: { exam_weight: 7.0 } } });
    assert.ok(frozen.blueprint.length >= 2, 'exam_weight must have produced more than one slot');

    const retained = {
      async forConcept() { return [goodCandidate(REF_A, 1), goodCandidate(REF_A, 1), goodCandidate(REF_A, 2)]; },
    };
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    const hashes = filled.questions.map(q => q.stem_hash);
    assert.equal(new Set(hashes).size, hashes.length, 'a retest reuses a DIFFERENT question, never the same stem');
  });

  test('the bank runs the free half of gate 7 without ever calling a classifier', async () => {
    const frozen = frozenOver([row(REF_A)]);
    const retained = {
      async forConcept() {
        return [
          { ...goodCandidate(REF_A, 3), stem: 'Explain how to make a bomb from the apparatus described.' },
          goodCandidate(REF_A, 4),
        ];
      },
    };
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(),
      moderator: { async classify() { throw new Error('the fallback path called a classifier'); } },
      retained, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(filled.model_calls, 0);
    assert.equal(filled.questions.length, 1);
    assert.equal(filled.questions[0].stem, goodCandidate(REF_A, 4).stem);
    assert.ok(filled.rejections.some(r => r.gate === 'moderation' && /regex/.test(r.detail)));
  });

  test('F.2.a — an empty bank does NOT shrink the assessment; the hole is reported', async () => {
    // *"Refusing to verify is always available; verifying with a hole never is."*
    const frozen = frozenOver([row(REF_A), row(REF_B)]);
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.equal(filled.questions.length, 0, 'neither concept is in the seed tier');
    assert.deepEqual(
      filled.unfillable.map(u => u.concept_ref).sort(),
      [REF_A, REF_B].sort(),
    );
    assert.equal(Q.manifestIsCovered(fillCtx(frozen), filled.questions), false,
      'the coverage predicate M10-4 will gate on must say NO');
  });

  test('a partially filled assessment is still not covered — coverage is per entry', async () => {
    const frozen = frozenOver([row(REF_A), row(seeded())]);
    const filled = await Q.fillBlueprint({
      model: null, rederiver: agreeingRederiver(), moderator: safeModerator(),
      retained: Q.EMPTY_RETAINED_BANK, newQuestionId: i => `q-${i}`, now: () => AT,
    }, fillCtx(frozen));

    assert.ok(filled.questions.length > 0, 'the seeded concept was filled');
    assert.deepEqual(filled.unfillable.map(u => u.concept_ref), [REF_A]);
    assert.equal(Q.manifestIsCovered(fillCtx(frozen), filled.questions), false);
  });

  test('a retest slot that cannot be filled is NOT a coverage hole', () => {
    // F.2.b: a retest counts toward its pattern, so its absence is not a broken
    // promise about session coverage.
    assert.match(code(MOD_BANK), /else if \(slot\.counts_toward_coverage\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M10-3 — THE SEED TIER IS REAL CONTENT, KEYED BY REAL CONCEPT IDENTITY
// ═══════════════════════════════════════════════════════════════════════════

describe('M10-3 — the seed bank', () => {
  test('every seed question resolves to a concept the compiled taxonomy contains', async () => {
    const { buildTaxonomy } = await import(pathToFileURL(path.join(outDir, 'taxonomy/build.js')).href);
    const { CBSE_PHYSICS } = await import(pathToFileURL(path.join(outDir, 'taxonomy/cbse-physics.js')).href);
    const byPath = new Map(buildTaxonomy(CBSE_PHYSICS).map(c => [c.path, c]));

    for (const q of Q.SEED_BANK) {
      const p = Q.conceptPathOf(q.path);
      const concept = byPath.get(p);
      assert.ok(concept, `seed question path does not exist in the taxonomy: ${p}`);
      assert.equal(concept.level, 'concept', 'a question hangs off a leaf, never a chapter');
      assert.equal(Q.conceptIdOf(q.path), concept.id, 'the seed id must be the taxonomy id');
    }
  });

  test('every seed question is closed-form and survives the gates it will meet', async () => {
    const frozen = frozenOver([row(REF_A)]);
    const slot = frozen.blueprint[0];
    for (const q of Q.SEED_BANK) {
      assert.ok(B.CLOSED_FORM_FORMATS.includes(q.format), `${q.stem} is not closed-form`);
      assert.ok(B.DEPTH_LADDER.includes(q.depth));

      const candidate = Q.seedToCandidate(q, slot.concept_ref);
      assert.equal(G.gateSlotBinding(slot, candidate).ok, true);
      const parsed = G.gateSchema(candidate);
      assert.equal(parsed.ok, true, parsed.ok ? '' : `gate 2 on "${q.stem}": ${parsed.detail}`);
      const structure = G.gateStructure(parsed.candidate);
      assert.equal(structure.ok, true, structure.ok ? '' : `gate 3 on "${q.stem}": ${structure.detail}`);
      const answerable = G.gateAnswerability(parsed.candidate);
      assert.equal(answerable.ok, true, answerable.ok ? '' : `gate 4 on "${q.stem}": ${answerable.detail}`);
      const novel = G.gateNovelty(parsed.candidate, { seen_stem_hashes: new Set(), declaration_texts: [] });
      assert.equal(novel.ok, true, novel.ok ? '' : `gate 6 on "${q.stem}": ${novel.detail}`);
    }
  });

  test('the seed index groups by concept id and every entry is reachable', () => {
    const index = Q.seedBankByConcept();
    let counted = 0;
    for (const [id, list] of index) {
      assert.match(id, /^[0-9a-f-]{36}$/, 'the key is a concept UUID, not a topic string');
      counted += list.length;
    }
    assert.equal(counted, Q.SEED_BANK.length, 'no seed question is unreachable');
    assert.ok(index.get(Q.conceptIdOf(SEEDED)).length > 0);
  });

  test('the seed tier is stable — a rename in the taxonomy must break a test, not a student', () => {
    // Paths, never hard-coded UUIDs. `lib/taxonomy/build.ts`'s derivation is
    // byte-stable forever, so the path IS the identity.
    assert.doesNotMatch(
      code(MOD_BANK).replace(/conceptIdOf|uuidV5/g, ''),
      /['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/,
      'a concept UUID nobody can read must never appear literally in the seed data',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL — the boundaries this pass agreed to keep
// ═══════════════════════════════════════════════════════════════════════════

describe('the determinism boundary', () => {
  test('no module in this pass imports Supabase, a clock, next/* or an SDK', () => {
    for (const rel of NEW_MODULES) {
      const src = code(rel);
      assert.doesNotMatch(src, /from ["']@supabase/, `${rel} reaches a database`);
      assert.doesNotMatch(src, /from ["']next\//, `${rel} reaches the framework`);
      assert.doesNotMatch(src, /from ["']@anthropic-ai/, `${rel} constructs a model client`);
      assert.doesNotMatch(src, /supabaseServer|createStudentServerClient/, `${rel} reaches a database`);
      assert.doesNotMatch(src, /Date\.now\(\)|new Date\(\)/, `${rel} owns a clock; every time is injected`);
      assert.doesNotMatch(src, /Math\.random|crypto\.randomUUID/, `${rel} owns randomness`);
    }
  });

  test('THE FALLBACK PATH REACHES NO MODEL — proven over source, not over a mock', () => {
    const src = code(MOD_BANK);
    const start = src.indexOf('export async function fillFromBank');
    const end = src.indexOf('export async function fillBlueprint');
    assert.ok(start > 0 && end > start, 'fillFromBank must precede fillBlueprint');
    const body = src.slice(start, end);
    assert.doesNotMatch(body, /deps\.model/, 'the bank path must not so much as reference a model');
    assert.doesNotMatch(body, /\.generate\(/, 'the bank path must not generate');
    // `rederiver_model: null` in the provenance is a FIELD, not a call. The two
    // model calls are `.rederive(` and `.classify(`, and neither is here.
    assert.doesNotMatch(body, /\.rederive\(/, 'the bank path must not re-derive');
    assert.doesNotMatch(body, /\.classify\(/, 'the bank path must not reach the classifier');
    assert.doesNotMatch(body, /deps\.rederiver|deps\.moderator/, 'it does not even hold the handles');
  });

  test('the branded cast that mints a frozen blueprint exists exactly once', () => {
    // It is deliberately ugly so a second one anywhere is visible in a grep.
    const casts = rel => (code(rel).match(/as unknown as/g) ?? []).length;
    assert.equal(casts(MOD_BLUEPRINT), 1, 'only freezeBlueprint() may mint the FROZEN brand');
    assert.ok(casts(MOD_BANK) <= 1, 'the bank casts only where the gates read a candidate');
  });

  test('F.5\'s anti-gaming caps are the score engine\'s numbers, not new ones', () => {
    // Two copies of one number is how a number drifts. This is the fence.
    const v2 = read('lib/ledger-score-v2.ts');
    assert.match(v2, new RegExp(`DAILY_QUESTION_CAP = ${B.DAILY_QUESTION_CAP}\\b`));
    assert.match(v2, new RegExp(`MIN_SESSION_QUESTIONS = ${B.MIN_SESSION_QUESTIONS}\\b`));
    assert.equal(B.DAILY_QUESTION_CAP, 60);
    assert.equal(B.MIN_SESSION_QUESTIONS, 5);
  });

  test('the two score engines are untouched by this pass', () => {
    for (const rel of ['lib/ledger-score.ts', 'lib/ledger-score-v2.ts']) {
      assert.doesNotMatch(read(rel), /assessment-blueprint|assessment-generation|question-bank/);
    }
  });

  test('F.4.a — closed-form only, identically in TypeScript and in SQL', () => {
    assert.deepEqual([...B.CLOSED_FORM_FORMATS], ['mcq', 'numeric', 'ordering', 'match']);
    assert.ok(!B.CLOSED_FORM_FORMATS.includes('short_text'), 'absent, not disabled');
    const sql = read(SQL_023);
    assert.match(sql, /format\s+TEXT\s+NOT NULL CHECK \(format IN \('mcq','numeric','ordering','match'\)\)/);
    assert.doesNotMatch(code(SQL_023), /short_text|rubric\s+(TEXT|JSONB)/,
      'no column for a format V1 does not ship');
  });

  test('every answer key shape is deterministically gradable by M10-5', () => {
    // M10-5 is not built here, but the SHAPE it will grade against is, and a key
    // it cannot evaluate is a model opinion with a schema around it.
    const keys = [
      { kind: 'mcq', correct_indices: [1] },
      { kind: 'numeric', value: 3, unit: 'Nm', tolerance: 0.05 },
      { kind: 'ordering', order: [0, 1, 2, 3] },
      { kind: 'match', pairs: [[0, 1]] },
    ];
    assert.deepEqual(keys.map(k => k.kind).sort(), [...B.CLOSED_FORM_FORMATS].sort());
    for (const k of keys) {
      // Every key agrees with a re-derivation computed from the key alone —
      // i.e. it is a decidable comparison, with no judgement in it.
      assert.equal(
        G.agreesWithKey(k, k.kind === 'mcq' ? { kind: 'mcq', correct_index: k.correct_indices[0] }
          : k.kind === 'numeric' ? { kind: 'numeric', value: k.value }
            : k.kind === 'ordering' ? { kind: 'ordering', order: k.order }
              : { kind: 'match', pairs: k.pairs }),
        true,
      );
    }
  });
});

describe('the route — the first typed capability module', () => {
  test('it guards every model call with lib/ai-guard.ts, the way /api/ai does', () => {
    const src = code(ROUTE);
    assert.match(src, /guardModelCall/, 'no unguarded path to a model');
    assert.match(src, /strikeCount/);
    assert.match(src, /classify/);
    assert.match(src, /meter/);
    assert.match(src, /consume_ai_call/, 'the same meter /api/ai uses');
  });

  test('a refused guard produces a bank-filled assessment, never a thrown request', () => {
    const src = code(ROUTE);
    assert.match(src, /model = null/, 'a refusal becomes the fallback, not a 500');
    assert.match(src, /generation_refused/);
  });

  test('the freeze and the commit precede the guard, and the guard precedes generation', () => {
    const src = code(ROUTE);
    const at = needle => src.indexOf(needle);
    assert.ok(at('freezeBlueprint(') > 0 && at('commitManifest(') > 0 && at('guardModelCall(') > 0 && at('fillBlueprint(') > 0);
    assert.ok(at('freezeBlueprint(') < at('commitManifest('), 'freeze, then commit');
    assert.ok(at('commitManifest(') < at('guardModelCall('), 'a rate-limited student still gets a frozen manifest');
    assert.ok(at('guardModelCall(') < at('fillBlueprint('), 'the guard runs before anything generates');
  });

  test('it reads the CONFIRMED view and never the raw table', () => {
    const src = code(ROUTE);
    assert.match(src, /CONFIRMED_SESSION_CONCEPTS_VIEW/);
    assert.doesNotMatch(src, /\.from\(["']session_concepts["']\)/);
  });

  test('it does not import, call or route around /api/ai', () => {
    // The one surviving mention is a trailing comment citing the posture it
    // copied. What matters is that no CODE reaches that route.
    // Split on /\r?\n/, not '\n'. On a CRLF checkout the old form left a
    // trailing '\r' on every line, and /\/\/.*$/ without /m anchors at the end
    // of the whole string, so comments were barely stripped and a comment
    // naming `/api/ai` tripped a fence meant for CODE.
    const src = code(ROUTE).split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '')).join('\n');
    assert.doesNotMatch(src, /api\/ai/);
    assert.doesNotMatch(src, /fetch\(/, 'a capability module owns its model call; it does not proxy another route');
    assert.equal(read('app/api/ai/route.ts').includes('assessment-blueprint'), false,
      '/api/ai is untouched by this pass');
  });

  test('the response never carries an answer key', () => {
    const src = code(ROUTE);
    // Line-ending agnostic: the literal '\n' form cannot match a CRLF file,
    // so this silently found nothing and the assertion below failed on a
    // correct route.
    const start = src.search(/return NextResponse\.json\(\{\r?\n\s*ok: true/);
    assert.ok(start > 0, 'the success response must be findable');
    assert.doesNotMatch(src.slice(start), /answer_key/,
      'a question is presented; a key is graded against, server-side, by M10-5');
  });

  test('the client supplies a session id and nothing else — A.6.b closed for this capability', () => {
    const src = code(ROUTE);
    assert.match(src, /body\.session_id/);
    for (const smuggled of ['body.concepts', 'body.grade', 'body.board', 'body.student_id', 'body.profile']) {
      assert.ok(!src.includes(smuggled), `${smuggled} must come from the server, never the client`);
    }
  });

  test('neither prompt carries the student\'s own words', () => {
    // Prompt/data separation taken literally: the capability's input is a SLOT,
    // so there is no free text to delimit.
    const src = read(ROUTE);
    const sys = src.slice(src.indexOf('const SYSTEM_PROMPT'), src.indexOf('const REDERIVE_PROMPT'));
    assert.doesNotMatch(sys, /declared_text|declaration_texts/);
    assert.match(src, /declaration_texts: concepts\.map/, 'the declarations are read for gate 6 only');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 023 — ADDITIVE, SELF-REGISTERING, AND IT ENFORCES WHAT IT CLAIMS
// ═══════════════════════════════════════════════════════════════════════════

describe('023_assessments.sql', () => {
  test('it is the next free version and registers with its own true checksum', () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const versions = fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort();
    // INVERTED 2026-08-16 (M10 part 2). This read `versions[versions.length - 1]
    // === '023_assessments.sql'` — an assertion that 023 was the LAST migration,
    // which is a claim about the future and goes stale the moment the next one
    // lands. `024_assessment_attempts.sql` is that migration. What the test
    // actually means — 023 has a free version number of its own, used once — is
    // asserted directly, and no version number is used twice.
    assert.ok(versions.includes('023_assessments.sql'));
    assert.equal(versions.filter(n => n.startsWith('023')).length, 1, 'one file per version');
    const numbers = versions.map(n => n.split('_')[0]);
    assert.equal(new Set(numbers).size, numbers.length, 'a version number is used twice');

    const sql = read(SQL_023);
    const i = sql.indexOf(REGISTRATION_SENTINEL);
    assert.notEqual(i, -1, '023 has no registration footer');
    assert.ok(sql.slice(i).includes(checksumOf(sql)),
      'the footer must carry 023\'s own body checksum, or the ledger records a hash that never matches');
    assert.match(sql.slice(i), /record_migration\(\s*'023',\s*'023_assessments\.sql'/);
  });

  test('it is ADDITIVE — it alters, drops and rewrites nothing that exists', () => {
    const sql = code(SQL_023);
    assert.doesNotMatch(sql, /ALTER TABLE public\.(study_sessions|session_concepts|academic_events|occurrences|concepts|score_history)/);
    assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|DROP CONSTRAINT|TRUNCATE|DELETE FROM/);
    // The DROP POLICY / DROP TRIGGER pairs are its OWN, and idempotent.
    for (const m of sql.match(/DROP (POLICY|TRIGGER) IF EXISTS \S+ ON (\S+)/g) ?? []) {
      assert.match(m, /public\.assessments|public\.assessment_questions/,
        `023 drops something outside its own two tables: ${m}`);
    }
  });

  test('it creates exactly the two tables, two views and three triggers it claims', () => {
    const sql = read(SQL_023);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.assessments/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.assessment_questions/);
    assert.match(sql, /CREATE OR REPLACE VIEW public\.assessment_coverage/);
    assert.match(sql, /CREATE OR REPLACE VIEW public\.retained_question_bank/);
    for (const t of ['assessments_freeze_guard_trg', 'assessment_questions_bind_guard_trg', 'assessment_questions_immutable_trg']) {
      assert.match(sql, new RegExp(`CREATE TRIGGER ${t}`));
    }
  });

  test('F.2 layer 3\'s third check lives in the database, where it binds the service role', () => {
    const sql = read(SQL_023);
    assert.match(sql, /slot ->> 'concept_ref' IS DISTINCT FROM NEW\.concept_ref/);
    assert.match(sql, /NEW\.counts_toward_coverage AND NOT EXISTS/);
    assert.match(sql, /is not on assessment %''s frozen coverage manifest/);
    // It refuses; it never repairs.
    assert.doesNotMatch(sql, /NEW\.concept_ref :?= slot/, 'a trigger that re-pointed a mis-bound question would be T5 as a convenience');
  });

  test('clients hold no authoritative assessment state', () => {
    const sql = read(SQL_023);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.assessments\s+FROM anon, authenticated/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.assessment_questions FROM anon, authenticated/);
    const policies = sql.match(/CREATE POLICY [\s\S]*?FOR (\w+)/g) ?? [];
    assert.ok(policies.length > 0);
    for (const p of policies) assert.match(p, /FOR SELECT/, 'only SELECT-own policies belong here');
  });

  test('an admitted question is a fact — only `retained` may move', () => {
    const sql = read(SQL_023);
    assert.match(sql, /NEW\.answer_key\s+IS DISTINCT FROM OLD\.answer_key/,
      'a key that can be edited after an attempt is a grade that can be changed after the fact');
    assert.match(sql, /may not be deleted/);
    assert.match(sql, /retained\s+BOOLEAN\s+NOT NULL DEFAULT TRUE/);
  });

  test('the bank view carries no answer key', () => {
    const sql = read(SQL_023);
    const view = sql.slice(sql.indexOf('CREATE OR REPLACE VIEW public.retained_question_bank'));
    const body = view.slice(0, view.indexOf('COMMENT ON VIEW'));
    assert.doesNotMatch(body, /answer_key/);
  });

  test('it ships nothing M10-4 … M10-7 owns', () => {
    const sql = code(SQL_023);
    assert.doesNotMatch(sql, /CREATE TABLE[^;]*assessment_attempts/, 'attempts are M10-5 / M10-7');
    assert.doesNotMatch(sql, /EVENT_SUPERSEDED/, 'the revocation sweep is M10-6');
    // The transition gate is M10-4 and belongs with the transition it guards.
    // 023 builds the frozen truth that gate will READ and touches no session.
    assert.doesNotMatch(sql, /UPDATE public\.study_sessions/);
    assert.doesNotMatch(sql, /CLOSED_UNVERIFIED|coverage_unfillable/,
      'the reason code belongs to the session, not to the assessment row');
    assert.match(sql, /CREATE OR REPLACE VIEW public\.assessment_coverage/,
      'what it DOES ship is the view M10-4 reads');
  });

  test('this pass moves no session state and writes no mistake', () => {
    for (const rel of [...NEW_MODULES, ROUTE]) {
      const src = code(rel);
      assert.doesNotMatch(src, /applySessionTransition|CLOSED_UNVERIFIED|QUESTION_WRONG/,
        `${rel} reaches into M10-4 or M10-7`);
    }
  });
});
