// DOES THE PRODUCT ACTUALLY WORK? Signing up is not using. This exercises the
// core loop on PRODUCTION as an authenticated student:
//
//   * an AI tool returns a real answer (the Anthropic key works in Vercel,
//     not just in .env.local, and the tool is registered)
//   * /api/dashboard returns the seven figures the landing surface renders
//   * /api/today derives a next action without erroring
//
// Deploying proves the code shipped. This proves it does something.
//
// Creates a real account and deletes it. Named journey-<epoch> so the queue
// audit classifies it as a fixture.
import fs from "node:fs";

const BASE = process.argv.includes("--local") ? "http://localhost:3311" : "https://www.studyledger.in";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const stamp = Date.now();
const EMAIL = `journey-${stamp}@studyledger-test.invalid`;
const PASSWORD = `Jr!${stamp}aA`;

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

console.log(`\nEXERCISING THE CORE LOOP against ${BASE}\n`);

// Create, then sign in for a real access token.
const mk = await fetch(`${SB}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `journey-${stamp}` } }),
});
if (!mk.ok) { console.log("could not create account:", (await mk.text()).slice(0, 160)); process.exit(1); }
const user = await mk.json();

const signIn = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const session = await signIn.json();
const TOKEN = session.access_token;
check("a student can obtain a session", Boolean(TOKEN));

const authed = (path, init = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

try {
  // ── The AI, which is the product's whole proposition ────────────────────
  const t0 = Date.now();
  const ai = await authed("/api/ai", {
    method: "POST",
    body: JSON.stringify({
      tool: "doubt",
      question: "In one sentence, what is the derivative of x squared?",
    }),
  });
  const aiBody = await ai.text();
  const took = ((Date.now() - t0) / 1000).toFixed(1);

  if (ai.ok) {
    let answer = "";
    try {
      const j = JSON.parse(aiBody);
      answer = String(j.text ?? j.answer ?? j.content ?? JSON.stringify(j)).slice(0, 90);
    } catch { answer = aiBody.slice(0, 90); }
    check("an AI tool returns a real answer", answer.length > 10, `${took}s: "${answer.replace(/\s+/g, " ")}"`);
    // The AI must never use an em-dash where a student can see it.
    check("the answer contains no em-dash", !answer.includes("\u2014"), answer.includes("\u2014") ? "found one" : "");
  } else {
    check("an AI tool returns a real answer", false, `HTTP ${ai.status}: ${aiBody.slice(0, 130)}`);
  }

  // ── The dashboard's own data ────────────────────────────────────────────
  const dash = await authed("/api/dashboard");
  const dashBody = await dash.text();
  if (dash.ok) {
    const j = JSON.parse(dashBody);
    const keys = Object.keys(j).filter(k => k !== "ok");
    check("/api/dashboard returns its cards", keys.length >= 6, keys.join(", "));
    check("no streak is returned (M0-6)", !("streak" in j));
  } else {
    check("/api/dashboard returns its cards", false, `HTTP ${dash.status}: ${dashBody.slice(0, 120)}`);
  }

  // ── Today ───────────────────────────────────────────────────────────────
  const today = await authed("/api/today");
  const todayBody = await today.text();
  check("/api/today answers a signed-in student", today.ok, today.ok ? "" : `HTTP ${today.status}: ${todayBody.slice(0, 120)}`);
} finally {
  await fetch(`${SB}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
  console.log("\ntest account removed.");
}

const bad = checks.filter(c => !c.ok);
console.log(bad.length === 0
  ? "\nThe core loop works for a real student."
  : `\n${bad.length} of ${checks.length} checks failed.`);
process.exit(bad.length ? 1 : 0);
