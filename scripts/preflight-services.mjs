// LAUNCH PREFLIGHT: probe every external dependency, do not read config and
// assume.
//
//   node scripts/preflight-services.mjs
//
// WHY. Three defects this week shared one shape: configuration that reads
// correctly and was never observed working.
//
//   * lib/jobs.ts called itself across a redirect that strips Authorization,
//     so every outbound email failed from launch onward.
//   * PostHog sat in connect-src but not script-src, so analytics loaded
//     nothing while looking configured.
//   * The Resend key is well-formed and revoked, so mail cannot be sent at
//     all.
//
// A key that LOOKS right proves nothing. Each probe below actually calls the
// service and reports what came back. Read-only: nothing is created, sent or
// charged.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
);

const results = [];
const record = (name, ok, detail, critical = true) =>
  results.push({ name, ok, detail, critical });

const timeout = (ms = 12_000) => AbortSignal.timeout(ms);

// ── Supabase: the database everything else depends on ──────────────────────
try {
  // `select=*` rather than a named column: an earlier version asked for
  // `id`, which this table does not have, and reported a healthy database as
  // down. A probe should test reachability, not schema trivia.
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?select=*&limit=1`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    signal: timeout(),
  });
  record("Supabase (service role)", r.ok, r.ok ? "reachable, query accepted" : `HTTP ${r.status}`);
} catch (e) { record("Supabase (service role)", false, String(e.message).slice(0, 60)); }

// The anon key is what every browser uses; a broken one means nobody signs
// in. It is checked against /auth/v1/health, NOT the REST root: that root
// answers 401 "Only the service_role API key can be used for this endpoint"
// to any anon caller, which is correct behaviour and was wrongly read as an
// outage. Signing in is what the anon key is actually for.
try {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    signal: timeout(),
  });
  record("Supabase auth (anon key)", r.ok, r.ok ? "sign-in endpoint reachable" : `HTTP ${r.status}`);
} catch (e) { record("Supabase auth (anon key)", false, String(e.message).slice(0, 60)); }

// ── Anthropic: every AI tool in the product ────────────────────────────────
try {
  const r = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    signal: timeout(),
  });
  record("Anthropic", r.ok, r.ok ? "key valid" : `HTTP ${r.status} - AI tools would fail`);
} catch (e) { record("Anthropic", false, String(e.message).slice(0, 60)); }

// ── Resend: welcome emails, reports, parent digests ────────────────────────
try {
  const r = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    signal: timeout(),
  });
  if (r.ok) {
    const doms = (await r.json()).data ?? [];
    const sending = doms.find(d => d.name === "studyledger.in");
    // A verified domain is not optional: an unverified one is accepted by the
    // API and then silently not delivered, which is what appears to have
    // happened to two real students.
    record("Resend (key)", true, `${doms.length} domain(s) configured`);
    record(
      "Resend (studyledger.in verified)",
      sending?.status === "verified",
      sending ? `status=${sending.status}` : "domain not present - mail will not deliver",
    );
  } else {
    record("Resend (key)", false, `HTTP ${r.status} - NO mail can be sent`);
    record("Resend (studyledger.in verified)", false, "cannot check without a valid key");
  }
} catch (e) { record("Resend (key)", false, String(e.message).slice(0, 60)); }

// ── PostHog: was blocked by our own CSP until this week ────────────────────
try {
  const host = env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const r = await fetch(`${host}/decide?v=3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.NEXT_PUBLIC_POSTHOG_KEY, distinct_id: "preflight" }),
    signal: timeout(),
  });
  record("PostHog", r.ok, r.ok ? "project key accepted" : `HTTP ${r.status}`, false);
} catch (e) { record("PostHog", false, String(e.message).slice(0, 60), false); }

// ── The live site: is the deployed build the current one? ──────────────────
try {
  const r = await fetch("https://www.studyledger.in/dashboard", { redirect: "manual", signal: timeout() });
  const deployed = r.status === 200;
  record(
    "Deployed build is current",
    deployed,
    deployed ? "/dashboard serves a page" : `/dashboard -> ${r.status}; production predates this branch`,
  );
} catch (e) { record("Deployed build is current", false, String(e.message).slice(0, 60)); }

// The apex must NOT redirect for the job runner to keep its Authorization.
try {
  const r = await fetch("https://studyledger.in/api/jobs/run", { redirect: "manual", signal: timeout() });
  const redirects = r.status >= 300 && r.status < 400;
  record(
    "Job runner origin (no cross-host redirect)",
    !redirects,
    redirects ? `apex -> ${r.status}, which strips Authorization` : `apex -> ${r.status}`,
  );
} catch (e) { record("Job runner origin (no cross-host redirect)", false, String(e.message).slice(0, 60)); }

// ── Report ─────────────────────────────────────────────────────────────────
const pad = Math.max(...results.map(r => r.name.length));
console.log("\nLAUNCH PREFLIGHT: every external dependency, probed rather than assumed\n");
for (const r of results) {
  const mark = r.ok ? "ok  " : (r.critical ? "FAIL" : "warn");
  console.log(`  ${mark}  ${r.name.padEnd(pad)}  ${r.detail}`);
}

const failed = results.filter(r => !r.ok && r.critical);
console.log(
  failed.length === 0
    ? "\nEvery critical dependency answered."
    : `\n${failed.length} critical dependenc${failed.length === 1 ? "y is" : "ies are"} down. Launch would be visibly broken.`,
);
process.exit(failed.length ? 1 : 0);
