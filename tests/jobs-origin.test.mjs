// ═══════════════════════════════════════════════════════════════════════════
// The job runner must never call itself across a redirect
//
// ── THE DEFECT THIS LOCKS DOWN ───────────────────────────────────────────
// `lib/jobs.ts` dispatched to `process.env.NEXT_PUBLIC_SITE_URL ||
// "https://studyledger.in"`. That env var is not set in production, so every
// dispatch went to the APEX, which 308-redirects to `www.studyledger.in`.
//
// `fetch` follows redirects by default, and per the Fetch spec a redirect to
// a DIFFERENT HOST strips the `Authorization` header. So each job arrived at
// its send route with no credential, and `isInternalCaller()` correctly
// refused it.
//
// Nothing about this was visible from outside. The cron fired on schedule,
// the dispatcher ran, jobs left the queue — and all fifteen of them landed in
// `failed` with `Error: Authentication required.` Fifteen welcome emails
// between 19 July and 20 August were silently never sent.
//
// Confirmed against an echo service before fixing: a same-host redirect keeps
// the header, a cross-host redirect drops it.
//
//   node --test tests/jobs-origin.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = fs.readFileSync(path.join(root, "lib", "jobs.ts"), "utf8");

/**
 * `lib/jobs.ts` is TypeScript and imports the Supabase client at module scope,
 * so it cannot be imported here without a build. `normaliseOrigin` is pure and
 * self-contained, so its body is lifted out of the source and evaluated. That
 * keeps the test honest: it exercises the SHIPPED text, and fails loudly if
 * the function is renamed or restructured rather than passing against a stale
 * copy.
 */
const normaliseOrigin = (() => {
  const m = /export function normaliseOrigin[\s\S]*?\n\}/.exec(SRC);
  assert.ok(m, "normaliseOrigin must exist in lib/jobs.ts");
  const body = m[0]
    .replace(/^export /, "")
    .replace(/\(raw: string \| undefined\): string/, "(raw)")   // signature
    .replace(/^\s*let url: URL;\s*$/m, "  let url;");            // local decl
  assert.equal(/:\s*(string|URL)\b/.test(body), false,
    "a type annotation survived the strip; update this shim to match lib/jobs.ts");
  return new Function(`${body}; return normaliseOrigin;`)();
})();

describe("the dispatch origin", () => {
  test("an unset NEXT_PUBLIC_SITE_URL falls back to the WWW host, not the apex", () => {
    // The apex is what broke it. The fallback must not reintroduce it.
    assert.equal(normaliseOrigin(undefined), "https://www.studyledger.in");
    assert.equal(normaliseOrigin(""), "https://www.studyledger.in");
  });

  test("an apex value is corrected rather than trusted", () => {
    // A config value that silently disables every outbound job is not worth
    // trusting, so the bare apex is rewritten even when set explicitly.
    assert.equal(normaliseOrigin("https://studyledger.in"), "https://www.studyledger.in");
    assert.equal(normaliseOrigin("https://studyledger.in/"), "https://www.studyledger.in");
  });

  test("the canonical host passes through untouched", () => {
    assert.equal(normaliseOrigin("https://www.studyledger.in"), "https://www.studyledger.in");
  });

  test("preview and local origins are left exactly as given", () => {
    // Only the apex redirects. Rewriting anything else would break previews.
    assert.equal(normaliseOrigin("https://studyledger-staging.vercel.app"),
      "https://studyledger-staging.vercel.app");
    assert.equal(normaliseOrigin("http://localhost:3000"), "http://localhost:3000");
  });

  test("an unparseable value falls back rather than throwing", () => {
    // A malformed env var must not take the whole job runner down.
    assert.equal(normaliseOrigin("not a url"), "https://www.studyledger.in");
  });
});

describe("nothing reintroduces the apex on an authenticated call", () => {
  test("lib/jobs.ts no longer defaults to the bare apex", () => {
    assert.equal(
      /NEXT_PUBLIC_SITE_URL\s*\|\|\s*"https:\/\/studyledger\.in"/.test(SRC), false,
      "the `|| apex` fallback is back in lib/jobs.ts; it strips Authorization on the redirect",
    );
  });

  test("every dispatch sends the credential and starts from the normalised base", () => {
    // If a new dispatch branch is added that builds its own URL, this catches
    // it: each fetch in the file must use the shared `base`.
    const fetches = [...SRC.matchAll(/fetch\(\s*`\$\{(\w+)\}([^`]*)`/g)];
    assert.ok(fetches.length >= 4, "expected the dispatch calls to be found");
    for (const [, varName, pathPart] of fetches) {
      assert.equal(varName, "base",
        `a dispatch to ${pathPart} builds its own origin instead of using the normalised base`);
    }
  });
});
