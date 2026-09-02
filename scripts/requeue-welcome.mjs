// REQUEUE THE THREE REAL WELCOME EMAILS.
//
//   node scripts/requeue-welcome.mjs            # dry run, prints the plan
//   node scripts/requeue-welcome.mjs --commit   # actually writes
//
// WHY THIS IS NOT AUTOMATIC. Deploying the normaliseOrigin() fix does NOT by
// itself send these. runPendingJobs() selects `status = 'pending' AND attempts
// < MAX_ATTEMPTS`, and all three sit at status='failed' with attempts=3. They
// are inert until something resets them, which is this script.
//
// WHAT IT DOES, precisely:
//
//   1. ONE row per PERSON, not per row. The fifteen failed rows are three
//      students; truong minh alone has twelve. The newest row per userId is
//      reset to pending/attempts=0, and that person's other rows are marked
//      'superseded' so they can never fire. Requeuing all fifteen would send
//      one student twelve welcome emails.
//
//   2. NOTHING is sent to a test fixture. The twelve pending rows named
//      <prefix>-<epoch> came from local dashboard and onboarding testing this
//      week. They are cancelled, not delivered.
//
//   3. It refuses to run against an undeployed fix, because the emails would
//      simply fail a fourth time and burn the retry budget.
import fs from "node:fs";

const COMMIT = process.argv.includes("--commit");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("supabase credentials missing from .env.local");

const api = async (path, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
};

// ── Guard: is the fix actually live? ────────────────────────────────────────
// The bug was the runner following a cross-host redirect, which strips
// Authorization. If the apex still redirects, the fix is not deployed and
// requeuing would just fail again.
const probe = await fetch("https://studyledger.in/api/jobs/run", { redirect: "manual" });
const redirects = probe.status >= 300 && probe.status < 400;
console.log(`apex /api/jobs/run -> ${probe.status}${redirects ? "  (still redirecting)" : ""}`);
// The refusal is deferred: all three preconditions are collected below and
// reported together, so one run tells the whole story rather than revealing
// blockers one at a time.

// ── Classify ───────────────────────────────────────────────────────────────
const jobs = await api("jobs?select=id,type,status,payload,attempts,created_at&order=created_at.desc&limit=200");
const welcome = jobs.filter(j => j.type === "send-welcome");
const isFixture = n => /^[a-z0-9]{1,8}[-_]\d{10,}$/i.test(String(n ?? ""));

const real = welcome.filter(j => !isFixture(j.payload?.name));
const fixtures = welcome.filter(j => isFixture(j.payload?.name));

// Newest row per person is the one to send; the rest are duplicates.
const byUser = new Map();
for (const j of real) {
  const id = j.payload?.userId;
  if (!id) continue;
  if (!byUser.has(id)) byUser.set(id, []);
  byUser.get(id).push(j);
}

const toSend = [], toSupersede = [];
for (const [, rows] of byUser) {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  toSend.push(sorted[0]);
  toSupersede.push(...sorted.slice(1));
}

console.log(`\nwelcome jobs: ${welcome.length}  (real ${real.length}, fixtures ${fixtures.length})`);
console.log(`\nWILL SEND one email each to ${toSend.length} people:`);
for (const j of toSend) console.log(`  ${j.payload?.name}   (row ${j.created_at.slice(0, 10)})`);
console.log(`\nWILL CLOSE ${toSupersede.length} duplicate rows for those same people (status done, reason recorded).`);
console.log(`WILL CLOSE ${fixtures.length} test fixtures the same way. None of them are emailed.`);

// ── Guard: would a requeue actually DELIVER? ───────────────────────────────
// The redirect check above proves the runner can authenticate. It does not
// prove an email can be sent, and two further preconditions were each found
// broken by measurement. Both would let this script report success while the
// student still receives nothing, which is the same silent failure in a new
// costume.
//
// (a) The Resend key. A revoked key does not fail loudly: /api/welcome returns
//     500, the job retries three times, and the queue ends up exactly as it
//     started.
const resendProbe = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
});
console.log(`\nresend credentials: ${resendProbe.ok ? "valid" : `REJECTED (HTTP ${resendProbe.status})`}`);

// (b) The idempotency flag. /api/welcome skips any account carrying
//     app_metadata.welcomeSent. That flag is written only after a send returns
//     without error, so an account can carry it having received nothing: the
//     message was ACCEPTED by the provider and then never arrived. For those
//     students a requeue marks the job done and sends nothing.
const flagged = [];
for (const id of [...new Set(real.map(j => j.payload?.userId).filter(Boolean))]) {
  const r = await fetch(`${URL}/auth/v1/admin/users/${id}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) continue;
  const u = await r.json();
  if (u.app_metadata?.welcomeSent) {
    flagged.push(u.user_metadata?.full_name ?? u.user_metadata?.name ?? "(unnamed)");
  }
}
if (flagged.length) {
  console.log(`already flagged welcomeSent, so /api/welcome would SKIP: ${flagged.join(", ")}`);
}

const blockers = [];
if (!resendProbe.ok) blockers.push("the Resend API key is rejected, so no mail can be sent by anyone");
if (flagged.length) blockers.push(`${flagged.length} account(s) carry welcomeSent and would be skipped silently`);
if (redirects) blockers.push("the apex still redirects, so the deployed build predates the normaliseOrigin() fix");

if (blockers.length) {
  console.log("\nBLOCKED. Requeuing now would mark rows done without delivering:");
  for (const b of blockers) console.log(`  - ${b}`);
}

if (!COMMIT) {
  console.log("\nDRY RUN. Nothing was written. Re-run with --commit to apply.");
  process.exit(0);
}

if (blockers.length) {
  console.log("\nREFUSING TO COMMIT while any blocker above stands. Each one would");
  console.log("turn a visible failure into an invisible one, which is how these");
  console.log("emails went unnoticed for six weeks in the first place.");
  process.exit(1);
}

// ── Apply ──────────────────────────────────────────────────────────────────
for (const j of toSend) {
  await api(`jobs?id=eq.${j.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "pending",
      attempts: 0,
      error: null,
      scheduled_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    }),
  });
  console.log(`  requeued: ${j.payload?.name}`);
}

// NOTE ON STATUS. The jobs.status CHECK (000_initial_schema.sql:106) allows
// only pending/running/done/failed. 'superseded' and 'cancelled' would be
// REJECTED by Postgres, after the requeues above had already been written,
// leaving the queue half-changed.
//
// Widening the CHECK by migration, to retire twelve of my own test rows, is
// not a fair trade. 'done' is used instead, with the reason written to
// `error`: the row needs no further action, and why is recorded rather than
// implied. Nothing is deleted (K.4).
for (const group of [
  { rows: toSupersede, status: "done", why: "superseded: duplicate of a newer row for the same student" },
  { rows: fixtures, status: "done", why: "cancelled: local test fixture, never a real sign-up" },
]) {
  for (const j of group.rows) {
    await api(`jobs?id=eq.${j.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: group.status, error: group.why }),
    });
  }
  console.log(`  ${group.status}: ${group.rows.length} rows`);
}

console.log("\nDone. Run scripts/audit-welcome-queue.mjs to confirm the new state,");
console.log("then trigger /api/jobs/run (or wait for the nightly cron) to send.");
