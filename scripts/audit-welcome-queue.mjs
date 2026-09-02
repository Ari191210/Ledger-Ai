// AUDIT THE WELCOME QUEUE. Read-only: this counts and classifies, it sends
// nothing and writes nothing.
//
//   node scripts/audit-welcome-queue.mjs
//
// WHY THIS EXISTS. Every outbound email failed from launch until 2026-09-01,
// because lib/jobs.ts called itself at the apex, which 308s to www, and a
// cross-host redirect strips the Authorization header. The jobs therefore
// failed with "Authentication required" and, once retries piled up, with
// "Too many requests".
//
// Before requeuing anything, two questions have to be answered with evidence:
//
//   1. HOW MANY PEOPLE, not how many rows. Each student is retried three
//      times and may be enqueued more than once, so 15 failed rows turned out
//      to be 3 human beings. Requeuing by row would mail one of them nine
//      times.
//
//   2. WHICH ROWS ARE REAL. Local testing of the dashboard and onboarding
//      enqueued fixtures named <prefix>-<epoch>. They are indistinguishable
//      from real sign-ups by status alone, and every currently PENDING row is
//      one of them.
//
// Run this before and after any requeue, and compare.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const q = async path => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) { console.log("  ! ", r.status, (await r.text()).slice(0, 140)); return null; }
  return r.json();
};

const jobs = await q("jobs?select=id,status,payload,created_at&order=created_at.desc&limit=100");

// A test fixture is named <prefix>-<epoch ms>: dash-, flow-, n406- and so on
// are all timestamped fixtures from this week's dashboard and onboarding work.
// A real sign-up carries a human name. The trailing epoch is the tell, so the
// prefix is left open rather than enumerated.
const isFixture = n => /^[a-z0-9]{1,8}[-_]\d{10,}$/i.test(String(n ?? ""));

const real = [], fixtures = [];
for (const j of jobs) {
  (isFixture(j.payload?.name) ? fixtures : real).push(j);
}

console.log(`total welcome jobs: ${jobs.length}`);
console.log(`  test fixtures : ${fixtures.length}`);
console.log(`  REAL people   : ${real.length}`);

const byStatus = rows => rows.reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {});
console.log(`\nfixtures by status:`, JSON.stringify(byStatus(fixtures)));
console.log(`real     by status:`, JSON.stringify(byStatus(real)));

console.log(`\nthe real ones:`);
for (const j of [...real].reverse()) {
  const p = j.payload ?? {};
  const name = String(p.name ?? "(no name)");
  // Names are shown, addresses are not: this is a count, not a mailing list.
  console.log(`  ${j.created_at.slice(0, 10)}  ${j.status.padEnd(8)} ${name.slice(0, 28)}`);
}

const realIds = [...new Set(real.map(j => j.payload?.userId).filter(Boolean))];
console.log(`\ndistinct real students awaiting a welcome email: ${realIds.length}`);
