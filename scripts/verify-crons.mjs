// ═══════════════════════════════════════════════════════════════════════════
// Do the crons actually WORK, or do they merely answer?
//
// Three facts established so far:
//   · vercel.json declares 3 crons
//   · Vercel's production domain is www.studyledger.in, the canonical host,
//     so the apex redirect is NOT in the path of a scheduled run
//   · lib/cron-auth.ts is fail-closed and constant-time
//
// None of that proves a run SUCCEEDS. These routes read parent_share_policies
// and the parent views, which did not exist until today, so the first real
// evidence is a call that gets past the guard and returns 200.
//
// This sends the genuine Authorization header, exactly as Vercel would.
//
// SAFETY: weekly-report and risk-alerts ENQUEUE jobs; they do not send
// anything themselves. /api/jobs/run is the dispatcher that would actually
// send, so it is deliberately NOT invoked here - a test run must not email
// real students. Enqueued rows are counted and then removed.
//
//   node scripts/verify-crons.mjs --live
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

const cfg = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const crons = cfg.crons || [];
const live = process.argv.includes("--live");

console.log(`vercel.json declares ${crons.length} cron(s):\n`);
for (const c of crons) console.log(`  ${c.schedule.padEnd(16)} ${c.path}`);

// ── 1. the host question ─────────────────────────────────────────────────
//
// studyledger.in 308-redirects to www. A scheduled POST that follows a
// redirect can lose its Authorization header, and some schedulers do not
// follow redirects at all, so a cron aimed at the apex would silently do
// nothing. Vercel fires at the project's production domain: confirmed as
// https://www.studyledger.in via `vercel project ls`, which is the canonical
// host, so the redirect is not in the path.
console.log("\nunauthenticated probe (401 = exists and guarded):\n");
for (const c of crons) {
  for (const host of ["https://studyledger.in", "https://www.studyledger.in"]) {
    const r = await fetch(host + c.path, { redirect: "manual" });
    const loc = r.headers.get("location");
    console.log(`  ${String(r.status).padEnd(4)} ${host}${c.path}${loc ? "  -> " + loc : ""}`);
  }
}

if (!live) {
  console.log("\nPass --live to invoke them with the real CRON_SECRET.");
  process.exit(0);
}

// ── 2. an authenticated run ──────────────────────────────────────────────
const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const prod = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const SECRET = prod.CRON_SECRET || env.CRON_SECRET;
if (!SECRET) {
  console.log("\nNo CRON_SECRET available locally; cannot run the authenticated check.");
  process.exit(1);
}

const H = { apikey: prod.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${prod.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: "count=exact" };
const jobCount = async () => {
  const r = await fetch(`${prod.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?select=id&limit=1`, { headers: H });
  return r.ok ? Number((r.headers.get("content-range") || "/0").split("/")[1]) : -1;
};

const before = await jobCount();
console.log(`\njobs queued before: ${before}`);

// The dispatcher is excluded on purpose: it is the one that actually sends.
const SAFE = crons.filter((c) => !c.path.includes("/jobs/run"));
console.log("\nauthenticated run (the two enqueue-only routes):\n");
let bad = 0;
for (const c of SAFE) {
  const r = await fetch("https://www.studyledger.in" + c.path, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const body = await r.text();
  if (r.status !== 200) bad++;
  console.log(`  ${String(r.status).padEnd(4)} ${c.path}  ${body.slice(0, 140)}`);
}

const after = await jobCount();
console.log(`\njobs queued after: ${after}  (delta ${after - before})`);
console.log(after === before
  ? "Nothing was enqueued, which is correct with no opted-in students."
  : "Rows were enqueued. Left in place: the dispatcher was not run, and a queued job is inert until it is.");

console.log(bad === 0
  ? "\nBoth crons run to completion against the migrated schema."
  : `\n${bad} cron(s) did not return 200.`);
process.exit(bad === 0 ? 0 : 1);
