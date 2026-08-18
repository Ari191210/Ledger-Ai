// M4 — server and edge authentication.
//
// Architecture R.1: "every product route that renders student data must be
// authenticated before it renders, at the server or the edge." T11: a
// client-only guard "stops being survivable the moment server components read
// student data."
//
// Two kinds of assertion live here, and the difference matters:
//
//   1. BEHAVIOURAL, against the real compiled `lib/auth-routes.ts`. The auth
//      decision is a pure function of (pathname, cookie names, enforcement), so
//      both directions are provable without a live Supabase project: an
//      unauthenticated request to a protected route is DENIED, and an
//      authenticated one — carrying a realistic `sb-<ref>-auth-token` cookie in
//      both its single and chunked forms — is ALLOWED.
//
//   2. STRUCTURAL, over source and config, for the claims that are about the
//      shape of the tree rather than the value of an expression: that the rate
//      limiter survived intact, that the matcher covers the student routes,
//      that the client guard cannot render children before a decision, and that
//      no code reads the retired `user_data` service columns. Same convention
//      as tests/home-shell.test.mjs and tests/m0-integrity-fences.test.mjs.
//
//   node --test tests/auth-middleware.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-auth');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

let A;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.auth.json'],
    { cwd: root },
  );
});

test('setup imports', async () => {
  A = await import(pathToFileURL(path.join(outDir, 'auth-routes.js')).href);
  assert.equal(typeof A.authDecision, 'function');
});

// A realistic signed-in cookie jar, taken from what `@supabase/ssr@0.12.4`
// actually writes rather than from a guess:
//
//   · `createStorageFromOptions` (browser branch) names cookies after the auth
//     storage key verbatim.
//   · `supabase-js` derives that key as
//     `sb-${new URL(url).hostname.split('.')[0]}-auth-token`.
//   · `createChunks()` emits one cookie under the bare key when the encoded
//     value fits MAX_CHUNK_SIZE (3180), and `key.0`, `key.1`, … when it does
//     not — which is the common case, since the value is base64url-encoded.
//
// Both forms are exercised, plus the assorted non-auth cookies a real browser
// carries alongside them.
const REF = 'abcdefghijklmnopqrst';
const SIGNED_IN = [`sb-${REF}-auth-token`, 'ph_phc_1_posthog', '__vercel_live_token'];
const SIGNED_IN_CHUNKED = [`sb-${REF}-auth-token.0`, `sb-${REF}-auth-token.1`];
const SIGNED_OUT = ['ph_phc_1_posthog', '__vercel_live_token', 'ledger-density'];

const PROTECTED_SAMPLE = [
  '/home',
  '/home/anything',
  '/dashboard',
  '/dashboard/profile',
  '/dashboard/saved',
  '/console',
  '/console/ai',
  '/console/analytics',
  '/tools',
  '/tools/exam-practice',
  '/tools/learn-lab',
  '/tools/grade-tracker',
  '/onboard',
];

const PUBLIC_SAMPLE = [
  '/',
  '/auth',
  '/auth/callback',
  '/auth/reset',
  '/pricing',
  '/faq',
  '/legal',
  '/legal/privacy',
  '/legal/terms',
  '/legal/data',
  '/limit',
  '/parent/ABC123',
  '/admin',
];

describe('M4-1 — the deny direction', () => {
  test('an unauthenticated request to every protected route is denied', () => {
    for (const pathname of PROTECTED_SAMPLE) {
      const v = A.authDecision({ pathname, cookieNames: SIGNED_OUT, enforce: true });
      assert.equal(v.action, 'redirect', `${pathname} must not be allowed signed out`);
      assert.equal(v.location, '/auth');
      assert.equal(v.denied, true);
    }
  });

  test('a request with NO cookies at all is denied', () => {
    const v = A.authDecision({ pathname: '/home', cookieNames: [], enforce: true });
    assert.equal(v.action, 'redirect');
  });

  test('the PKCE code-verifier cookie is not a session — this is the fail-open case', () => {
    // Written at the START of a sign-in attempt, before a session exists.
    // Accepting it would let anyone who merely opened the sign-in page through.
    const v = A.authDecision({
      pathname: '/home',
      cookieNames: [`sb-${REF}-auth-token-code-verifier`],
      enforce: true,
    });
    assert.equal(v.action, 'redirect');
    assert.equal(A.isSessionCookieName(`sb-${REF}-auth-token-code-verifier`), false);
  });

  test('every PKCE key @supabase/ssr 0.12 writes is excluded, not just the fixed one', () => {
    // src/cookies.ts names three, and a half-started sign-in can carry all
    // three at once. None is a session.
    const verifiers = [
      `sb-${REF}-auth-token-code-verifier`,
      `sb-${REF}-auth-token-flow-abcd1234efgh-code-verifier`,
      `sb-${REF}-auth-token-flows-code-verifier`,
      // The verifier is chunked by the same chunker as the session.
      `sb-${REF}-auth-token-code-verifier.0`,
      `sb-${REF}-auth-token-flows-code-verifier.0`,
    ];
    for (const name of verifiers) {
      assert.equal(A.isSessionCookieName(name), false, `${name} must not read as a session`);
    }
    // …and all of them together still do not open the gate.
    const v = A.authDecision({ pathname: '/home', cookieNames: verifiers, enforce: true });
    assert.equal(v.action, 'redirect');
    assert.equal(v.denied, true);
  });

  test('a lookalike cookie name does not pass', () => {
    for (const name of [
      'sb-auth-token',
      'sb--auth-token',
      'auth-token',
      'xsb-abc-auth-token',
      `sb-${REF}-auth-token-extra`,
      `sb-${REF}-refresh-token`,
    ]) {
      assert.equal(A.isSessionCookieName(name), false, `${name} must not read as a session`);
    }
  });
});

describe('M4-1 — the allow direction', () => {
  test('an AUTHENTICATED request to every protected route succeeds', () => {
    for (const pathname of PROTECTED_SAMPLE) {
      const v = A.authDecision({ pathname, cookieNames: SIGNED_IN, enforce: true });
      assert.equal(v.action, 'allow', `${pathname} must stay reachable signed in`);
      assert.equal(v.denied, false);
    }
  });

  test('a chunked session cookie is a session', () => {
    for (const pathname of PROTECTED_SAMPLE) {
      const v = A.authDecision({ pathname, cookieNames: SIGNED_IN_CHUNKED, enforce: true });
      assert.equal(v.action, 'allow', `${pathname} must allow a chunked session`);
    }
    assert.equal(A.isSessionCookieName(`sb-${REF}-auth-token.0`), true);
    assert.equal(A.isSessionCookieName(`sb-${REF}-auth-token.11`), true);
  });

  test('the pre-2.0 cookie name still reads as a session', () => {
    const v = A.authDecision({
      pathname: '/home',
      cookieNames: ['supabase-auth-token'],
      enforce: true,
    });
    assert.equal(v.action, 'allow');
  });
});

describe('M4-1 — the cookie the browser actually writes', () => {
  // The deny/allow matrix above is only worth anything if the cookie name it
  // matches is the cookie the product really sets. These assertions tie the
  // recognizer to the real derivation rather than to the fixture.
  const client = code('lib/supabase.ts');
  const provider = code('components/auth-provider.tsx');

  test('the browser client is on cookie storage, not localStorage', () => {
    assert.match(client, /from "@supabase\/ssr"/);
    assert.match(client, /createBrowserClient\(/);
    // The old localStorage-backed construction must be gone, or the edge is
    // blind again and the whole gate is decorative.
    assert.ok(
      !/createClient\(/.test(client),
      'lib/supabase.ts must not construct the localStorage-backed client',
    );
    assert.ok(!/from "@supabase\/supabase-js"/.test(client));
  });

  test('the callback page keeps ownership of the code exchange', () => {
    // createBrowserClient defaults detectSessionInUrl to true in a browser.
    // app/auth/callback/page.tsx calls exchangeCodeForSession by hand; letting
    // the SDK also try would race it and consume the verifier twice.
    assert.match(client, /detectSessionInUrl:\s*false/);
    assert.match(read('app/auth/callback/page.tsx'), /exchangeCodeForSession\(/);
  });

  test('the storage key is derived exactly as supabase-js derives it', () => {
    // supabase-js: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`.
    // The migration reads localStorage under this key, so a divergence here
    // silently signs every existing student out.
    assert.match(client, /new URL\(SUPABASE_URL\)\.hostname\.split\("\."\)\[0\]/);
    assert.match(client, /sb-\$\{[^}]*\}-auth-token/);
  });

  test('the derived key for a real project URL is recognised as a session', () => {
    const derived = `sb-${new URL(`https://${REF}.supabase.co`).hostname.split('.')[0]}-auth-token`;
    assert.equal(derived, `sb-${REF}-auth-token`);
    assert.equal(A.isSessionCookieName(derived), true);
    assert.equal(A.isSessionCookieName(`${derived}.0`), true);
    // A hyphenated (custom/self-hosted) host must not read as signed out.
    assert.equal(A.isSessionCookieName('sb-db-prod-auth-token'), true);
    assert.equal(A.isSessionCookieName('sb-db-prod-auth-token-code-verifier'), false);
  });

  test('an existing localStorage session is migrated, not discarded', () => {
    assert.match(client, /migrateLegacyLocalSession/);
    assert.match(client, /setSession\(/);
    assert.match(client, /localStorage\.removeItem\(AUTH_STORAGE_KEY\)/);
    // A cookie session already present must win — replaying the stale
    // localStorage copy over it would downgrade a fresh session to an old one.
    assert.match(client, /if \(!data\.session\)/);
  });

  test('the migration completes before the first session read', () => {
    // Otherwise getSession answers "signed out" for a student who is not, and
    // AuthGuard bounces them to /auth on the deploy.
    const migrateAt = provider.indexOf('migrateLegacyLocalSession()');
    const getSessionAt = provider.indexOf('supabase.auth.getSession()');
    assert.ok(migrateAt > -1, 'the provider must run the migration');
    assert.ok(getSessionAt > -1, 'the provider must still read the session');
    assert.ok(migrateAt < getSessionAt, 'the migration must be awaited first');
    assert.match(provider, /await migrateLegacyLocalSession\(\)/);
  });
});

describe('M4-1 — public routes stay public', () => {
  test('every public route is reachable with no session, under enforcement', () => {
    for (const pathname of PUBLIC_SAMPLE) {
      const v = A.authDecision({ pathname, cookieNames: SIGNED_OUT, enforce: true });
      assert.equal(v.action, 'allow', `${pathname} must remain public`);
      assert.equal(v.denied, false, `${pathname} must not even be classified as denied`);
    }
  });

  test('/parent/<code> is public permanently — a parent has no account', () => {
    assert.equal(A.isProtectedRoute('/parent/XYZ789'), false);
  });

  test('protection matches on segment boundaries, not on string prefixes', () => {
    for (const pathname of ['/homepage', '/toolsmith', '/consoles', '/dashboards', '/onboarding']) {
      assert.equal(A.isProtectedRoute(pathname), false, `${pathname} is not a student route`);
    }
  });

  test('/api/* is never answered with an HTML redirect to the sign-in page', () => {
    for (const pathname of ['/api/ai', '/api/track', '/api/parent/ABC', '/api/jobs/enqueue']) {
      assert.equal(A.isProtectedRoute(pathname), false);
      assert.equal(A.authDecision({ pathname, cookieNames: [], enforce: true }).action, 'allow');
    }
  });
});

describe('M4-1 — the enforcement gate', () => {
  test('OFF by default, and only "1" turns it on', () => {
    assert.equal(A.isEnforcementEnabled({}), false);
    assert.equal(A.isEnforcementEnabled({ AUTH_MIDDLEWARE_ENFORCE: '0' }), false);
    assert.equal(A.isEnforcementEnabled({ AUTH_MIDDLEWARE_ENFORCE: 'true' }), false);
    assert.equal(A.isEnforcementEnabled({ AUTH_MIDDLEWARE_ENFORCE: '' }), false);
    assert.equal(A.isEnforcementEnabled({ AUTH_MIDDLEWARE_ENFORCE: '1' }), true);
  });

  test('with enforcement off the deny is still COMPUTED, only not acted on', () => {
    // This is what makes the flag auditable rather than a fail-open: the
    // verdict is identical, and only the action is suppressed.
    const v = A.authDecision({ pathname: '/home', cookieNames: SIGNED_OUT, enforce: false });
    assert.equal(v.denied, true);
    assert.equal(v.observedOnly, true);
    assert.equal(v.action, 'allow');
  });

  test('enforcement off never changes the verdict for an authenticated request', () => {
    for (const pathname of PROTECTED_SAMPLE) {
      const on = A.authDecision({ pathname, cookieNames: SIGNED_IN, enforce: true });
      const off = A.authDecision({ pathname, cookieNames: SIGNED_IN, enforce: false });
      assert.deepEqual(on, off, `${pathname} must behave identically signed in either way`);
    }
  });
});

describe('M4-1 — middleware.ts wiring', () => {
  const mw = code('middleware.ts');

  test('the rate limiter is unchanged: every rule, limit and window survives', () => {
    // Written as literal source text, digit separators and all, so an edit to
    // any limit or window fails this test rather than being absorbed by a
    // tolerant regex.
    const expected = [
      ['/api/ai', '20', '60_000'],
      ['/api/auth/google', '5', '60_000'],
      ['/api/auth/send-reset', '3', '600_000'],
      ['/api/welcome', '3', '60_000'],
      ['/api/send-report', '5', '60_000'],
      ['/api/parent', '10', '60_000'],
      ['/api/admin/generate-hash', '2', '60_000'],
      ['/api/track', '60', '60_000'],
      ['/api/errors', '30', '60_000'],
      ['/api/jobs/enqueue', '5', '60_000'],
    ];
    for (const [prefix, limit, windowMs] of expected) {
      const re = new RegExp(
        `prefix:\\s*"${prefix}"\\s*,\\s*limit:\\s*${limit}\\s*,\\s*windowMs:\\s*${windowMs}\\s*\\}`,
      );
      assert.ok(re.test(mw), `rate rule for ${prefix} (${limit}/${windowMs}) must survive M4`);
    }
    // Exactly ten rules — M4 added none and removed none.
    assert.equal((mw.match(/prefix:\s*"/g) ?? []).length, 10);
  });

  test('the 429 response and its four headers survive', () => {
    assert.match(mw, /status:\s*429/);
    for (const h of ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After']) {
      assert.ok(mw.includes(h), `${h} must still be sent`);
    }
    assert.match(mw, /Too many requests/);
  });

  test('the CRON_SECRET bypass survives', () => {
    assert.match(mw, /CRON_SECRET/);
    assert.match(mw, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  });

  test('the matcher covers every protected segment, bare and with subpaths', () => {
    for (const m of [
      '"/home"', '"/home/:path*"',
      '"/dashboard"', '"/dashboard/:path*"',
      '"/console"', '"/console/:path*"',
      '"/tools"', '"/tools/:path*"',
      '"/onboard"',
    ]) {
      assert.ok(mw.includes(m), `matcher must include ${m}`);
    }
  });

  test('the matcher still covers every API surface it covered before M4', () => {
    for (const m of [
      '"/api/ai/:path*"', '"/api/auth/:path*"', '"/api/welcome"', '"/api/send-report"',
      '"/api/parent/:path*"', '"/api/admin/generate-hash"', '"/api/track"', '"/api/errors"',
      '"/api/jobs/enqueue"',
    ]) {
      assert.ok(mw.includes(m), `matcher must still include ${m}`);
    }
  });

  test('the matcher does not protect a public route', () => {
    for (const m of ['"/pricing"', '"/faq"', '"/legal', '"/limit"', '"/parent/:path*"', '"/admin"']) {
      assert.ok(!mw.includes(m), `${m} must not be in the page-auth matcher`);
    }
  });

  test('middleware delegates the decision rather than reimplementing it', () => {
    assert.match(mw, /from "@\/lib\/auth-routes"/);
    assert.match(mw, /authDecision\(/);
    // A second, divergent notion of "protected" in the middleware would be the
    // classic way this gate rots.
    assert.ok(!/PROTECTED_PREFIXES\s*=/.test(mw), 'the prefix list has exactly one definition');
  });
});

describe('M4-2 — the client guard', () => {
  const guard = code('components/auth-guard.tsx');

  test('children are rendered from exactly one place, and only when allowed', () => {
    assert.equal((guard.match(/\{children\}/g) ?? []).length, 1);
    assert.match(guard, /if \(decision === "denied"\) return null;/);
    assert.match(guard, /decision === "pending"/);
  });

  test('the decision is exhaustive and defaults to not-allowed', () => {
    // `loading ? pending : user ? allowed : denied` — there is no state in
    // which a null user reaches `allowed`.
    assert.match(guard, /loading \? "pending" : user \? "allowed" : "denied"/);
  });

  test('a denied visitor cannot press Back into the route', () => {
    assert.match(guard, /router\.replace\("\/auth"\)/);
    assert.ok(!/router\.push\(/.test(guard), 'push would leave the protected URL in history');
  });

  test('a denied visitor is not shown a loading state that claims work', () => {
    // The old guard rendered "Loading…" while redirecting. PRINCIPLES §7.
    const deniedBranch = guard.slice(guard.lastIndexOf('=== "denied"'));
    assert.ok(!deniedBranch.includes('Loading'), 'the denied branch must not say Loading');
    // …and the only branch that DOES say Loading is `pending`.
    const pendingBranch = guard.slice(guard.lastIndexOf('=== "pending"'), guard.lastIndexOf('=== "denied"'));
    assert.ok(pendingBranch.includes('Loading'), 'the pending branch is the one that may say Loading');
  });

  test('it is still mounted on all four student shells', () => {
    for (const rel of [
      'app/home/layout.tsx',
      'app/tools/layout.tsx',
      'app/dashboard/layout.tsx',
      'app/console/layout.tsx',
    ]) {
      const src = read(rel);
      assert.match(src, /from "@\/components\/auth-guard"/, `${rel} must import the guard`);
      assert.match(src, /<AuthGuard>/, `${rel} must mount the guard`);
    }
  });

  test('/onboard carries its own equivalent guard', () => {
    // It has no layout, so the page itself must refuse to render for a null
    // user rather than relying on the middleware flag that is off today.
    const onboard = code('app/onboard/page.tsx');
    assert.match(onboard, /if \(authLoading \|\| !user\) return/);
    assert.match(onboard, /if \(!user\) \{ router\.push\("\/auth"\); return; \}/);
  });
});

describe('M4-3 — service state is separated from student-writable state', () => {
  const migration = read('supabase/migrations/011_service_state.sql');

  test('both tables are created with RLS on and no policy at all', () => {
    for (const t of ['notification_state', 'parent_alert_state']) {
      assert.ok(
        new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\b`).test(migration),
        `${t} must be created`,
      );
      assert.ok(
        new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`).test(migration),
        `${t} must enable RLS`,
      );
      assert.ok(
        new RegExp(`REVOKE ALL ON TABLE ${t} FROM anon, authenticated`).test(migration),
        `${t} must revoke the student roles`,
      );
    }
    // The whole point: a policy here would re-expose the state.
    assert.ok(!/CREATE POLICY/.test(migration), 'service-state tables carry zero policies');
  });

  test('the migration is additive — it drops nothing', () => {
    const sql = migration
      .split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');
    assert.ok(!/DROP COLUMN/.test(sql), 'the column drop is a separate, later run');
    assert.ok(!/DROP TABLE/.test(sql));
    assert.ok(/ALTER TABLE user_data DROP COLUMN IF EXISTS "notifState"/.test(migration),
      'the follow-up drop is written down, commented, so it is not re-derived');
  });

  test('it registers itself in the M1 migration ledger', () => {
    assert.match(migration, /-- >>> MIGRATION LEDGER REGISTRATION <<</);
    assert.match(migration, /supabase_migrations\.record_migration\(\s*'011'/);
  });

  test('no code reads or writes the retired user_data columns any more', () => {
    for (const rel of [
      'app/api/cron/notifications/route.ts',
      'app/api/cron/risk-alerts/route.ts',
      'lib/user-data.ts',
    ]) {
      const src = code(rel);
      assert.ok(!/notifState/.test(src), `${rel} must not reference user_data.notifState`);
      assert.ok(!/parentAlerts/.test(src), `${rel} must not reference user_data.parentAlerts`);
    }
  });

  test('the cron routes go to the service-role tables through supabaseServer', () => {
    const notif = code('app/api/cron/notifications/route.ts');
    assert.match(notif, /from\("notification_state"\)/);
    assert.match(notif, /supabaseServer/);
    assert.ok(!/from\("notification_state"\)[\s\S]{0,200}?supabase\b(?!Server)/.test(notif));

    const risk = code('app/api/cron/risk-alerts/route.ts');
    assert.match(risk, /from\("parent_alert_state"\)/);
    assert.match(risk, /supabaseServer/);
  });

  test('a failed state read fails the run rather than degrading to empty state', () => {
    // Empty state means "nothing sent yet". Treating a read error as empty
    // would re-fire every notification and every parent alert the system had
    // already suppressed — the exact harm M4-3 exists to prevent.
    const notif = code('app/api/cron/notifications/route.ts');
    assert.match(notif, /if \(nsErr\) return NextResponse\.json\(\s*\{ error: nsErr\.message \}, \{ status: 500 \}\s*\);/);

    const risk = code('app/api/cron/risk-alerts/route.ts');
    assert.match(risk, /if \(stErr\) return NextResponse\.json\(\s*\{ error: stErr\.message \}, \{ status: 500 \}\s*\);/);
  });

  test('the UserData type no longer declares service-owned fields', () => {
    const ud = code('lib/user-data.ts');
    assert.ok(!/notifState\?:/.test(ud));
    assert.ok(!/parentAlerts\?:/.test(ud));
  });
});
