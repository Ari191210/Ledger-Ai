// Shared compile-and-load helper for lib/trading, used by every script in
// scripts/ that needs the pure trading modules at runtime (trading-agent.mjs,
// kite-login.mjs, and anything added after them).
//
// This exists as its own module rather than being copy-pasted per script
// because the copy in scripts/trading-agent.mjs had two real bugs, both
// invisible until something in lib/trading lived in a subdirectory:
// lib/trading/kite/ is the first thing to do that, and both bugs would have
// bitten kite-login.mjs immediately if this hadn't been pulled out and fixed
// once, here.
//
//   1. The old file-rewrite loop used a plain (non-recursive) readdirSync
//      over the output directory, so anything tsc emitted into a
//      subdirectory — lib/trading/kite/*.js — was never touched.
//   2. The old rewrite regex only matched "./x" imports, not "../x". Files
//      one directory deeper (kite/*.ts) routinely import upward with "../".
//
// tests/trading.test.mjs's own before() hook had the identical pair of bugs
// and was fixed the same way when lib/trading/kite/ was added; see that
// file's history for the failing case that exposed it.

import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, ".test-build", "lib", "trading");

function jsFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFilesRecursive(p));
    else if (entry.name.endsWith(".js")) out.push(p);
  }
  return out;
}

/** Compiles lib/trading (via tests/trading.tsconfig.json) to .test-build. */
export function compileTradingModules() {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tests/trading.tsconfig.json"],
    { cwd: root, stdio: "inherit" },
  );

  // tsc emits ES modules but leaves import specifiers extensionless, which
  // Node's ESM resolver rejects. Matches "./x", "../x", "../../x" and so on.
  for (const p of jsFilesRecursive(outDir)) {
    fs.writeFileSync(
      p,
      fs.readFileSync(p, "utf8").replace(/(from\s+")((?:\.\.?\/)+[\w-]+)(")/g, "$1$2.js$3"),
    );
  }
  // Nearest-package-json wins, so this marks only this output directory as
  // ESM without changing how the rest of .test-build is interpreted.
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
}

/** Loads a compiled module by its path relative to .test-build/lib/trading. */
export function loadTradingModule(name) {
  return import(pathToFileURL(path.join(outDir, name)).href);
}
