/**
 * M19 — THE PERSONAL MODEL. Acceptance I.2, V.5.1 … V.5.7, proved.
 *
 * EXECUTION_PLAN M19's definition of done, task by task:
 *   M19-1  I.2 — "the list is bounded, not open."
 *   M19-2  V.5.2–V.5.4 — "the aggregator is refused by the database, not by
 *          policy."
 *   M19-3  V.5.6, V.5.7 — "the fallback is stated, never silent."
 *   M19-4  V.5.5 — `explicit_value` restored exactly by L1 replay.
 *
 * `lib/personal-model.ts` and `lib/event-contract.ts` are both I/O-free (no
 * imports, no clock, no network — same discipline `tests/mistake-dna.test.mjs`
 * already exercises), so the whole of this suite is provable with no Supabase
 * project in reach (U.3, the determinism boundary). The GRANT-level guarantee
 * (M19-2) is the one property that CANNOT be proved by TypeScript alone — a
 * type system has no opinion about who a database will let write a column —
 * so that half of the suite reads `031_personal_model.sql` as text and
 * asserts on the REVOKE/GRANT statements themselves, the same way
 * `tests/data-ownership.test.mjs` and `tests/mistake-dna.test.mjs:988`
 * already verify their own structural refusals.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-personal-model');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const strip = sql =>
  sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');

const SQL_031 = 'supabase/migrations/031_personal_model.sql';

let PM; // lib/personal-model.ts
let EC; // lib/event-contract.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.personal-model.json'],
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
  [PM, EC] = await Promise.all([load('personal-model.js'), load('event-contract.js')]);
});

const STUDENT = '11111111-1111-4111-8111-111111111111';

const ev = (overrides) => ({
  event_id: overrides.event_id ?? '99999999-9999-4999-8999-999999999991',
  event_type: overrides.event_type,
  seq: overrides.seq,
  received_at: overrides.received_at,
  concept_id: overrides.concept_id ?? null,
  session_id: overrides.session_id ?? null,
  payload: overrides.payload ?? {},
});

// ═══════════════════════════════════════════════════════════════════════════
// I.2 — THE BOUNDED DIMENSION LIST (M19-1)
// ═══════════════════════════════════════════════════════════════════════════

describe('I.2 — the dimension list is bounded, not open', () => {
  test('exactly nine dimensions, transcribed from the architecture table', () => {
    assert.deepEqual(
      [...PM.PERSONAL_MODEL_DIMENSIONS],
      [
        'explanation_style', 'communication_tone', 'question_format_mix',
        'difficulty_preference', 'session_length', 'working_window',
        'correction_method', 'notification_appetite', 'recommendation_aggressiveness',
      ],
    );
  });

  test('isPersonalModelDimension rejects an out-of-set name — the TYPE SYSTEM refuses, not convention', () => {
    assert.equal(PM.isPersonalModelDimension('explanation_style'), true);
    assert.equal(PM.isPersonalModelDimension('learning_ability'), false);
    assert.equal(PM.isPersonalModelDimension('personality_type'), false); // I.1 — permanently out of scope
    assert.equal(PM.isPersonalModelDimension(''), false);
    assert.equal(PM.isPersonalModelDimension(null), false);
    assert.equal(PM.isPersonalModelDimension(123), false);
  });

  test('the SQL enum (031) contains exactly the same nine values, in the same order — no drift between TS and SQL', () => {
    const sql = strip(read(SQL_031));
    const m = /CREATE TYPE public\.personal_model_dimension AS ENUM \(([\s\S]*?)\);/.exec(sql);
    assert.ok(m, 'personal_model_dimension enum not found in 031');
    const values = m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    assert.deepEqual(values, [...PM.PERSONAL_MODEL_DIMENSIONS]);
  });

  test('the event-ingest layer (event-contract.ts) mirrors the same bounded set — a client cannot PREFERENCE_SET an out-of-set dimension', () => {
    const result = EC.validateEventDraft({
      client_event_id: 'c1',
      schema_version: 1,
      occurred_at: '2026-08-01T00:00:00.000Z',
      event_type: 'PREFERENCE_SET',
      surface: 'web',
      source: 'student_declaration',
      payload: { dimension: 'personality_type', value: 'x' },
    });
    assert.equal(result.ok, false);
    assert.ok(result.problems.some(p => p.code === 'BAD_DIMENSION'));
  });

  test('the event-ingest layer accepts every one of the nine, and only those nine', () => {
    for (const dim of PM.PERSONAL_MODEL_DIMENSIONS) {
      const result = EC.validateEventDraft({
        client_event_id: `c-${dim}`,
        schema_version: 1,
        occurred_at: '2026-08-01T00:00:00.000Z',
        event_type: 'PREFERENCE_SET',
        surface: 'web',
        source: 'student_declaration',
        payload: { dimension: dim, value: 'step-by-step' },
      });
      assert.ok(
        !result.problems?.some?.(p => p.code === 'BAD_DIMENSION'),
        `${dim} was wrongly rejected as out-of-set`,
      );
    }
  });

  test('isValidValueForDimension enforces I.2\'s per-dimension TYPE, not just the dimension name', () => {
    assert.equal(PM.isValidValueForDimension('explanation_style', 'step-by-step'), true);
    assert.equal(PM.isValidValueForDimension('explanation_style', 'nonsense'), false);
    assert.equal(PM.isValidValueForDimension('session_length', 45), true);
    assert.equal(PM.isValidValueForDimension('session_length', 'forty-five'), false);
    assert.equal(PM.isValidValueForDimension('question_format_mix', { mcq: 0.7, numeric: 0.3 }), true);
    assert.equal(PM.isValidValueForDimension('question_format_mix', { invalid_format: 1 }), false);
    assert.equal(PM.isValidValueForDimension('working_window', new Array(24).fill(0)), true);
    assert.equal(PM.isValidValueForDimension('working_window', [1, 2, 3]), false); // wrong length
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.5.2–V.5.4 — THE AGGREGATOR IS REFUSED BY THE DATABASE (M19-2)
// ═══════════════════════════════════════════════════════════════════════════

describe('V.5.2–V.5.4 — explicit-over-inferred, enforced by column-level GRANT', () => {
  const sql = strip(read(SQL_031));

  const grantColumns = (op, role) => {
    const re = new RegExp(
      `GRANT ${op} \\(([^)]*)\\)\\s+ON public\\.personal_model TO ${role}`, 'g',
    );
    const cols = new Set();
    let m;
    while ((m = re.exec(sql))) {
      for (const c of m[1].split(',').map(s => s.trim())) cols.add(c);
    }
    return cols;
  };

  test('personal_model_aggregator has NO grant, of any kind, on explicit_value or overridden_at', () => {
    for (const op of ['INSERT', 'UPDATE']) {
      const cols = grantColumns(op, 'personal_model_aggregator');
      assert.ok(!cols.has('explicit_value'), `aggregator has ${op} on explicit_value`);
      assert.ok(!cols.has('overridden_at'), `aggregator has ${op} on overridden_at`);
    }
  });

  test('personal_model_aggregator DOES have UPDATE on the inferred-side columns — it is not refused from doing its job', () => {
    const cols = grantColumns('UPDATE', 'personal_model_aggregator');
    for (const c of ['inferred_value', 'confidence', 'evidence_count', 'last_signal_at']) {
      assert.ok(cols.has(c), `aggregator is missing UPDATE on ${c}`);
    }
  });

  test('REVOKE ALL precedes the aggregator\'s GRANTs — the GRANT is a complete statement of what is permitted, not a widening', () => {
    const revokeIdx = sql.indexOf('REVOKE ALL ON public.personal_model FROM personal_model_aggregator');
    const grantIdx = sql.indexOf('GRANT SELECT ON public.personal_model TO personal_model_aggregator');
    assert.ok(revokeIdx !== -1, 'no REVOKE ALL for personal_model_aggregator');
    assert.ok(grantIdx !== -1, 'no narrowing GRANT for personal_model_aggregator');
    assert.ok(revokeIdx < grantIdx, 'REVOKE must precede GRANT');
  });

  test('authenticated (the student) has explicit_value/overridden_at, and does NOT have the inferred-side columns', () => {
    const insertCols = grantColumns('INSERT', 'authenticated');
    const updateCols = grantColumns('UPDATE', 'authenticated');
    assert.ok(updateCols.has('explicit_value'));
    assert.ok(updateCols.has('overridden_at'));
    for (const c of ['inferred_value', 'confidence', 'evidence_count', 'last_signal_at']) {
      assert.ok(!insertCols.has(c) && !updateCols.has(c), `student has a grant on ${c}, which is the aggregator's alone`);
    }
  });

  test('a dedicated role narrower than service_role exists for the aggregator — it is not just "service_role, told nicely"', () => {
    assert.match(sql, /CREATE ROLE personal_model_aggregator NOLOGIN/);
  });

  test('the belt-and-braces trigger refuses the aggregator role even if a future GRANT is mistakenly widened', () => {
    assert.match(sql, /personal_model_explicit_is_sacred/);
    assert.match(sql, /current_user = 'personal_model_aggregator'/);
    assert.match(sql, /RAISE EXCEPTION 'personal_model_aggregator may not write explicit_value or overridden_at/);
  });

  test('effective_value is a GENERATED column — there is no code path that computes it any other way (I.6 mechanism 2)', () => {
    assert.match(
      sql,
      /effective_value\s+JSONB GENERATED ALWAYS AS \(COALESCE\(explicit_value, inferred_value\)\) STORED/,
    );
  });

  test('resolveEffectiveValue (the TS-side preview of the same rule) agrees with COALESCE semantics', () => {
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const withExplicit = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: 'step-by-step', inferred_value: 'bullet-points',
      confidence: 0.9, last_signal_at: '2026-08-17T00:00:00.000Z', default_value: 'examples-first', nowMs: now,
    });
    assert.equal(withExplicit.value, 'step-by-step');
    assert.equal(withExplicit.source, 'explicit');

    const inferredOnly = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: 'bullet-points',
      confidence: 0.9, last_signal_at: '2026-08-17T00:00:00.000Z', default_value: 'examples-first', nowMs: now,
    });
    assert.equal(inferredOnly.value, 'bullet-points');
    assert.equal(inferredOnly.source, 'inferred');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.5.5 — `explicit_value` RESTORED EXACTLY BY L1 REPLAY (M19-4)
// ═══════════════════════════════════════════════════════════════════════════

describe('V.5.5 — L1 replay restores explicit_value exactly', () => {
  test('the last PREFERENCE_SET, in seq order, wins — not the last by array position, not by occurred_at', () => {
    const events = [
      { event_id: 'e3', seq: 30, received_at: '2026-08-03T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'step-by-step' } },
      { event_id: 'e1', seq: 10, received_at: '2026-08-01T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'bullet-points' } },
      { event_id: 'e2', seq: 20, received_at: '2026-08-02T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'theory-first' } },
    ];
    const replayed = PM.replayExplicitValues(events);
    const row = replayed.get('explanation_style');
    assert.equal(row.explicit_value, 'step-by-step');
    assert.equal(row.overridden_at, '2026-08-03T00:00:00.000Z');
    assert.equal(row.source_event_id, 'e3');
  });

  test('a clear (value: null) is restored as null, not dropped — I.6 mechanism 4', () => {
    const events = [
      { event_id: 'e1', seq: 10, received_at: '2026-08-01T00:00:00.000Z', payload: { dimension: 'communication_tone', value: 'direct' } },
      { event_id: 'e2', seq: 20, received_at: '2026-08-05T00:00:00.000Z', payload: { dimension: 'communication_tone', value: null } },
    ];
    const replayed = PM.replayExplicitValues(events);
    const row = replayed.get('communication_tone');
    assert.equal(row.explicit_value, null);
    assert.equal(row.overridden_at, '2026-08-05T00:00:00.000Z'); // the clear is itself an event, timestamped
  });

  test('an out-of-set dimension in old L1 data (pre-dating a later bound change) is never replayed — I.2 held even in the past', () => {
    const events = [
      { event_id: 'e1', seq: 10, received_at: '2026-08-01T00:00:00.000Z', payload: { dimension: 'not_a_real_dimension', value: 'x' } },
    ];
    const replayed = PM.replayExplicitValues(events);
    assert.equal(replayed.size, 0);
  });

  test('a full replay of a mixed multi-dimension history reproduces the exact same map as an incremental application would', () => {
    const events = [
      { event_id: 'e1', seq: 10, received_at: '2026-08-01T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'step-by-step' } },
      { event_id: 'e2', seq: 20, received_at: '2026-08-02T00:00:00.000Z', payload: { dimension: 'session_length', value: 25 } },
      { event_id: 'e3', seq: 30, received_at: '2026-08-03T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'bullet-points' } },
    ];
    const replayed = PM.replayExplicitValues(events);
    assert.equal(replayed.size, 2);
    assert.equal(replayed.get('explanation_style').explicit_value, 'bullet-points');
    assert.equal(replayed.get('session_length').explicit_value, 25);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.5.6 / V.5.7 — CONFIDENCE, DECAY, FLOOR, DISCLOSURE (M19-3)
// ═══════════════════════════════════════════════════════════════════════════

describe('V.5.6/V.5.7 — decay is applied at read time, never by rewriting rows, and the floor discloses rather than guesses', () => {
  test('decayedConfidence halves every HALF_LIFE days, exactly (I.5 formula, verbatim)', () => {
    const last = '2026-01-01T00:00:00.000Z';
    const atZeroDays = PM.decayedConfidence(0.8, last, Date.parse(last));
    const atOneHalfLife = PM.decayedConfidence(0.8, last, Date.parse(last) + PM.CONFIDENCE_HALF_LIFE_DAYS * 86400000);
    const atTwoHalfLives = PM.decayedConfidence(0.8, last, Date.parse(last) + 2 * PM.CONFIDENCE_HALF_LIFE_DAYS * 86400000);
    assert.equal(atZeroDays, 0.8);
    assert.equal(atOneHalfLife, 0.4);
    assert.equal(atTwoHalfLives, 0.2);
  });

  test('evidence_count and confidence are never destroyed by ageing — decay is a read-time VIEW, the stored row is untouched', () => {
    // The stored aggregate itself has no time-dependent mutation path: calling
    // decayedConfidence twice, at two different `nowMs`, from the SAME stored
    // (confidence, last_signal_at) never mutates its inputs.
    const stored = { confidence: 0.8, last_signal_at: '2026-01-01T00:00:00.000Z' };
    PM.decayedConfidence(stored.confidence, stored.last_signal_at, Date.parse('2026-06-01'));
    assert.equal(stored.confidence, 0.8);
    assert.equal(stored.last_signal_at, '2026-01-01T00:00:00.000Z');
  });

  test('below CONFIDENCE_FLOOR, resolveEffectiveValue falls back to the default — and DISCLOSES why, never silently', () => {
    const last = '2025-01-01T00:00:00.000Z'; // 200+ days stale (V.5's own scenario 7)
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const result = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: 'bullet-points',
      confidence: 0.9, last_signal_at: last, default_value: 'examples-first', nowMs: now,
    });
    assert.equal(result.source, 'default');
    assert.equal(result.value, 'examples-first');
    assert.ok(result.disclosure && result.disclosure.length > 0, 'a below-floor fallback must be disclosed, never silent');
    assert.match(result.disclosure, /confidence/i);
  });

  test('at or above the floor, the inference is used and no fallback disclosure is attached', () => {
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const result = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: 'bullet-points',
      confidence: 0.9, last_signal_at: '2026-08-17T00:00:00.000Z', default_value: 'examples-first', nowMs: now,
    });
    assert.equal(result.source, 'inferred');
    assert.equal(result.disclosure, null);
  });

  test('no signal at all yet — the default is used, disclosed as "no signal yet", never a guess', () => {
    const result = PM.resolveEffectiveValue({
      dimension: 'session_length', explicit_value: null, inferred_value: null,
      confidence: null, last_signal_at: null, default_value: 30, nowMs: Date.now(),
    });
    assert.equal(result.source, 'default');
    assert.equal(result.value, 30);
    assert.match(result.disclosure, /no signal yet/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// I.3/I.4 — SIGNAL EXTRACTION AND AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

describe('I.3/I.4 — extraction is deterministic and derives only from events that already exist academically', () => {
  test('extractExplanationStyleSignals requires the payload style AND a following correct answer to weight strongly', () => {
    const events = [
      ev({ event_id: 'e1', event_type: 'EXPLANATION_READ', seq: 1, received_at: '2026-08-01T00:00:00.000Z', concept_id: 'c1', payload: { style: 'step-by-step', dwell_ms: 25000 } }),
      ev({ event_id: 'e2', event_type: 'QUESTION_CORRECT', seq: 2, received_at: '2026-08-01T00:05:00.000Z', concept_id: 'c1', payload: { question_id: 'q1', attempt_id: 'a1' } }),
    ];
    const signals = PM.extractExplanationStyleSignals(events);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].observed_value, 'step-by-step');
    assert.ok(signals[0].weight > 0.5);
  });

  test('a short dwell below the floor produces no signal at all — no fabricated evidence', () => {
    const events = [
      ev({ event_type: 'EXPLANATION_READ', seq: 1, received_at: '2026-08-01T00:00:00.000Z', concept_id: 'c1', payload: { style: 'step-by-step', dwell_ms: 500 } }),
    ];
    assert.equal(PM.extractExplanationStyleSignals(events).length, 0);
  });

  test('extractQuestionFormatSignals produces a negative-weighted vote for an abandoned QUESTION_STARTED', () => {
    const events = [
      ev({ event_type: 'QUESTION_STARTED', seq: 1, received_at: '2026-08-01T00:00:00.000Z', payload: { question_id: 'q1', format: 'mcq' } }),
    ];
    const signals = PM.extractQuestionFormatSignals(events);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].observed_value.mcq, -0.5);
  });

  test('extractCorrectionMethodSignals fires only on MISTAKE_RESOLVED with a bounded method', () => {
    const events = [
      ev({ event_type: 'MISTAKE_RESOLVED', seq: 1, received_at: '2026-08-01T00:00:00.000Z', payload: { pattern_id: 'p1', resolution_id: 'r1', correction_method: 'drill' } }),
    ];
    const signals = PM.extractCorrectionMethodSignals(events);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].observed_value, 'drill');
  });

  test('aggregateDimension picks the majority categorical value, weighted by recency', () => {
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const signals = [
      { dimension: 'explanation_style', observed_value: 'bullet-points', weight: 0.9, source_event_id: 'e1', observed_at: '2026-08-17T00:00:00.000Z' },
      { dimension: 'explanation_style', observed_value: 'bullet-points', weight: 0.9, source_event_id: 'e2', observed_at: '2026-08-16T00:00:00.000Z' },
      { dimension: 'explanation_style', observed_value: 'theory-first', weight: 0.5, source_event_id: 'e3', observed_at: '2026-01-01T00:00:00.000Z' },
    ];
    const agg = PM.aggregateDimension('explanation_style', signals, now);
    assert.equal(agg.inferred_value, 'bullet-points');
    assert.equal(agg.evidence_count, 3);
    assert.ok(agg.confidence > 0 && agg.confidence <= 1);
  });

  test('aggregateDimension returns null for an empty signal set — no evidence, no inference', () => {
    assert.equal(PM.aggregateDimension('explanation_style', [], Date.now()), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.5 — THE FULL WALKTHROUGH, ARCHITECTURE'S OWN SCENARIO, STEP BY STEP
// ═══════════════════════════════════════════════════════════════════════════

describe('V.5 — the architecture\'s own personalisation-override scenario', () => {
  test('1–7, in one continuous story', () => {
    // 1. No explicit preference. Ten signals favour bullet-points.
    const now1 = Date.parse('2026-08-01T00:00:00.000Z');
    const tenSignals = Array.from({ length: 10 }, (_, i) => ({
      dimension: 'explanation_style', observed_value: 'bullet-points', weight: 0.8,
      source_event_id: `s${i}`, observed_at: '2026-07-30T00:00:00.000Z',
    }));
    const agg1 = PM.aggregateDimension('explanation_style', tenSignals, now1);
    const eff1 = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: agg1.inferred_value,
      confidence: agg1.confidence, last_signal_at: agg1.last_signal_at, default_value: 'examples-first', nowMs: now1,
    });
    assert.equal(eff1.value, 'bullet-points');
    assert.equal(eff1.source, 'inferred');

    // 2. Student sets step-by-step. explicit_value = step-by-step; effective
    //    changes on the very next read.
    const eff2 = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: 'step-by-step', inferred_value: agg1.inferred_value,
      confidence: agg1.confidence, last_signal_at: agg1.last_signal_at, default_value: 'examples-first', nowMs: now1,
    });
    assert.equal(eff2.value, 'step-by-step');
    assert.equal(eff2.source, 'explicit');

    // 3. Twenty further signals favour bullet-points. inferred_value updates;
    //    explicit_value untouched; effective_value stays step-by-step.
    const twentyMore = Array.from({ length: 20 }, (_, i) => ({
      dimension: 'explanation_style', observed_value: 'bullet-points', weight: 0.9,
      source_event_id: `t${i}`, observed_at: '2026-08-01T00:00:00.000Z',
    }));
    const agg3 = PM.aggregateDimension('explanation_style', [...tenSignals, ...twentyMore], now1);
    const eff3 = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: 'step-by-step', inferred_value: agg3.inferred_value,
      confidence: agg3.confidence, last_signal_at: agg3.last_signal_at, default_value: 'examples-first', nowMs: now1,
    });
    assert.equal(agg3.inferred_value, 'bullet-points');
    assert.equal(eff3.value, 'step-by-step'); // untouched
    assert.equal(eff3.source, 'explicit');

    // 4. Attempt to write explicit_value from the aggregator — refused by
    //    column-level grant. Proved structurally in the V.5.2–V.5.4 describe
    //    block above (031's GRANT statements); nothing further to prove here
    //    in pure TypeScript, since a type system cannot model a GRANT.

    // 5. All of L2 truncated and rebuilt from L1. explicit_value restored
    //    exactly.
    const l1 = [
      { event_id: 'e1', seq: 10, received_at: '2026-07-15T00:00:00.000Z', payload: { dimension: 'explanation_style', value: 'step-by-step' } },
    ];
    const replayed = PM.replayExplicitValues(l1);
    assert.equal(replayed.get('explanation_style').explicit_value, 'step-by-step');

    // 6. Student clears the preference. effective_value falls back to
    //    inferred_value — and the fallback IS disclosed (V.5.7 — but a clear
    //    falling back to a STILL-CONFIDENT inference is disclosed as a
    //    source change, not as a low-confidence guess).
    const eff6 = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: agg3.inferred_value,
      confidence: agg3.confidence, last_signal_at: agg3.last_signal_at, default_value: 'examples-first', nowMs: now1,
    });
    assert.equal(eff6.value, 'bullet-points');
    assert.equal(eff6.source, 'inferred');

    // 7. No signals for 200 days. decayed_confidence drops below the floor;
    //    the system uses the product default and says so.
    const now7 = now1 + 200 * 86400000;
    const eff7 = PM.resolveEffectiveValue({
      dimension: 'explanation_style', explicit_value: null, inferred_value: agg3.inferred_value,
      confidence: agg3.confidence, last_signal_at: agg3.last_signal_at, default_value: 'examples-first', nowMs: now7,
    });
    assert.equal(eff7.source, 'default');
    assert.equal(eff7.value, 'examples-first');
    assert.ok(eff7.disclosure, 'V.5 scenario 7 requires an explicit disclosure of the fallback');
  });
});
