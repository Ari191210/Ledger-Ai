// ═══════════════════════════════════════════════════════════════════════════
// The 15 jobs that failed for a reason that no longer exists
//
// All 15 are `failed` with attempts = 3, so the runner will never pick them
// up again: `runJobs()` selects on `attempts < MAX_ATTEMPTS`. They failed
// because the dispatcher called itself across a host redirect that stripped
// the credential, which is now fixed in lib/jobs.ts.
//
// Two distinct causes are recorded, and they deserve different treatment:
//
//   6x  "Authentication required."   -> the redirect defect. Requeue.
//   9x  "Too many requests."         -> a rate limiter refused the SEND ROUTE.
//                                       Nine of these are the same handful of
//                                       users retried within minutes on 19
//                                       August. Requeueing all nine would mail
//                                       someone the same welcome twice.
//
// So this DEFAULTS TO A DRY RUN and, when asked to act, requeues at most one
// job per recipient. A welcome email that arrives six weeks late is a small
// oddity; the same one arriving twice is a real annoyance.
//
//   node scripts/requeue-failed-jobs.mjs           (dry run)
//   node scripts/requeue-failed-jobs.mjs --apply
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
  "Content-Type": "application/json",
};
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const apply = process.argv.includes("--apply");

const r = await fetch(
  `${U}/rest/v1/jobs?select=id,type,payload,error,attempts,created_at&status=eq.failed&order=created_at.asc`,
  { headers: H });
const jobs = await r.json();
console.log(`${jobs.length} failed job(s)\n`);
if (jobs.length === 0) process.exit(0);

// One per recipient, keeping the EARLIEST — that is the welcome they should
// have had when they signed up.
const seen = new Map();
const skipped = [];
for (const j of jobs) {
  const who = j.payload?.email || j.payload?.userId || j.id;
  if (seen.has(who)) { skipped.push({ j, who }); continue; }
  seen.set(who, j);
}

console.log(`${seen.size} distinct recipient(s):\n`);
for (const [who, j] of seen) {
  console.log(`  ${String(who).padEnd(34)} ${j.type.padEnd(16)} ${(j.created_at || "").slice(0, 10)}  ${(j.error || "").slice(0, 40)}`);
}
if (skipped.length) {
  console.log(`\n${skipped.length} duplicate(s) will be left failed, so nobody is mailed twice:`);
  for (const { j, who } of skipped) {
    console.log(`  ${String(who).padEnd(34)} ${(j.created_at || "").slice(0, 19)}`);
  }
}

if (!apply) {
  console.log("\nDry run. Pass --apply to requeue the one-per-recipient set.");
  console.log("Nothing sends until /api/jobs/run next fires (daily 00:00 UTC),");
  console.log("and only if the redirect fix has been deployed.");
  process.exit(0);
}

let ok = 0;
for (const [, j] of seen) {
  const res = await fetch(`${U}/rest/v1/jobs?id=eq.${j.id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({
      status: "pending", attempts: 0, error: null,
      scheduled_at: new Date().toISOString(),
      started_at: null, completed_at: null,
    }),
  });
  if (res.ok) ok++;
  else console.log(`  failed to requeue ${j.id}: ${res.status} ${(await res.text()).slice(0, 90)}`);
}
console.log(`\nrequeued ${ok} of ${seen.size}.`);
console.log("They will be attempted on the next /api/jobs/run.");
