// M5 — identity, profile, onboarding.
//
// Two kinds of assertion live here, and the difference matters:
//
//   1. BEHAVIOURAL, against the real compiled `lib/student-profile.ts`. The
//      precedence rule — Postgres outranks localStorage — is a pure function of
//      two records, so "localStorage no longer outranks Postgres" (M5-2's
//      done-when) is PROVABLE with no Supabase project in reach, in both
//      directions: the server value wins where it exists, and the cache still
//      fills a gap where it does not.
//
//   2. STRUCTURAL, over source and SQL, for the claims that are about the
//      shape of the tree rather than the value of an expression: that the
//      whole-row read-modify-write is gone, that the server context never
//      writes, that onboarding is ten pages of one question each, that signup
//      leads into it, and that the landing page has a way back in. Same
//      convention as tests/auth-middleware.test.mjs and
//      tests/home-shell.test.mjs.
//
//   node --test tests/student-context.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-student');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

let P;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.student.json'],
    { cwd: root, stdio: 'inherit' },
  );
});

before(async () => {
  P = await import(pathToFileURL(path.join(outDir, 'student-profile.js')).href);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE PRECEDENCE RULE — M5-2's done-when, both directions
// ═══════════════════════════════════════════════════════════════════════════
describe('resolveProfile — Postgres outranks localStorage', () => {
  test('a server value beats a conflicting cached value', () => {
    const { profile, sources } = P.resolveProfile(
      { board: 'IB (International Baccalaureate)' },
      { board: 'CBSE' },
    );
    assert.equal(profile.board, 'IB (International Baccalaureate)');
    assert.equal(sources.board, 'postgres');
  });

  test('every field is decided independently, not the whole record at once', () => {
    const { profile, sources } = P.resolveProfile(
      { board: 'CBSE', subjects: ['Physics'] },
      { board: 'ICSE', grade: 'Class 11', subjects: ['Chemistry'] },
    );
    assert.equal(profile.board, 'CBSE');
    assert.deepEqual(profile.subjects, ['Physics']);
    assert.equal(profile.grade, 'Class 11');
    assert.equal(sources.board, 'postgres');
    assert.equal(sources.subjects, 'postgres');
    assert.equal(sources.grade, 'local');
  });

  test('the cache still answers a question the record left blank', () => {
    const { profile, sources } = P.resolveProfile({ board: 'CBSE' }, { grade: 'Class 12' });
    assert.equal(profile.grade, 'Class 12');
    assert.equal(sources.grade, 'local');
  });

  test('an empty string on the server does not outrank a real cached value', () => {
    const { profile, sources } = P.resolveProfile({ board: '  ' }, { board: 'CBSE' });
    assert.equal(profile.board, 'CBSE');
    assert.equal(sources.board, 'local');
  });

  test('an empty array on the server does not outrank real cached subjects', () => {
    const { profile } = P.resolveProfile({ subjects: [] }, { subjects: ['Physics'] });
    assert.deepEqual(profile.subjects, ['Physics']);
  });

  test('a field neither side holds stays absent rather than becoming undefined-ish', () => {
    const { profile, sources } = P.resolveProfile({}, {});
    assert.equal('stream' in profile, false);
    assert.equal(sources.stream, 'absent');
  });

  test('null inputs on either side are legal and produce an empty profile', () => {
    const { profile } = P.resolveProfile(null, null);
    assert.deepEqual(profile, {});
  });

  test('THE OLD BEHAVIOUR IS GONE: spreading local over server would have lost this', () => {
    // `{ ...server, ...local }` returned the stale board. The rule must not.
    const server = { board: 'IGCSE / Cambridge', subjects: ['Physics', 'Maths'] };
    const stale = { board: 'CBSE', subjects: ['Biology'] };
    const { profile } = P.resolveProfile(server, stale);
    assert.notDeepEqual(profile, { ...server, ...stale });
    assert.deepEqual(profile, server);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · ONBOARDING COMPLETION IS DERIVED, NOT STORED
// ═══════════════════════════════════════════════════════════════════════════
describe('isOnboarded — the two ratified answers, and nothing else', () => {
  test('board and subjects together mean onboarded', () => {
    assert.equal(P.isOnboarded({ board: 'CBSE', subjects: ['Physics'] }), true);
  });

  test('board alone is not enough', () => {
    assert.equal(P.isOnboarded({ board: 'CBSE' }), false);
  });

  test('subjects alone are not enough', () => {
    assert.equal(P.isOnboarded({ subjects: ['Physics'] }), false);
  });

  test('an empty subject list is not a declaration', () => {
    assert.equal(P.isOnboarded({ board: 'CBSE', subjects: [] }), false);
  });

  test('no profile is not onboarded', () => {
    assert.equal(P.isOnboarded(null), false);
    assert.equal(P.isOnboarded(undefined), false);
  });

  test('grade, stream, target exam and style do not participate', () => {
    // PRODUCT_DECISIONS §3: "/onboard — Board and subjects. Nothing else."
    assert.equal(
      P.isOnboarded({ grade: 'Class 11', stream: 'Commerce', targetExam: 'CUET', aiProfile: { learningStyle: 'step-by-step' } }),
      false,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · ROW MAPPING, INCLUDING THE PRE-012 SHAPE
// ═══════════════════════════════════════════════════════════════════════════
describe('profileFromRow / profileFromLegacyRow', () => {
  test('a version-chain row maps to the product shape', () => {
    const p = P.profileFromRow({
      student_id: 'u', version: 3, board: 'CBSE', grade: null, stream: null,
      target_exam: null, subjects: ['Physics', 'Maths'], interests: null,
      ai_profile: null, effective_from: 'x', changed_by: 'student',
      change_reason: null, is_current: true,
    });
    assert.equal(p.board, 'CBSE');
    assert.deepEqual(p.subjects, ['Physics', 'Maths']);
    assert.equal('grade' in p, false);
  });

  test('the legacy flat row maps `interests` onto `subjects`', () => {
    // Migration 012 §6 makes the same mapping, for the same reason: the
    // retired onboarding asked "Which subjects interest you?" and stored the
    // answer under a column named for the question, not for the field.
    const p = P.profileFromLegacyRow({ board: 'ICSE', interests: ['Physics', 'Chemistry'] });
    assert.deepEqual(p.subjects, ['Physics', 'Chemistry']);
  });

  test('non-string junk in an array is dropped rather than carried', () => {
    const p = P.profileFromLegacyRow({ interests: ['Physics', 3, null, '', 'Maths'] });
    assert.deepEqual(p.subjects, ['Physics', 'Maths']);
  });

  test('a null row is null, never an empty profile pretending to be one', () => {
    assert.equal(P.profileFromRow(null), null);
    assert.equal(P.profileFromLegacyRow(null), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · M5-2 — THE WHOLE-ROW READ-MODIFY-WRITE IS GONE
// ═══════════════════════════════════════════════════════════════════════════
describe('lib/user-data.ts — no unguarded read-modify-write remains', () => {
  const src = code('lib/user-data.ts');

  test('patchUserData no longer loads the row before writing it', () => {
    const body = src.slice(src.indexOf('export async function patchUserData'));
    const fn = body.slice(0, body.indexOf('\n}') + 2);
    assert.equal(/loadUserData\s*\(/.test(fn), false, 'patchUserData must not read before it writes');
    assert.equal(/\.\.\.\s*\(?\s*existing/.test(fn), false, 'the whole-row spread must not return');
  });

  test('patchUserData writes exactly the one field it was given', () => {
    assert.match(src, /patchUserData[\s\S]{0,400}?saveUserData\(userId,\s*\{\s*\[key\]:\s*value\s*\}/);
  });

  test('fetchUserData no longer spreads localStorage over the server row', () => {
    assert.equal(
      /\{\s*\.\.\.\s*\(?\s*data[^}]*\)?\s*,\s*\.\.\.\s*localProfile\s*\}/.test(src),
      false,
      'the C.3 CURRENT FACT `{ ...data, ...localProfile }` must not exist',
    );
    assert.match(src, /resolveProfile\(/);
  });

  test('the profile write path goes through the versioning function', () => {
    assert.match(src, /supabase\.rpc\(\s*["']set_student_profile["']/);
  });
});

describe('lib/student-context.ts — one server-side read, and only a read', () => {
  const src = code('lib/student-context.ts');

  test('it is built on the M4-1 cookie-scoped client, not on the service role', () => {
    assert.match(src, /createStudentServerClient/);
    assert.equal(/supabaseServer/.test(src), false, 'the service role sees every row and must not be used here');
  });

  test('identity comes from the validated session, never from an argument', () => {
    assert.match(src, /auth\.getUser\(\)/);
    assert.equal(
      /getStudentContext\s*=\s*cache\(async\s*\(\s*[A-Za-z]/.test(src),
      false,
      'getStudentContext must take no student id argument',
    );
  });

  test('it performs no write of any kind', () => {
    for (const verb of ['.upsert(', '.insert(', '.update(', '.delete(']) {
      assert.equal(src.includes(verb), false, `student-context must not call ${verb}`);
    }
  });

  test('an unauthenticated caller gets null, not an empty context', () => {
    assert.match(src, /if\s*\(userError\s*\|\|\s*!user\)\s*return null;/);
  });

  test('the legacy fallback names the condition that retires it', () => {
    assert.match(read('lib/student-context.ts'), /migration_ledger\(\)[\s\S]{0,80}012/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 · M5-1 — THE MIGRATION'S POSTURE
// ═══════════════════════════════════════════════════════════════════════════
describe('supabase/migrations/012 — students + versioned student_profiles', () => {
  const sql = read('supabase/migrations/012_students_and_profiles.sql');

  test('both tables exist and the profile is keyed by (student_id, version)', () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS students/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS student_profiles/);
    assert.match(sql, /PRIMARY KEY \(student_id, version\)/);
  });

  test('exactly one current version per student is an index, not a convention', () => {
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_one_current[\s\S]{0,120}WHERE is_current/);
  });

  test('RLS is on and the student may only SELECT', () => {
    assert.match(sql, /ALTER TABLE students\s+ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY/);
    const policies = sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
    assert.ok(policies.length >= 2);
    for (const p of policies) {
      assert.match(p, /FOR SELECT/, `every policy on the M5-1 tables must be SELECT-only: ${p.slice(0, 60)}`);
    }
  });

  test('the write function serialises concurrent writers on the identity row', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.set_student_profile/);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /COALESCE\(v_cur\.version, 0\) \+ 1/);
  });

  test('the writer is taken from auth.uid(), never from an argument', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.set_student_profile'));
    assert.match(fn, /v_uid\s+UUID\s*:=\s*auth\.uid\(\)/);
    assert.equal(/p_student_id/.test(fn), false);
  });

  test('history is never overwritten — the outgoing version is only retired', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.set_student_profile'));
    const updates = fn.match(/UPDATE student_profiles SET [^;]*/g) ?? [];
    assert.equal(updates.length, 1);
    assert.match(updates[0], /SET is_current = FALSE/);
  });

  test('the backfill is marked as derived, never as an act by the student', () => {
    assert.match(sql, /'backfill:012'/);
  });

  test('it is additive — the old columns are dropped only in the commented follow-up', () => {
    const live = sql
      .split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');
    assert.equal(/DROP COLUMN/.test(live), false, '012 must not drop a user_data column');
  });

  test('it registers itself in the M1-1 ledger with its own checksum', async () => {
    const { checksumOf } = await import(pathToFileURL(path.join(root, 'scripts', 'migration-ledger.mjs')).href);
    assert.ok(sql.includes(checksumOf(sql)), '012 must carry its own body checksum');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6 · M5-3 — ONE SCREEN, TWO QUESTIONS, REACHED FROM SIGNUP
// ═══════════════════════════════════════════════════════════════════════════
// Rewritten 2026-08-30 for §2.6 as amended (reversal at PRODUCT_DECISIONS
// §7.7): ten pages, one question each, progress visible, back always live.
// The previous cases asserted the two-question single screen and are replaced
// rather than deleted — the same claims are made about the new rule, so a
// regression back toward a wizard, or forward into a survey, still fails.
// ═══════════════════════════════════════════════════════════════════════════
describe('app/onboard/page.tsx — PRODUCT_DECISIONS §2.6', () => {
  const src = code('app/onboard/page.tsx');
  const script = code('lib/onboarding-questions.ts');

  test('the page renders the script and owns no question of its own', () => {
    // The flow is data. A question hard-coded into the component is a question
    // no test can count and no reviewer can find.
    assert.match(src, /ONBOARDING_PAGES/);
    assert.equal(/Which board do you follow\?/.test(src), false);
    assert.equal(/TOTAL_DATA_STEPS/.test(src), false);
  });

  test('ten pages, and page one is the only one with two questions', () => {
    const pages = script.match(/\{ id: "[a-z]+",\s+questions: \[/g) ?? [];
    assert.equal(pages.length, 10, '§2.6 states ten');
    assert.match(script, /\{ id: "you",\s+questions: \[Q\.board, Q\.subjects\] \}/);
  });

  test('every dimension question maps to the bounded list, and all nine are asked', () => {
    const model = code('lib/personal-model.ts');
    const bounded = (model.match(/^\s{2}"([a-z_]+)",$/gm) ?? [])
      .map((l) => l.trim().replace(/[",]/g, ''));
    assert.ok(bounded.length >= 9, 'sanity: the bounded list parsed');
    for (const dimension of bounded) {
      assert.ok(
        script.includes(`dimension: "${dimension}"`),
        `${dimension} is a personal-model dimension that onboarding never asks about`,
      );
    }
  });

  test('progress is reported and back is always available', () => {
    // §2.6: "a question a student cannot un-answer is an interrogation."
    assert.match(src, /role="progressbar"/);
    assert.match(src, /\{index \+ 1\} of \{PAGE_COUNT\}/);
    assert.match(src, /disabled=\{index === 0\}/);
  });

  test('the progress track claims position, never achievement', () => {
    // PRINCIPLES §4.3 — nothing in onboarding may read as unlocking or
    // awarding. A track that fills is a readout; a checklist is a reward.
    for (const banned of ['complete!', 'Well done', 'unlocked', 'Congratulations', 'badge']) {
      assert.equal(src.toLowerCase().includes(banned.toLowerCase()), false, `${banned} is gamification`);
    }
  });

  test('only board and subjects gate completion; the nine are skippable', () => {
    assert.match(script, /export function isComplete/);
    // isComplete names identity and nothing else.
    const body = script.slice(script.indexOf('export function isComplete'));
    assert.match(body.slice(0, 400), /answers\.board/);
    assert.match(body.slice(0, 400), /answers\.subjects/);
    assert.equal(/explanation_style|session_length/.test(body.slice(0, 400)), false,
      'a preference must never block a student from finishing');
    // and the control reflects it
    assert.match(src, /disabled=\{identityPage && !pageAnswered\}/);
  });

  test('answers persist as they are given, so abandoning costs nothing', () => {
    assert.match(src, /persistDraft/);
    assert.match(src, /localStorage\.setItem\(DRAFT_KEY/);
  });

  test('preferences are written as EXPLICIT, never as inferred', () => {
    // I.6 — an explicit answer outranks an inferred one. Writing these as
    // inferred would make the student's own statement a guess.
    assert.match(src, /explicit_value: w\.value/);
    assert.equal(/inferred_value|confidence:/.test(src), false,
      'the client may not write the inferred side; 031 does not grant it');
  });

  test('it saves through the versioning write path, not a whole-row upsert', () => {
    assert.match(src, /saveStudentProfile\(/);
    assert.equal(/saveUserData\(/.test(src), false);
  });

  test('finishing goes to the walkthrough, never a done screen', () => {
    assert.match(src, /router\.replace\("\/today\?first=1"\)/);
    assert.equal(/Your Ledger is ready|Open my dashboard/.test(src), false);
  });

  test('an unauthenticated visitor is sent to /auth before anything renders', () => {
    assert.match(src, /if \(!user\) \{ router\.push\("\/auth"\); return; \}/);
  });
});

describe('app/auth/page.tsx — signup leads into onboarding', () => {
  const src = code('app/auth/page.tsx');

  test('a signup that returns a session goes to /onboard', () => {
    assert.match(src, /signUp\([\s\S]{0,300}?data\.session[\s\S]{0,80}?router\.replace\("\/onboard"\)/);
  });

  test('the confirmation screen survives for projects that require it', () => {
    assert.match(src, /setDone\(true\)/);
    assert.match(read('app/auth/page.tsx'), /confirmation link/);
  });

  test('sign-in routes an undeclared student to /onboard rather than /home', () => {
    assert.match(src, /landingRouteFor/);
    assert.match(src, /return "\/onboard";/);
  });

  test('the Google path is untouched', () => {
    assert.match(src, /accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    assert.match(src, /google_oauth_state/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7 · M5-4 — A RETURNING USER CAN GET BACK IN
// ═══════════════════════════════════════════════════════════════════════════
describe('app/page.tsx — a sign-in path exists from /', () => {
  const src = code('app/page.tsx');

  test('the landing page links to /auth', () => {
    assert.match(src, /href="\/auth"/);
  });

  test('the sign-in link is above the fold, in the hero, not only in the colophon', () => {
    const hero = src.slice(0, src.indexOf('data-spine-index="1"'));
    assert.match(hero, /href="\/auth"/);
  });

  test('nothing else on the landing page changed', () => {
    // The narrative is eight sections and two "Start your record" CTAs. M5-4
    // is an S — a link, not a redesign.
    assert.equal((src.match(/data-spine-index="\d"/g) ?? []).length, 8);
    assert.equal((src.match(/Start your record/g) ?? []).length, 2);
    assert.match(src, /Your mistakes are your syllabus\./);
    // M16-2 merged the four `/legal/*` routes into one `/legal?section=`
    // page (`PRODUCT_DECISIONS` §2.4); the colophon link now points at the
    // Terms section of that page rather than the retired `/legal/terms`.
    assert.match(src, /href="\/legal\?section=terms"/);
  });

  test('no new stylesheet rule was needed to add it', () => {
    // The link reuses `.colophon`, which already carries the face, the tone,
    // hover and :focus-visible (§6.6).
    assert.match(src, /className="colophon"/);
  });
});
