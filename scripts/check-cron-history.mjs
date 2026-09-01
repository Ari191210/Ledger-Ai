// Have the SCHEDULED runs ever succeeded?
//
// A live probe cannot answer this: I do not hold production's CRON_SECRET
// (Vercel returns encrypted values as empty strings), so my own calls are
// expected 401s and they pollute the log. Vercel's own invocations are the
// evidence, and they are distinguishable: they arrive at the cron schedule,
// not seconds after I ran a script.
//
// vercel.json: weekly-report Mon 02:00, risk-alerts daily 03:00,
// jobs/run daily 00:00 (UTC).
import { execFileSync } from "node:child_process";

const raw = execFileSync("npx",
  ["vercel", "logs", "https://www.studyledger.in", "--json"],
  { encoding: "utf8", shell: true, maxBuffer: 32 * 1024 * 1024 });

const rows = raw.split(/\r?\n/)
  .filter((l) => l.trim().startsWith("{"))
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean)
  .filter((r) => /\/api\/(cron|jobs)\//.test(r.requestPath || ""));

console.log(`${rows.length} cron-path requests in the retained window\n`);

// My probes all landed in the last few minutes. Anything older is Vercel's.
const now = Date.now();
const mine = rows.filter((r) => now - r.timestamp < 20 * 60_000);
const theirs = rows.filter((r) => now - r.timestamp >= 20 * 60_000);

console.log(`  ${mine.length} in the last 20 minutes (my own probes)`);
console.log(`  ${theirs.length} older than that\n`);

if (theirs.length === 0) {
  console.log("No scheduled invocations are visible in the retained log window.");
  console.log("Vercel's log retention is short, so this is NOT evidence that");
  console.log("the crons never ran. The schedules are:");
  console.log("  weekly-report  Mondays 02:00 UTC");
  console.log("  risk-alerts    daily    03:00 UTC");
  console.log("  jobs/run       daily    00:00 UTC");
  const next3 = new Date();
  next3.setUTCHours(3, 0, 0, 0);
  if (next3 < new Date()) next3.setUTCDate(next3.getUTCDate() + 1);
  console.log(`\nNext risk-alerts run: ${next3.toISOString()}`);
  console.log("Re-run this afterwards; a 200 there is the proof.");
} else {
  for (const r of theirs.slice(0, 25)) {
    console.log(`  ${new Date(r.timestamp).toISOString()}  ${String(r.responseStatusCode).padEnd(4)} ${r.requestPath}`);
  }
  const ok = theirs.filter((r) => r.responseStatusCode === 200).length;
  console.log(`\n${ok} of ${theirs.length} scheduled runs returned 200.`);
  console.log(ok === 0
    ? "None succeeded. CRON_SECRET may be wrong in production, or the runs are failing."
    : "The schedule authenticates and completes.");
}
