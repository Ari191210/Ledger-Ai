import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTITUTION §1 — NO AI PRODUCT CLICHÉS
//
// PRODUCT_CONSTITUTION.md forbids glowing gradients, glassmorphism, orbs,
// particles, neon, animated backgrounds, custom cursors and sci-fi visuals,
// and says violating it requires explicit founder approval rather than being
// shipped and mentioned afterwards. A rule nothing enforces is a rule that
// decays: the WebGL aurora, the custom cursor and the page-gradient wash were
// all removed by hand, then partially grew back as new components.
//
// This test pins the removal. It checks the things a human would otherwise
// have to remember, and deliberately does NOT fail on legacy pages that are
// still awaiting migration — those are tracked by lib/editorial-routes.ts.
// ═══════════════════════════════════════════════════════════════════════════

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dirs, exts = /\.(tsx?|css)$/) {
  const out = [];
  const walk = d => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.test(e.name)) out.push(p);
    }
  };
  for (const d of dirs) walk(path.join(root, d));
  return out;
}

const rel = f => path.relative(root, f).replace(/\\/g, "/");

describe("constitution §1 — no AI product clichés", () => {
  test("the 3D/WebGL stack is not a dependency", () => {
    // The aurora is gone; nothing should be able to reintroduce it by
    // importing a renderer that is already installed.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const banned = ["three", "@react-three/fiber", "@react-three/drei", "@splinetool/react-spline", "@splinetool/runtime"];
    const present = banned.filter(d => deps[d]);
    assert.deepEqual(present, [], `WebGL/3D packages reinstalled: ${present.join(", ")}`);
  });

  test("no custom cursor implementation", () => {
    // §6: native browser cursor only.
    // Rules that HIDE or neutralise the old cursor (display:none, the
    // reduced-motion override, a comment recording the removal) are
    // compliance. Only a rule that gives .cur-dot real appearance, or a
    // component that tracks the pointer, is a violation.
    const offenders = [];
    for (const f of sourceFiles(["app", "components"])) {
      const src = fs.readFileSync(f, "utf8");
      if (/cursor-trail|magnetic-cursor|CustomCursor/.test(src)) offenders.push(rel(f));
      // A cursor element positioned from mouse coordinates is the real thing.
      if (/\.cur-(dot|ring)\b/.test(src) && /(mousemove|pointermove)/.test(src)) {
        offenders.push(rel(f));
      }
    }
    assert.deepEqual(offenders, [], `custom cursor code: ${offenders.join(", ")}`);
  });

  test("the tools index carries no gradient, glass or glow", () => {
    // The surface this change introduced. Held to the rule exactly.
    const src = fs.readFileSync(path.join(root, "app/tools/page.tsx"), "utf8");
    for (const bad of [/linear-gradient/, /radial-gradient/, /backdrop-filter/, /blur\(/, /glass/i, /\bglow\b/i]) {
      assert.ok(!bad.test(src), `app/tools/page.tsx contains ${bad}`);
    }
  });

  test("components/ has no unreferenced decorative components", () => {
    // Dead decoration is how the forbidden vocabulary survives a purge: it
    // stops rendering, so nobody notices it, and it gets copied back later.
    const comps = sourceFiles(["components"], /\.tsx$/);
    const all = sourceFiles(["app", "components", "lib"], /\.tsx?$/);
    const sources = all.map(f => [f, fs.readFileSync(f, "utf8")]);

    const dead = [];
    for (const c of comps) {
      const stem = path.basename(c, ".tsx");
      const referenced = sources.some(([f, src]) =>
        f !== c && (src.includes(`/${stem}"`) || src.includes(`/${stem}'`) ||
                    src.includes(`./${stem}"`) || src.includes(`./${stem}'`)));
      if (referenced) continue;
      const src = fs.readFileSync(c, "utf8");
      // Only decorative dead code fails; unused shadcn primitives are inert.
      if (/linear-gradient|radial-gradient|backdrop-filter|three|spline|aurora|particle/i.test(src)) {
        dead.push(rel(c));
      }
    }
    assert.deepEqual(dead, [], `unreferenced decorative components: ${dead.join(", ")}`);
  });
});
