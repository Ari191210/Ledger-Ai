// CSP: a host allowed to RECEIVE data is not thereby allowed to EXECUTE code.
//
// PostHog was listed in connect-src but not script-src, so the browser refused
// config.js, the session recorder, surveys and web-vitals on every page load.
// Analytics looked configured and collected nothing. Nobody noticed because a
// blocked script is a console warning, not a broken page.
//
// These tests pin the shape of that fix: the asset host may load script, the
// ingestion host may not, and anything reachable by connect-src is a
// deliberate choice rather than an accident of copy-paste.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");

/** One CSP directive, as the array literal in next.config.mjs spells it. */
function directive(name) {
  // Two spellings exist in the config: a plain string entry, and (for
  // connect-src) an array of strings joined at build time. The array form is
  // tried FIRST, because the plain-string regex would otherwise match only
  // that array's first element and silently report a truncated directive.
  const block = new RegExp(`\\[\\s*"${name} [\\s\\S]*?\\]\\.join`, "").exec(CONFIG);
  if (block) {
    // Comments are stripped LINE BY LINE, only where `//` follows whitespace.
    // A naive /\/\/[^\n]*/ also eats the `//` inside every https:// URL, which
    // silently reduced this directive to "connect-src 'self' https: https:".
    return block[0]
      .split("\n")
      .map(line => line.replace(/(^|\s)\/\/.*$/, ""))
      .join(" ")
      .replace(/["\[\],]|\.join/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const single = new RegExp(`"${name} ([^"]*)"`).exec(CONFIG);
  assert.ok(single, `${name} must exist in the CSP`);
  return single[1];
}

describe("CSP lets PostHog load, not just phone home", () => {
  test("the PostHog asset host may serve script", () => {
    // Without this the library never loads, so nothing is ever measured.
    assert.match(directive("script-src"), /https:\/\/us-assets\.i\.posthog\.com/);
  });

  test("the PostHog INGESTION host may not serve script", () => {
    // us.i.posthog.com receives event data. A host we post to has no business
    // executing code in the page, and adding it would widen the XSS surface
    // for no functional gain.
    const scriptSrc = directive("script-src");
    assert.equal(
      /https:\/\/us\.i\.posthog\.com/.test(scriptSrc),
      false,
      "the ingestion endpoint must not be allowed to execute script",
    );
  });

  test("both PostHog hosts remain reachable by connect-src", () => {
    // Loading the library is useless if the events cannot be sent.
    const connectSrc = directive("connect-src");
    assert.match(connectSrc, /https:\/\/us\.i\.posthog\.com/);
    assert.match(connectSrc, /https:\/\/us-assets\.i\.posthog\.com/);
  });

  test("object-src stays none and base-uri stays self", () => {
    // The two directives that most cheaply prevent injection escalating.
    assert.match(CONFIG, /"object-src 'none'"/);
    assert.match(CONFIG, /"base-uri 'self'"/);
  });

  test("no wildcard host is ever allowed to execute script", () => {
    // 'self' plus named hosts only. A wildcard in script-src would make every
    // other rule here decorative.
    const scriptSrc = directive("script-src");
    assert.equal(
      /\*/.test(scriptSrc),
      false,
      `script-src must name its hosts explicitly, got: ${scriptSrc}`,
    );
  });
});
