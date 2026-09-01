// M18 — Data ownership. Part O; V.6.9; V.10.1–V.10.8.
//
// Three kinds of assertion, same convention as tests/academic-events.test.mjs
// and tests/assessment-grading.test.mjs:
//
//   1. BEHAVIOURAL, against the real compiled pure modules
//      (lib/correction.ts, lib/restatement.ts, lib/score-engine.ts) —
//      O.3's outcome classifier, the declaration/occurrence correction
//      drafts, the dispute builder, and the forced-restatement decision.
//   2. STRUCTURAL, over the migration SQL text — append-only triggers,
//      REVOKEd grants, absent UPDATE/DELETE policies, ON DELETE RESTRICT on
//      evidence. This is how "no UPDATE path exists" (M18-2's done-when) is
//      checked without a live database: the same posture
//      tests/academic-events.test.mjs uses for 016's append-only trigger.
//   3. WIRING, over the server-module source text — that the I/O layer
//      (lib/correction-server.ts, lib/evidence-deletion.ts,
//      lib/account-deletion.ts, lib/data-export.ts) actually calls the
//      audit/restatement/revocation primitives V.10.x require, without
//      requiring a live Supabase project (which tsc + next build already
//      exercised as a compile-time check).
//
//   node --test tests/data-ownership.test.mjs

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-data-ownership');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const SQL_030 = 'supabase/migrations/030_data_ownership.sql';
const SQL_024 = 'supabase/migrations/024_assessment_attempts.sql';
const SQL_016 = 'supabase/migrations/016_audit_entries.sql';

let Correction;
let Restatement;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.data-ownership.json'],
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
  [Correction, Restatement] = await Promise.all([
    load('correction.js'),
    load('restatement.js'),
  ]);
});

const STUDENT = '11111111-1111-4111-8111-111111111111';
const AT = '2026-08-18T10:00:00.000Z';

// ═══════════════════════════════════════════════════════════════════════════
// O.3 — the classifier, behaviourally
// ═══════════════════════════════════════════════════════════════════════════
describe('O.3 — classifyOutcome, the one entry point', () => {
  test('a student-declared target always auto-accepts, regardless of claim_kind', () => {
    assert.equal(Correction.classifyOutcome('declaration', 'mechanical'), 'auto_accepted');
    assert.equal(Correction.classifyOutcome('declaration', 'judgement'), 'auto_accepted');
  });

  test('a verified target with a mechanical claim is accepted, not disputed', () => {
    assert.equal(Correction.classifyOutcome('question', 'mechanical'), 'accepted_mechanical');
    assert.equal(Correction.classifyOutcome('assessment_attempt', 'mechanical'), 'accepted_mechanical');
    assert.equal(Correction.classifyOutcome('occurrence', 'mechanical'), 'accepted_mechanical');
  });

  test('a verified target with a judgement claim disputes — never auto-resolved either way (O.3.a)', () => {
    assert.equal(Correction.classifyOutcome('question', 'judgement'), 'disputed');
    assert.equal(Correction.classifyOutcome('assessment_attempt', 'judgement'), 'disputed');
    assert.equal(Correction.classifyOutcome('occurrence', 'judgement'), 'disputed');
  });

  test('buildCorrectionRequest refuses an empty claim or reason rather than storing a blank correction', () => {
    const base = { correction_id: 'c1', student_id: STUDENT, target_type: 'question', target_id: 'q1', claim_kind: 'mechanical', at: AT };
    const noClaim = Correction.buildCorrectionRequest({ ...base, claim: '   ', reason: 'because' });
    assert.equal(noClaim.ok, false);
    assert.equal(noClaim.refusal, 'empty_claim');

    const noReason = Correction.buildCorrectionRequest({ ...base, claim: 'the key is wrong', reason: '' });
    assert.equal(noReason.ok, false);
    assert.equal(noReason.refusal, 'empty_reason');
  });

  test('buildCorrectionRequest refuses an unknown target_type or claim_kind rather than defaulting one', () => {
    const bad = Correction.buildCorrectionRequest({
      correction_id: 'c1', student_id: STUDENT, target_type: 'nonsense', target_id: 'x',
      claim: 'x', reason: 'x', claim_kind: 'mechanical', at: AT,
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.refusal, 'unknown_target_type');
  });

  test('a built request carries the SAME outcome classifyOutcome would derive — one decision, not two', () => {
    const built = Correction.buildCorrectionRequest({
      correction_id: 'c1', student_id: STUDENT, target_type: 'assessment_attempt', target_id: 'a1',
      claim: 'my answer was right', reason: 'the numeric grader mis-parsed the unit', claim_kind: 'mechanical', at: AT,
    });
    assert.equal(built.ok, true);
    assert.equal(built.record.outcome, Correction.classifyOutcome('assessment_attempt', 'mechanical'));
    assert.equal(built.record.outcome, 'accepted_mechanical');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.10.1 / V.10.3 — the dispute is never silently rejected, never silently
// wins, and always starts 'open'
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.1 / V.10.3 — buildDispute', () => {
  test('a dispute is always constructed as status "open" — this module cannot adjudicate one', () => {
    const built = Correction.buildCorrectionRequest({
      correction_id: 'c2', student_id: STUDENT, target_type: 'question', target_id: 'q9',
      claim: 'the question was ambiguous', reason: 'two readings are both defensible', claim_kind: 'judgement', at: AT,
    });
    assert.equal(built.record.outcome, 'disputed');
    const dispute = Correction.buildDispute({ dispute_id: 'd1', correction: built.record, attempt_id: 'att1', at: AT });
    assert.equal(dispute.status, 'open');
    assert.equal(dispute.reason, built.record.reason);
    assert.equal(dispute.correction_id, 'c2');
  });

  test('buildDispute has no parameter or return path that could set status to anything but "open"', () => {
    // A structural check on the module's own vocabulary, not just one call:
    // DisputeRecord['status'] is typed as the literal "open" in the source.
    const src = read('lib/correction.ts');
    assert.match(src, /status:\s*"open"/, 'DisputeRecord must be typed to the single literal "open"');
    assert.doesNotMatch(src, /status:\s*"upheld"|status:\s*"stood_down"/, 'this module must not be able to construct a resolved dispute');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.10.4 — a declaration correction is auto-accepted and appends, never edits
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.4 — declarationCorrectionEventDraft', () => {
  test('produces an EVENT_SUPERSEDED draft naming what it supersedes, never editing it', () => {
    const built = Correction.buildCorrectionRequest({
      correction_id: 'c3', student_id: STUDENT, target_type: 'declaration', target_id: 'evt-1',
      claim: 'that was Friday, not Thursday', reason: 'misremembered the day', claim_kind: 'mechanical', at: AT,
    });
    assert.equal(built.record.outcome, 'auto_accepted');
    const draft = Correction.declarationCorrectionEventDraft({
      client_event_id: 'correction:c3', correction: built.record, supersedes_event_id: 'evt-1', occurred_at: AT,
    });
    assert.equal(draft.event_type, 'EVENT_SUPERSEDED');
    assert.equal(draft.source, 'system');
    assert.equal(draft.supersedes_event_id, 'evt-1');
    assert.equal(draft.payload.reason, built.record.reason);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// F.8 row 3 — an occurrence misclassification changes ONLY the classification
// ═══════════════════════════════════════════════════════════════════════════
describe('F.8 row 3 — occurrenceCorrectionPatch', () => {
  test('names exactly the fields a misclassification correction may change', () => {
    const patch = Correction.occurrenceCorrectionPatch('misconception', null, 'occ-1');
    assert.deepEqual(Object.keys(patch).sort(), ['cognitive_error', 'execution_error', 'supersedes'].sort());
    assert.equal(patch.supersedes, 'occ-1');
    assert.equal(patch.cognitive_error, 'misconception');
    assert.equal(patch.execution_error, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.6.9 / V.10.2 — the restatement decision
// ═══════════════════════════════════════════════════════════════════════════
describe('V.6.9 / V.10.2 — decideCorrectionRestatement', () => {
  test('with no prior snapshot, there is nothing to restate', () => {
    const d = Restatement.decideCorrectionRestatement({ prior: null, correctionId: 'c1', reason: 'x' });
    assert.equal(d.restatementOf, null);
    assert.equal(d.reason, null);
  });

  test('with a prior snapshot, ALWAYS restates — even under the SAME formula_version (unlike a formula-change restatement)', () => {
    const prior = { id: 42, formulaVersion: 'ledger-score/3.0.0', capturedOn: '2026-05-01' };
    const d = Restatement.decideCorrectionRestatement({ prior, correctionId: 'c9', reason: 'a question was found wrong' });
    assert.equal(d.restatementOf, 42);
    assert.match(d.reason, /c9/);
    assert.match(d.reason, /2026-05-01/);
    assert.match(d.reason, /kept and has not been overwritten/);
  });

  test('is a DIFFERENT decision than the formula-version restatement — it must not read prior.formulaVersion at all', () => {
    // A correction under the SAME formula version must still restate (O.4.a's
    // three-months-old dispute has no formula change anywhere in the story).
    // If the function body early-returned on formulaVersion equality like
    // decideRestatement does, this test would catch it. Comments are stripped
    // first — this file's own header PROSE discusses decideRestatement's
    // comparison, which would otherwise false-positive this check.
    const codeOnly = read('lib/restatement.ts')
      .split('\n')
      .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/**'))
      .join('\n');
    assert.doesNotMatch(
      codeOnly,
      /prior\.formulaVersion\s*===\s*/,
      'decideCorrectionRestatement must not suppress a restatement based on formula-version equality — the correction cause is independent of the formula cause',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL — 030's append-only enforcement, the actual "no UPDATE path"
// ═══════════════════════════════════════════════════════════════════════════
describe('030_data_ownership.sql — structural append-only (M18-2 done-when)', () => {
  const sql = read(SQL_030);

  test('correction_requests has no INSERT/UPDATE/DELETE policy for authenticated, and both are REVOKEd', () => {
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.correction_requests FROM anon, authenticated/);
    assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,120}correction_requests[\s\S]{0,40}FOR (INSERT|UPDATE|DELETE)/i);
  });

  test('correction_requests has a BEFORE UPDATE OR DELETE trigger that refuses arbitrary mutation', () => {
    assert.match(sql, /CREATE TRIGGER correction_requests_append_only_trg\s+BEFORE UPDATE OR DELETE ON public\.correction_requests/);
    assert.match(sql, /correction_requests_append_only[\s\S]{0,600}RAISE EXCEPTION/);
  });

  test('assessment_attempt_disputes has no client write policy and refuses everything but the one forward resolution move', () => {
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.assessment_attempt_disputes FROM anon, authenticated/);
    assert.match(sql, /CREATE TRIGGER assessment_attempt_disputes_append_only_trg\s+BEFORE UPDATE OR DELETE ON public\.assessment_attempt_disputes/);
  });

  test('assessment_attempt_disputes only ever opens as status = \'open\' by default, matching the TS builder', () => {
    assert.match(sql, /status\s+TEXT\s+NOT NULL DEFAULT 'open'/);
  });

  test('evidence tombstone columns exist, are both-or-neither, and the row itself cannot be DELETEd (V.10.6)', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS binary_deleted_at TIMESTAMPTZ/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS binary_deleted_reason TEXT/);
    assert.match(sql, /evidence_tombstone_shape[\s\S]{0,300}binary_deleted_at IS NULL AND binary_deleted_reason IS NULL/);
    assert.match(sql, /evidence_tombstone_forward_only[\s\S]{0,400}TG_OP = 'DELETE'[\s\S]{0,300}RAISE EXCEPTION/);
  });

  test('the score-eligibility view excludes both revoked AND disputed questions (V.10.1, bidirectional)', () => {
    assert.match(sql, /CREATE OR REPLACE VIEW public\.assessment_score_eligible_questions/);
    assert.match(sql, /FROM public\.unrevoked_assessment_questions q/);
    assert.match(sql, /assessment_attempt_disputes d\s+WHERE d\.status = 'open' AND d\.question_id = q\.question_id/);
  });

  test('030 is additive only — it does not touch 024\'s own append-only guard', () => {
    assert.match(sql, /assessment_attempts_append_only_trg/);
    assert.doesNotMatch(sql, /DROP TABLE|ALTER TABLE public\.assessment_attempts DROP/);
  });

  test('revoke_all_parent_connections_for_deletion revokes by state=revoked, revoked_by=\'system\' — reusing 029\'s own shape', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.revoke_all_parent_connections_for_deletion/);
    assert.match(sql, /SET state = 'revoked', revoked_at = now\(\), revoked_by = 'system'/);
  });

  test('registers itself in the migration ledger, same convention as every migration since 009', () => {
    assert.match(sql, /supabase_migrations\.record_migration\(\s*'030'/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL — 024 still refuses a direct edit to a graded attempt (V.10.5)
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.5 — no UPDATE path onto a graded attempt exists, before or after M18', () => {
  const sql024 = read(SQL_024);

  test('assessment_attempts has no UPDATE/DELETE policy and a trigger that refuses both', () => {
    assert.match(sql024, /REVOKE INSERT, UPDATE, DELETE ON public\.assessment_attempts             FROM anon, authenticated/);
    assert.match(sql024, /CREATE OR REPLACE FUNCTION public\.assessment_attempts_append_only\(\)[\s\S]{0,1200}answers are append-only/);
  });

  test('the ONLY new write M18 adds to assessment_attempts is an INSERT of a superseding row (correction-server.ts), never an .update(', () => {
    const src = read('lib/correction-server.ts');
    assert.doesNotMatch(
      src,
      /supabaseServer\s*\.from\("assessment_attempts"\)\s*\.update\(/,
      'M18 must never UPDATE a graded attempt; a correction only ever INSERTs a superseding row',
    );
    assert.match(src, /supabaseServer\s*\.from\("assessment_attempts"\)\s*\.insert\(/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.10.6 — evidence deletion tombstones, occurrences stay valid
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.6 — evidence deletion never touches occurrences or the evidence row shape', () => {
  test('lib/evidence-deletion.ts never deletes an evidence row and never touches occurrences', () => {
    const src = read('lib/evidence-deletion.ts');
    assert.doesNotMatch(src, /\.from\("evidence"\)\.delete\(/);
    assert.doesNotMatch(src, /\.from\("occurrences"\)/);
    assert.match(src, /binary_deleted_at:\s*at/);
    assert.match(src, /binary_deleted_reason:\s*opts\.reason/);
  });

  test('007_mistakes.sql still RESTRICTs occurrences.evidence_id — the guarantee tombstoning relies on', () => {
    const sql007 = read('supabase/migrations/007_mistakes.sql');
    assert.match(sql007, /evidence_id\s+UUID NOT NULL REFERENCES evidence\(id\) ON DELETE RESTRICT/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.10.7 — export completeness
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.7 — data-export.ts reads every named layer plus dispute markers and the audit trail', () => {
  const src = read('lib/data-export.ts');

  for (const table of [
    'academic_events', 'evidence', 'assessment_attempts', 'assessment_question_revocations',
    'occurrences', 'correction_requests', 'assessment_attempt_disputes', 'audit_entries', 'score_history',
  ]) {
    test(`reads ${table}`, () => {
      assert.match(src, new RegExp(`\\.from\\("${table}"\\)`));
    });
  }

  test('L2 is named as excluded, with a derivation manifest rather than the numbers themselves', () => {
    assert.match(src, /L2_DERIVATION/);
    assert.match(src, /patterns:\s*{/);
    assert.doesNotMatch(src, /\.from\("patterns"\)|\.from\("academic_record"\)/);
  });

  test('every export is an AuditEntry (O.1, O.6)', () => {
    assert.match(src, /writeAuditEntry\(\{[\s\S]{0,200}action:\s*"export"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.10.8 — account deletion
// ═══════════════════════════════════════════════════════════════════════════
describe('V.10.8 — account deletion revokes parent connections and writes the tombstone', () => {
  const src = read('lib/account-deletion.ts');

  test('writes the deletion AuditEntry BEFORE calling auth.admin.deleteUser', () => {
    const auditIdx = src.indexOf('action: "deletion"');
    const deleteIdx = src.indexOf('deleteUser(studentId)');
    assert.ok(auditIdx > -1 && deleteIdx > -1);
    assert.ok(auditIdx < deleteIdx, 'the tombstone must be written before the row it describes is erased');
  });

  test('calls the bulk parent-connection revoke RPC, not a per-connection loop', () => {
    assert.match(src, /rpc\(\s*["']revoke_all_parent_connections_for_deletion["']/);
  });

  test('audit_entries.student_id is ON DELETE SET NULL (016) — the tombstone survives the cascade', () => {
    const sql016 = read(SQL_016);
    assert.match(sql016, /student_id\s+UUID\s+REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  });
});
