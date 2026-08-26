// Environment doctor.
//
// The single most expensive failure this repo has had is a missing env var
// discovered at runtime, in production, as a 503. This reads .env.local (or
// the live process env), reports exactly what is set, what is missing, and —
// crucially — what each missing value actually breaks for a user.
//
// It never prints a secret. Only whether one is present and well-formed.
//
//   node scripts/env-doctor.mjs
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Everything the code reads, what it powers, and how bad its absence is. */
const VARS = [
  { key: "ANTHROPIC_API_KEY", severity: "blocking",
    breaks: "Every one of the 46 AI tool pages. /api/ai returns 500.",
    looksLike: v => v.startsWith("sk-ant-") },
  { key: "NEXT_PUBLIC_SUPABASE_URL", severity: "blocking",
    breaks: "Auth and all saved data. Falls back to a placeholder host, so writes silently no-op.",
    looksLike: v => /^https:\/\/.+\.supabase\.co/.test(v) },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", severity: "blocking",
    breaks: "Auth and all saved data.",
    looksLike: v => v.length > 40 },
  { key: "SUPABASE_SERVICE_ROLE_KEY", severity: "blocking",
    breaks: "Server-side reads: admin, cron, parent digests, job queue.",
    looksLike: v => v.length > 40 },

  { key: "STRIPE_SECRET_KEY", severity: "important",
    breaks: "Checkout returns 503. Nobody can pay.",
    looksLike: v => v.startsWith("sk_") },
  { key: "STRIPE_WEBHOOK_SECRET", severity: "important",
    breaks: "Payments succeed but tiers never upgrade — the worst failure mode here.",
    looksLike: v => v.startsWith("whsec_") },
  { key: "STRIPE_PRICE_PRO_MONTHLY",  severity: "important", breaks: "The Pro monthly plan is unbuyable.",  looksLike: v => v.startsWith("price_") },
  { key: "STRIPE_PRICE_PRO_YEARLY",   severity: "important", breaks: "The Pro yearly plan is unbuyable.",   looksLike: v => v.startsWith("price_") },
  { key: "STRIPE_PRICE_MAX_MONTHLY",  severity: "important", breaks: "The Max monthly plan is unbuyable.",  looksLike: v => v.startsWith("price_") },
  { key: "STRIPE_PRICE_MAX_YEARLY",   severity: "important", breaks: "The Max yearly plan is unbuyable.",   looksLike: v => v.startsWith("price_") },

  { key: "CRON_SECRET", severity: "important",
    breaks: "FAIL-CLOSED: every cron returns 401 and silently stops. Weekly reports, risk alerts, notifications and the job queue all die quietly.",
    looksLike: v => v.length >= 16 },

  { key: "RESEND_API_KEY", severity: "optional", breaks: "Welcome, weekly report and parent digest emails.", looksLike: v => v.startsWith("re_") },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", severity: "optional", breaks: "Push notifications.", looksLike: v => v.length > 20 },
  { key: "VAPID_PRIVATE_KEY",            severity: "optional", breaks: "Push notifications.", looksLike: v => v.length > 20 },
  { key: "NEXT_PUBLIC_GOOGLE_CLIENT_ID", severity: "optional", breaks: "Sign in with Google.", looksLike: v => v.includes(".apps.googleusercontent.com") },
  { key: "GOOGLE_CLIENT_SECRET",         severity: "optional", breaks: "Sign in with Google." },
  { key: "ADMIN_KEY",                    severity: "optional", breaks: "The admin dashboard." },
  { key: "NEXT_PUBLIC_POSTHOG_KEY",      severity: "optional", breaks: "Product analytics.", looksLike: v => v.startsWith("phc_") },
  { key: "NEXT_PUBLIC_SITE_URL",         severity: "optional", breaks: "Stripe redirects and email links point at production instead of localhost." },
];

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return null;
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const envPath = path.join(root, ".env.local");
const fromFile = parseEnvFile(envPath);
const env = { ...(fromFile ?? {}), ...process.env };

console.log(fromFile
  ? `Reading ${path.relative(root, envPath)}\n`
  : `No .env.local found. Copy .env.local.example to .env.local and fill it in.\n`);

const groups = { blocking: [], important: [], optional: [] };
const set = [];

for (const v of VARS) {
  const raw = env[v.key];
  const present = typeof raw === "string" && raw.length > 0 && !raw.includes("...");
  if (!present) { groups[v.severity].push(v); continue; }
  const shaped = v.looksLike ? v.looksLike(raw) : true;
  set.push({ ...v, shaped });
}

const label = { blocking: "BLOCKING", important: "IMPORTANT", optional: "OPTIONAL" };
let exitCode = 0;

for (const sev of ["blocking", "important", "optional"]) {
  const missing = groups[sev];
  if (!missing.length) continue;
  if (sev === "blocking") exitCode = 1;
  console.log(`${label[sev]} — ${missing.length} missing`);
  for (const v of missing) console.log(`  ${v.key}\n      ${v.breaks}`);
  console.log("");
}

const malformed = set.filter(v => !v.shaped);
if (malformed.length) {
  console.log(`SET BUT SUSPICIOUS — ${malformed.length}`);
  for (const v of malformed) console.log(`  ${v.key} does not match its expected format`);
  console.log("");
}

console.log(`${set.length} set, ${VARS.length - set.length} missing.`);
if (groups.blocking.length === 0) {
  console.log("Nothing blocking. The app will boot and its core paths will work.");
} else {
  console.log(`${groups.blocking.length} blocking value(s) missing — the AI tools and/or auth will not work.`);
}
console.log("\nNote: /journey works entirely without any of these. It is local-first by design.");

process.exit(exitCode);
