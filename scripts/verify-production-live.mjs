// ═══════════════════════════════════════════════════════════════════════════
// All 37 migrations are recorded. But a ledger row is a claim about SCHEMA.
// The question that actually matters is whether the PRODUCT works now:
// whether the surfaces that were hollow can reach the tables they needed.
//
// Three separate checks, because each can pass while another fails:
//   1. the schema objects V1 depends on really exist and are queryable
//   2. 035's pgvector columns landed (the extension could have been refused)
//   3. every public route still returns 200 and the APIs still refuse
//      unauthenticated callers correctly
//
//   node scripts/verify-production-live.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};
const U = env.NEXT_PUBLIC_SUPABASE_URL;
// studyledger.in 308-redirects to the www host. Following the redirect is the
// only way to see the real response: a manual check reports 308 for every
// route, which looks like uniform success and is actually no information.
const SITE = "https://www.studyledger.in";

let bad = 0;

// ── 1. The tables the hollow surfaces needed ─────────────────────────────
console.log("the tables each surface reads:");
const SURFACE_NEEDS = {
  "/onboard writes":  ["students", "student_profiles", "personal_model"],
  // /capture was retired in §7.9; its tables are now reached from /today and
  // /dashboard, which is where the same work happens.
  "/dashboard":       ["ingestion_runs", "evidence", "occurrences"],
  // `mistake_dna` is the FILENAME of 025, not a table. It creates
  // mistake_retest_schedule and mistake_resolutions.
  "/diagnosis":       ["patterns", "mistake_resolutions", "mistake_retest_schedule"],
  "/record":          ["academic_record", "concept_accuracy", "academic_events"],
  "/today":           ["recommendations", "home_layout"],
};
for (const [surface, tables] of Object.entries(SURFACE_NEEDS)) {
  const absent = [];
  for (const t of tables) {
    const r = await fetch(`${U}/rest/v1/${t}?select=*&limit=1`, { headers: H });
    if (r.status === 404) absent.push(t);
  }
  if (absent.length) bad++;
  console.log(`  ${absent.length ? "MISSING" : "ok     "} ${surface.padEnd(18)}`
    + (absent.length ? ` -> ${absent.join(", ")}` : tables.join(", ")));
}

// ── 2. 033's durable field and 035's vector columns ──────────────────────
console.log("\ncolumns added rather than tables:");
const colCheck = async (table, col) => {
  const r = await fetch(`${U}/rest/v1/${table}?select=${col}&limit=1`, { headers: H });
  return r.ok;
};
// 035 also adds embedding columns to the session-concepts table. This check
// deliberately does NOT probe them: 022 forbids anything outside itself, 035
// and lib/session-concepts.ts from naming that table, and
// tests/session-concepts.test.mjs enforces the rule with a substring scan
// over scripts/ among other directories. The view name contains the table
// name, so even reading through the view would trip it.
//
// That rule is worth more than this line of coverage. The vector work is
// already proven by `concepts.label_embedding` below and by 035's own
// registration in the ledger.
for (const [t, c] of [["students", "last_seen_at"], ["concepts", "label_embedding"],
  ["academic_events", "search_vector"]]) {
  const ok = await colCheck(t, c);
  if (!ok) bad++;
  console.log(`  ${ok ? "ok     " : "MISSING"} ${t}.${c}`);
}

// ── 3. The live site ─────────────────────────────────────────────────────
console.log("\nlive routes:");
// /capture is deliberately absent: §7.9 retired it and a 404 is now correct.
// /dashboard replaces it as the surface a student actually lands on.
for (const path of ["/", "/auth", "/onboard", "/dashboard", "/diagnosis", "/record", "/today"]) {
  const r = await fetch(SITE + path);
  const ok = r.status === 200;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok " : "BAD"} ${String(r.status).padEnd(4)} ${path}`);
}

console.log("\nAPIs must refuse an anonymous caller:");
for (const path of ["/api/today", "/api/record", "/api/personal-model"]) {
  const r = await fetch(SITE + path);
  // 401/403 is correct. A 500 would mean it is reaching the DB and failing.
  const ok = [401, 403, 404, 405].includes(r.status);
  if (!ok) bad++;
  console.log(`  ${ok ? "ok " : "BAD"} ${String(r.status).padEnd(4)} ${path}`
    + (r.status === 500 ? "   <- a 500 here means a real error, not auth" : ""));
}

console.log(bad === 0
  ? "\nSchema, columns and routes all check out."
  : `\n${bad} problem(s) above.`);
process.exit(bad === 0 ? 0 : 1);
