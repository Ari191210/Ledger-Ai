// M14-8 — CLIENT-CLAIM CORROBORATION, GENERALISED, AND THE IST/UTC BOUNDARY.
//
// EXECUTION_PLAN M14-8: *"Generalise the `active-close` corroboration pattern
// to all client claims; fix the IST/UTC boundary. **ADAPT.** Done when: R.10 —
// a client claim is admissible only when a server-observable fact agrees."*
//
// Two claims are under test and they are proved differently.
//
//   · **THE BOUNDARY BUG** is proved AT THE INSTANT THAT USED TO FAIL. A
//     description of a timezone bug is worth nothing; the assertions below pick
//     2026-08-16T19:30:00Z — 01:00 IST on the 17th — and require the day key to
//     read `2026-08-17`, which is precisely what the three old UTC readings got
//     wrong. `lib/client-claim-corroboration.ts` is pure arithmetic over an
//     epoch instant and a fixed offset, so this suite returns the same answer
//     on a machine in any timezone; if it were reading the host clock's zone
//     these tests would pass in Delhi and fail in CI, which is the failure mode
//     they exist to make impossible.
//
//   · **THE GENERALISATION** is proved by using the pattern on a claim that has
//     nothing to do with an active day. R.10 asks for a MODEL for *"every
//     client-originated claim"*, and a function that only ever serves one caller
//     has not been generalised — it has been renamed. So `admitClientClaim` is
//     exercised over a second, unrelated claim type with a server-written
//     source, and `lib/active-close.ts` is asserted to be a CALLER of it rather
//     than a second implementation of it.
//
//   node --test tests/corroboration.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-corroboration');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const code = rel => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let C;   // compiled lib/client-claim-corroboration
let A;   // compiled lib/active-close

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.corroboration.json'],
    { cwd: root },
  );
  // tsc emits extensionless relative specifiers; Node's ESM loader requires the
  // extension. Same rewriter as every other compiled suite in this repository —
  // omitting it is what silently skipped an entire suite once already.
  for (const e of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.js')) continue;
    const p = path.join(outDir, e.name);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
      /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
      (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
    ));
  }
});

const load = name => import(pathToFileURL(path.join(outDir, name)).href);

test('setup imports', async () => {
  C = await load('client-claim-corroboration.js');
  A = await load('active-close.js');
  // If the rewriter above is ever dropped, these throw and the suite fails
  // loudly instead of silently skipping every assertion below it.
  assert.equal(typeof C.dayKeyInZone, 'function');
  assert.equal(typeof A.corroborateActiveDay, 'function');
});

// ═══════════════════════════════════════════════════════════════════════════
// THE BOUNDARY. D.1.b: "day-boundary logic … defined ONCE, server-side, in the
// student's declared timezone."
// ═══════════════════════════════════════════════════════════════════════════

/** 01:00 IST on the 17th. The exact instant the old code got wrong. */
const LATE_NIGHT_IST = Date.parse('2026-08-16T19:30:00.000Z');
/** 23:59:59.999 IST on the 16th — the last millisecond of the IST day. */
const LAST_MS_OF_16 = Date.parse('2026-08-16T18:29:59.999Z');
/** 00:00:00.000 IST on the 17th — the first millisecond of the IST day. */
const FIRST_MS_OF_17 = Date.parse('2026-08-16T18:30:00.000Z');

describe('M14-8: the IST/UTC day boundary, asserted at the instant that failed', () => {
  test('IST is UTC+05:30, declared once as a named constant', () => {
    assert.equal(C.IST_OFFSET_MINUTES, 330);
    assert.equal(C.DECLARED_ZONE_OFFSET_MINUTES, 330);
  });

  test('THE BUG: 01:00 IST belongs to the IST day, and the UTC slice said otherwise', () => {
    assert.equal(C.dayKeyInZone(LATE_NIGHT_IST), '2026-08-17');
    // The old reading, spelled out so the regression is unmistakable.
    const oldUtcSlice = new Date(LATE_NIGHT_IST).toISOString().slice(0, 10);
    assert.equal(oldUtcSlice, '2026-08-16');
    assert.notEqual(C.dayKeyInZone(LATE_NIGHT_IST), oldUtcSlice,
      'the day key agrees with the UTC slice, so the boundary was never actually moved');
  });

  test('the boundary is exact to the millisecond, on both sides', () => {
    assert.equal(C.dayKeyInZone(LAST_MS_OF_16), '2026-08-16');
    assert.equal(C.dayKeyInZone(FIRST_MS_OF_17), '2026-08-17');
    assert.equal(FIRST_MS_OF_17 - LAST_MS_OF_16, 1, 'the two instants are not adjacent');
  });

  test('it is arithmetic, not a host-clock read — the answer does not depend on the machine', () => {
    // A host in IST and a host in UTC must agree. The function takes an epoch
    // instant and a fixed offset and reads only UTC accessors, so this is a
    // property of the code rather than of the runner.
    const src = code('lib/client-claim-corroboration.ts');
    assert.doesNotMatch(src, /getFullYear\(\)|getMonth\(\)|getDate\(\)|toLocaleDateString|toDateString/,
      'a local-zone accessor reappeared; the day key now depends on where the process runs');
    assert.match(src, /getUTCFullYear|getUTCMonth|getUTCDate/);
    // And an explicit offset argument gives an explicitly different answer.
    assert.equal(C.dayKeyInZone(LATE_NIGHT_IST, 0), '2026-08-16');
    assert.equal(C.dayKeyInZone(LATE_NIGHT_IST, 330), '2026-08-17');
  });

  test('dayKeyOf reads a stored timestamp, and never reinterprets a bare date', () => {
    assert.equal(C.dayKeyOf('2026-08-16T19:30:00.000Z'), '2026-08-17');
    // A bare date has no instant. Shifting it would move some of them a day,
    // which is how a "fix" reintroduces the bug from the other side.
    assert.equal(C.dayKeyOf('2026-08-16'), '2026-08-16');
    assert.equal(C.dayKeyOf(''), null);
    assert.equal(C.dayKeyOf(null), null);
    assert.equal(C.dayKeyOf(12345), null, 'a number was coerced into a day');
    assert.equal(C.dayKeyOf('not a date'), null);
  });

  test('the stamp is written in the declared zone, not the browser\'s', () => {
    assert.equal(A.activeDayKey(LATE_NIGHT_IST), '2026-08-17');
    const src = code('lib/active-close.ts');
    assert.doesNotMatch(src, /getFullYear\(\)|getMonth\(\)|getDate\(\)/,
      'the browser-local date triple survived; two devices can stamp two different days for one event');
    assert.ok(!src.includes('.slice(0, 10)') && !src.includes('.slice(0,10)'),
      'the UTC evidence slice survived');
  });

  test('D.1.b — clock skew is retained and is DIAGNOSTIC, never a gate', () => {
    assert.equal(C.clockSkewMs(1_000, 400), 600);
    assert.equal(C.clockSkewMs(400, 1_000), -600);
    // A student whose phone clock is an hour fast did not choose that and
    // cannot see it. The claim is still admitted; the skew is merely reported.
    const blob = activeBlob({ stampAtMs: LATE_NIGHT_IST + 3_600_000 });
    const v = A.judgeActiveDay(blob, '2026-08-17', LATE_NIGHT_IST);
    assert.equal(v.admitted, true, 'a wrong wall clock cost a student their active day');
    assert.equal(v.clockSkewMs, 3_600_000);
  });

  test('dayKeyDistance measures days without subtracting two strings', () => {
    assert.equal(C.dayKeyDistance('2026-08-17', '2026-08-16'), 1);
    assert.equal(C.dayKeyDistance('2026-08-16', '2026-08-17'), 1);
    assert.equal(C.dayKeyDistance('2026-08-17', '2026-08-17'), 0);
    assert.equal(C.dayKeyDistance('2026-09-01', '2026-08-31'), 1, 'a month boundary was mis-measured');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE END-TO-END REGRESSION: A LATE-NIGHT SESSION IS AN ACTIVE DAY.
// ═══════════════════════════════════════════════════════════════════════════

/** A blob for a student who sat a ten-question paper at 01:00 IST on the 17th.
 *  Under the old code the stamp read `2026-08-17` (browser-local), the evidence
 *  read `2026-08-16` (UTC slice) and the close read `2026-08-16` (UTC), so the
 *  day was recorded `active = false`. Every late-night session in India. */
function activeBlob(o = {}) {
  const at = o.stampAtMs ?? LATE_NIGHT_IST;
  return {
    'ledger-last-event': JSON.stringify({
      date: o.stampDay ?? C.dayKeyInZone(LATE_NIGHT_IST),
      type: o.type ?? 'practice_session',
      at,
    }),
    'ledger-papers-log': JSON.stringify([
      { date: o.paperDate ?? new Date(LATE_NIGHT_IST).toISOString(), score: 7, total: o.total ?? 10 },
    ]),
    ...(o.extra ?? {}),
  };
}

describe('M14-8: the late-night session is no longer discarded', () => {
  test('THE REGRESSION — a 01:00 IST paper makes the 17th an active day', () => {
    assert.equal(A.corroborateActiveDay(activeBlob(), '2026-08-17'), true,
      'the IST/UTC boundary bug is back: a genuine late-night session recorded active = false');
  });

  test('… and it is NOT an active day on the 16th, which is what the bug used to say', () => {
    assert.equal(A.corroborateActiveDay(activeBlob(), '2026-08-16'), false);
  });

  test('the verdict names which server-observable fact agreed', () => {
    const v = A.judgeActiveDay(activeBlob(), '2026-08-17');
    assert.equal(v.admitted, true);
    assert.deepEqual([...v.corroboratedBy], ['papers-log']);
    // Every source here reads the SAME blob the stamp came from, so the
    // weakness is reported in the verdict rather than only in a comment.
    assert.equal(v.serverWitnessed, false,
      'a blob-derived source is claiming to be server-written');
  });

  test('FORGERY: a stamp with no matching evidence does nothing (R.10)', () => {
    const bare = { 'ledger-last-event': JSON.stringify({ date: '2026-08-17', type: 'practice_session', at: LATE_NIGHT_IST }) };
    const v = A.judgeActiveDay(bare, '2026-08-17');
    assert.equal(v.admitted, false);
    assert.equal(v.refusal, 'uncorroborated');
    assert.equal(A.corroborateActiveDay(bare, '2026-08-17'), false);
  });

  test('FORGERY: evidence with no stamp does nothing either', () => {
    const noStamp = { 'ledger-papers-log': JSON.stringify([{ date: new Date(LATE_NIGHT_IST).toISOString(), total: 10 }]) };
    assert.equal(A.judgeActiveDay(noStamp, '2026-08-17').refusal, 'no-claim');
    assert.equal(A.corroborateActiveDay(null, '2026-08-17'), false);
  });

  test('a stamp for another day is refused as WRONG-DAY, not as uncorroborated', () => {
    const v = A.judgeActiveDay(activeBlob({ stampDay: '2026-08-15' }), '2026-08-17');
    assert.equal(v.admitted, false);
    assert.equal(v.refusal, 'wrong-day');
  });

  test('the ≥5 gate still holds — a two-question paper is not a graded session', () => {
    assert.equal(A.corroborateActiveDay(activeBlob({ total: 2 }), '2026-08-17'), false);
    assert.equal(A.corroborateActiveDay(activeBlob({ total: 5 }), '2026-08-17'), true);
  });

  test('each of the four evidence sources can corroborate on its own', () => {
    const day = '2026-08-17';
    const stamp = { 'ledger-last-event': JSON.stringify({ date: day, type: 'practice_session', at: LATE_NIGHT_IST }) };
    const iso = new Date(LATE_NIGHT_IST).toISOString();
    const cases = {
      'papers-log': { 'ledger-papers-log': JSON.stringify([{ date: iso, total: 10 }]) },
      'coverage-checks': { 'ledger-checks': JSON.stringify([{ date: iso }]) },
      'cleared-mistakes': { 'ledger-mistakes': JSON.stringify([{ status: 'cleared', clearedDate: iso }]) },
      'focus-last': { 'ledger-focus-last': iso },
    };
    for (const [name, evidence] of Object.entries(cases)) {
      const v = A.judgeActiveDay({ ...stamp, ...evidence }, day);
      assert.equal(v.admitted, true, `${name} stopped corroborating`);
      assert.deepEqual([...v.corroboratedBy], [name]);
    }
  });

  test('an UNCLEARED mistake does not corroborate — the qualifier is real', () => {
    const day = '2026-08-17';
    const blob = {
      'ledger-last-event': JSON.stringify({ date: day, type: 'mistake_cleared', at: LATE_NIGHT_IST }),
      'ledger-mistakes': JSON.stringify([{ status: 'open', clearedDate: new Date(LATE_NIGHT_IST).toISOString() }]),
    };
    assert.equal(A.corroborateActiveDay(blob, day), false);
  });

  test('unparseable blob values are refused, never treated as evidence', () => {
    const day = '2026-08-17';
    const stamp = { 'ledger-last-event': JSON.stringify({ date: day, type: 'practice_session', at: 1 }) };
    assert.equal(A.corroborateActiveDay({ ...stamp, 'ledger-papers-log': '{not json' }, day), false);
    assert.equal(A.corroborateActiveDay({ ...stamp, 'ledger-papers-log': '"a string"' }, day), false);
    assert.equal(A.judgeActiveDay({ 'ledger-last-event': '{broken' }, day).refusal, 'no-claim');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE GENERALISATION. R.10: *"the model for EVERY client-originated claim."*
// ═══════════════════════════════════════════════════════════════════════════

describe('M14-8: the pattern is reusable, not renamed', () => {
  test('active-close is a CALLER of the pattern, not a second copy of it', () => {
    const src = code('lib/active-close.ts');
    assert.match(src, /from "\.\/client-claim-corroboration"/);
    assert.match(src, /admitClientClaim\(\{/);
    // The discipline must not have been re-inlined under a new name: the file
    // may READ evidence, but the admission decision belongs to the module.
    assert.equal((src.match(/admitClientClaim/g) ?? []).length, 2,
      'the admission decision is taken somewhere other than admitClientClaim');
    assert.doesNotMatch(src, /return\s+true;\s*\n[\s\S]{0,40}return\s+false;/,
      'a hand-rolled corroboration ladder came back');
  });

  test('the module knows nothing about active days', () => {
    const src = code('lib/client-claim-corroboration.ts');
    for (const leak of ['ledger-last-event', 'ledger-papers-log', 'ledger-checks',
                        'ledger-mistakes', 'ledger-focus-last', 'QualifyingEventType', 'activeDay']) {
      assert.ok(!src.includes(leak), `the generalised module still knows about ${leak}`);
    }
    // Nor about I/O — three call sites in a browser, a cron and a test can only
    // share one definition if it imports nothing.
    for (const leak of ['@supabase', 'supabase', 'next/', 'localStorage', 'window.', 'Date.now(']) {
      assert.ok(!src.includes(leak), `the generalised module reaches for ${leak}`);
    }
  });

  test('R.10 on an UNRELATED claim: admitted only when a server-observable fact agrees', () => {
    // A completely different claim: "I finished a study session on this day."
    // Nothing about it is active-day-shaped, and the pattern serves it as-is.
    const serverRows = [{ session_id: 's-1', closed_at: '2026-08-16T19:45:00.000Z', state: 'VERIFIED' }];
    const source = C.dayMatchSource({
      name: 'study_sessions',
      serverWritten: true,
      records: () => serverRows,
      dateOf: r => r.closed_at,
      qualifies: r => r.state === 'VERIFIED',
    });

    const claim = { value: 's-1', claimedAtMs: LATE_NIGHT_IST, claimedDayKey: '2026-08-17' };
    const good = C.admitClientClaim({ claim, sources: [source], forDayKey: '2026-08-17', observedAtMs: LATE_NIGHT_IST });
    assert.equal(good.admitted, true);
    assert.deepEqual([...good.corroboratedBy], ['study_sessions']);
    assert.equal(good.serverWitnessed, true, 'a server-written source did not raise serverWitnessed');
    assert.equal(good.clockSkewMs, 0);

    // The same claim with the server row in a non-qualifying state is refused.
    serverRows[0].state = 'CLOSED_UNVERIFIED';
    assert.equal(C.admitClientClaim({ claim, sources: [source], forDayKey: '2026-08-17' }).refusal, 'uncorroborated');
  });

  test('REFUSAL IS THE DEFAULT — forgetting to corroborate fails closed', () => {
    const claim = { value: 'anything', claimedAtMs: 1, claimedDayKey: '2026-08-17' };
    // No sources at all. This is the shape of an author who wired up a claim
    // and forgot the evidence, and it must not admit.
    const v = C.admitClientClaim({ claim, sources: [] });
    assert.equal(v.admitted, false);
    assert.equal(v.refusal, 'uncorroborated');
    assert.deepEqual([...v.corroboratedBy], []);
  });

  test('a null or absent claim is refused, and a null VALUE is not a claim', () => {
    const always = { name: 'always', serverWritten: true, agrees: () => true };
    assert.equal(C.admitClientClaim({ claim: null, sources: [always] }).refusal, 'no-claim');
    assert.equal(
      C.admitClientClaim({ claim: { value: null, claimedAtMs: null, claimedDayKey: '2026-08-17' }, sources: [always] }).refusal,
      'unreadable-claim',
    );
    assert.equal(
      C.admitClientClaim({ claim: { value: undefined, claimedAtMs: null, claimedDayKey: null }, sources: [always] }).refusal,
      'unreadable-claim',
    );
  });

  test('every agreeing source is named, in the order offered', () => {
    const mk = (name, ok) => ({ name, agrees: () => ok });
    const v = C.admitClientClaim({
      claim: { value: 1, claimedAtMs: null, claimedDayKey: null },
      sources: [mk('a', true), mk('b', false), mk('c', true)],
    });
    assert.deepEqual([...v.corroboratedBy], ['a', 'c']);
    assert.equal(v.serverWitnessed, false, 'sources that never declared serverWritten were counted as server-written');
    assert.equal(v.clockSkewMs, null, 'a skew was invented for a claim carrying no instant');
  });

  test('a day-scoped source cannot agree with a claim that names no day', () => {
    const source = C.dayMatchSource({
      name: 'rows', records: () => [{ d: '2026-08-17' }], dateOf: r => r.d,
    });
    assert.equal(source.agrees({ value: 1, claimedAtMs: null, claimedDayKey: null }), false);
    assert.equal(source.agrees({ value: 1, claimedAtMs: null, claimedDayKey: '2026-08-17' }), true);
    assert.equal(source.agrees({ value: 1, claimedAtMs: null, claimedDayKey: '2026-08-18' }), false);
  });

  test('dayMatchSource resolves record dates in the declared zone too', () => {
    // The record is stored as a UTC instant on the 16th; in IST it is the 17th.
    // A source that sliced the string would disagree with the stamp — that
    // slice was one third of the bug.
    const source = C.dayMatchSource({
      name: 'rows', records: () => [{ d: '2026-08-16T19:30:00.000Z' }], dateOf: r => r.d,
    });
    assert.equal(source.agrees({ value: 1, claimedAtMs: null, claimedDayKey: '2026-08-17' }), true);
    assert.equal(source.agrees({ value: 1, claimedAtMs: null, claimedDayKey: '2026-08-16' }), false);
  });

  test('isAdmitted is the deliberate discard of a verdict, not the default read', () => {
    const admitted = A.judgeActiveDay(activeBlob(), '2026-08-17');
    assert.equal(C.isAdmitted(admitted), true);
    assert.equal(C.isAdmitted({ admitted: false, refusal: 'no-claim', corroboratedBy: [] }), false);
  });
});
