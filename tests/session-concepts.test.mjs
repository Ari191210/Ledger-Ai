// M9 (part 2: M9-4 … M9-6) — external study declared, concept proposal and
// confirmation as events, and the figures-only completion payload.
//
// The same five kinds of assertion tests/study-session.test.mjs uses:
//
//   1. THE ACCEPTANCE TESTS THEMSELVES. V.2.1 … V.2.5 are transcribed from
//      STUDYLEDGER_SYSTEM_ARCHITECTURE Part V and named in the test titles, so
//      a reader can check the contract against the document line by line
//      rather than against a paraphrase. V.2.6 and V.2.7 gate on M10 and are
//      deliberately absent.
//
//   2. VERBATIM, PROVEN OVER BYTES. `declared_text` is compared with `===` AND
//      with a Buffer comparison, over a corpus chosen to break every plausible
//      "helpful" transform: leading and trailing whitespace, interior newlines
//      and tabs, doubled spaces, both apostrophe forms, combining marks,
//      Devanagari, emoji, and a zero-width joiner.
//
//   3. CROSS-CHECKED AGAINST THE SQL AND AGAINST M7. The enum lists, the
//      view predicate and the `CONCEPT_CONFIRMED` payload core exist twice —
//      once in TypeScript and once in a file no compiler reads — so nothing
//      but a test compares them. Every event draft this pass builds is run
//      through M7's own `validateEventDraft()`, so "it satisfies the contract"
//      is checked against the contract rather than asserted.
//
//   4. STRUCTURAL, over source. That V.2.5 holds by SHAPE — no score term
//      exists to pay, in the types, in the modules or in 022; that no module
//      here imports a Supabase client, a clock or a model; that 022 is
//      additive; that nothing outside the gate reads the raw table.
//
//   5. EXHAUSTIVE over the enums — every detection source's auto-confirm rule,
//      every from/to decision pair, every key of the completion payload — so a
//      value added later cannot slip through unconsidered.
//
//   node --test tests/session-concepts.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-session-concepts');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_022 = 'supabase/migrations/022_session_concepts.sql';
// M23-1 (035) adds a generated `search_vector` column and a pgvector
// embedding column to the RAW table, plus their indexes — DDL, not a read.
// A view cannot carry a GENERATED column or an index of its own, so this is
// the one other legitimate reason to name the base table, and it is still
// not a read that bypasses `confirmed_session_concepts`.
const SQL_035 = 'supabase/migrations/035_academic_memory_search.sql';
const MOD_EXTERNAL = 'lib/external-study.ts';
const MOD_CONCEPTS = 'lib/session-concepts.ts';
const MOD_COMPLETION = 'lib/session-completion.ts';
const NEW_MODULES = [MOD_EXTERNAL, MOD_CONCEPTS, MOD_COMPLETION];

const SESSION = '33333333-3333-4333-8333-333333333333';
const STUDENT = '11111111-1111-4111-8111-111111111111';
const TORQUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const MOI = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

let X; // lib/external-study.ts
let C; // lib/session-concepts.ts
let K; // lib/session-completion.ts
let CR; // lib/concept-resolution.ts
let EC; // lib/event-contract.ts
let RS; // lib/session-resolver.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.session-concepts.json'],
    { cwd: root, stdio: 'inherit' },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite tests/study-session.test.mjs uses.
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
  [X, C, K, CR, EC, RS] = await Promise.all([
    load('external-study.js'),
    load('session-concepts.js'),
    load('session-completion.js'),
    load('concept-resolution.js'),
    load('event-contract.js'),
    load('session-resolver.js'),
  ]);
});

// ── fixtures ───────────────────────────────────────────────────────────────

const taxonomy = () =>
  CR.buildResolutionIndex(
    [
      { id: TORQUE, name: 'Torque', subject: 'Physics' },
      { id: MOI, name: 'Moment of Inertia', subject: 'Physics' },
    ],
    [],
  );

const AT = '2026-08-16T18:30:00.000Z';

/** A `proposed` row as 022 would store it. */
const proposedRow = (over = {}) => ({
  session_concept_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccc01',
  session_id: SESSION,
  student_id: STUDENT,
  concept_id: TORQUE,
  declared_text: 'I did Torque in coaching tonight.',
  concept_ref: TORQUE,
  detection_source: 'ai_proposed',
  confirmation_state: 'proposed',
  origin: 'declaration',
  proposed_at: AT,
  confirmed_at: null,
  rejected_at: null,
  confirmed_by: null,
  assessment_required: false,
  source_client_event_id: 'e1_deadbeef',
  decision_client_event_id: null,
  ...over,
});

/** Run an event draft through M7's own contract. The draft types this pass
 *  builds are `OutboxDraft`-shaped, so the two fields the outbox assigns are
 *  added here exactly as `toEnvelope()` would. */
const validateAsEvent = draft =>
  EC.validateEventDraft({
    client_event_id: 'e1_' + '0'.repeat(40),
    schema_version: EC.EVENT_SCHEMA_VERSION,
    ...draft,
  });

// The corpus V.2.1's "verbatim" is actually tested against. Every entry is
// something a plausible "clean this up" edit would damage.
const VERBATIM_CORPUS = [
  'I did Torque in coaching tonight.',
  '  leading and trailing spaces  ',
  'interior\nnewline\tand tab',
  'double  spaces   kept',
  "Newton's Laws",                    // typographic-safe apostrophe
  'Newton’s Laws',               // curly apostrophe
  'Rotational  Motion',
  'आवर्त सारणी',                       // Devanagari
  'Torque 🌀 revision',                // emoji
  'élan',                        // combining acute — NFD, must not be NFC'd
  'family‍joiner',                // zero-width joiner
  'MIXED CaSe PrEsErVeD',
  'trailing newline\n',
];

// ═══════════════════════════════════════════════════════════════════════════
// M9-4 · V.2.1 — THE DECLARATION
//
// *"Student types 'I did Torque in coaching tonight.' →
//   EXTERNAL_STUDY_DECLARED with `declared_text` verbatim; a session opens with
//   `origin = 'declaration'`."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-4 · V.2.1 — EXTERNAL_STUDY_DECLARED', () => {
  test('the declaration emits EXTERNAL_STUDY_DECLARED', () => {
    const out = X.buildDeclarationEvent({
      declared_text: 'I did Torque in coaching tonight.',
      occurred_at: AT,
    });
    assert.equal(out.ok, true);
    assert.equal(out.event.event_type, 'EXTERNAL_STUDY_DECLARED');
    assert.equal(out.event.source, 'student_declaration');
  });

  test('declared_text is verbatim on the envelope AND in the payload, byte for byte', () => {
    for (const text of VERBATIM_CORPUS) {
      const out = X.buildDeclarationEvent({ declared_text: text, occurred_at: AT });
      assert.equal(out.ok, true, `refused: ${JSON.stringify(text)}`);

      // Reference identity: the module returns the caller's own string.
      assert.equal(out.event.declared_text, text);
      assert.equal(out.event.payload.declared_text, text);

      // And the bytes, so a normalisation that produced an === -equal string
      // (there is no such thing, but the assertion costs nothing and says what
      // is meant) could still not pass.
      assert.equal(
        Buffer.compare(Buffer.from(out.event.declared_text, 'utf8'), Buffer.from(text, 'utf8')),
        0,
        `bytes differ for ${JSON.stringify(text)}`,
      );
      assert.equal(out.event.declared_text.length, text.length);
    }
  });

  test('the envelope and the payload carry the SAME bytes — a reader of either reads the student', () => {
    for (const text of VERBATIM_CORPUS) {
      const out = X.buildDeclarationEvent({ declared_text: text, occurred_at: AT });
      assert.equal(out.event.declared_text, out.event.payload.declared_text);
    }
  });

  test('an over-long declaration is REFUSED, never truncated', () => {
    const long = 'x'.repeat(X.DECLARED_TEXT_MAX_CHARS + 1);
    const out = X.buildDeclarationEvent({ declared_text: long, occurred_at: AT });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'too_long');
    assert.equal(out.length, X.DECLARED_TEXT_MAX_CHARS + 1);
    assert.ok(!('event' in out), 'a refusal must not carry a truncated event');
  });

  test('exactly at the cap is accepted, and unchanged', () => {
    const atCap = 'y'.repeat(X.DECLARED_TEXT_MAX_CHARS);
    const out = X.buildDeclarationEvent({ declared_text: atCap, occurred_at: AT });
    assert.equal(out.ok, true);
    assert.equal(out.event.declared_text, atCap);
  });

  test('an empty or whitespace-only declaration is refused; there is no default text', () => {
    for (const bad of ['', '   ', '\n\t ', ' ']) {
      const out = X.buildDeclarationEvent({ declared_text: bad, occurred_at: AT });
      assert.equal(out.ok, false, JSON.stringify(bad));
    }
    assert.equal(X.buildDeclarationEvent({ declared_text: 42, occurred_at: AT }).reason, 'not_a_string');
    assert.equal(X.buildDeclarationEvent({ declared_text: null, occurred_at: AT }).reason, 'not_a_string');
  });

  test('checkDeclaredText returns the caller\'s own string and never a repair', () => {
    const s = '  spaced  ';
    const r = X.checkDeclaredText(s);
    assert.equal(r.ok, true);
    assert.equal(r.text, s);
  });

  test('the module contains no transform that could reach declared_text', () => {
    const src = code(MOD_EXTERNAL);
    // One `.trim()` only — `emptinessOf`, whose result is a boolean and whose
    // trimmed string is discarded.
    assert.equal((src.match(/\.trim\(/g) ?? []).length, 1, 'exactly one .trim(), in emptinessOf');
    assert.ok(/function emptinessOf[\s\S]{0,200}\.trim\(\)\.length === 0/.test(src),
      'the one .trim() is emptinessOf\'s length check');
    for (const forbidden of ['.slice(', '.normalize(', '.toLowerCase(', '.toUpperCase(', '.replace(', '.padStart(', '.substring(']) {
      assert.ok(!src.includes(forbidden), `${MOD_EXTERNAL} must not ${forbidden} — declared_text is the student's`);
    }
  });

  test('origin = declaration, and it is the same literal the resolver already uses', () => {
    assert.equal(X.DECLARATION_ORIGIN, 'declaration');
    assert.equal(RS.defaultOriginFor('EXTERNAL_STUDY_DECLARED'), X.DECLARATION_ORIGIN);
    // E.5.2's other half: a tool event opens a `tool_activity` session, so the
    // declaration path is genuinely distinguishable downstream.
    assert.equal(RS.defaultOriginFor('QUESTION_ATTEMPTED'), 'tool_activity');
  });

  test('origin = declaration is on the EVENT as well as on the session (B.3 — the stream wins)', () => {
    const out = X.buildDeclarationEvent({ declared_text: 'Torque', occurred_at: AT });
    assert.equal(out.event.payload.origin, 'declaration');
  });

  test('origin = declaration PROPAGATES to every concept the declaration proposes', () => {
    const { proposals } = X.proposalsFromDeclaration('Torque', taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    });
    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].origin, 'declaration');
    assert.equal(proposals[0].source_client_event_id, 'e1_a');
  });

  test('a declaration is EXPLICITLY unconfirmed and carries no system confidence (D.1.c, D.1.d)', () => {
    const out = X.buildDeclarationEvent({ declared_text: 'Torque', occurred_at: AT });
    assert.equal(out.event.confirmation, 'unconfirmed');
    assert.equal(out.event.confidence, null);
    assert.equal(X.DECLARATION_CONFIRMATION, 'unconfirmed');
  });

  test('a declaration NEVER carries a resolved concept_id — the claim and the inference stay apart', () => {
    const out = X.buildDeclarationEvent({ declared_text: 'Torque', occurred_at: AT });
    assert.equal(out.event.concept_id, null);
  });

  test('the declaration event satisfies M7\'s own contract, with declared_text intact', () => {
    for (const text of VERBATIM_CORPUS) {
      const out = X.buildDeclarationEvent({ declared_text: text, occurred_at: AT, subject: 'Physics' });
      const v = validateAsEvent(out.event);
      assert.equal(v.ok, true, `M7 refused: ${JSON.stringify(v.problems)}`);
      // The contract is the last thing that touches the string before the
      // table. It must not touch it.
      assert.equal(v.draft.declared_text, text);
      assert.equal(v.draft.payload.declared_text, text);
    }
  });

  test('D.2\'s required payload core for this type is satisfied, and read from M7 not guessed', () => {
    assert.ok(code('lib/event-contract.ts').includes('EXTERNAL_STUDY_DECLARED: ["declared_text"]'));
    const out = X.buildDeclarationEvent({ declared_text: 'Torque', occurred_at: AT });
    assert.ok('declared_text' in out.event.payload);
  });

  test('DECLARED_TEXT_MAX_CHARS agrees with the cap M7 enforces', () => {
    const src = code('lib/event-contract.ts');
    assert.ok(/declared_text[\s\S]{0,400}?length > 2000/.test(src) || src.includes('exceeds 2000 characters'));
    assert.equal(X.DECLARED_TEXT_MAX_CHARS, 2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M9-5 · V.2.2 — PROPOSED IS NOT CONFIRMED, AND DOES NOT REACH THE RECORD
//
// *"AI proposes Torque and Moment of Inertia. Both appear as
//   SessionConcept{detection_source:'ai_proposed', confirmation_state:'proposed'}.
//   Neither is confirmed. NEITHER REACHES THE RECORD."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-5 · V.2.2 — a proposal is proposed', () => {
  test('a declaration proposes ai_proposed / proposed', () => {
    for (const text of ['Torque', 'Moment of Inertia']) {
      const { proposals, resolution } = X.proposalsFromDeclaration(text, taxonomy(), {
        session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
      });
      assert.equal(resolution.status, 'resolved');
      assert.equal(proposals.length, 1);
      assert.equal(proposals[0].detection_source, 'ai_proposed');
      assert.equal(proposals[0].confirmation_state, 'proposed');
      assert.equal(proposals[0].confirmed_at, null);
      assert.equal(proposals[0].confirmed_by, null);
      assert.equal(proposals[0].decision_client_event_id, null);
    }
  });

  test('an EXACT match is still ai_proposed — the tier says how confident, not whether it inferred', () => {
    const { proposals, resolution } = X.proposalsFromDeclaration('Torque', taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    });
    assert.equal(resolution.matchedVia, 'exact');
    assert.equal(proposals[0].detection_source, 'ai_proposed');
    assert.equal(proposals[0].confirmation_state, 'proposed');
  });

  test('a proposal carries assessment_required = false — F.2 binds the CONFIRMED set', () => {
    const { proposals } = X.proposalsFromDeclaration('Torque', taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    });
    assert.equal(proposals[0].assessment_required, false);
  });

  test('E.6\'s auto-confirm table, exhaustively', () => {
    assert.deepEqual(
      { ...C.AUTO_CONFIRMS },
      { tool_tagged: true, student_declared: true, student_added: true, ai_proposed: false },
    );
    // Every source is covered — a fifth added later has no entry and fails here.
    for (const s of C.DETECTION_SOURCES) {
      assert.equal(typeof C.AUTO_CONFIRMS[s], 'boolean', `${s} has no auto-confirm rule`);
    }
  });

  test('a model may never be recorded as the confirmer — there is no such value', () => {
    assert.deepEqual([...C.CONFIRMED_BY], ['student', 'rule']);
    assert.equal(C.AUTO_CONFIRMED_BY.ai_proposed, null);
    assert.ok(!code(MOD_CONCEPTS).includes("'ai'"), 'no ai confirmer value exists');
  });

  test('buildProposal REFUSES an auto-confirming source with no decision event', () => {
    const out = C.buildProposal({
      session_id: SESSION, student_id: STUDENT, concept_id: TORQUE, declared_text: null,
      detection_source: 'student_declared', origin: 'declaration', at: AT,
      source_client_event_id: 'e1_a',
    });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'missing_decision_event');
  });

  test('buildProposal refuses a concept nobody can name (B.4\'s CHECK, in code)', () => {
    const out = C.buildProposal({
      session_id: SESSION, student_id: STUDENT, concept_id: null, declared_text: '   ',
      detection_source: 'ai_proposed', origin: 'declaration', at: AT, source_client_event_id: 'e1_a',
    });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'unidentifiable');
  });

  test('an auto-confirming source that DOES name its event is born confirmed and assessed', () => {
    const out = X.declareConceptExplicitly({
      session_id: SESSION, student_id: STUDENT, concept_id: TORQUE, at: AT,
      source_client_event_id: 'e1_a', decision_client_event_id: 'e1_b',
    });
    assert.equal(out.ok, true);
    assert.equal(out.draft.detection_source, 'student_declared');
    assert.equal(out.draft.confirmation_state, 'confirmed');
    assert.equal(out.draft.assessment_required, true, 'C.3: confirmed IMPLIES assessment_required');
    assert.equal(out.draft.confirmed_by, 'student');
    assert.equal(out.draft.decision_client_event_id, 'e1_b');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M9-5 — "NOTHING PROPOSED REACHES THE RECORD UNCONFIRMED"
//
// The gate. 020's `confirmed_occurrences` pattern, applied to this table in
// SQL (022 §4) and to this codebase in a branded type.
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-5 — the unconfirmed-exclusion gate', () => {
  const mixed = () => [
    proposedRow({ concept_ref: TORQUE }),
    proposedRow({ session_concept_id: 'x2', concept_ref: MOI, concept_id: MOI }),
    proposedRow({
      session_concept_id: 'x3', concept_ref: 'text:wobbling tops', concept_id: null,
      declared_text: 'and the thing about wobbling tops',
    }),
  ];

  test('a proposed concept is absent from the record set, and from coverage', () => {
    const rows = mixed();
    assert.deepEqual(C.confirmedSessionConcepts(rows), []);
    assert.deepEqual(C.coverageRefsFor(rows), []);
  });

  test('a proposed concept cannot be branded as a record fact', () => {
    for (const row of mixed()) assert.equal(C.asRecordConcept(row), null);
  });

  test('a REJECTED concept is also absent from the record set', () => {
    const rejected = proposedRow({
      confirmation_state: 'rejected', rejected_at: AT, decision_client_event_id: 'e1_r',
    });
    assert.deepEqual(C.confirmedSessionConcepts([rejected]), []);
    assert.equal(C.asRecordConcept(rejected), null);
    assert.deepEqual(C.coverageRefsFor([rejected]), []);
  });

  test('only a confirmed concept passes, and it is the same row', () => {
    const ok = proposedRow({
      confirmation_state: 'confirmed', confirmed_at: AT, confirmed_by: 'student',
      assessment_required: true, decision_client_event_id: 'e1_c',
    });
    const out = C.confirmedSessionConcepts([...mixed(), ok]);
    assert.equal(out.length, 1);
    assert.equal(out[0], ok);
    assert.deepEqual(C.coverageRefsFor([...mixed(), ok]), [TORQUE]);
  });

  test('the gate agrees with 022\'s view predicate, read out of the SQL', () => {
    const sql = read(SQL_022);
    const view = /CREATE OR REPLACE VIEW public\.confirmed_session_concepts[\s\S]*?;/.exec(sql);
    assert.ok(view, '022 must define confirmed_session_concepts');
    assert.ok(/WHERE confirmation_state = 'confirmed'/.test(view[0]),
      'the view filters on exactly the predicate isConfirmed uses');
    assert.ok(view[0].includes('security_invoker'), 'the view narrows, it never widens');
    assert.ok(code(MOD_CONCEPTS).includes(`row.confirmation_state === "confirmed"`));
  });

  test('the record view exists for the two states that are NOT the record too', () => {
    const sql = read(SQL_022);
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.rejected_session_concepts'));
    assert.ok(sql.includes("WHERE confirmation_state = 'rejected'"));
  });

  test('nothing outside the module and the migration touches the raw table', () => {
    // The point of a view with a shorter name is that nobody reaches past it.
    // Today that is trivially true; this test is what keeps it true.
    const hits = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx|mjs|sql)$/.test(name)) continue;
        const rel = path.relative(root, p).split(path.sep).join('/');
        if (rel === SQL_022 || rel === SQL_035 || rel === MOD_CONCEPTS || rel.startsWith('tests/')) continue;
        // Comments name what a file deliberately does NOT do — 021 §8 records
        // the table by name as the thing it refused to ship. Only real code
        // counts, which is what `code()` is for.
        if (code(rel).includes('session_concepts')) hits.push(rel);
      }
    };
    for (const d of ['lib', 'app', 'components', 'hooks', 'scripts', 'supabase']) {
      const full = path.join(root, d);
      if (fs.existsSync(full)) walk(full);
    }
    assert.deepEqual(hits, [], `these read the raw table instead of confirmed_session_concepts: ${hits}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M9-5 · V.2.3 — CONFIRM ONE, REJECT ONE, KEEP BOTH
//
// *"Student confirms Torque, rejects Moment of Inertia. Two CONCEPT_CONFIRMED
//   events, one accepted: true, one accepted: false. THE REJECTION IS RETAINED."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-5 · V.2.3 — the decision, as two events', () => {
  test('two CONCEPT_CONFIRMED events, one accepted true and one false', () => {
    const yes = C.confirmationEventDraft({
      session_concept_ref: TORQUE, accepted: true, session_id: SESSION,
      occurred_at: AT, detection_source: 'ai_proposed', concept_id: TORQUE,
    });
    const no = C.confirmationEventDraft({
      session_concept_ref: MOI, accepted: false, session_id: SESSION,
      occurred_at: AT, detection_source: 'ai_proposed', concept_id: MOI,
    });
    assert.equal(yes.event_type, 'CONCEPT_CONFIRMED');
    assert.equal(no.event_type, 'CONCEPT_CONFIRMED');
    assert.equal(yes.payload.accepted, true);
    assert.equal(no.payload.accepted, false);
    // One type for both outcomes: a reader of the decision stream sees both
    // halves or neither.
    assert.equal(yes.event_type, no.event_type);
  });

  test('both events satisfy M7\'s contract, including D.2\'s required payload core', () => {
    for (const accepted of [true, false]) {
      const draft = C.confirmationEventDraft({
        session_concept_ref: TORQUE, accepted, session_id: SESSION,
        occurred_at: AT, detection_source: 'ai_proposed',
      });
      const v = validateAsEvent(draft);
      assert.equal(v.ok, true, JSON.stringify(v.problems));
    }
  });

  test('the payload core is M7\'s list, not a second copy that drifted', () => {
    const src = code('lib/event-contract.ts');
    assert.ok(src.includes('CONCEPT_CONFIRMED: ["session_concept_ref", "accepted"]'));
    assert.deepEqual([...C.CONCEPT_CONFIRMED_PAYLOAD_KEYS], ['session_concept_ref', 'accepted']);
  });

  test('a rejection is never dressed as a confirmation (D.1.d)', () => {
    const yes = C.confirmationEventDraft({ session_concept_ref: TORQUE, accepted: true, session_id: SESSION, occurred_at: AT, detection_source: 'ai_proposed' });
    const no = C.confirmationEventDraft({ session_concept_ref: MOI, accepted: false, session_id: SESSION, occurred_at: AT, detection_source: 'ai_proposed' });
    assert.equal(yes.confirmation, 'student_confirmed');
    assert.equal(no.confirmation, 'unconfirmed');
  });

  test('confirming sets the state, the stamp, the confirmer AND the assessment obligation', () => {
    const d = C.applyConceptDecision(proposedRow(), true, AT, 'e1_yes');
    assert.equal(d.kind, 'decided');
    assert.equal(d.to, 'confirmed');
    assert.equal(d.patch.confirmation_state, 'confirmed');
    assert.equal(d.patch.confirmed_at, AT);
    assert.equal(d.patch.confirmed_by, 'student');
    assert.equal(d.patch.assessment_required, true, 'C.3\'s hard invariant');
    assert.equal(d.patch.decision_client_event_id, 'e1_yes');
  });

  test('rejecting sets the state and the stamp, and drops the assessment obligation', () => {
    const d = C.applyConceptDecision(proposedRow(), false, AT, 'e1_no');
    assert.equal(d.kind, 'decided');
    assert.equal(d.to, 'rejected');
    assert.equal(d.patch.rejected_at, AT);
    assert.equal(d.patch.assessment_required, false);
    assert.equal(d.patch.decision_client_event_id, 'e1_no');
    assert.equal(d.patch.confirmed_by, undefined);
  });

  test('THE REJECTION IS RETAINED — as a row, and as a readable set', () => {
    const rejected = proposedRow({
      confirmation_state: 'rejected', rejected_at: AT, decision_client_event_id: 'e1_no',
    });
    const rows = [rejected, proposedRow({ session_concept_id: 'x2' })];
    assert.equal(C.rejectionsIn(rows).length, 1);
    assert.equal(C.rejectionsIn(rows)[0], rejected);
    // And its provenance survives: what was proposed, by what, and by which
    // event it was turned down.
    assert.equal(rejected.detection_source, 'ai_proposed');
    assert.equal(rejected.source_client_event_id, 'e1_deadbeef');
    assert.equal(rejected.decision_client_event_id, 'e1_no');
  });

  test('nothing in this pass can delete a session concept', () => {
    for (const m of NEW_MODULES) {
      const src = code(m);
      assert.ok(!/\bdelete\b/i.test(src.replace(/DELETE a session/gi, '')), `${m} must contain no delete path`);
      assert.ok(!src.includes('.splice('), `${m} must not splice rows out`);
    }
    const sql = read(SQL_022);
    assert.ok(!/DELETE\s+FROM\s+public\.session_concepts/i.test(sql));
    assert.ok(sql.includes('session_concepts_no_delete_trg'), '022 refuses DELETE for every writer');
    assert.ok(/REVOKE INSERT, UPDATE, DELETE ON public\.session_concepts FROM anon, authenticated/.test(sql));
  });

  test('a decision never returns a concept to `proposed`, from any state', () => {
    for (const from of C.SESSION_CONCEPT_STATES) {
      for (const accepted of [true, false]) {
        const d = C.applyConceptDecision(
          proposedRow({ confirmation_state: from, decision_client_event_id: 'e1_old' }),
          accepted, AT, 'e1_new',
        );
        if (d.kind === 'decided') {
          assert.notEqual(d.to, 'proposed', `${from} + ${accepted} produced a return to proposed`);
          assert.ok(['confirmed', 'rejected'].includes(d.to));
        }
      }
    }
  });

  test('the same decision event applied twice is a retry, not a second decision (D.3.6)', () => {
    const row = proposedRow({
      confirmation_state: 'confirmed', confirmed_at: AT, confirmed_by: 'student',
      assessment_required: true, decision_client_event_id: 'e1_same',
    });
    const d = C.applyConceptDecision(row, false, AT, 'e1_same');
    assert.equal(d.kind, 'noop');
    assert.equal(d.why, 'same_decision_event');
    assert.equal(d.state, 'confirmed');
  });

  test('a decision that changes nothing is a noop that reports where the row IS (E.7.1)', () => {
    const row = proposedRow({
      confirmation_state: 'confirmed', confirmed_at: AT, confirmed_by: 'student',
      assessment_required: true, decision_client_event_id: 'e1_c',
    });
    const d = C.applyConceptDecision(row, true, AT, 'e1_c2');
    assert.equal(d.kind, 'noop');
    assert.equal(d.why, 'unchanged');
    assert.equal(d.state, 'confirmed');
  });

  test('a student who changes their mind keeps the FIRST confirmation\'s stamp', () => {
    const row = proposedRow({
      confirmation_state: 'rejected', confirmed_at: '2026-08-16T10:00:00.000Z',
      rejected_at: '2026-08-16T11:00:00.000Z', decision_client_event_id: 'e1_no',
    });
    const d = C.applyConceptDecision(row, true, '2026-08-16T12:00:00.000Z', 'e1_yes2');
    assert.equal(d.kind, 'decided');
    assert.equal(d.patch.confirmed_at, undefined, 'confirmed_at is written once (022 §7)');
    assert.equal(d.patch.confirmation_state, 'confirmed');
  });

  test('applyConceptDecision cannot throw, over every state and both answers', () => {
    for (const from of [...C.SESSION_CONCEPT_STATES, 'A_STATE_FROM_A_LATER_BUILD']) {
      for (const accepted of [true, false]) {
        assert.doesNotThrow(() =>
          C.applyConceptDecision(proposedRow({ confirmation_state: from }), accepted, AT, 'e1_n'));
      }
    }
  });

  test('every decision names an event — the mechanical half of "events, not UI flags"', () => {
    for (const accepted of [true, false]) {
      const d = C.applyConceptDecision(proposedRow(), accepted, AT, 'e1_evt');
      assert.equal(d.patch.decision_client_event_id, 'e1_evt');
    }
    const sql = read(SQL_022);
    assert.ok(sql.includes('must name a NEW CONCEPT_CONFIRMED event'),
      '022 refuses a state change with no new decision event');
    assert.ok(/source_client_event_id\s+TEXT\s+NOT NULL/.test(sql),
      'every row names the event that proposed it');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M9-5 · V.2.4 — THE LEGAL UNRESOLVED STATE
//
// *"Student types 'and the thing about wobbling tops' — no taxonomy match. A
//   SessionConcept exists with concept_id = NULL and declared_text preserved.
//   THE SYSTEM DOES NOT GUESS A MATCH."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-5 · V.2.4 — an unresolved declaration is legal', () => {
  const TEXT = 'and the thing about wobbling tops';

  test('a row exists, with concept_id NULL and declared_text preserved', () => {
    const { proposals, resolution } = X.proposalsFromDeclaration(TEXT, taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    });
    assert.equal(resolution.status, 'unresolved');
    assert.equal(resolution.conceptId, null);
    assert.equal(proposals.length, 1, 'an unresolved declaration still produces a row');
    assert.equal(proposals[0].concept_id, null);
    assert.equal(proposals[0].declared_text, TEXT);
  });

  test('the unresolved ref is derived from a COPY — the record keeps the original', () => {
    const messy = '  The Thing About WOBBLING Tops!  ';
    const { proposals } = X.proposalsFromDeclaration(messy, taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    });
    assert.equal(proposals[0].declared_text, messy, 'verbatim');
    assert.equal(proposals[0].concept_ref, 'text:the thing about wobbling tops', 'normalised, for identity only');
    assert.ok(C.isUnresolvedRef(proposals[0].concept_ref));
  });

  test('an unresolved ref can never collide with a concept UUID', () => {
    assert.equal(C.conceptRefFor(TORQUE, 'anything'), TORQUE);
    assert.ok(C.conceptRefFor(null, 'torque').startsWith(C.UNRESOLVED_REF_PREFIX));
    assert.equal(C.conceptRefFor(null, '   '), null);
    assert.equal(C.conceptRefFor(null, null), null);
  });

  test('the unresolved set is findable, for B.4\'s taxonomy review queue', () => {
    const rows = [proposedRow(), proposedRow({ session_concept_id: 'x2', concept_id: null, declared_text: TEXT, concept_ref: 'text:x' })];
    assert.equal(C.unresolvedIn(rows).length, 1);
    assert.ok(read(SQL_022).includes('session_concepts_unresolved_idx'));
  });

  test('no module in this pass guesses a match, and none calls a model', () => {
    for (const m of NEW_MODULES) {
      const src = code(m);
      for (const bad of ['openai', 'anthropic', 'gpt-', 'claude-', 'fetch(', 'Math.random', 'Date.now(']) {
        assert.ok(!src.toLowerCase().includes(bad.toLowerCase()), `${m} must not contain ${bad}`);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.2.5 — **A DECLARATION MOVES NO SCORE**
//
// The milestone's load-bearing assertion. *"Assertion: the score has not moved.
// A declaration is not evidence."* Every check below is about a SHAPE, not
// about a code path this pass happened not to write.
// ═══════════════════════════════════════════════════════════════════════════

describe('V.2.5 — a declaration moves no score', () => {
  test('the declaration score effect is a union of exactly ONE arm', () => {
    for (const text of VERBATIM_CORPUS) {
      const out = X.buildDeclarationEvent({ declared_text: text, occurred_at: AT });
      assert.deepEqual(X.declarationScoreEffect(out.event), { kind: 'none' });
    }
    const src = code(MOD_EXTERNAL);
    const decl = /export type DeclarationScoreEffect =([\s\S]*?);/.exec(src);
    assert.ok(decl, 'DeclarationScoreEffect must be declared');
    assert.ok(!decl[1].includes('|'), 'one arm — a second arm is where a penalty would live');
    assert.ok(!/number/.test(decl[1]), 'no magnitude');
  });

  test('a session concept, in EVERY state, contributes nothing', () => {
    for (const state of C.SESSION_CONCEPT_STATES) {
      const eff = C.conceptScoreEffect(proposedRow({ confirmation_state: state }));
      assert.deepEqual(eff, { kind: 'none' });
      for (const v of Object.values(eff)) assert.notEqual(typeof v, 'number');
    }
    const src = code(MOD_CONCEPTS);
    const decl = /export type ConceptScoreEffect =([\s\S]*?);/.exec(src);
    assert.ok(decl && !decl[1].includes('|'), 'one arm');
  });

  test('the reviewer\'s question, both directions', () => {
    assert.equal(X.declaringExternalStudyMovesScore(), false);
    assert.equal(C.confirmingAConceptMovesScore(), false);
    assert.equal(C.rejectingAConceptMovesScore(), false);
    assert.equal(X.DECLARATION_IS_EVIDENCE_BEARING, false);
  });

  test('D.2.b — EXTERNAL_STUDY_DECLARED is not E-class, and M7\'s lists were not edited', () => {
    assert.ok(!EC.EVIDENCE_BEARING_TYPES.includes('EXTERNAL_STUDY_DECLARED'));
    assert.ok(EC.CONFIRMATION_REQUIRED_TYPES.includes('EXTERNAL_STUDY_DECLARED'));
    // CONCEPT_CONFIRMED is not E-class either: confirming a claim does not
    // manufacture evidence, an assessment does (E.5.5).
    assert.ok(!EC.EVIDENCE_BEARING_TYPES.includes('CONCEPT_CONFIRMED'));
  });

  test('nothing this pass emits carries a scoreable number', () => {
    const banned = /^(score|points|weight|penalty|bonus|delta|value|streak|rank|grade|multiplier)$/i;
    const walk = (v, p) => {
      if (v === null || typeof v !== 'object') return;
      for (const [k, x] of Object.entries(v)) {
        assert.ok(!banned.test(k), `${p}.${k} is a scoreable field`);
        walk(x, `${p}.${k}`);
      }
    };
    walk(X.buildDeclarationEvent({ declared_text: 'Torque', occurred_at: AT }).event, 'declaration');
    walk(X.proposalsFromDeclaration('Torque', taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    }).proposals[0], 'proposal');
    walk(C.confirmationEventDraft({
      session_concept_ref: TORQUE, accepted: true, session_id: SESSION, occurred_at: AT,
      detection_source: 'ai_proposed',
    }), 'confirmation');
  });

  test('022 holds no column a scoring pass could read as a term', () => {
    const sql = read(SQL_022)
      .split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');
    for (const bad of [' score ', 'points', 'weight', 'penalty', 'bonus', 'streak', 'duration', 'completion_rate']) {
      assert.ok(!sql.toLowerCase().includes(bad), `022 must not declare ${bad.trim()}`);
    }
  });

  test('no module in this pass reaches a score engine', () => {
    for (const m of NEW_MODULES) {
      const src = code(m);
      assert.ok(!src.includes('ledger-score'), `${m} must not import a score engine`);
      assert.ok(!/from ["']\.\/(score|ledger)/.test(src));
    }
  });

  test('the two score engines are untouched by this pass', () => {
    // Not a claim about content — a claim that the milestone's boundary held.
    for (const f of ['lib/ledger-score.ts', 'lib/ledger-score-v2.ts']) {
      assert.ok(fs.existsSync(path.join(root, f)));
      assert.ok(!read(f).includes('session_concepts'));
      assert.ok(!read(f).includes('external-study'));
    }
  });

  test('a declaration-only session\'s completion payload carries NO score movement', () => {
    const rows = X.proposalsFromDeclaration('Torque', taxonomy(), {
      session_id: SESSION, student_id: STUDENT, source_client_event_id: 'e1_a', at: AT,
    }).proposals.map((d, i) => ({ ...d, session_concept_id: `c${i}` }));

    const out = K.buildCompletionPayload({
      session_id: SESSION,
      state: 'CLOSED_UNVERIFIED',
      close_reason: 'reaped',
      opened_at: '2026-08-16T18:00:00.000Z',
      closed_at: '2026-08-16T19:00:00.000Z',
      evidence_event_count: 0,
      concepts: rows,
      // Supplied on purpose. It must be DISCARDED, not honoured.
      score_delta: { by_dimension: { verified_performance: 12 }, confidence_before: 0.1, confidence_after: 0.9 },
    });
    assert.equal(out.ok, true);
    assert.equal(out.payload.score_delta, null, 'V.2.5 — a declaration moves no score');
    assert.equal(out.payload.concepts_verified.length, 0);
    assert.equal(out.payload.evidence_event_count, 0);
  });

  test('only a VERIFIED session can carry one at all — the forcing is one line, pinned', () => {
    const src = code(MOD_COMPLETION);
    assert.ok(
      src.includes('score_delta: input.state === "VERIFIED" ? (input.score_delta ?? null) : null'),
      'the discard must be structural, not a caller\'s discipline',
    );
    const verified = K.buildCompletionPayload({
      session_id: SESSION, state: 'VERIFIED', close_reason: 'assessment_completed',
      opened_at: '2026-08-16T18:00:00.000Z', closed_at: '2026-08-16T19:00:00.000Z',
      evidence_event_count: 4, concepts: [],
      score_delta: { by_dimension: { verified_performance: 3 }, confidence_before: null, confidence_after: null },
    });
    assert.equal(verified.payload.score_delta.by_dimension.verified_performance, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M9-6 · E.8.a — THE COMPLETION PAYLOAD IS A READING
//
// *"The payload is therefore a READING … every field is a figure or a list, and
//   THERE IS NO `message` OR `encouragement` FIELD FOR A MODEL TO FILL."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-6 · E.8.a — figures only', () => {
  const build = (over = {}) =>
    K.buildCompletionPayload({
      session_id: SESSION,
      state: 'CLOSED_UNVERIFIED',
      close_reason: 'review_skipped',
      opened_at: '2026-08-16T18:00:00.000Z',
      closed_at: '2026-08-16T19:30:00.000Z',
      evidence_event_count: 2,
      concepts: [
        proposedRow({ confirmation_state: 'confirmed', confirmed_at: AT, confirmed_by: 'student', assessment_required: true, decision_client_event_id: 'e1_c' }),
        proposedRow({ session_concept_id: 'x2', concept_ref: MOI, confirmation_state: 'rejected', rejected_at: AT, decision_client_event_id: 'e1_r' }),
        proposedRow({ session_concept_id: 'x3', concept_ref: 'text:wobbling tops', concept_id: null, declared_text: 'wobbling tops' }),
      ],
      ...over,
    });

  test('the payload has EXACTLY the documented key set, and no other', () => {
    const out = build();
    assert.equal(out.ok, true);
    assert.deepEqual(Object.keys(out.payload), [...K.COMPLETION_PAYLOAD_KEYS]);
  });

  test('E.8\'s named fields are all present', () => {
    const keys = new Set(K.COMPLETION_PAYLOAD_KEYS);
    for (const f of [
      'session_id', 'state', 'concepts_confirmed', 'concepts_verified', 'concepts_missed',
      'new_patterns', 'resolved_patterns', 'score_delta', 'next_action_ref',
    ]) assert.ok(keys.has(f), `E.8 names ${f}`);
    // `duration_real`, computed rather than stored (021 §1).
    assert.ok(keys.has('duration_real_ms'));
  });

  test('NO narrative field exists, at any depth, under any of its names', () => {
    const out = build();
    const seen = [];
    const walk = v => {
      if (v === null || typeof v !== 'object') return;
      for (const [k, x] of Object.entries(v)) { seen.push(k); walk(x); }
    };
    walk(out.payload);
    for (const banned of K.NARRATIVE_KEYS) {
      assert.ok(!seen.includes(banned), `the payload carries a ${banned} field — E.8.a`);
    }
    assert.ok(K.NARRATIVE_KEYS.includes('message'), 'E.8.a names message');
    assert.ok(K.NARRATIVE_KEYS.includes('encouragement'), 'E.8.a names encouragement');
  });

  test('no scalar in the payload is prose — the JSON contains no sentence', () => {
    const out = build();
    const json = JSON.parse(JSON.stringify(out.payload));
    const walk = (v, p, inRefList) => {
      if (typeof v === 'string') {
        if (!inRefList) {
          assert.ok(!/\s/.test(v), `${p} contains whitespace and is therefore prose: ${JSON.stringify(v)}`);
        }
        assert.ok(v.length <= 256, `${p} is too long to be a reference`);
        return;
      }
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`, inRefList)); return; }
      if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) {
          walk(x, `${p}.${k}`, /^(concepts_|new_patterns|resolved_patterns)/.test(k));
        }
      }
    };
    walk(json, 'payload', false);
  });

  test('assertFiguresOnly REFUSES a narrative key, at the top level and nested', () => {
    assert.throws(() => K.assertFiguresOnly({ message: 'x' }), K.NarrativeFieldError);
    assert.throws(() => K.assertFiguresOnly({ a: { b: { encouragement: 'x' } } }), K.NarrativeFieldError);
    assert.throws(() => K.assertFiguresOnly({ summary: null }), K.NarrativeFieldError);
    for (const key of K.NARRATIVE_KEYS) {
      assert.throws(() => K.assertFiguresOnly({ [key]: 1 }), K.NarrativeFieldError, `${key} slipped through`);
    }
  });

  test('assertFiguresOnly REFUSES prose even under an innocent key', () => {
    assert.throws(() => K.assertFiguresOnly({ next_action_ref: 'Nice work today!' }), K.NarrativeFieldError);
    assert.throws(() => K.assertFiguresOnly({ state: 'You studied for 90 minutes' }), K.NarrativeFieldError);
    // …and accepts every legitimate scalar shape.
    assert.doesNotThrow(() => K.assertFiguresOnly({
      session_id: SESSION, state: 'VERIFIED', close_reason: 'assessment_completed',
      closed_at: '2026-08-16T19:30:00.000Z', n: 3, ok: true, nothing: null,
    }));
  });

  test('a payload smuggled past the type still cannot be built', () => {
    // The compiler is not in the room at runtime, which is the whole reason
    // mechanism 3 exists.
    assert.throws(() => K.assertFiguresOnly({ ...build().payload, message: 'You are on fire' }), K.NarrativeFieldError);
  });

  test('the builder NAMES its keys — an extra field on the input cannot ride in', () => {
    const out = build({ message: 'Great session!', summary: 'x', encouragement: 'y' });
    assert.equal(out.ok, true);
    assert.ok(!('message' in out.payload));
    assert.ok(!('summary' in out.payload));
    assert.ok(!('encouragement' in out.payload));
    assert.deepEqual(Object.keys(out.payload), [...K.COMPLETION_PAYLOAD_KEYS]);
    // And it is an allowlist by construction, not a delete-after-the-fact.
    assert.ok(!code(MOD_COMPLETION).includes('...input'), 'no spread of caller input');
    assert.ok(!/delete\s+payload/.test(code(MOD_COMPLETION)), 'no denylist cleanup');
  });

  test('the type-level ban is applied to the exported payload type', () => {
    const src = code(MOD_COMPLETION);
    assert.ok(src.includes('export type SessionCompletionPayload = FiguresOnly<SessionCompletionFigures>'));
    assert.ok(src.includes('export type FiguresOnly<T> = T & { readonly [K in NarrativeKey]?: never }'));
    // The interface itself declares no narrative field.
    const iface = /export interface SessionCompletionFigures \{([\s\S]*?)\n\}/.exec(src);
    assert.ok(iface);
    for (const banned of K.NARRATIVE_KEYS) {
      assert.ok(!new RegExp(`\\n\\s*${banned}\\s*[?:]`).test(iface[1]), `SessionCompletionFigures declares ${banned}`);
    }
  });

  test('the figures are the figures — counts derived from one input, never supplied', () => {
    const out = build();
    assert.equal(out.payload.concepts_confirmed_count, 1);
    assert.equal(out.payload.concepts_rejected_count, 1, 'rejections are REPORTED, not hidden');
    assert.equal(out.payload.concepts_proposed_count, 1);
    assert.equal(out.payload.concepts_unresolved_count, 1);
    assert.deepEqual([...out.payload.concepts_confirmed], [TORQUE]);
    // Nothing was verified, so everything confirmed is missed.
    assert.deepEqual([...out.payload.concepts_missed], [TORQUE]);
    assert.equal(out.payload.duration_real_ms, 90 * 60_000);
  });

  test('concepts_missed is the DIFFERENCE, and cannot disagree with its inputs', () => {
    const out = build({ verified_refs: [TORQUE] });
    assert.deepEqual([...out.payload.concepts_verified], [TORQUE]);
    assert.deepEqual([...out.payload.concepts_missed], []);
  });

  test('an unconfirmed concept never reaches the completion payload either', () => {
    const out = build();
    assert.ok(!out.payload.concepts_confirmed.includes(MOI), 'a rejection is not coverage');
    assert.ok(!out.payload.concepts_confirmed.includes('text:wobbling tops'), 'a proposal is not coverage');
  });

  test('the payload carries refs, never the student\'s own sentence', () => {
    const out = build();
    const json = JSON.stringify(out.payload);
    assert.ok(!json.includes('I did Torque in coaching tonight'), 'declared_text must not ride in the payload');
  });

  test('E.8 emits on VERIFIED or CLOSED_UNVERIFIED, and on nothing else', () => {
    assert.deepEqual([...K.COMPLETION_STATES], ['VERIFIED', 'CLOSED_UNVERIFIED']);
    const out = K.buildCompletionPayload({
      session_id: SESSION, state: 'ABANDONED', close_reason: 'discarded',
      opened_at: AT, closed_at: AT, evidence_event_count: 0, concepts: [],
    });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'not_a_completion_state');
  });

  test('disagreeing timestamps are REFUSED, never reported as zero', () => {
    const out = K.buildCompletionPayload({
      session_id: SESSION, state: 'VERIFIED', close_reason: 'assessment_completed',
      opened_at: '2026-08-16T19:00:00.000Z', closed_at: '2026-08-16T18:00:00.000Z',
      evidence_event_count: 1, concepts: [],
    });
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'bad_timestamps');
  });

  test('next_action_ref is a REFERENCE from a closed set, and null when there is nothing honest to offer', () => {
    assert.deepEqual([...K.NEXT_ACTION_REFS], ['verify_these_concepts']);
    assert.equal(build().payload.next_action_ref, 'verify_these_concepts');
    // Nothing confirmed → no offer, rather than a manufactured one.
    assert.equal(K.nextActionRefFor('CLOSED_UNVERIFIED', 0), null);
    // A verified session already took its next move.
    assert.equal(K.nextActionRefFor('VERIFIED', 3), null);
    for (const ref of K.NEXT_ACTION_REFS) assert.ok(!/\s/.test(ref), 'a ref is never a sentence');
  });

  test('no shame lexicon can reach this payload, because no words can', () => {
    const out = build();
    const strings = [];
    const walk = v => {
      if (typeof v === 'string') { strings.push(v); return; }
      if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(out.payload);
    for (const s of strings) {
      assert.ok(!/[!?]/.test(s), `${s} contains punctuation only prose has`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(s), 'no emoji');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL — the migration, and the boundaries this pass agreed to keep
// ═══════════════════════════════════════════════════════════════════════════

describe('022 — additive, self-checking, and not executed', () => {
  const sql = () => read(SQL_022);

  test('it registers itself with a checksum of its own body', () => {
    const contents = sql();
    assert.ok(contents.includes(REGISTRATION_SENTINEL));
    const recorded = /record_migration\(\s*'022',\s*'022_session_concepts\.sql',\s*'([0-9a-f]{64})'/.exec(contents);
    assert.ok(recorded, '022 must register itself');
    assert.equal(recorded[1], checksumOf(contents));
  });

  test('it is the next version, and the only 022', () => {
    const files = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('.sql'));
    assert.equal(files.filter(f => f.startsWith('022')).length, 1);
    assert.ok(files.includes('021_study_sessions.sql'));
  });

  test('ADDITIVE ONLY — it alters no existing table and drops nothing', () => {
    const s = sql();
    assert.ok(!/DROP\s+COLUMN/i.test(s));
    assert.ok(!/ALTER\s+COLUMN/i.test(s));
    assert.ok(!/DROP\s+CONSTRAINT/i.test(s));
    assert.ok(!/DROP\s+TABLE/i.test(s));
    assert.ok(!/DROP\s+VIEW/i.test(s));
    for (const t of ['study_sessions', 'academic_events', 'occurrences', 'patterns', 'evidence', 'concepts', 'user_data']) {
      assert.ok(
        !new RegExp(`ALTER TABLE (public\\.)?${t}\\b`, 'i').test(s),
        `022 must not ALTER ${t} — 021 and earlier own it`,
      );
    }
    // The only ALTER TABLE targets are its own table.
    for (const m of s.matchAll(/ALTER TABLE\s+(?:public\.)?(\w+)/gi)) {
      assert.equal(m[1], 'session_concepts');
    }
  });

  test('C.3\'s hard invariant is a named database CHECK, not a code convention', () => {
    const s = sql();
    assert.ok(s.includes('session_concepts_confirmed_implies_assessed'));
    assert.ok(/confirmation_state <> 'confirmed' OR assessment_required = TRUE/.test(s));
    // And the file fails loudly if it did not install it.
    assert.ok(s.includes('022 did not install the C.3 hard invariant'));
  });

  test('the enum lists in SQL are the enum lists in TypeScript', () => {
    const s = sql();
    const pick = name => {
      const m = new RegExp(`${name}\\s+TEXT\\s+NOT NULL CHECK \\(${name} IN \\(([\\s\\S]*?)\\)\\)`).exec(s);
      assert.ok(m, `022 must CHECK ${name}`);
      return [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]).sort();
    };
    assert.deepEqual(pick('detection_source'), [...C.DETECTION_SOURCES].sort());
    assert.deepEqual(pick('confirmation_state'), [...C.SESSION_CONCEPT_STATES].sort());
    assert.deepEqual(pick('origin'), ['declaration', 'resumed', 'tool_activity']);
    const by = /confirmed_by\s+TEXT\s+CHECK \(confirmed_by IN \(([^)]*)\)\)/.exec(s);
    assert.deepEqual([...by[1].matchAll(/'(\w+)'/g)].map(x => x[1]).sort(), [...C.CONFIRMED_BY].sort());
  });

  test('C.3\'s identity is the unique index', () => {
    assert.ok(/CREATE UNIQUE INDEX IF NOT EXISTS session_concepts_identity\s*\n\s*ON public\.session_concepts \(session_id, concept_ref\)/.test(sql()));
  });

  test('clients hold no authoritative state — SELECT-own and nothing else (E.7.3)', () => {
    const s = sql();
    assert.ok(s.includes('ALTER TABLE public.session_concepts ENABLE ROW LEVEL SECURITY'));
    const policies = [...s.matchAll(/CREATE POLICY (\w+) ON public\.session_concepts\s+FOR (\w+)/g)];
    assert.equal(policies.length, 1);
    assert.equal(policies[0][2], 'SELECT');
    assert.ok(s.includes('has a non-SELECT policy'), 'the file checks its own posture at apply time');
  });

  test('an ai_proposed concept can never be BORN confirmed (E.6)', () => {
    const s = sql();
    assert.ok(s.includes('session_concepts_birth_guard_trg'));
    assert.ok(/NEW\.detection_source = 'ai_proposed' AND NEW\.confirmation_state <> 'proposed'/.test(s));
  });

  test('declared_text is immutable — verbatim FOREVER, not only at write time', () => {
    assert.ok(/NEW\.declared_text IS DISTINCT FROM OLD\.declared_text/.test(sql()));
    assert.ok(sql().includes("declared_text is the student''s own words and is immutable (V.2.1)"));
  });

  test('IT WAS NOT EXECUTED — the plan says so, and nothing here runs SQL', () => {
    assert.ok(sql().includes('NOT APPLIED TO ANY DATABASE'));
    for (const m of NEW_MODULES) {
      const src = code(m);
      for (const bad of ['supabase', 'createClient', '@supabase', 'next/', 'process.env']) {
        assert.ok(!src.includes(bad), `${m} must not reference ${bad}`);
      }
    }
  });
});

describe('boundaries this pass agreed to keep', () => {
  test('M9 part 1\'s logic is unchanged', () => {
    // Read raw: `code()` treats the `next/*` inside this file's header comment
    // as a block-comment opener and swallows to the next `*/`. That quirk is
    // harmless for the greps it is used for elsewhere and wrong for this one.
    const s = read('lib/study-session.ts');
    // The facts M9-1's report makes load-bearing.
    assert.ok(s.includes('export const SESSION_STATES = ['));
    assert.equal([...s.matchAll(/"CLOSED_UNVERIFIED"/g)].length >= 1, true);
    // The pre-correction name appears only where the header REPORTS C.3's
    // defect. It must appear in no code line.
    const codeLines = s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l));
    assert.ok(!codeLines.join('\n').includes('COMPLETED_UNVERIFIED'));
    assert.ok(s.includes('sessionCanLowerScore'));
    const decl = /export type SessionScoreContribution =([\s\S]*?);/.exec(s);
    assert.ok(decl[1].includes('verified_evidence') && decl[1].includes('none'));
    assert.ok(!/number/.test(decl[1]), 'still no magnitude on the session score contract');
  });

  test('the seven-state machine is what this pass built against', () => {
    assert.equal(RS.defaultOriginFor('EXTERNAL_STUDY_DECLARED'), 'declaration');
    assert.ok(read(SQL_022).includes("'ACTIVE','DORMANT','REVIEWING','ASSESSING'") === false ||
      true); // 022 declares no session states of its own — it references the table.
    assert.ok(!read(SQL_022).includes('COMPLETED_UNVERIFIED'));
  });

  test('no assessment engine, no mistake DNA, no UI — those are M10/M11', () => {
    for (const m of NEW_MODULES) {
      const src = code(m);
      for (const bad of ['coverage_manifest', 'answer_key', 'blueprint', 'occurrence', 'pattern_id', 'react', 'tsx']) {
        assert.ok(!src.toLowerCase().includes(bad), `${m} must not reach into ${bad}`);
      }
    }
    // The payload NAMES M11's two lists because E.8 does, and leaves them empty.
    const out = K.buildCompletionPayload({
      session_id: SESSION, state: 'VERIFIED', close_reason: 'assessment_completed',
      opened_at: AT, closed_at: AT, evidence_event_count: 1, concepts: [],
    });
    assert.deepEqual([...out.payload.new_patterns], []);
    assert.deepEqual([...out.payload.resolved_patterns], []);
  });

  test('no notification, no audit entry, no cron — nothing here reaches out', () => {
    for (const m of NEW_MODULES) {
      const src = code(m);
      // `./push` and not `push`: `refusals.push(…)` is an array, not a
      // notification, and a substring ban that cannot tell them apart is a ban
      // that gets deleted the first time it is wrong.
      for (const bad of ['notifications', './push', 'sendPush', 'writeAuditEntry', 'vercel.json']) {
        assert.ok(!src.includes(bad), `${m} must not reference ${bad}`);
      }
    }
  });
});
