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
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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
      const { data, error } = await admin.from('patterns').insert({
        student_id: made.userA, tier: 'concept', subject: 'Physics',
        concept_id: made.conceptId, parent_pattern_id: made.subjectId,
        error_class: 'execution', error_type: 'sign-error',
        label: 'Sign error applying the chain rule',
        severity: 87, system_confidence: 0.9, status: 'open',
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

  test('the system CAN resolve — the rule constrains students, not the engine', async () => {
    const { error } = await admin.from('patterns')
      .update({ status: 'resolved' }).eq('id', made.leafId);
    assert.equal(error, null, 'service role must be able to resolve');
    // Restore for later assertions.
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
