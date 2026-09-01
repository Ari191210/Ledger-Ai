// M13-1 / M13-2 — `/diagnosis` EXISTS, EVERY FIGURE ON IT REACHES A RECORD,
// AND THE SEVEN TOOLS IT ABSORBS REDIRECT INTO IT.
//
// Two instruments in one file, the same pairing `tests/capture-shell.test.mjs`
// and `tests/capture-pipeline.test.mjs` use between them:
//
//   · STRUCTURAL fences over source and config, because "the route exists",
//     "the seven redirect", "the shell is reused rather than reinvented" and
//     "no deletion affordance exists" are claims about the shape of the tree,
//     and this repository has no React test renderer.
//
//   · BEHAVIOURAL proof over the real, compiled `lib/diagnosis.ts`, because
//     M13-1's done-when — *"every claim on the surface reaches a record"* — is
//     a claim about arithmetic, and the only honest way to assert it is to sum
//     the rows a tally names and compare them to the tally.
//
//   node --test tests/diagnosis.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-diagnosis');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

/** Comments explain; only real code counts. Same convention as
 *  tests/capture-shell.test.mjs and tests/home-shell.test.mjs. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let D; // lib/diagnosis

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.diagnosis.json'],
    { cwd: root },
  );
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
      ));
    }
  };
  walk(outDir);
});

test('setup imports', async () => {
  D = await import(pathToFileURL(path.join(outDir, 'diagnosis.js')).href);
  assert.equal(typeof D.buildDiagnosis, 'function');
  assert.equal(typeof D.loadDiagnosis, 'function');
});

// ══ FIXTURES — rows shaped exactly as `020`'s view and `007` return them ═════

const STUDENT = '11111111-1111-4111-8111-111111111111';
const EV_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const EV_B = 'aaaaaaaa-0000-4000-8000-000000000002';
const LEAF_SIGN = 'bbbbbbbb-0000-4000-8000-000000000001';
const LEAF_MISCONCEPTION = 'bbbbbbbb-0000-4000-8000-000000000002';
const LEAF_MISREAD = 'bbbbbbbb-0000-4000-8000-000000000003';
const SUBJ_EXEC = 'cccccccc-0000-4000-8000-000000000001';
const GLOBAL_EXEC = 'dddddddd-0000-4000-8000-000000000001';
const CONCEPT_TORQUE = 'eeeeeeee-0000-4000-8000-000000000001';
const CONCEPT_CHAIN = 'eeeeeeee-0000-4000-8000-000000000002';

let n = 0;
const occ = (over = {}) => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  student_id: STUDENT,
  evidence_id: EV_A,
  concept_id: CONCEPT_TORQUE,
  pattern_id: LEAF_SIGN,
  subject: 'Physics',
  chapter: 'Rotational Motion',
  topic: 'Torque',
  question_ref: 'Q7(b)',
  source: 'school-exam',
  marks_lost: 3,
  marks_available: 5,
  cognitive_error: null,
  execution_error: 'sign-error',
  confidence_before: null,
  created_at: '2026-03-01T00:00:00.000Z',
  confirmed_at: '2026-03-02T00:00:00.000Z',
  ...over,
});

const leaf = (over = {}) => ({
  id: LEAF_SIGN,
  student_id: STUDENT,
  tier: 'concept',
  concept_id: CONCEPT_TORQUE,
  parent_pattern_id: SUBJ_EXEC,
  subject: 'Physics',
  error_class: 'execution',
  error_type: 'sign-error',
  label: 'Sign error: Torque',
  status: 'open',
  severity: 61,
  severity_version: 'severity-factors@1',
  ...over,
});

const parents = () => ([
  {
    id: SUBJ_EXEC, student_id: STUDENT, tier: 'subject', concept_id: null,
    parent_pattern_id: GLOBAL_EXEC, subject: 'Physics',
    error_class: 'execution', error_type: 'sign-error',
    label: 'Sign error in Physics', status: 'open', severity: null, severity_version: null,
  },
  {
    id: GLOBAL_EXEC, student_id: STUDENT, tier: 'global', concept_id: null,
    parent_pattern_id: null, subject: null,
    error_class: 'execution', error_type: 'sign-error',
    label: 'Sign error', status: 'open', severity: null, severity_version: null,
  },
]);

// ══ M13-1 — THE ROUTE ═══════════════════════════════════════════════════════

describe('M13-1: /diagnosis renders', () => {
  test('the route exists, with its own shell layout', () => {
    assert.ok(exists('app/diagnosis/page.tsx'), '/diagnosis has no page');
    assert.ok(exists('app/diagnosis/layout.tsx'), '/diagnosis has no layout');
  });

  test('the layout reuses /home`s shell rather than inventing an eighth one', () => {
    const src = read('app/diagnosis/layout.tsx');
    assert.match(src, /VitalityShell/, '/diagnosis does not mount the console token host');
    assert.match(src, /AuthGuard/, '/diagnosis is not behind the auth guard');
    assert.match(src, /console\/console\.css/, '/diagnosis does not import the console stylesheet');
    assert.match(src, /robots:\s*\{\s*index:\s*false/, '/diagnosis is indexable');
  });

  test('the page is built from the console primitives, not new components', () => {
    const src = code('app/diagnosis/page.tsx');
    assert.match(src, /@\/components\/console\/primitives/, 'the page does not use the shared primitives');
    assert.doesNotMatch(src, /\.css['"]/, 'the page introduces its own stylesheet');
  });

  test('the page holds no arithmetic constant that becomes a figure', () => {
    // Every number on the surface comes from `lib/diagnosis.ts`. The only
    // numeric literals left in the page are gap steps, font weights, string
    // slices and singular/plural comparisons against 0 and 1 — none of which
    // can become a figure a student reads as a fact.
    const src = code('app/diagnosis/page.tsx')
      .replace(/weight=\{\d+\}/g, '')      // the type ramp's 400/500/600
      .replace(/\.slice\(0,\s*\d+\)/g, ''); // the 8-character id handle
    const numbers = [...src.matchAll(/[^\w.](\d+(?:\.\d+)?)/g)].map(m => Number(m[1]));
    const suspicious = numbers.filter(v => v > 6);
    assert.deepEqual(
      suspicious, [],
      `a number the spacing ramp cannot explain appears in the page: ${suspicious.join(', ')}`,
    );
  });
});

// ══ M13-1 — EVERY CLAIM REACHES A RECORD ════════════════════════════════════

describe('M13-1: every figure is a sum of rows it can name', () => {
  test('a class tally equals the sum of the occurrences it names', () => {
    const rows = [
      occ({ marks_lost: 3 }),
      occ({ marks_lost: 4 }),
      occ({ marks_lost: 2, pattern_id: LEAF_MISCONCEPTION, concept_id: CONCEPT_CHAIN,
            execution_error: null, cognitive_error: 'misconception' }),
    ];
    const d = D.buildDiagnosis(rows, [leaf(), ...parents()]);
    const byId = new Map(rows.map(r => [r.id, r]));

    for (const c of d.marksLost.classes) {
      const summed = c.occurrenceIds.reduce((t, id) => {
        assert.ok(byId.has(id), `class tally names ${id}, which is not a row it was given`);
        return t + byId.get(id).marks_lost;
      }, 0);
      assert.equal(summed, c.marksLost, `${c.errorClass} claims ${c.marksLost} and its rows sum to ${summed}`);
      assert.equal(c.occurrenceIds.length, c.occurrenceCount);

      for (const t of c.types) {
        const s = t.occurrenceIds.reduce((n2, id) => n2 + byId.get(id).marks_lost, 0);
        assert.equal(s, t.marksLost, `${t.label} claims ${t.marksLost} and its rows sum to ${s}`);
      }
    }

    assert.equal(d.marksLost.marksLost, 9);
    assert.equal(d.occurrencesRead, 3);
  });

  test('the two error classes are separate totals, never merged (§4.5)', () => {
    const d = D.buildDiagnosis(
      [
        occ({ marks_lost: 6 }),
        occ({ marks_lost: 4, pattern_id: LEAF_MISCONCEPTION, concept_id: CONCEPT_CHAIN,
              execution_error: null, cognitive_error: 'misconception' }),
      ],
      [leaf(), ...parents()],
    );
    const found = Object.fromEntries(d.marksLost.classes.map(c => [c.errorClass, c.marksLost]));
    assert.equal(found.execution, 6);
    assert.equal(found.cognitive, 4);
  });

  test('an occurrence carrying BOTH errors is assigned to neither class (V.4.9)', () => {
    const d = D.buildDiagnosis(
      [occ({ marks_lost: 5, cognitive_error: 'misconception', execution_error: 'sign-error' })],
      [leaf(), ...parents()],
    );
    const classes = d.marksLost.classes.map(c => c.errorClass);
    assert.deepEqual(classes, ['ambiguous'], 'an ambiguous occurrence was silently assigned');
    assert.equal(d.marksLost.classes[0].marksLost, 5);
    assert.equal(D.errorTypeOf({ cognitiveError: 'misconception', executionError: 'sign-error' }), null);
  });

  test('an UNCONFIRMED row never becomes a mark lost', () => {
    const d = D.buildDiagnosis(
      [occ({ marks_lost: 3 }), occ({ marks_lost: 99, confirmed_at: null })],
      [leaf(), ...parents()],
    );
    assert.equal(d.marksLost.marksLost, 3, 'a proposal was counted as a fact');
    assert.equal(d.occurrencesRead, 1);
    assert.deepEqual(d.refused, [{ refusal: 'not-confirmed', count: 1 }]);
  });

  test('a row with no evidence is refused, not shown (PRINCIPLES §3.2)', () => {
    const d = D.buildDiagnosis([occ({ evidence_id: null, marks_lost: 40 })], []);
    assert.equal(d.occurrencesRead, 0);
    assert.equal(d.marksLost.marksLost, 0);
    assert.deepEqual(d.refused, [{ refusal: 'no-evidence', count: 1 }]);
  });

  test('a refusal is COUNTED, never silently dropped', () => {
    const d = D.buildDiagnosis(
      [occ({ id: null }), occ({ marks_lost: null }), occ({ cognitive_error: null, execution_error: null })],
      [],
    );
    const reasons = Object.fromEntries(d.refused.map(r => [r.refusal, r.count]));
    assert.equal(reasons['no-id'], 1);
    assert.equal(reasons['marks-unreadable'], 1);
    assert.equal(reasons['no-error-classification'], 1);
  });

  test('no evidence is an EMPTY diagnosis, not a diagnosis of zero', () => {
    const d = D.buildDiagnosis([], []);
    assert.equal(D.isEmpty(d), true);
    assert.equal(d.marksLost.classes.length, 0, 'empty classes were fabricated to fill the screen');
    assert.equal(d.recurrence.length, 0);
    assert.equal(d.calibration.bands.length, 0);
    assert.equal(d.evidenceCount, 0);
  });

  test('the evidence count is distinct papers, not occurrences', () => {
    const d = D.buildDiagnosis(
      [occ({ evidence_id: EV_A }), occ({ evidence_id: EV_A }), occ({ evidence_id: EV_B })],
      [leaf(), ...parents()],
    );
    assert.equal(d.evidenceCount, 2);
    assert.equal(d.occurrencesRead, 3);
  });
});

// ══ M13-1 — RECURRENCE, WITH AN EVIDENCE TRAIL ══════════════════════════════

describe('M13-1: recurrence carries an evidence trail', () => {
  test('every recurrence names its occurrences AND the evidence behind each', () => {
    const rows = [
      occ({ evidence_id: EV_A, created_at: '2026-01-05T00:00:00.000Z', marks_lost: 2 }),
      occ({ evidence_id: EV_B, created_at: '2026-03-05T00:00:00.000Z', marks_lost: 4 }),
    ];
    const d = D.buildDiagnosis(rows, [leaf(), ...parents()]);

    assert.equal(d.recurrence.length, 1);
    const g = d.recurrence[0];
    assert.equal(g.leaves.length, 1);
    const l = g.leaves[0];

    assert.equal(l.recurrenceCount, 2, 'recurrence must be counted from the trail it can list');
    assert.equal(l.trail.length, 2);
    assert.equal(l.marksLost, 6);
    assert.equal(l.firstSeenAt, '2026-01-05T00:00:00.000Z');
    assert.equal(l.lastSeenAt, '2026-03-05T00:00:00.000Z');
    for (const step of l.trail) {
      assert.ok(step.occurrenceId, 'a trail step with no occurrence');
      assert.ok(step.evidenceId, 'a trail step that reaches no evidence row');
    }
    assert.equal(l.trail.reduce((n2, s) => n2 + s.marksLost, 0), l.marksLost);
  });

  test('a pattern with no listed occurrence produces NO recurrence row', () => {
    // The leaf exists in `patterns`; nothing confirmed points at it.
    const d = D.buildDiagnosis([], [leaf(), ...parents()]);
    assert.equal(d.recurrence.length, 0, 'a pattern was claimed with no evidence to show');
  });

  test('recurrence is never read from patterns.recurrence_count', () => {
    // The stored counter counts unconfirmed occurrences too. If the surface
    // read it, this leaf would claim 9 while being able to show 1.
    const d = D.buildDiagnosis([occ()], [{ ...leaf(), recurrence_count: 9 }, ...parents()]);
    assert.equal(d.recurrence[0].leaves[0].recurrenceCount, 1);
  });

  test('an occurrence pointing at a PARENT attaches no evidence (§4.4.2)', () => {
    const d = D.buildDiagnosis([occ({ pattern_id: SUBJ_EXEC })], [leaf(), ...parents()]);
    assert.equal(d.recurrence.length, 0, 'a parent was given an occurrence directly');
  });

  test('an unpatterned confirmed occurrence is shown as itself, never folded in', () => {
    const d = D.buildDiagnosis([occ({ pattern_id: null, marks_lost: 7 })], [leaf(), ...parents()]);
    assert.equal(d.recurrence.length, 0);
    assert.equal(d.unpatterned.occurrenceCount, 1);
    assert.equal(d.unpatterned.marksLost, 7);
    // It still counts as a mark lost — the fact happened.
    assert.equal(d.marksLost.marksLost, 7);
  });

  test('parent severity is the MAXIMUM of its leaves, never an average (§4.6.2/§4.6.4)', () => {
    const rows = [
      occ({ pattern_id: LEAF_SIGN, marks_lost: 2 }),
      occ({ pattern_id: LEAF_MISREAD, concept_id: CONCEPT_CHAIN, topic: 'Chain rule',
            execution_error: 'sign-error', marks_lost: 1 }),
    ];
    const patternRows = [
      leaf({ severity: 80 }),
      leaf({ id: LEAF_MISREAD, concept_id: CONCEPT_CHAIN, severity: 20, label: 'Sign error: Chain rule' }),
      ...parents(),
    ];
    const d = D.buildDiagnosis(rows, patternRows);
    assert.equal(d.recurrence.length, 1, 'the two leaves did not roll up to their shared parent');
    assert.equal(d.recurrence[0].severity, 80, 'parent severity is not MAX of its leaves');
    assert.notEqual(d.recurrence[0].severity, 50, 'parent severity was averaged, which dilutes');
    // §4.6.4 — breadth is stated in words, not folded into the number.
    assert.equal(d.recurrence[0].topicCount, 2);
    assert.equal(d.recurrence[0].marksLost, 3);
  });

  test('leaves inside a group are ordered by severity, worst first (§4.4.5)', () => {
    const rows = [
      occ({ pattern_id: LEAF_SIGN }),
      occ({ pattern_id: LEAF_MISREAD, concept_id: CONCEPT_CHAIN }),
    ];
    const d = D.buildDiagnosis(rows, [
      leaf({ severity: 10 }),
      leaf({ id: LEAF_MISREAD, concept_id: CONCEPT_CHAIN, severity: 90, label: 'Sign error: Chain rule' }),
      ...parents(),
    ]);
    assert.deepEqual(d.recurrence[0].leaves.map(l => l.severity), [90, 10]);
  });

  test('the ordering is deterministic — the same rows produce the same order twice', () => {
    const rows = [occ(), occ({ pattern_id: LEAF_MISCONCEPTION, concept_id: CONCEPT_CHAIN,
                               execution_error: null, cognitive_error: 'misconception' })];
    const patternRows = [
      leaf(),
      leaf({ id: LEAF_MISCONCEPTION, concept_id: CONCEPT_CHAIN, error_class: 'cognitive',
             error_type: 'misconception', severity: 40, label: 'Misconception: Chain rule',
             parent_pattern_id: null }),
      ...parents(),
    ];
    const a = D.buildDiagnosis(rows, patternRows);
    const b = D.buildDiagnosis(rows, patternRows);
    assert.deepEqual(a.recurrence.map(g => g.label), b.recurrence.map(g => g.label));
    assert.deepEqual(a.marksLost.classes.map(c => c.errorClass), b.marksLost.classes.map(c => c.errorClass));
  });
});

// ══ M13-1 — CALIBRATION, FROM THE RECORD ════════════════════════════════════

describe('M13-1: calibration reads confidence_before, and never assumes it', () => {
  test('unrated occurrences are excluded and STATED, not defaulted to a value', () => {
    const d = D.buildDiagnosis(
      [
        occ({ confidence_before: 3, marks_lost: 4 }),
        occ({ confidence_before: 3, marks_lost: 2 }),
        occ({ confidence_before: null, marks_lost: 9 }),
      ],
      [leaf(), ...parents()],
    );
    assert.equal(d.calibration.rated, 2);
    assert.equal(d.calibration.unrated, 1);
    assert.equal(d.calibration.bands.length, 1);
    assert.equal(d.calibration.bands[0].confidence, 3);
    assert.equal(d.calibration.bands[0].marksLost, 6, 'an unrated occurrence leaked into a band');
    assert.equal(d.calibration.bands[0].occurrenceIds.length, 2);
  });

  test('no rated occurrence means NO calibration figure at all (V.6.1)', () => {
    const d = D.buildDiagnosis([occ({ confidence_before: null })], [leaf(), ...parents()]);
    assert.equal(d.calibration.rated, 0);
    assert.deepEqual(d.calibration.bands, [], 'a calibration was invented from no ratings');
  });

  test('a confidence outside 0–3 is not a band', () => {
    const d = D.buildDiagnosis([occ({ confidence_before: 7 })], [leaf(), ...parents()]);
    assert.equal(d.calibration.rated, 0);
    assert.equal(d.calibration.unrated, 1);
  });
});

// ══ M13-2 — THE SEVEN REDIRECT, AND NOTHING ELSE MOVED ══════════════════════

const SEVEN = {
  '/tools/post-exam': '/diagnosis',
  '/tools/paper-autopsy': '/diagnosis',
  '/tools/marks-obituary': '/diagnosis',
  '/tools/paper-pattern': '/diagnosis',
  '/tools/paper-trauma': '/diagnosis?view=recurrence',
  '/tools/marks-forensics': '/diagnosis?view=recurrence',
  '/tools/calibration': '/diagnosis?view=calibration',
};

describe('M13-2: the seven tools absorbed by /diagnosis', () => {
  test('all seven redirect, permanently, to /diagnosis', () => {
    const cfg = read('next.config.mjs');
    for (const [source, destination] of Object.entries(SEVEN)) {
      const re = new RegExp(
        `source:\\s*"${source.replace(/\//g, '\\/')}"\\s*,\\s*destination:\\s*"${destination.replace(/[/?=]/g, m => '\\' + m)}"\\s*,\\s*permanent:\\s*true`,
      );
      assert.match(cfg, re, `${source} does not permanently redirect to ${destination}`);
    }
  });

  test('the redirects are exact-path — no wildcard swallows a route M13 does not merge', () => {
    const cfg = read('next.config.mjs');
    assert.doesNotMatch(cfg, /source:\s*"\/tools\/:/, 'a wildcard redirect was added under /tools');
    assert.doesNotMatch(cfg, /destination:\s*"\/diagnosis[^"]*"\s*,\s*permanent:\s*false/, 'a temporary diagnosis redirect exists');
  });

  test('the routes /diagnosis does NOT absorb still resolve (§2.5, unlinked not deleted)', () => {
    // `grade-tracker` was on this list until M13-3. It is NOT an eighth tool
    // absorbed by `/diagnosis`; it is the ONE tool §2.4 sends to `/record`
    // ("`grade-tracker`, `/console/analytics` — the longitudinal asset"), and
    // `tests/record.test.mjs` owns that redirect's fence. The claim this test
    // makes — /diagnosis merges SEVEN and not eight — is unchanged, which is
    // why the list below still holds every other tool that keeps resolving.
    const cfg = read('next.config.mjs');
    for (const kept of ['exam-triage', 'panic-triage', 'recall-studio', 'learn-lab']) {
      assert.doesNotMatch(
        cfg, new RegExp(`source:\\s*"\\/tools\\/${kept}"`),
        `${kept} was redirected by M13, which merges seven tools into /diagnosis and not eight`,
      );
      assert.ok(exists(`app/tools/${kept}/page.tsx`), `${kept} lost its page`);
    }
    // `grade-tracker` moves to `/record`, and its page file survives the move.
    assert.ok(exists('app/tools/grade-tracker/page.tsx'), 'grade-tracker lost its page');
    assert.doesNotMatch(
      cfg, /source:\s*"\/tools\/grade-tracker"\s*,\s*destination:\s*"\/diagnosis/,
      'grade-tracker was sent to /diagnosis; §2.4 sends it to /record',
    );
  });

  test('none of the seven page files was gutted — M8`s precedent, not M3`s stub', () => {
    // The routes stop being reachable; the code stays in the tree so the three
    // genuinely distinct halves (marks-forensics` mark-scheme grading,
    // calibration`s question generation, post-exam`s debrief) can be rebuilt
    // onto the record by the milestones that own them.
    for (const slug of Object.keys(SEVEN)) {
      const rel = `app${slug}/page.tsx`;
      assert.ok(exists(rel), `${rel} was deleted; §2.3 keeps the repository whole`);
      assert.ok(read(rel).length > 500, `${rel} was reduced to a stub`);
    }
  });

  test('what did not survive the merge is STATED in the config, not glossed', () => {
    const cfg = read('next.config.mjs');
    assert.match(cfg, /WHAT THE STUDENT LOSES TODAY/, 'the merge does not account for what it dropped');
    assert.match(cfg, /paper-pattern/, 'paper-pattern`s fabricated forecast is not accounted for');
  });
});

// ══ M13-2 — post-exam REACHES LEVEL 3, WITH DELETION REMOVED (P.4) ══════════

describe('M13-2: no deletion affordance exists anywhere on the new surface', () => {
  const SURFACE = ['app/diagnosis/page.tsx', 'app/diagnosis/layout.tsx',
                   'app/api/diagnosis/route.ts', 'lib/diagnosis.ts'];

  test('no destructive verb appears in the surface, its API or its data layer', () => {
    for (const rel of SURFACE) {
      const src = code(rel);
      assert.doesNotMatch(src, /\.delete\s*\(/, `${rel} calls a delete`);
      assert.doesNotMatch(src, /removeItem\s*\(/, `${rel} clears storage`);
      assert.doesNotMatch(src, /\bDELETE\b/, `${rel} names a DELETE`);
      assert.doesNotMatch(src, /clearAll|wipe|resetRecord|Clear all/i, `${rel} offers a clear-all`);
    }
  });

  test('the API route exports a read verb and nothing else', () => {
    const src = code('app/api/diagnosis/route.ts');
    assert.match(src, /export async function GET/, 'the diagnosis route has no read verb');
    for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.doesNotMatch(src, new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`),
        `the diagnosis route exports ${verb}; P.4 requires read-only`);
    }
  });

  test('the injected db interface has two reads and no write verb', () => {
    const src = code('lib/diagnosis.ts');
    const body = src.slice(src.indexOf('export interface DiagnosisDb'));
    const iface = body.slice(0, body.indexOf('}'));
    assert.match(iface, /listConfirmedOccurrences/);
    assert.match(iface, /listPatterns/);
    assert.doesNotMatch(iface, /insert|update|delete|upsert|write|remove|clear/i,
      'DiagnosisDb gained a write verb; the surface that replaced the only record-destroying tool must not be able to write');
  });

  test('the route reads the STUDENT`s client, so RLS is the enforcement', () => {
    const src = code('app/api/diagnosis/route.ts');
    assert.match(src, /createStudentServerClient/, 'the diagnosis route does not run as the student');
    assert.doesNotMatch(src, /supabaseServer/, 'the diagnosis route uses the service role, which bypasses RLS');
  });

  test('the record is read through 020`s view, never the raw table', () => {
    const src = code('lib/diagnosis.ts');
    assert.match(src, /confirmed_occurrences/, 'the record is not read through the confirmed view');
    const route = code('app/api/diagnosis/route.ts');
    assert.doesNotMatch(route, /from\(\s*["']occurrences["']\s*\)/, 'the route reads the raw occurrences table');
  });

  test('007 still declares no DELETE policy on occurrences or patterns', () => {
    // The second mechanism. Even if a route asked, `authenticated` cannot
    // destroy a row: there is no policy that would admit the statement.
    const sql = read('supabase/migrations/007_mistakes.sql');
    assert.doesNotMatch(sql, /FOR\s+DELETE/i, '007 gained a DELETE policy');
  });

  test('post-exam`s own "Clear all" is still gone (removed in M0)', () => {
    const src = read('app/tools/post-exam/page.tsx');
    assert.doesNotMatch(code('app/tools/post-exam/page.tsx'), /removeItem/,
      'post-exam regained the wipe that destroyed the record');
    assert.match(src, /Kept permanently/, 'post-exam lost the label that replaced the wipe');
  });
});

// ══ THE ACCESS LAYER ════════════════════════════════════════════════════════

describe('loadDiagnosis: two reads, and a failure is never an empty diagnosis', () => {
  test('it folds what the two verbs return', async () => {
    const db = {
      async listConfirmedOccurrences() { return { data: [occ({ marks_lost: 5 })], error: null }; },
      async listPatterns() { return { data: [leaf(), ...parents()], error: null }; },
    };
    const r = await D.loadDiagnosis(db, STUDENT);
    assert.equal(r.ok, true);
    assert.equal(r.diagnosis.marksLost.marksLost, 5);
    assert.equal(r.diagnosis.recurrence[0].leaves[0].trail.length, 1);
  });

  test('a read failure is reported, never rendered as "nothing wrong"', async () => {
    const db = {
      async listConfirmedOccurrences() { return { data: null, error: { message: 'connection refused' } }; },
      async listPatterns() { return { data: [], error: null }; },
    };
    const r = await D.loadDiagnosis(db, STUDENT);
    assert.equal(r.ok, false);
    assert.equal(r.error.message, 'connection refused');
  });

  test('a pattern read failure is reported too — a diagnosis with no recurrence would be a lie', async () => {
    const db = {
      async listConfirmedOccurrences() { return { data: [occ()], error: null }; },
      async listPatterns() { return { data: null, error: { message: 'timeout' } }; },
    };
    const r = await D.loadDiagnosis(db, STUDENT);
    assert.equal(r.ok, false);
  });
});
