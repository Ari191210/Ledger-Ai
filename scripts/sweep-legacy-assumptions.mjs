// ═══════════════════════════════════════════════════════════════════════════
// Is a FOURTH drift waiting?
//
// Three defects have now come out of the same place: migrations that touch
// PRE-LEDGER tables (000-007, which production actually has) while assuming
// the shape staging happens to have.
//
//   `id`          TEXT in production, UUID in staging
//   `created_at`  absent in production
//   `interests`   text[] in production, jsonb in staging
//
// Each was found by the user pasting SQL and getting an error, which is the
// worst possible discovery channel. This sweeps every pending migration for
// the same class of assumption BEFORE the next paste.
//
// A reference is suspicious when a pending migration (008+) touches a
// pre-ledger table AND does something type-sensitive to it: a cast, a
// comparison, a jsonb function, an array function, or a bare column read in
// an INSERT ... SELECT.
//
//   node scripts/sweep-legacy-assumptions.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";

const MIG = "supabase/migrations";

/**
 * Tables production actually has, from migrations 000-007. Anything a pending
 * migration creates itself is safe by construction: it made the column, so it
 * knows the type.
 */
const LEGACY = [
  "user_data", "rooms", "ai_history", "error_logs", "announcements",
  "mistakes", "mistake_reviews", "score_history", "user_streaks",
  "study_sessions", "notifications", "push_subscriptions",
];

/** Operations whose correctness depends on the column's declared type. */
const TYPE_SENSITIVE = [
  [/jsonb_\w+\s*\(/g, "jsonb function"],
  [/array_length\s*\(|ARRAY\s*\(\s*SELECT/gi, "array function"],
  [/::\s*(uuid|jsonb|json|text\[\]|timestamptz)/gi, "explicit cast"],
  [/\b\w+\.\w+\s*=\s*\w+\.\w+/g, "column comparison"],
];

const files = fs.readdirSync(MIG).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
const pending = files.filter((f) => Number(f.slice(0, 3)) >= 8);

let flagged = 0;

for (const f of pending) {
  const src = fs.readFileSync(path.join(MIG, f), "utf8");

  // Which legacy tables does this migration actually mention?
  const touched = LEGACY.filter((t) => new RegExp(`\\b${t}\\b`).test(src));
  if (touched.length === 0) continue;

  // Does it guard itself by asking the catalogue what it is dealing with?
  const introspects = /information_schema\.columns/.test(src);

  // Find the type-sensitive operations that appear near a legacy table name.
  const lines = src.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    if (/^\s*--/.test(line)) return; // a comment is not an operation
    const near = lines.slice(Math.max(0, i - 12), i + 12).join("\n");
    if (!touched.some((t) => new RegExp(`\\b${t}\\b`).test(near))) return;
    for (const [re, label] of TYPE_SENSITIVE) {
      re.lastIndex = 0;
      if (re.test(line)) { hits.push({ n: i + 1, label, line: line.trim() }); break; }
    }
  });

  if (hits.length === 0) continue;

  flagged++;
  const status = introspects ? "GUARDED  " : "UNGUARDED";
  console.log(`\n${status} ${f}`);
  console.log(`  touches: ${touched.join(", ")}`);
  if (!introspects) {
    console.log(`  does NOT consult information_schema, so it assumes a shape`);
  }
  for (const h of hits.slice(0, 6)) {
    console.log(`    ${h.n}: [${h.label}] ${h.line.slice(0, 96)}`);
  }
  if (hits.length > 6) console.log(`    ... and ${hits.length - 6} more`);
}

console.log(`\n${flagged} pending migration(s) touch a pre-ledger table with type-sensitive SQL.`);
console.log("UNGUARDED ones are where a fourth drift would hide.");
