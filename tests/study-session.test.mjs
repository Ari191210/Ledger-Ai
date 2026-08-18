// M9 (part 1: M9-1 … M9-3) — the Study Session state machine, the resolver,
// and liveness across tabs, devices and days.
//
// Five kinds of assertion, the same shape tests/legacy-freeze.test.mjs uses:
//
//   1. THE ACCEPTANCE TESTS THEMSELVES. V.1.1 … V.1.8 are transcribed from
//      STUDYLEDGER_SYSTEM_ARCHITECTURE Part V and named in the test titles, so
//      a reader can check the contract against the document line by line
//      rather than against a paraphrase. Each runs against a FakeStore that
//      enforces the constraints 021 declares — the partial unique index, the
//      conditional update, the terminal shape, the abandon precondition — and
//      refuses the way Postgres refuses.
//
//   2. THE RACE, ACTUALLY RACED. V.1.3 is a claim about behaviour under
//      concurrency, so the test interleaves two `resolveSession()` calls
//      inside one tick with a store that yields between its read and its
//      write. A sequential test would pass against code that has the window.
//
//   3. CROSS-CHECKED AGAINST THE SQL. `TRANSITIONS`, `LIVE_STATES` and the
//      edge list / index predicate in `021` are the same machine written
//      twice, because no compiler sees the SQL. Nothing but a test compares
//      them.
//
//   4. STRUCTURAL, over source. That nothing in the reap path imports
//      `lib/notifications.ts` or `lib/push.ts`; that no session module reaches
//      a score engine; that `021` registers itself with a matching checksum
//      and is additive; that no module here imports a Supabase client or reads
//      a clock.
//
//   5. EXHAUSTIVE over `SESSION_STATES`, `SESSION_ACTIONS` and `CLOSE_REASONS`
//      — every state's score contribution, every state's note against the §4
//      shame lexicon, and every (state, action) pair, so a state or an action
//      added later cannot slip through unconsidered.
//
//   node --test tests/study-session.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-sessions');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_021 = 'supabase/migrations/021_study_sessions.sql';
const CRON_ROUTE = 'app/api/cron/session-reaping/route.ts';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

let S; // lib/study-session.ts
let R; // lib/session-resolver.ts
let P; // lib/session-reaping.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.sessions.json'],
    { cwd: root, stdio: 'inherit' },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite tests/legacy-freeze.test.mjs uses.
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
  [S, R, P] = await Promise.all([
    load('study-session.js'),
    load('session-resolver.js'),
    load('session-reaping.js'),
  ]);
});

// ═══════════════════════════════════════════════════════════════════════════
// THE FAKE STORE — 021's constraints, in memory.
//
// It is deliberately NOT a convenience double. Every refusal below is one the
// migration declares, and the test's value comes entirely from the doubles
// refusing the way Postgres refuses:
//
//   · the partial unique index      → a second live row for one student is
//                                     rejected as a conflict, not overwritten
//   · the conditional update        → `.eq('state', from)` matching zero rows
//                                     returns null, never an error
//   · study_sessions_terminal_shape → terminal implies closed_at + close_reason
//   · …abandon_requires_no_evidence → ABANDONED implies zero E-class events
//   · the transition guard          → only E.2's edges; terminal is terminal
//   · the birth guard               → a session is born live
//
// `yieldBetween` is what makes the V.1.3 race real: when set, the store awaits
// a caller-supplied barrier between reading and writing, so two resolvers can
// be made to sit in the window together.
// ═══════════════════════════════════════════════════════════════════════════

function makeStore(opts = {}) {
  const rows = new Map();
  let n = 0;
  const pause = () => (opts.yieldBetween ? opts.yieldBetween() : Promise.resolve());

  const liveOf = studentId =>
    [...rows.values()].find(r => r.student_id === studentId && S.isLive(r.state)) ?? null;

  const enforce = row => {
    const terminal = S.isTerminal(row.state);
    if (terminal && (row.closed_at == null || row.close_reason == null)) {
      throw new Error('study_sessions_terminal_shape');
    }
    if (!terminal && (row.closed_at != null || row.close_reason != null)) {
      throw new Error('study_sessions_terminal_shape');
    }
    if (row.state === 'ABANDONED' && row.evidence_event_count !== 0) {
      throw new Error('study_sessions_abandon_requires_no_evidence');
    }
    if (Date.parse(row.last_activity_at) < Date.parse(row.opened_at)) {
      throw new Error('study_sessions_activity_after_open');
    }
  };

  const store = {
    rows,
    all: () => [...rows.values()],
    seed(row) {
      const full = {
        session_id: row.session_id ?? `s${++n}`,
        student_id: row.student_id ?? STUDENT,
        state: row.state ?? 'ACTIVE',
        origin: row.origin ?? 'tool_activity',
        opened_at: row.opened_at ?? new Date(0).toISOString(),
        last_activity_at: row.last_activity_at ?? new Date(0).toISOString(),
        finish_requested_at: row.finish_requested_at ?? null,
        closed_at: row.closed_at ?? null,
        close_reason: row.close_reason ?? null,
        evidence_event_count: row.evidence_event_count ?? 0,
        input_watermark_event_id: null,
      };
      enforce(full);
      rows.set(full.session_id, full);
      return full;
    },

    async findLive(studentId) {
      await pause();
      const r = liveOf(studentId);
      return r ? { ...r } : null;
    },

    async findById(sessionId) {
      const r = rows.get(sessionId);
      return r ? { ...r } : null;
    },

    async insertOpen(draft) {
      // The read half of the index check happens INSIDE the write, atomically,
      // which is the whole point: an application-layer check-then-insert has a
      // window between the two statements and this does not.
      await pause();
      if (liveOf(draft.student_id)) return { conflict: true };
      // 021's birth guard: a session is born ACTIVE (E.1).
      const row = {
        session_id: `s${++n}`,
        student_id: draft.student_id,
        state: 'ACTIVE',
        origin: draft.origin,
        opened_at: draft.opened_at,
        last_activity_at: draft.last_activity_at,
        finish_requested_at: null,
        closed_at: null,
        close_reason: null,
        evidence_event_count: 0,
        input_watermark_event_id: null,
      };
      enforce(row);
      rows.set(row.session_id, row);
      return { row: { ...row } };
    },

    async transition(sessionId, from, patch, expect) {
      await pause();
      const cur = rows.get(sessionId);
      if (!cur) return null;
      if (cur.state !== from) return null; // zero rows matched — E.7.1
      // The optimistic half of the WHERE clause, which the sweep supplies and
      // a student-driven transition does not.
      if (expect?.last_activity_at !== undefined && cur.last_activity_at !== expect.last_activity_at) {
        return null;
      }
      if (S.isTerminal(cur.state)) throw new Error('terminal is terminal');
      if (patch.state !== cur.state) {
        const edges = Object.values(S.TRANSITIONS[cur.state]).map(e => e.to);
        if (!edges.includes(patch.state)) throw new Error('not an edge of the E.2 machine');
      }
      const next = { ...cur, ...patch };
      enforce(next);
      // The partial unique index also refuses a SECOND live row appearing by
      // update — it constrains rows, not statements.
      const others = [...rows.values()].filter(
        r => r.session_id !== sessionId && r.student_id === cur.student_id && S.isLive(r.state),
      );
      if (S.isLive(next.state) && others.length > 0) throw new Error('one live session per student');
      rows.set(sessionId, next);
      return { ...next };
    },
  };
  return store;
}

const iso = ms => new Date(ms).toISOString();
const T0 = Date.parse('2026-08-16T09:00:00.000Z');
const MIN = 60_000;
const HOUR = 3_600_000;

// ═══════════════════════════════════════════════════════════════════════════
// 1 · V.1 — THE ACCEPTANCE TESTS, IN ORDER
// ═══════════════════════════════════════════════════════════════════════════

describe('V.1 — session lifecycle (the literal acceptance tests)', () => {
  test('V.1.1 — no session exists; GET /session/current returns null', async () => {
    const store = makeStore();
    assert.equal(await R.currentSession(store, STUDENT), null);
  });

  test('V.1.1b — a page view does not open one (E.1: deliberately non-qualifying)', async () => {
    const store = makeStore();
    const out = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'CONCEPT_VIEWED', receivedAtMs: T0,
    });
    assert.equal(out.outcome, 'none');
    assert.equal(out.reason, 'not_qualifying');
    assert.equal(store.all().length, 0);
    // E.4 case 3, which "must not be optimised away": the event is legal and
    // session-less. Nothing was created and nothing was refused.
    assert.equal(await R.currentSession(store, STUDENT), null);
  });

  test('V.1.2 — one practice question opens ACTIVE with origin = tool_activity', async () => {
    const store = makeStore();
    const out = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    });
    assert.equal(out.outcome, 'attached');
    assert.equal(out.opened, true);
    assert.equal(out.session.state, 'ACTIVE');
    assert.equal(out.session.origin, 'tool_activity');
    assert.equal(out.session.last_activity_at, iso(T0));
    assert.equal(store.all().length, 1);
  });

  test('V.1.3 — a second tab produces exactly one session (sequential)', async () => {
    const store = makeStore();
    const a = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    });
    const b = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 + 1000,
    });
    assert.equal(a.session.session_id, b.session.session_id);
    assert.equal(b.opened, false);
    assert.equal(store.all().length, 1);
  });

  test('V.1.3 — RACED: two tabs interleaved inside one tick still produce one session', async () => {
    // Both resolvers are made to sit in the window between the read and the
    // write together. Without the index this is exactly where two sessions are
    // born; with it, the loser's INSERT is refused and it re-reads.
    let release;
    const barrier = new Promise(r => { release = r; });
    let waiting = 0;
    const store = makeStore({
      yieldBetween: () => {
        waiting += 1;
        return waiting <= 2 ? barrier : Promise.resolve();
      },
    });

    const one = R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    });
    const two = R.resolveSession(store, {
      studentId: STUDENT, eventType: 'PRACTICE_COMPLETED', receivedAtMs: T0,
    });
    release();
    const [a, b] = await Promise.all([one, two]);

    assert.equal(store.all().length, 1, 'exactly one session row exists');
    assert.equal(a.outcome, 'attached');
    assert.equal(b.outcome, 'attached');
    assert.equal(a.session.session_id, b.session.session_id);
    // Exactly one of the two opened it. Both attached.
    assert.equal([a.opened, b.opened].filter(Boolean).length, 1);
  });

  test('V.1.3 — the index is per STUDENT: two students hold two live sessions', async () => {
    const store = makeStore();
    await R.resolveSession(store, { studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 });
    await R.resolveSession(store, { studentId: OTHER, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 });
    assert.equal(store.all().length, 2);
  });

  test('V.1.4 — 50 minutes of quiet is DORMANT, not closed', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;

    const now = T0 + 50 * MIN;
    assert.equal(S.livenessOf(T0, now), 'idle');
    const report = await P.runReaping(store, store.all(), now);
    assert.equal(report.reaped, 0, 'nothing is closed at 50 minutes');
    assert.equal(report.idled, 1);
    assert.equal((await store.findById(opened.session_id)).state, 'DORMANT');
    // Still the student's session: it has not closed and current still answers.
    assert.equal((await R.currentSession(store, STUDENT)).session_id, opened.session_id);
  });

  test('V.1.5 — returning and answering goes back to ACTIVE with the SAME session_id', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;
    await P.runReaping(store, store.all(), T0 + 50 * MIN);

    const back = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 + 51 * MIN,
    });
    assert.equal(back.session.session_id, opened.session_id, 'same session_id');
    assert.equal(back.session.state, 'ACTIVE');
    assert.equal(back.woke, true);
    assert.equal(back.opened, false);
    assert.equal(back.session.last_activity_at, iso(T0 + 51 * MIN));
    assert.equal(store.all().length, 1);
  });

  test('V.1.6 — killing the browser and returning on a phone returns the same session', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;

    // "Killing the browser" writes nothing — there is no client-held state and
    // no heartbeat to stop. The phone asks the same question a fresh client
    // asks, and gets the same session. Nothing about the device is stored.
    const onPhone = await R.currentSession(store, STUDENT);
    assert.equal(onPhone.session_id, opened.session_id);
    assert.equal(onPhone.state, 'ACTIVE');
    assert.ok(!('device_id' in onPhone), 'no device is recorded as owning the session (E.3)');

    // And a qualifying event from the phone joins it rather than opening a
    // second one — E.3, *"cross-tool by default"*.
    const fromPhone = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'PRACTICE_COMPLETED', receivedAtMs: T0 + 5 * MIN,
    });
    assert.equal(fromPhone.session.session_id, opened.session_id);
    assert.equal(store.all().length, 1);
  });

  test('V.1.6b — reading /session/current does not move the liveness clock', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;
    await R.currentSession(store, STUDENT);
    await R.currentSession(store, STUDENT);
    assert.equal((await store.findById(opened.session_id)).last_activity_at, iso(T0));
  });

  test('V.1.7 — 25 hours produces CLOSED_UNVERIFIED with reason = reaped', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;

    const now = T0 + 25 * HOUR;
    assert.equal(S.livenessOf(T0, now), 'reapable');
    const report = await P.runReaping(store, store.all(), now);

    const row = await store.findById(opened.session_id);
    assert.equal(row.state, 'CLOSED_UNVERIFIED');
    assert.equal(row.close_reason, 'reaped');
    assert.equal(row.closed_at, iso(now));
    assert.equal(report.reaped, 1);
    assert.deepEqual(report.closed.map(c => c.session_id), [opened.session_id]);
    // The walk is E.2's, not a short-circuit: ACTIVE → DORMANT → closed.
    assert.equal(report.idled, 1);
  });

  test('V.1.7 — THE SCORE DOES NOT FALL: a reaped session has no negative arm', () => {
    const c = S.sessionScoreContribution('CLOSED_UNVERIFIED');
    assert.deepEqual(c, { kind: 'none' });
    // Structural, not remembered: there is no arm carrying a sign, so M14
    // cannot pay one without first widening the type.
    for (const state of S.SESSION_STATES) {
      const v = S.sessionScoreContribution(state);
      assert.deepEqual(Object.keys(v), ['kind']);
      assert.ok(['verified_evidence', 'none'].includes(v.kind));
      for (const val of Object.values(v)) {
        assert.notEqual(typeof val, 'number', `${state} contribution carries a number`);
      }
      assert.equal(S.sessionCanLowerScore(state), false);
    }
    // Only VERIFIED yields evidence. Five of seven yield nothing.
    const evidence = S.SESSION_STATES.filter(
      s => S.sessionScoreContribution(s).kind === 'verified_evidence',
    );
    assert.deepEqual(evidence, ['VERIFIED']);
  });

  test('V.1.7 — NOTHING SHAMES: every state note and close reason is a fact', () => {
    // §4 and §4.1's lexicon. A word here is a defect, not a copy choice.
    // Matched on WORD boundaries. A substring match would flag "closed" for
    // containing "lose", which is how a lexicon test stops being read.
    const banned = [
      'fail', 'failed', 'failure', 'lost', 'lose', 'behind',
      'gave', 'missed', 'streak', 'risk', 'warning', 'poor', 'bad', 'weak',
      'lazy', 'wasted', 'obituary', 'autopsy', 'coroner', 'death', 'trauma',
      'cremator', 'forensics', 'incomplete', 'unfinished', 'neglected',
      'congratulations', 'amazing', 'sorry', 'unfortunately', 'only',
    ];
    const strings = [
      ...Object.values(S.SESSION_STATE_NOTE),
      ...Object.values(S.CLOSE_REASON_NOTE),
      ...S.SESSION_STATES.map(s => S.nextMoveFor(s)).filter(Boolean),
    ];
    assert.ok(strings.length > 0);
    for (const str of strings) {
      const low = str.toLowerCase();
      for (const word of banned) {
        assert.ok(!new RegExp(`\\b${word}\\b`).test(low),
          `"${str}" contains banned framing "${word}"`);
      }
      for (const phrase of ['you did not', "you didn't", 'gave up', 'give up',
        'on fire', 'well done', 'great job', 'cause of death']) {
        assert.ok(!low.includes(phrase), `"${str}" contains banned framing "${phrase}"`);
      }
      assert.ok(!/[!]/.test(str), `"${str}" uses an exclamation mark`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(str), `"${str}" contains an emoji`);
    }
    // Every state and every close reason has a note. A state with none would
    // be rendered by whatever the caller invented.
    for (const s of S.SESSION_STATES) assert.equal(typeof S.SESSION_STATE_NOTE[s], 'string');
    for (const r of S.CLOSE_REASONS) assert.equal(typeof S.CLOSE_REASON_NOTE[r], 'string');
  });

  test('V.1.7 — a reap emits no notification and writes no audit entry', () => {
    for (const rel of ['lib/session-reaping.ts', CRON_ROUTE]) {
      const src = code(rel);
      assert.ok(!/from\s+["'][^"']*notifications["']/.test(src), `${rel} imports notifications`);
      assert.ok(!/from\s+["'][^"']*\/push["']/.test(src), `${rel} imports push`);
      assert.ok(!/writeAuditEntry/.test(src), `${rel} writes an audit entry`);
      assert.ok(!/ledger-score/.test(src), `${rel} reaches a score engine`);
    }
  });

  test('V.1.8 — finish once → REVIEWING; again from a stale tab → current state, not an error', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;

    const first = await R.applyGuarded(store, opened.session_id, 'finish_requested', T0 + MIN);
    assert.equal(first.changed, true);
    assert.equal(first.session.state, 'REVIEWING');
    assert.equal(first.session.finish_requested_at, iso(T0 + MIN));

    // The stale tab still believes the session is ACTIVE and presses again.
    const second = await R.applyGuarded(store, opened.session_id, 'finish_requested', T0 + 2 * MIN);
    assert.equal(second.changed, false, 'zero rows affected');
    assert.equal(second.session.state, 'REVIEWING', 'it returns the CURRENT state');
    assert.equal(second.why, 'not_permitted');
    // Not an error, and it did not rewrite the first tab's timestamp.
    assert.equal(second.session.finish_requested_at, iso(T0 + MIN));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · M9-1 — THE STATE MACHINE, EXHAUSTIVELY
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-1 — E.2, the state machine', () => {
  test('the states are E.2\'s table, and three are terminal', () => {
    assert.deepEqual([...S.SESSION_STATES], [
      'ACTIVE', 'DORMANT', 'REVIEWING', 'ASSESSING',
      'CLOSED_UNVERIFIED', 'VERIFIED', 'ABANDONED',
    ]);
    assert.deepEqual([...S.TERMINAL_STATES], ['CLOSED_UNVERIFIED', 'VERIFIED', 'ABANDONED']);
    assert.deepEqual([...S.LIVE_STATES], ['ACTIVE', 'DORMANT', 'REVIEWING', 'ASSESSING']);
    // LIVE_STATES is DERIVED, not written twice.
    assert.equal(S.LIVE_STATES.length + S.TERMINAL_STATES.length, S.SESSION_STATES.length);
    for (const s of S.SESSION_STATES) assert.equal(S.isLive(s), !S.isTerminal(s));
  });

  test('E.2 names CLOSED_UNVERIFIED — the pre-correction COMPLETED_UNVERIFIED is nowhere', () => {
    assert.ok(!S.SESSION_STATES.includes('COMPLETED_UNVERIFIED'));
    assert.ok(!code('lib/study-session.ts').includes('COMPLETED_UNVERIFIED'));
    assert.ok(!code(SQL_021).includes('completed_unverified'));
  });

  test('every terminal state is a dead end for every action', () => {
    for (const state of S.TERMINAL_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        assert.equal(out.kind, 'noop', `${state} + ${action} moved`);
        assert.equal(out.why, 'terminal');
        assert.equal(out.state, state);
      }
      assert.deepEqual(S.TRANSITIONS[state], {});
    }
  });

  test('applySessionTransition is TOTAL and never throws — E.7.1 / V.1.8', () => {
    for (const state of S.SESSION_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        for (const evidence of [0, 1, 99]) {
          assert.doesNotThrow(() =>
            S.applySessionTransition({ state, evidence_event_count: evidence }, action));
        }
      }
    }
    // Including inputs no caller should produce.
    assert.doesNotThrow(() =>
      S.applySessionTransition({ state: 'NOT_A_STATE', evidence_event_count: 0 }, 'discard'));
    assert.equal(
      S.applySessionTransition({ state: 'ACTIVE', evidence_event_count: 0 }, 'not_an_action').kind,
      'noop',
    );
  });

  test('E.2.b — ABANDONED is refused once ANY E-class event exists', () => {
    for (const state of ['ACTIVE', 'DORMANT']) {
      const clean = S.applySessionTransition({ state, evidence_event_count: 0 }, 'discard');
      assert.equal(clean.kind, 'transition');
      assert.equal(clean.to, 'ABANDONED');
      assert.equal(clean.close_reason, 'discarded');

      const dirty = S.applySessionTransition({ state, evidence_event_count: 1 }, 'discard');
      assert.equal(dirty.kind, 'noop');
      assert.equal(dirty.why, 'has_evidence');
      assert.equal(dirty.state, state, 'the session survives; the evidence is never erased');
    }
    // REVIEWING and ASSESSING have no discard edge at all — by then a concept
    // set has been shown and the session may only be closed.
    for (const state of ['REVIEWING', 'ASSESSING']) {
      assert.equal(S.TRANSITIONS[state].discard, undefined);
    }
  });

  test('E.2.b — the store refuses ABANDONED with evidence even if the machine is bypassed', async () => {
    const store = makeStore();
    store.seed({ session_id: 'x', state: 'ACTIVE', evidence_event_count: 3 });
    await assert.rejects(
      () => store.transition('x', 'ACTIVE', {
        state: 'ABANDONED', closed_at: iso(T0), close_reason: 'discarded',
      }),
      /abandon_requires_no_evidence/,
    );
  });

  test('every closing transition names a reason, and no reason is a verdict', () => {
    for (const state of S.LIVE_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        if (out.kind !== 'transition') continue;
        if (out.closes) {
          assert.ok(S.CLOSE_REASONS.includes(out.close_reason),
            `${state} + ${action} closes with an unknown reason`);
        }
      }
    }
    // The reason set contains no verdict. Named individually so adding one is
    // a visible test edit.
    for (const banned of ['gave_up', 'failed', 'incomplete', 'abandoned_by_student']) {
      assert.ok(!S.CLOSE_REASONS.includes(banned));
    }
  });

  test('only qualifying activity advances the liveness clock', () => {
    for (const state of S.LIVE_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        if (out.kind !== 'transition') continue;
        assert.equal(out.touches_activity, action === 'qualifying_activity',
          `${state} + ${action} touches_activity=${out.touches_activity}`);
      }
    }
  });

  test('a reap never advances the clock it reads', () => {
    for (const state of S.LIVE_STATES) {
      for (const action of ['idle_elapsed', 'reap_elapsed']) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        if (out.kind !== 'transition') continue;
        assert.equal(out.touches_activity, false);
      }
    }
  });

  test('E.2 — the four routes into CLOSED_UNVERIFIED, and no fifth', () => {
    const routes = [];
    for (const state of S.LIVE_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        if (out.kind === 'transition' && out.to === 'CLOSED_UNVERIFIED') {
          routes.push(`${state}+${action}=${out.close_reason}`);
        }
      }
    }
    assert.deepEqual(routes.sort(), [
      'ASSESSING+assessment_skipped=assessment_skipped',
      'ASSESSING+generation_failed=generation_failed',
      'ASSESSING+reap_elapsed=reaped',
      'DORMANT+reap_elapsed=reaped',
      'REVIEWING+reap_elapsed=reaped',
      'REVIEWING+review_skipped=review_skipped',
    ].sort());
  });

  test('VERIFIED is reachable only from ASSESSING, only by assessment_completed', () => {
    const routes = [];
    for (const state of S.SESSION_STATES) {
      for (const action of S.SESSION_ACTIONS) {
        const out = S.applySessionTransition({ state, evidence_event_count: 0 }, action);
        if (out.kind === 'transition' && out.to === 'VERIFIED') routes.push(`${state}+${action}`);
      }
    }
    assert.deepEqual(routes, ['ASSESSING+assessment_completed']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · M9-3 — LIVENESS
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-3 — E.3, liveness across tabs, devices and days', () => {
  test('E.3 — REAP_HOURS is far greater than IDLE_MINUTES, and both are constants', () => {
    assert.equal(S.IDLE_MINUTES, 45);
    assert.equal(S.REAP_HOURS, 20);
    assert.equal(S.IDLE_MS, 45 * MIN);
    assert.equal(S.REAP_MS, 20 * HOUR);
    assert.ok(S.REAP_MS > 10 * S.IDLE_MS, 'REAP_HOURS >> IDLE_MINUTES');
    // The acceptance tests' own numbers must land where V.1 says.
    assert.equal(S.livenessOf(0, 50 * MIN), 'idle');   // V.1.4
    assert.equal(S.livenessOf(0, 25 * HOUR), 'reapable'); // V.1.7
    assert.equal(S.livenessOf(0, 44 * MIN), 'fresh');
    assert.equal(S.livenessOf(0, 45 * MIN), 'fresh', 'the boundary is exclusive');
    assert.equal(S.livenessOf(0, 20 * HOUR), 'idle', 'the reap boundary is exclusive too');
  });

  test('E.3 — a session started at 23:40 and continued at 00:10 is ONE session', async () => {
    const lateNight = Date.parse('2026-08-16T23:40:00.000Z');
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: lateNight,
    })).session;

    const afterMidnight = Date.parse('2026-08-17T00:10:00.000Z');
    assert.ok(S.crossesDayBoundaryWithoutClosing(lateNight, afterMidnight));

    // A sweep at 00:10 must leave it alone: 30 real minutes is fresh, whatever
    // the calendar says. This is the lib/active-close.ts IST/UTC bug, refused.
    const report = await P.runReaping(store, store.all(), afterMidnight);
    assert.equal(report.planned, 0);

    const back = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: afterMidnight,
    });
    assert.equal(back.session.session_id, opened.session_id);
    assert.equal(back.session.state, 'ACTIVE');
    assert.equal(store.all().length, 1);
  });

  test('E.3 — cross-TOOL by default: events from any tool join the same session', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;
    for (const [t, type] of [[1, 'PRACTICE_COMPLETED'], [2, 'CONCEPT_VIEWED'], [3, 'EXTERNAL_STUDY_DECLARED']]) {
      const out = await R.resolveSession(store, {
        studentId: STUDENT, eventType: type, receivedAtMs: T0 + t * MIN,
      });
      assert.equal(out.session.session_id, opened.session_id, `${type} opened a second session`);
    }
    assert.equal(store.all().length, 1);
  });

  test('E.3 — a non-qualifying event attaches but does NOT move the liveness clock', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;
    const view = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'CONCEPT_VIEWED', receivedAtMs: T0 + 10 * MIN,
    });
    assert.equal(view.session.session_id, opened.session_id);
    assert.equal((await store.findById(opened.session_id)).last_activity_at, iso(T0),
      'only study refreshes the study clock');
  });

  test('there is no heartbeat and no timer anywhere in the session modules', () => {
    for (const rel of ['lib/study-session.ts', 'lib/session-resolver.ts', 'lib/session-reaping.ts']) {
      const src = code(rel);
      assert.ok(!/Date\.now\(/.test(src), `${rel} reads a clock`);
      assert.ok(!/setInterval|setTimeout/.test(src), `${rel} owns a timer`);
      assert.ok(!/\bheartbeat\b|\bping\b|\bpoll\b/i.test(src), `${rel} mentions a heartbeat`);
      assert.ok(!/supabase|fetch\(/i.test(src), `${rel} reaches the network`);
    }
    // And no session table column stores a device — the session is the
    // student's (E.3), and `device_id` lives on the event (D.1).
    assert.ok(!/device_id\s+/.test(code(SQL_021)));
  });

  test('sessionLiveness reads the row rather than a clock of its own', async () => {
    const store = makeStore();
    const row = store.seed({ last_activity_at: iso(T0), opened_at: iso(T0) });
    assert.equal(R.sessionLiveness(row, T0 + MIN), 'fresh');
    assert.equal(R.sessionLiveness(row, T0 + 50 * MIN), 'idle');
    assert.equal(R.sessionLiveness(row, T0 + 25 * HOUR), 'reapable');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · M9-2 — THE RESOLVER, E.1's QUALIFYING SET, AND THE RACE
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-2 — E.4, the resolver', () => {
  test('E.1 — the qualifying set is exactly three types, and every one is a real event type', () => {
    assert.deepEqual([...S.QUALIFYING_EVENT_TYPES], [
      'QUESTION_ATTEMPTED', 'PRACTICE_COMPLETED', 'EXTERNAL_STUDY_DECLARED',
    ]);
    // Cross-checked against M7's contract: a qualifying type that is not in
    // D.2 could never arrive, and the resolver would be dead code.
    const contract = read('lib/event-contract.ts');
    for (const t of S.QUALIFYING_EVENT_TYPES) {
      assert.ok(contract.includes(`"${t}"`), `${t} is not an EVENT_TYPE (D.2)`);
    }
  });

  test('E.1 — the deliberately NON-qualifying set, by name', () => {
    for (const t of ['CONCEPT_VIEWED', 'EXPLANATION_READ', 'QUESTION_STARTED',
      'RECOMMENDATION_SURFACED', 'PARENT_REPORT_VIEWED', 'PREFERENCE_SET']) {
      assert.equal(S.isQualifyingEventType(t), false, `${t} must not open a session`);
    }
  });

  test('E.1 — the CONCEPT_VIEWED / EXPLANATION_READ pair needs all three conjuncts', () => {
    const base = {
      conceptRef: 'c1', viewedDwellMs: 40_000, readDwellMs: 40_000,
      hasBothTypes: true, followedByAcademicEvent: true,
    };
    assert.equal(S.qualifiesAsPair(base), true);
    assert.equal(S.qualifiesAsPair({ ...base, hasBothTypes: false }), false);
    assert.equal(S.qualifiesAsPair({ ...base, conceptRef: null }), false, 'must be the SAME concept');
    assert.equal(S.qualifiesAsPair({ ...base, viewedDwellMs: 1, readDwellMs: 1 }), false);
    assert.equal(S.qualifiesAsPair({ ...base, followedByAcademicEvent: false }), false,
      'a pair with nothing after it is not study, however long the student stared');
    // The floor is exclusive, so exactly-the-floor does not qualify.
    assert.equal(S.qualifiesAsPair({ ...base, viewedDwellMs: S.PAIR_DWELL_FLOOR_MS, readDwellMs: 0 }), false);
  });

  test('E.4 case 2 — a declaration opens a session with origin = declaration', async () => {
    const store = makeStore();
    const out = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'EXTERNAL_STUDY_DECLARED', receivedAtMs: T0,
    });
    assert.equal(out.opened, true);
    assert.equal(out.session.origin, 'declaration');
    assert.equal(R.defaultOriginFor('EXTERNAL_STUDY_DECLARED'), 'declaration');
    assert.equal(R.defaultOriginFor('QUESTION_ATTEMPTED'), 'tool_activity');
    // The origin enum is C.3's three values and no fourth.
    assert.deepEqual([...S.SESSION_ORIGINS], ['tool_activity', 'declaration', 'resumed']);
  });

  test('E.4 — a qualifying event attaches to REVIEWING/ASSESSING without reopening them', async () => {
    for (const state of ['REVIEWING', 'ASSESSING']) {
      const store = makeStore();
      const row = store.seed({ session_id: 'r', state });
      const out = await R.resolveSession(store, {
        studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
      });
      assert.equal(out.outcome, 'attached');
      assert.equal(out.session.session_id, row.session_id);
      assert.equal(out.session.state, state, `${state} was reopened`);
      assert.equal(out.woke, false);
    }
  });

  test('E.4 — a terminal session does not attract new events; a qualifying one opens a new session', async () => {
    const store = makeStore();
    store.seed({
      session_id: 'closed', state: 'CLOSED_UNVERIFIED',
      closed_at: iso(T0), close_reason: 'reaped',
    });
    const out = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 + HOUR,
    });
    assert.equal(out.opened, true);
    assert.notEqual(out.session.session_id, 'closed');
    assert.equal(store.all().length, 2, 'the closed session is not reopened — a new one is started');
  });

  test('the resolver takes received_at and is therefore replay-safe', async () => {
    // E.4: *"deterministic, has no clock of its own … re-running it over the
    // stream reconstructs identical session boundaries."* Two independent
    // replays of one stream produce the same boundaries.
    const stream = [
      ['CONCEPT_VIEWED', 0],
      ['QUESTION_ATTEMPTED', 1 * MIN],
      ['CONCEPT_VIEWED', 2 * MIN],
      ['PRACTICE_COMPLETED', 3 * MIN],
      ['QUESTION_ATTEMPTED', 30 * HOUR],
    ];
    const replay = async () => {
      const store = makeStore();
      const seen = [];
      for (const [type, offset] of stream) {
        const now = T0 + offset;
        await P.runReaping(store, store.all(), now);
        const out = await R.resolveSession(store, {
          studentId: STUDENT, eventType: type, receivedAtMs: now,
        });
        seen.push(out.outcome === 'attached' ? out.session.session_id : null);
      }
      return { seen, rows: store.all().map(r => [r.state, r.close_reason]) };
    };
    assert.deepEqual(await replay(), await replay());
    const { seen, rows } = await replay();
    assert.equal(seen[0], null, 'a lone CONCEPT_VIEWED is session-less');
    assert.equal(seen[1], seen[3], 'the whole first window is one session');
    assert.notEqual(seen[1], seen[4], '30 hours later is a new session');
    assert.deepEqual(rows.sort(), [['ACTIVE', null], ['CLOSED_UNVERIFIED', 'reaped']].sort());
  });

  test('applyGuarded on a missing session reports it and does not throw', async () => {
    const store = makeStore();
    const out = await R.applyGuarded(store, 'nope', 'finish_requested', T0);
    assert.deepEqual(out, { changed: false, session: null, why: 'not_found' });
  });

  test('applyGuarded reports lost_race when another writer moved first', async () => {
    const store = makeStore();
    const row = store.seed({ session_id: 'q', state: 'ACTIVE' });
    // Simulate the concurrent writer landing between the read and the update.
    const realFindById = store.findById.bind(store);
    let first = true;
    store.findById = async id => {
      const r = await realFindById(id);
      if (first) { first = false; return r; }
      return r;
    };
    const cheat = store.transition.bind(store);
    store.transition = async (id, from, patch) => {
      // Somebody else already moved it to REVIEWING.
      if (store.rows.get(id).state === 'ACTIVE') {
        await cheat(id, 'ACTIVE', { state: 'REVIEWING', finish_requested_at: iso(T0) });
      }
      return cheat(id, from, patch);
    };
    const out = await R.applyGuarded(store, row.session_id, 'finish_requested', T0);
    assert.equal(out.changed, false);
    assert.equal(out.why, 'lost_race');
    assert.equal(out.session.state, 'REVIEWING');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE REAPER
// ═══════════════════════════════════════════════════════════════════════════

describe('M9-1 — reaping', () => {
  test('planReaping leaves fresh and terminal sessions alone', () => {
    const store = makeStore();
    const rows = [
      store.seed({ session_id: 'fresh', last_activity_at: iso(T0), opened_at: iso(T0) }),
      store.seed({
        session_id: 'done', student_id: OTHER, state: 'VERIFIED',
        closed_at: iso(T0), close_reason: 'assessment_completed',
      }),
    ];
    assert.deepEqual(P.planReaping(rows, T0 + MIN), []);
  });

  test('planReaping walks E.2 rather than short-circuiting', () => {
    const store = makeStore();
    const rows = [
      store.seed({ session_id: 'a', state: 'ACTIVE', last_activity_at: iso(T0), opened_at: iso(T0) }),
      store.seed({ session_id: 'b', student_id: OTHER, state: 'DORMANT', last_activity_at: iso(T0), opened_at: iso(T0) }),
    ];
    const plans = P.planReaping(rows, T0 + 25 * HOUR);
    assert.deepEqual(plans.find(p => p.session_id === 'a').actions, ['idle_elapsed', 'reap_elapsed']);
    assert.deepEqual(plans.find(p => p.session_id === 'b').actions, ['reap_elapsed']);
  });

  test('an idle REVIEWING or ASSESSING session is not touched until it is reapable', () => {
    const store = makeStore();
    for (const state of ['REVIEWING', 'ASSESSING']) {
      const row = store.seed({
        session_id: `i-${state}`, student_id: `${state}-student`,
        state, last_activity_at: iso(T0), opened_at: iso(T0),
      });
      assert.deepEqual(P.planReaping([row], T0 + 50 * MIN), [],
        `${state} closed at IDLE_MINUTES — there is no state between it and closed`);
      assert.deepEqual(P.planReaping([row], T0 + 25 * HOUR)[0].actions, ['reap_elapsed']);
    }
  });

  test('a REVIEWING session left for a day is reaped, not stranded', async () => {
    // Without this edge the partial unique index locks the student out of ever
    // opening another session — a rule written to protect them, refusing to.
    const store = makeStore();
    store.seed({ session_id: 'rev', state: 'REVIEWING', last_activity_at: iso(T0), opened_at: iso(T0) });
    const now = T0 + 25 * HOUR;
    const report = await P.runReaping(store, store.all(), now);
    assert.equal(report.reaped, 1);
    assert.equal((await store.findById('rev')).close_reason, 'reaped');
    // And the student can now start a new one.
    const out = await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: now + MIN,
    });
    assert.equal(out.opened, true);
  });

  test('THE STUDENT WINS THE RACE: a session woken between read and write is left alone', async () => {
    const store = makeStore();
    const opened = (await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0,
    })).session;
    const stale = store.all();          // what the sweep read
    // The student answers a question 25 hours later, a microsecond before the
    // sweep's UPDATE lands.
    await R.resolveSession(store, {
      studentId: STUDENT, eventType: 'QUESTION_ATTEMPTED', receivedAtMs: T0 + 25 * HOUR,
    });
    const report = await P.runReaping(store, stale, T0 + 25 * HOUR);
    assert.equal(report.reaped, 0);
    assert.equal(report.unchanged, 1);
    assert.equal((await store.findById(opened.session_id)).state, 'ACTIVE');
  });

  test('every plan carries the exact last_activity_at it decided against', () => {
    const store = makeStore();
    const row = store.seed({ session_id: 'p', last_activity_at: iso(T0), opened_at: iso(T0) });
    const [plan] = P.planReaping([row], T0 + 25 * HOUR);
    assert.equal(plan.expect_last_activity_at, iso(T0));
  });

  test('a wake that does NOT change the state still defeats the sweep', async () => {
    // The hard case, and the one a state-only WHERE clause gets wrong: the
    // student answers a question in an already-ACTIVE session, so the state
    // the sweep read is still the state on the row. Only the activity
    // timestamp moved — which is precisely what the sweep decided against.
    const store = makeStore();
    const row = store.seed({ session_id: 'w', state: 'ACTIVE', last_activity_at: iso(T0), opened_at: iso(T0) });
    const stale = [{ ...row }];
    await store.transition('w', 'ACTIVE', { state: 'ACTIVE', last_activity_at: iso(T0 + 25 * HOUR) });

    const report = await P.runReaping(store, stale, T0 + 25 * HOUR);
    assert.equal(report.planned, 1, 'the sweep did plan against the stale row');
    assert.equal(report.idled, 0, 'and wrote nothing');
    assert.equal(report.reaped, 0);
    assert.equal(report.unchanged, 1);
    assert.equal((await store.findById('w')).state, 'ACTIVE');
  });

  test('the reap report is facts only — no message, no encouragement (E.8.a)', async () => {
    const store = makeStore();
    store.seed({ session_id: 'z', last_activity_at: iso(T0), opened_at: iso(T0) });
    const report = await P.runReaping(store, store.all(), T0 + 25 * HOUR);
    const keys = Object.keys(report).sort();
    assert.deepEqual(keys, ['closed', 'idle_ms', 'idled', 'planned', 'reap_ms', 'reaped', 'unchanged']);
    for (const k of ['message', 'encouragement', 'summary', 'headline', 'tone']) {
      assert.ok(!(k in report), `the report carries a ${k} field a model could fill`);
    }
    assert.deepEqual(Object.keys(report.closed[0]).sort(), ['quiet_ms', 'session_id', 'student_id']);
  });

  test('a sweep is idempotent — running it twice closes nothing twice', async () => {
    const store = makeStore();
    store.seed({ session_id: 'z', last_activity_at: iso(T0), opened_at: iso(T0) });
    const now = T0 + 25 * HOUR;
    const first = await P.runReaping(store, store.all(), now);
    const second = await P.runReaping(store, store.all(), now + MIN);
    assert.equal(first.reaped, 1);
    assert.equal(second.planned, 0);
    assert.equal(second.reaped, 0);
    assert.deepEqual(second.closed, []);
  });

  test('a row with an unparseable last_activity_at is left alone, never closed', () => {
    const rows = [{
      session_id: 'bad', student_id: STUDENT, state: 'ACTIVE', origin: 'tool_activity',
      opened_at: 'not a date', last_activity_at: 'not a date',
      finish_requested_at: null, closed_at: null, close_reason: null,
      evidence_event_count: 0, input_watermark_event_id: null,
    }];
    assert.deepEqual(P.planReaping(rows, T0 + 100 * HOUR), [],
      'a bad timestamp must never be read as 56 years of silence');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6 · 021 — THE MIGRATION, CROSS-CHECKED AGAINST THE MACHINE
// ═══════════════════════════════════════════════════════════════════════════

describe('021 — the migration', () => {
  const sql = () => read(SQL_021);

  test('it registers itself with a checksum that matches its own body', () => {
    const contents = sql();
    assert.ok(contents.includes(REGISTRATION_SENTINEL), 'no registration block');
    const m = /record_migration\(\s*'021',\s*'021_study_sessions\.sql',\s*'([0-9a-f]{64})',\s*'self'\s*\)/.exec(contents);
    assert.ok(m, 'the registration call is missing or malformed');
    assert.equal(m[1], checksumOf(contents), '021 registers a checksum that is not its own body');
    assert.ok(!contents.includes('PLACEHOLDER'), 'a placeholder checksum survived');
  });

  test('021 is the next free version and no version is used twice', () => {
    // BOUNDARY ASSERTION, INVERTED IN PLACE — 2026-08-16, M9 part 2.
    //
    // It read `!names.some(n => n.startsWith('022'))` when M9 part 1 was the
    // head of the migration series. M9 part 2 adds `022_session_concepts.sql`
    // — the `session_concepts` table 021 §8 records by name as the thing it
    // deliberately refused to ship without C.3's hard invariant — so "021 is
    // the highest version" stopped being true on purpose. What the test is
    // actually for survives unchanged and is the half kept below: no version
    // number is used twice, and 021 is still there. Same treatment M7 part 2
    // gave the one boundary assertion in tests/academic-events.test.mjs:
    // inverted in place and dated, never deleted.
    const dir = path.join(root, 'supabase', 'migrations');
    const names = fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort();
    assert.ok(names.includes('021_study_sessions.sql'));
    assert.equal(
      names.filter(n => n.startsWith('021')).length, 1,
      '021 must be a single file',
    );
    const versions = names.map(n => n.split('_')[0]);
    assert.equal(new Set(versions).size, versions.length, 'a version number is used twice');
  });

  test('it is ADDITIVE — it drops and alters nothing that already exists', () => {
    const body = code(SQL_021);
    assert.ok(!/DROP\s+TABLE/i.test(body));
    assert.ok(!/DROP\s+COLUMN/i.test(body));
    assert.ok(!/TRUNCATE/i.test(body));
    assert.ok(!/DELETE\s+FROM/i.test(body));
    // The only ALTER is on the table it just created.
    for (const m of body.match(/ALTER\s+TABLE\s+[^\s;]+/gi) ?? []) {
      assert.match(m, /study_sessions/i, `021 alters something it did not create: ${m}`);
    }
    // The only DROPs are its own idempotency guards.
    for (const m of body.match(/DROP\s+(TRIGGER|POLICY)\s+IF\s+EXISTS\s+[^\s;]+/gi) ?? []) {
      assert.match(m, /study_sessions/i);
    }
    assert.ok(/CREATE TABLE IF NOT EXISTS public\.study_sessions/.test(body), 'not idempotent');
  });

  test('the state CHECK is exactly SESSION_STATES', () => {
    const body = code(SQL_021);
    const m = /state\s+TEXT\s+NOT NULL CHECK \(state IN \(([\s\S]*?)\)\)/.exec(body);
    assert.ok(m, 'no state CHECK found');
    const inSql = [...m[1].matchAll(/'([A-Z_]+)'/g)].map(x => x[1]).sort();
    assert.deepEqual(inSql, [...S.SESSION_STATES].sort());
  });

  test('the close_reason CHECK is exactly CLOSE_REASONS', () => {
    const body = code(SQL_021);
    const m = /close_reason\s+TEXT\s+CHECK \(close_reason IN \(([\s\S]*?)\)\)/.exec(body);
    assert.ok(m, 'no close_reason CHECK found');
    const inSql = [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]).sort();
    assert.deepEqual(inSql, [...S.CLOSE_REASONS].sort());
  });

  test('the origin CHECK is exactly SESSION_ORIGINS', () => {
    const m = /origin\s+TEXT\s+NOT NULL CHECK \(origin IN \(([\s\S]*?)\)\)/.exec(code(SQL_021));
    assert.ok(m);
    assert.deepEqual([...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]).sort(), [...S.SESSION_ORIGINS].sort());
  });

  test('M9-2 — the partial unique index exists, is UNIQUE, and its predicate is LIVE_STATES', () => {
    const body = code(SQL_021);
    const m = /CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_one_live_per_student\s*\n\s*ON public\.study_sessions \(student_id\)\s*\n\s*WHERE state IN \(([^)]*)\);/.exec(body);
    assert.ok(m, 'the one-live-session partial unique index is missing or is not partial');
    const predicate = [...m[1].matchAll(/'([A-Z_]+)'/g)].map(x => x[1]).sort();
    assert.deepEqual(predicate, [...S.LIVE_STATES].sort(),
      'the index predicate and LIVE_STATES have drifted');
    // It must be on student_id ALONE — a composite would permit two live rows.
    assert.ok(/\(student_id\)/.test(m[0]));
    // And no terminal state may be inside it, or a closed session would keep
    // the slot occupied forever.
    for (const t of S.TERMINAL_STATES) assert.ok(!predicate.includes(t));
  });

  test('M9-1 — the SQL transition guard holds exactly the edges TRANSITIONS produces', () => {
    const body = code(SQL_021);
    const m = /allowed TEXT\[\] := ARRAY\[([\s\S]*?)\];/.exec(body);
    assert.ok(m, 'the transition guard has no edge list');
    const inSql = [...m[1].matchAll(/'([A-Z_]+)>([A-Z_]+)'/g)].map(x => `${x[1]}>${x[2]}`).sort();

    const fromCode = new Set();
    for (const [state, actions] of Object.entries(S.TRANSITIONS)) {
      for (const edge of Object.values(actions)) fromCode.add(`${state}>${edge.to}`);
    }
    assert.deepEqual(inSql, [...fromCode].sort(),
      'the state machine in TypeScript and the state machine in SQL disagree');
    assert.equal(new Set(inSql).size, inSql.length, 'the SQL edge list has a duplicate');
  });

  test('terminal is terminal, in SQL as in code', () => {
    const body = code(SQL_021);
    assert.ok(/IF OLD\.state IN \('CLOSED_UNVERIFIED','VERIFIED','ABANDONED'\) THEN[\s\S]{0,200}RAISE EXCEPTION/.test(body),
      'the guard does not refuse a transition out of a terminal state');
    // And no edge in the list starts from one.
    const m = /allowed TEXT\[\] := ARRAY\[([\s\S]*?)\];/.exec(body);
    for (const t of S.TERMINAL_STATES) {
      assert.ok(!new RegExp(`'${t}>`).test(m[1]), `${t} has an outgoing edge in SQL`);
    }
  });

  test('a session is born live — the birth guard refuses any other entry state', () => {
    const body = code(SQL_021);
    assert.ok(/study_sessions_birth_guard/.test(body));
    assert.ok(/BEFORE INSERT ON public\.study_sessions/.test(body));
    const m = /IF NEW\.state NOT IN \(([^)]*)\) THEN/.exec(body);
    assert.ok(m);
    const born = [...m[1].matchAll(/'([A-Z_]+)'/g)].map(x => x[1]).sort();
    assert.deepEqual(born, ['ACTIVE', 'DORMANT']);
  });

  test('E.7.3 — clients hold no authoritative session state: SELECT-own and nothing else', () => {
    const body = code(SQL_021);
    assert.ok(/ENABLE ROW LEVEL SECURITY/.test(body));
    const policies = [...body.matchAll(/CREATE POLICY\s+(\w+)[\s\S]*?FOR\s+(\w+)/g)];
    assert.equal(policies.length, 1, 'study_sessions has more than one policy');
    assert.equal(policies[0][2].toUpperCase(), 'SELECT');
    assert.ok(/REVOKE INSERT, UPDATE, DELETE ON public\.study_sessions FROM anon, authenticated/.test(body));
    assert.ok(/auth\.uid\(\) = student_id/.test(body));
  });

  test('E.2.b and the terminal shape are database CHECKs, not code conventions', () => {
    const body = code(SQL_021);
    assert.ok(/CONSTRAINT study_sessions_abandon_requires_no_evidence CHECK \(\s*state <> 'ABANDONED' OR evidence_event_count = 0\s*\)/.test(body));
    assert.ok(/CONSTRAINT study_sessions_terminal_shape CHECK/.test(body));
    assert.ok(/CONSTRAINT study_sessions_activity_after_open CHECK/.test(body));
  });

  test('the schema holds nothing a scoring pass could read as a penalty', () => {
    const body = code(SQL_021);
    for (const banned of ['duration', 'streak', 'score', 'penalty', 'points', 'completion_rate', 'xp']) {
      assert.ok(!new RegExp(`\\b${banned}\\w*\\s+(INTEGER|NUMERIC|REAL|BOOLEAN|TEXT)`, 'i').test(body),
        `021 declares a ${banned} column`);
    }
  });

  test('021 verifies its own claims and adds no foreign key to the event stream', () => {
    const body = code(SQL_021);
    assert.ok(/DO \$\$/.test(body), 'no self-verification block');
    assert.ok(/RAISE EXCEPTION '021 did not create the one-live-session partial unique index/.test(body));
    assert.ok(!/REFERENCES public\.academic_events/.test(body),
      'a FK from the fact to the derivation would let the derivation refuse the fact (C.3/B.3)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7 · THE CRON ROUTE — real logic, deliberately unscheduled
// ═══════════════════════════════════════════════════════════════════════════

describe('the reaping cron route', () => {
  test('it exists, authenticates as an internal caller, and is not scheduled', () => {
    const src = read(CRON_ROUTE);
    assert.ok(/isInternalCaller/.test(src), 'the route does not authenticate');
    assert.ok(/status: 401/.test(src));
    const vercel = JSON.parse(read('vercel.json'));
    const crons = vercel.crons ?? [];
    assert.ok(!crons.some(c => String(c.path).includes('session-reaping')),
      'the sweep is wired to a clock before its first tested run');
  });

  test('it reuses the pure machine rather than implementing a second one', () => {
    const src = code(CRON_ROUTE);
    assert.ok(/runReaping/.test(src));
    assert.ok(/LIVE_STATES/.test(src), 'the live predicate is copied rather than derived');
    // A raw UPDATE here would be a second state machine.
    assert.ok(!/\.update\(\s*\{\s*state:\s*['"]/.test(src),
      'the route writes a state directly, bypassing applyGuarded');
  });

  test('its conditional update is guarded on the FROM state (E.7.1)', () => {
    const src = code(CRON_ROUTE);
    assert.ok(/\.update\(patch\)[\s\S]{0,200}\.eq\("state", from\)/.test(src),
      'the transition adapter is not a conditional update');
  });

  test('the event it emits is system-sourced, deduplicated, and carries facts only', () => {
    const src = code(CRON_ROUTE);
    assert.ok(/SESSION_CLOSED_UNVERIFIED/.test(src));
    assert.ok(/source: "system"/.test(src), 'D.2.a restricts this type to source = system');
    assert.ok(/client_event_id: `session-reap:\$\{closed\.session_id\}`/.test(src),
      'a re-run must deduplicate rather than append a second closure');
    for (const banned of ['message:', 'encouragement:', 'headline:', 'tone:']) {
      assert.ok(!src.includes(banned), `the emitted event carries ${banned}`);
    }
  });
});
