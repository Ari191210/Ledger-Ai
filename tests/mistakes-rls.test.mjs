/**
 * 007_mistakes.sql — RLS and schema invariants, verified against the live database.
 *
 * Closes M1-3's acceptance: "RLS denies cross-user reads (tested)."
 *
 * This is the only integration test in the suite. It SKIPS silently when
 * Supabase credentials are absent, so `npm test` stays pure and CI stays green
 * without secrets.
 *
 * It creates two throwaway users, proves they cannot see each other, proves the
 * resolution rule is refused by the database, and deletes everything it made.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

/**
 * The severity formula's identity, read from `lib/mistake-severity.ts`.
 *
 * 025 added `patterns_severity_version_shape`: a concept-tier pattern must
 * carry both a severity and the version of the formula that produced it,
 * because a derived number without its formula cannot be interpreted or
 * recomputed. This fixture predates that migration and set only `severity`,
 * so it began failing the moment 025 reached the database it tests against.
 *
 * Read from source rather than hardcoded, so a future formula revision moves
 * this fixture with the code. Read rather than imported because this file is
 * plain ESM and the constant lives in TypeScript; the sibling
 * mistake-dna.test.mjs compiles the whole module tree for its own reasons,
 * which is far more machinery than one string needs.
 *
 * Resolved with `fileURLToPath` rather than `new URL(...)` because this file
 * declares its own `URL` const further down, which shadows the global.
 */
const SEVERITY_FACTORS_VERSION = (() => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(path.join(here, '..', 'lib', 'mistake-severity.ts'), 'utf8');
  const m = src.match(/SEVERITY_FACTORS_VERSION\s*=\s*["']([^"']+)["']/);
  if (!m) throw new Error('could not read SEVERITY_FACTORS_VERSION from lib/mistake-severity.ts');
  return m[1];
})();

// ── Environment ─────────────────────────────────────────────────────────────
if (existsSync('.env.local') && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile('.env.local'); } catch { /* ignore */ }
}

const URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CONFIGURED = Boolean(URL && ANON && SERVICE);

const admin = CONFIGURED
  ? createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const stamp = Date.now();
const EMAIL_A = `rls-test-a-${stamp}@studyledger.test`;
const EMAIL_B = `rls-test-b-${stamp}@studyledger.test`;
const PASSWORD = `Test-${stamp}-Aa1!`;

/** Everything created here, torn down in `after`. */
const made = {
  userA: null, userB: null,
  conceptId: null, evidenceId: null,
  globalId: null, subjectId: null, leafId: null,
  occurrenceId: null,
};

let clientA = null;
let clientB = null;

async function signIn(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

describe('007_mistakes — RLS and schema invariants', { skip: !CONFIGURED && 'Supabase env not configured' }, () => {
  before(async () => {
    // ── Two real users ──────────────────────────────────────────────────────
    for (const [key, email] of [['userA', EMAIL_A], ['userB', EMAIL_B]]) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password: PASSWORD, email_confirm: true,
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      made[key] = data.user.id;
    }

    clientA = await signIn(EMAIL_A);
    clientB = await signIn(EMAIL_B);

    // ── A shared concept (service role — the taxonomy is not user data) ─────
    {
      const { data, error } = await admin.from('concepts').insert({
        subject: 'Physics', chapter: 'Rotational Motion',
        topic: 'Angular Momentum', name: `RLS test concept ${stamp}`,
        board_codes: ['TEST'], exam_weight: 6,
      }).select('id').single();
      if (error) throw new Error(`concept: ${error.message}`);
      made.conceptId = data.id;
    }

    // ── User A's pattern tree: global → subject → leaf ──────────────────────
    {
      const { data, error } = await admin.from('patterns').insert({
        student_id: made.userA, tier: 'global',
        error_class: 'execution', error_type: 'sign-error',
        label: 'You make sign errors',
      }).select('id').single();
      if (error) throw new Error(`global pattern: ${error.message}`);
      made.globalId = data.id;
    }
    {
      const { data, error } = await admin.from('patterns').insert({
        student_id: made.userA, tier: 'subject', subject: 'Physics',
        parent_pattern_id: made.globalId,
        error_class: 'execution', error_type: 'sign-error',
        label: 'You make sign errors in Physics',
      }).select('id').single();
      if (error) throw new Error(`subject pattern: ${error.message}`);
      made.subjectId = data.id;
    }
    {
      // A leaf carries a severity, and 025 requires the severity's VERSION to
      // travel with it: `patterns_severity_version_shape` says a concept-tier
      // row must have both, because a derived number without the identity of
      // the formula that derived it cannot be interpreted or recomputed. This
      // fixture predates 025 and set only `severity`, so it began failing the
      // moment that migration reached the database it tests against.
      //
      // Using the real constant rather than a literal, so a future formula
      // revision moves this fixture with the code instead of leaving it
      // asserting against a version that no longer exists.
      const { data, error } = await admin.from('patterns').insert({
        student_id: made.userA, tier: 'concept', subject: 'Physics',
        concept_id: made.conceptId, parent_pattern_id: made.subjectId,
        error_class: 'execution', error_type: 'sign-error',
        label: 'Sign error applying the chain rule',
        severity: 87, severity_version: SEVERITY_FACTORS_VERSION,
        system_confidence: 0.9, status: 'open',
      }).select('id').single();
      if (error) throw new Error(`leaf pattern: ${error.message}`);
      made.leafId = data.id;
    }

    // ── A's evidence + occurrence ───────────────────────────────────────────
    {
      const { data, error } = await admin.from('evidence').insert({
        student_id: made.userA, type: 'photo',
        storage_ref: `test/${stamp}.jpg`, content_hash: `hash-${stamp}`,
        captured_at: new Date().toISOString(), verified_by: 'student',
      }).select('id').single();
      if (error) throw new Error(`evidence: ${error.message}`);
      made.evidenceId = data.id;
    }
    {
      const { data, error } = await admin.from('occurrences').insert({
        student_id: made.userA, evidence_id: made.evidenceId,
        source: 'school-exam', subject: 'Physics', chapter: 'Rotational Motion',
        topic: 'Angular Momentum', concept_id: made.conceptId,
        question_ref: 'Q7(b)', marks_lost: 3, marks_available: 5,
        execution_error: 'sign-error',
        student_answer: { kind: 'text', text: '-L instead of +L' },
        pattern_id: made.leafId,
      }).select('id').single();
      if (error) throw new Error(`occurrence: ${error.message}`);
      made.occurrenceId = data.id;
    }
  });

  after(async () => {
    if (!CONFIGURED || !admin) return;
    // Explicit order: RESTRICT foreign keys make cascade order matter.
    if (made.occurrenceId) await admin.from('occurrences').delete().eq('id', made.occurrenceId);
    for (const id of [made.leafId, made.subjectId, made.globalId]) {
      if (id) await admin.from('patterns').delete().eq('id', id);
    }
    if (made.evidenceId) await admin.from('evidence').delete().eq('id', made.evidenceId);
    for (const id of [made.userA, made.userB]) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
    if (made.conceptId) await admin.from('concepts').delete().eq('id', made.conceptId);
  });

  // ══ POSITIVE CONTROL ══════════════════════════════════════════════════════
  // Without this, "B sees nothing" could mean RLS blocks everyone.

  test('owner CAN read their own patterns', async () => {
    const { data, error } = await clientA.from('patterns').select('id').eq('id', made.leafId);
    assert.equal(error, null);
    assert.equal(data.length, 1, 'owner must see their own leaf pattern');
  });

  test('owner CAN read their own occurrences and evidence', async () => {
    const occ = await clientA.from('occurrences').select('id').eq('id', made.occurrenceId);
    assert.equal(occ.data.length, 1, 'owner must see their own occurrence');
    const ev = await clientA.from('evidence').select('id').eq('id', made.evidenceId);
    assert.equal(ev.data.length, 1, 'owner must see their own evidence');
  });

  // ══ CROSS-USER DENIAL — the acceptance criterion ══════════════════════════

  test('other user CANNOT read patterns', async () => {
    const { data, error } = await clientB.from('patterns').select('id').eq('id', made.leafId);
    assert.equal(error, null, 'RLS filters rather than errors');
    assert.equal(data.length, 0, 'user B must not see user A patterns');
  });

  test('other user CANNOT read occurrences', async () => {
    const { data } = await clientB.from('occurrences').select('id').eq('id', made.occurrenceId);
    assert.equal(data.length, 0, 'user B must not see user A occurrences');
  });

  test('other user CANNOT read evidence', async () => {
    const { data } = await clientB.from('evidence').select('id').eq('id', made.evidenceId);
    assert.equal(data.length, 0, 'user B must not see user A evidence');
  });

  test('other user CANNOT read anything at all across the three tables', async () => {
    for (const table of ['patterns', 'occurrences', 'evidence']) {
      const { data } = await clientB.from(table).select('id');
      assert.equal(data.length, 0, `user B must see zero rows in ${table}`);
    }
  });

  test('other user CANNOT write into user A rows', async () => {
    const { data } = await clientB.from('patterns')
      .update({ status: 'acknowledged' }).eq('id', made.leafId).select('id');
    assert.equal(data?.length ?? 0, 0, 'user B must not update user A patterns');
  });

  // ══ THE RESOLUTION RULE (PRINCIPLES §3.1) ═════════════════════════════════

  test('student CANNOT mark their own pattern resolved', async () => {
    const { error } = await clientA.from('patterns')
      .update({ status: 'resolved' }).eq('id', made.leafId).select('id');
    assert.notEqual(error, null, 'the database must refuse student self-resolution');
  });

  test('student CANNOT set dormant or recurred either', async () => {
    for (const status of ['dormant', 'recurred']) {
      const { error } = await clientA.from('patterns')
        .update({ status }).eq('id', made.leafId).select('id');
      assert.notEqual(error, null, `student must not set status='${status}'`);
    }
  });

  test('student CAN acknowledge and practise', async () => {
    for (const status of ['acknowledged', 'practising']) {
      const { data, error } = await clientA.from('patterns')
        .update({ status }).eq('id', made.leafId).select('status');
      assert.equal(error, null, `student must be able to set '${status}'`);
      assert.equal(data[0].status, status);
    }
  });

  test('even the system cannot resolve without proof — 025 binds the engine too', async () => {
    // This test used to assert that the service role could simply set
    // 'resolved', on the reasoning that RLS constrains students and not the
    // engine. 025 deliberately closed that: RLS does not bind the service
    // role, and everything Mistake DNA writes runs AS the service role, so a
    // policy alone would leave the rule enforced only by convention.
    //
    // `patterns_resolution_requires_proof` is a TRIGGER, and triggers bind
    // everyone. Two rules now hold for every caller:
    //
    //   · resolved is reachable only from 'practising' (§4.8, G.7)
    //   · a mistake_resolutions row naming ≥2 proof attempts must ALREADY
    //     exist (G.8: "a resolution that cannot name them is not
    //     constructible")
    //
    // So the honest assertion is not "the engine may resolve freely" but
    // "the engine may resolve only by producing the proof first".

    // a) the leaf is currently 'practising' from the previous test, yet a bare
    //    resolve is still refused, because no proof row exists.
    {
      const { error } = await admin.from('patterns')
        .update({ status: 'resolved' }).eq('id', made.leafId);
      assert.notEqual(error, null, 'a resolution with no proof must be refused');
      assert.match(error.message, /mistake_resolutions row naming its proof attempts/);
    }

    // b) with the proof written first, in the shape §4.8 requires, the same
    //    update succeeds. This is the path the engine actually takes.
    {
      const { error: proofError } = await admin.from('mistake_resolutions').insert({
        pattern_id: made.leafId,
        student_id: made.userA,
        resolved_at: new Date().toISOString(),
        // ≥2 correct answers on the same concept. These are opaque ids here;
        // the constraint is on the count, not on their existence.
        proof_attempt_ids: [crypto.randomUUID(), crypto.randomUUID()],
        measured_from: new Date(Date.now() - 30 * 86400_000).toISOString(),
        cooling_days: 30,                 // CHECK requires >= 7
        set_by: 'system',                 // CHECK requires exactly this
      });
      assert.equal(proofError, null, 'the engine must be able to write the proof');

      const { error } = await admin.from('patterns')
        .update({ status: 'resolved' }).eq('id', made.leafId);
      assert.equal(error, null, 'with proof present, the engine may resolve');
    }

    // c) and the transition rule holds regardless of proof: 'open' is not a
    //    legal predecessor of 'resolved'.
    {
      await admin.from('patterns').update({ status: 'open' }).eq('id', made.leafId);
      const { error } = await admin.from('patterns')
        .update({ status: 'resolved' }).eq('id', made.leafId);
      assert.notEqual(error, null, "'open' → 'resolved' must be refused");
      assert.match(error.message, /not a legal transition/);
    }

    // Restore for later assertions.
    await admin.from('mistake_resolutions').delete().eq('pattern_id', made.leafId);
    await admin.from('patterns').update({ status: 'open' }).eq('id', made.leafId);
  });

  // ══ IMMUTABILITY (§4.3, §4.9) ═════════════════════════════════════════════

  test('occurrences cannot be updated by their owner', async () => {
    const { data } = await clientA.from('occurrences')
      .update({ marks_lost: 999 }).eq('id', made.occurrenceId).select('id');
    assert.equal(data?.length ?? 0, 0, 'an occurrence is a fact; no UPDATE policy exists');
  });

  test('occurrences cannot be deleted by their owner', async () => {
    const { data } = await clientA.from('occurrences')
      .delete().eq('id', made.occurrenceId).select('id');
    assert.equal(data?.length ?? 0, 0, 'occurrences are never deleted');
    const check = await clientA.from('occurrences').select('id').eq('id', made.occurrenceId);
    assert.equal(check.data.length, 1, 'the row must survive the delete attempt');
  });

  test('evidence cannot be deleted by its owner', async () => {
    const { data } = await clientA.from('evidence')
      .delete().eq('id', made.evidenceId).select('id');
    assert.equal(data?.length ?? 0, 0, 'evidence outlives what is built on it');
  });

  // ══ SCHEMA INVARIANTS (service role — these are structural, not RLS) ══════

  test('an occurrence with no error classification is rejected', async () => {
    const { error } = await admin.from('occurrences').insert({
      student_id: made.userA, evidence_id: made.evidenceId, source: 'mock',
      subject: 'Physics', chapter: 'x', topic: 'y', concept_id: made.conceptId,
      question_ref: 'Q1', marks_lost: 1, marks_available: 2,
      student_answer: { kind: 'text', text: 'x' },
    });
    assert.notEqual(error, null, 'at least one error class is mandatory (§4.3)');
  });

  test('an occurrence cannot attach to a PARENT pattern', async () => {
    for (const [tier, id] of [['subject', made.subjectId], ['global', made.globalId]]) {
      const { error } = await admin.from('occurrences').insert({
        student_id: made.userA, evidence_id: made.evidenceId, source: 'mock',
        subject: 'Physics', chapter: 'x', topic: 'y', concept_id: made.conceptId,
        question_ref: 'Q2', marks_lost: 1, marks_available: 2,
        execution_error: 'sign-error',
        student_answer: { kind: 'text', text: 'x' },
        pattern_id: id,
      });
      assert.notEqual(error, null, `parents must not own evidence — ${tier} tier (§4.4.2)`);
    }
  });

  test('a parent pattern cannot carry a persisted severity', async () => {
    const { error } = await admin.from('patterns').insert({
      student_id: made.userB, tier: 'global',
      error_class: 'cognitive', error_type: 'misconception',
      label: 'illegal', severity: 50,
    });
    assert.notEqual(error, null, 'parent severity is never persisted (§4.6.2)');
  });

  test('a leaf pattern requires concept, subject, parent and severity', async () => {
    const { error } = await admin.from('patterns').insert({
      student_id: made.userB, tier: 'concept',
      error_class: 'cognitive', error_type: 'misconception',
      label: 'illegal leaf',
    });
    assert.notEqual(error, null, 'tier shape must be enforced (§4.4)');
  });

  test('duplicate leaf patterns are impossible — the merge rule is structural', async () => {
    const { error } = await admin.from('patterns').insert({
      student_id: made.userA, tier: 'concept', subject: 'Physics',
      concept_id: made.conceptId, parent_pattern_id: made.subjectId,
      error_class: 'execution', error_type: 'sign-error',
      label: 'duplicate', severity: 40,
    });
    assert.notEqual(error, null, 'same student+concept+class+type must collide (§4.7)');
  });

  test('marks_lost cannot exceed marks_available', async () => {
    const { error } = await admin.from('occurrences').insert({
      student_id: made.userA, evidence_id: made.evidenceId, source: 'mock',
      subject: 'Physics', chapter: 'x', topic: 'y', concept_id: made.conceptId,
      question_ref: 'Q3', marks_lost: 9, marks_available: 5,
      execution_error: 'sign-error',
      student_answer: { kind: 'text', text: 'x' },
    });
    assert.notEqual(error, null, 'marks must be sane');
  });

  test('the shared taxonomy is readable by any authenticated user', async () => {
    const { data, error } = await clientB.from('concepts').select('id').eq('id', made.conceptId);
    assert.equal(error, null);
    assert.equal(data.length, 1, 'concepts are shared, not user data');
  });

  test('a student cannot write the taxonomy', async () => {
    const { error } = await clientA.from('concepts').insert({
      subject: 'Physics', chapter: 'x', topic: 'y', name: 'student-written',
    });
    assert.notEqual(error, null, 'the taxonomy is the company asset, not user data');
  });
});
