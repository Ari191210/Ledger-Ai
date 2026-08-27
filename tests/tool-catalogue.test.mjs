import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// TOOL CATALOGUE INTEGRITY
//
// There are three independent lists of tools in this codebase:
//
//   1. lib/tools-registry.ts   — drives /tools and the command palette
//   2. app/dashboard/page.tsx  — a second hardcoded catalogue with tiers
//   3. app/tools/<slug>/       — the routes that actually exist
//
// They have drifted before. The nav sidebar once carried 23 dead links after
// the June consolidation, and at the time these tests were written the
// dashboard still linked to /tools/doubt and /tools/notes (both 404, merged
// into learn-lab) while omitting exam-day entirely.
//
// Any hardcoded slug that does not resolve to a route is a 404 shipped to a
// student. These tests fail the build instead.
// ═══════════════════════════════════════════════════════════════════════════

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = p => fs.readFileSync(path.join(root, p), "utf8");
const slugsIn = src => [...src.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);

const routes = new Set(
  fs.readdirSync(path.join(root, "app", "tools"), { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name),
);

const registrySrc  = read("lib/tools-registry.ts");
const dashboardSrc = read("app/dashboard/page.tsx");

const registrySlugs  = slugsIn(registrySrc);
// The dashboard file also contains a `slug: string` type declaration and
// unrelated helper signatures; only the catalogue literals carry a title.
const dashboardSlugs = [...dashboardSrc.matchAll(/\{\s*slug:\s*"([^"]+)",\s*ttl:/g)].map(m => m[1]);

// The categories the /tools page iterates. Every tool must fall into one of
// them, or it renders nowhere despite being in the registry.
const catOrder = [...registrySrc.matchAll(/CAT_ORDER[^=]*=\s*\[([^\]]+)\]/g)]
  .flatMap(m => [...m[1].matchAll(/"([A-Z]+)"/g)].map(x => x[1]));
const registryCats = [...registrySrc.matchAll(/cat:\s*"([A-Z]+)"/g)].map(m => m[1]);

describe("tool catalogue integrity", () => {
  test("registry is non-empty and route directories were found", () => {
    assert.ok(registrySlugs.length > 20, `registry parsed only ${registrySlugs.length} slugs`);
    assert.ok(routes.size > 20, `found only ${routes.size} tool routes`);
  });

  test("every registry tool has a route", () => {
    const dead = registrySlugs.filter(s => !routes.has(s));
    assert.deepEqual(dead, [], `registry tools with no route: ${dead.join(", ")}`);
  });

  test("every dashboard tool has a route", () => {
    const dead = dashboardSlugs.filter(s => !routes.has(s));
    assert.deepEqual(dead, [], `dashboard tools with no route: ${dead.join(", ")}`);
  });

  test("every route is listed in the registry", () => {
    const orphan = [...routes].filter(s => !registrySlugs.includes(s));
    assert.deepEqual(orphan, [], `routes missing from the registry: ${orphan.join(", ")}`);
  });

  test("the dashboard catalogue and the registry agree", () => {
    const missing = registrySlugs.filter(s => !dashboardSlugs.includes(s));
    const extra   = dashboardSlugs.filter(s => !registrySlugs.includes(s));
    assert.deepEqual(missing, [], `in the registry but not the dashboard: ${missing.join(", ")}`);
    assert.deepEqual(extra,   [], `in the dashboard but not the registry: ${extra.join(", ")}`);
  });

  test("no duplicate slugs in the registry", () => {
    const seen = new Set();
    const dupes = registrySlugs.filter(s => seen.size === seen.add(s).size);
    assert.deepEqual(dupes, [], `duplicate registry slugs: ${dupes.join(", ")}`);
  });

  test("every tool's category is rendered by the /tools page", () => {
    assert.ok(catOrder.length > 0, "could not parse CAT_ORDER");
    const orphan = [...new Set(registryCats)].filter(c => !catOrder.includes(c));
    assert.deepEqual(orphan, [], `categories no page iterates: ${orphan.join(", ")}`);
  });

  test("every tool declares a title, subtitle and category", () => {
    const entries = [...registrySrc.matchAll(/\{\s*slug:\s*"([^"]+)"[^}]*\}/g)].map(m => m[0]);
    const bad = entries.filter(e => !/title:\s*"[^"]+"/.test(e) || !/subtitle:\s*"[^"]+"/.test(e) || !/cat:\s*"[A-Z]+"/.test(e));
    assert.deepEqual(bad, [], `incomplete registry entries: ${bad.join(" | ")}`);
  });

  test("hardcoded /tools/<slug> links resolve to a real route", () => {
    // Deep links may carry a query string (?tab=doubt) — strip it before
    // checking the slug.
    const files = [];
    const walk = dir => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "node_modules" && !e.name.startsWith(".")) walk(full);
        } else if (/\.tsx?$/.test(e.name)) files.push(full);
      }
    };
    walk(path.join(root, "app"));
    walk(path.join(root, "components"));

    const broken = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/["'`]\/tools\/([a-z0-9-]+)(\?[^"'`]*)?["'`]/g)) {
        if (!routes.has(m[1])) broken.push(`${path.relative(root, f)} → /tools/${m[1]}`);
      }
    }
    assert.deepEqual(broken, [], `dead tool links:\n  ${broken.join("\n  ")}`);
  });
});

// ── The search the /tools page actually runs ───────────────────────────────
describe("tool search", () => {
  let reg;

  before(async () => {
    // Compile into a directory of our own. The score-projection suite owns
    // .test-build and rewrites the files in it after compiling; sharing that
    // directory makes the two suites race and fail intermittently.
    const outDir = path.join(root, ".test-build-registry");
    execFileSync(
      process.execPath,
      [
        path.join(root, "node_modules", "typescript", "bin", "tsc"),
        path.join(root, "lib", "tools-registry.ts"),
        "--outDir", outDir,
        "--module", "es2020",
        "--target", "es2020",
        "--moduleResolution", "node",
        "--skipLibCheck",
      ],
      { cwd: root },
    );
    reg = await import(pathToFileURL(path.join(outDir, "tools-registry.js")).href);
  });

  test("an empty query returns everything", () => {
    assert.equal(reg.searchTools("").length, reg.TOOLS_REGISTRY.length);
    assert.equal(reg.searchTools("   ").length, reg.TOOLS_REGISTRY.length);
  });

  test("matches on title, slug and keyword", () => {
    assert.ok(reg.searchTools("flashcard").some(t => t.slug === "flashcards"));
    assert.ok(reg.searchTools("grade-tracker").some(t => t.slug === "grade-tracker"));
    // "pomodoro" is a keyword on focus-lab, not in its title
    assert.ok(reg.searchTools("pomodoro").some(t => t.slug === "focus-lab"));
  });

  test("search is case-insensitive", () => {
    assert.deepEqual(
      reg.searchTools("CITATION").map(t => t.slug),
      reg.searchTools("citation").map(t => t.slug),
    );
  });

  test("extra terms narrow rather than widen the results", () => {
    const one = reg.searchTools("exam");
    const two = reg.searchTools("exam simulator");
    assert.ok(two.length <= one.length, "AND semantics: more terms must not return more tools");
    assert.ok(two.some(t => t.slug === "exam-sim"));
  });

  test("a nonsense query returns nothing rather than everything", () => {
    assert.deepEqual(reg.searchTools("zzzznotarealtool"), []);
  });

  test("every tool is reachable by searching its own title", () => {
    const unreachable = reg.TOOLS_REGISTRY
      .filter(t => !reg.searchTools(t.title).some(r => r.slug === t.slug))
      .map(t => t.slug);
    assert.deepEqual(unreachable, [], `tools not findable by their own title: ${unreachable.join(", ")}`);
  });
});
