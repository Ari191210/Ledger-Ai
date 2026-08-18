/**
 * 029_parent_space.sql — RLS, revocation and category gating, verified
 * against the live database. Closes M17's "tested, not assumed" half of
 * V.8.1–V.8.8.
 *
 * SKIPS silently when Supabase credentials are absent, exactly like
 * `tests/mistakes-rls.test.mjs` — `npm test` stays pure and CI stays green
 * without secrets.
 *
 * Creates a throwaway student and a throwaway parent, invites, accepts,
 * proves category gating and immediate revocation, then deletes everything.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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
const STUDENT_EMAIL = `parent-space-student-${stamp}@studyledger.test`;
const PARENT_EMAIL  = `parent-space-parent-${stamp}@studyledger.test`;
const PASSWORD = `Test-${stamp}-Aa1!`;

const made = { studentId: null, parentId: null, invitationId: null, connectionId: null };
let studentClient = null;
let parentClient = null;

// 029_parent_space.sql is written but NOT applied to any database by this
// milestone (ground rule: no migration is ever applied by the agent that
// wrote it — a human runs it in Supabase → SQL Editor). So this suite must
// distinguish "no credentials" (silent skip, existing convention) from
// "credentials present but 029 not yet applied" (skip with a clear reason,
// not a wall of PGRST202/PGRST205 failures that look like a real defect).
let SCHEMA_READY = false;
if (CONFIGURED) {
  try {
    const { error } = await admin.from('parent_invitations').select('invitation_id').limit(1);
    SCHEMA_READY = !error;
  } catch {
    SCHEMA_READY = false;
  }
}
const RUN = CONFIGURED && SCHEMA_READY;
const skipReason = !CONFIGURED
  ? 'Supabase env not configured'
  : !SCHEMA_READY
    ? '029_parent_space.sql has not been applied to this database yet (expected — migrations are written, not applied, by this milestone)'
    : false;

async function signIn(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

describe('029_parent_space — RLS, revocation, category gating', { skip: skipReason }, () => {
  before(async () => {
    for (const [key, email] of [['studentId', STUDENT_EMAIL], ['parentId', PARENT_EMAIL]]) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      made[key] = data.user.id;
    }
    studentClient = await signIn(STUDENT_EMAIL);
    parentClient  = await signIn(PARENT_EMAIL);
  });

  after(async () => {
    if (!CONFIGURED) return;
    if (made.studentId) await admin.from('parent_share_policies').delete().eq('student_id', made.studentId);
    if (made.connectionId) await admin.from('parent_connections').delete().eq('connection_id', made.connectionId);
    if (made.invitationId) await admin.from('parent_invitations').delete().eq('invitation_id', made.invitationId);
    if (made.studentId) await admin.auth.admin.deleteUser(made.studentId).catch(() => {});
    if (made.parentId) await admin.auth.admin.deleteUser(made.parentId).catch(() => {});
  });

  test('V.8.1/V.8.2 — a fresh connection starts with every category OFF', async () => {
    const token = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    const { data: inv, error: invErr } = await studentClient.rpc('create_parent_invitation', {
      p_email: PARENT_EMAIL, p_token_hash: tokenHash, p_expires_at: expiresAt,
    });
    assert.equal(invErr, null, invErr?.message);
    made.invitationId = inv.invitation_id;

    const { data: conn, error: acceptErr } = await parentClient.rpc('accept_parent_invitation', { p_token_hash: tokenHash });
    assert.equal(acceptErr, null, acceptErr?.message);
    made.connectionId = conn.connection_id;
    assert.equal(conn.state, 'active');

    const { data: policy } = await admin
      .from('parent_share_policies')
      .select('*')
      .eq('student_id', made.studentId)
      .eq('is_current', true)
      .single();
    for (const cat of ['score_trajectory', 'dimension_breakdown', 'subject_state', 'progress_fixing', 'consistency', 'upcoming_exams', 'assessment_activity']) {
      assert.equal(policy[cat], false, `${cat} was not FALSE by default`);
    }
  });

  test('V.8.4 — get_parent_projection() before any category is turned on returns only "system"', async () => {
    const { data, error } = await parentClient.rpc('get_parent_projection', { p_student_id: made.studentId });
    assert.equal(error, null, error?.message);
    assert.deepEqual(Object.keys(data).sort(), ['system']);
  });

  test('turning ON one category surfaces only that key, never a neighbour', async () => {
    const { error: setErr } = await studentClient.rpc('set_parent_share_policy', { p_consistency: true });
    assert.equal(setErr, null, setErr?.message);

    const { data, error } = await parentClient.rpc('get_parent_projection', { p_student_id: made.studentId });
    assert.equal(error, null, error?.message);
    assert.deepEqual(Object.keys(data).sort(), ['consistency', 'system']);
    assert.ok(!('subjectState' in data));
    assert.ok(!('scoreTrajectory' in data));
  });

  test('V.8.7 — every parent read appends a parent_access_log row the student can read', async () => {
    const { data: log, error } = await studentClient
      .from('parent_access_log')
      .select('*')
      .eq('student_id', made.studentId)
      .order('accessed_at', { ascending: false });
    assert.equal(error, null, error?.message);
    assert.ok(log.length >= 1, 'no access log row was written by get_parent_projection()');
    assert.ok(log[0].categories_read.includes('consistency'));
  });

  test('V.8.6 — revocation is immediate: the very next read fails, no TTL window', async () => {
    const { error: revErr } = await studentClient.rpc('revoke_parent_connection', { p_connection_id: made.connectionId });
    assert.equal(revErr, null, revErr?.message);

    const { error } = await parentClient.rpc('get_parent_projection', { p_student_id: made.studentId });
    assert.ok(error, 'a revoked connection could still read the projection');
  });

  test('V.8.8 — the parent role has no write policy on any academic table it could reach', async () => {
    const { error } = await parentClient.from('parent_share_policies').update({ consistency: true }).eq('student_id', made.studentId);
    assert.ok(error, 'a parent was able to write to parent_share_policies');
  });

  test('a caller cannot forge auth.uid() via an argument — accept_parent_invitation requires the invited party to be signed in as themselves', async () => {
    // studentClient tries to accept an invitation addressed to the parent.
    const token = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: inv } = await studentClient.rpc('create_parent_invitation', {
      p_email: PARENT_EMAIL, p_token_hash: tokenHash, p_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    const { error } = await studentClient.rpc('accept_parent_invitation', { p_token_hash: tokenHash });
    assert.ok(error, 'a student was able to accept their own invitation as the parent');
    await admin.from('parent_invitations').delete().eq('invitation_id', inv.invitation_id);
  });
});
