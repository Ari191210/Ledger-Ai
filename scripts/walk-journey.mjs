// WALK THE STUDENT JOURNEY. Six days from launch, this has been read but
// never watched. Reading tells you what the code intends; driving a real
// browser tells you what a student meets.
//
//   node scripts/walk-journey.mjs           (against localhost:3311)
//   node scripts/walk-journey.mjs --prod    (against the live site)
//
// It creates a REAL account against the real Supabase project, because a
// mocked sign-up proves nothing about sign-up. The account is named
// journey-<epoch> so scripts/audit-welcome-queue.mjs classifies it as a
// fixture and it can never be mistaken for a student.
//
// It asserts what the founder actually asked for:
//   * ten onboarding pages, one question each after the first
//   * finishing lands on /dashboard, not /today
//   * the swan palette is on screen, light, at first paint
//   * no page dead-ends a signed-in student
import { chromium } from "playwright-core";
import fs from "node:fs";

const PROD = process.argv.includes("--prod");
const BASE = PROD ? "https://www.studyledger.in" : "http://localhost:3311";
const EXE = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
);

const stamp = Date.now();
const EMAIL = `journey-${stamp}@studyledger-test.invalid`;
const PASSWORD = `Jr!${stamp}aA`;

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

console.log(`\nWALKING THE STUDENT JOURNEY against ${BASE}\n`);

// ── Create the account through the API, so the walk starts at sign-in ──────
const signUp = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `journey-${stamp}` },
  }),
});
if (!signUp.ok) {
  console.log("could not create the test account:", signUp.status, (await signUp.text()).slice(0, 200));
  process.exit(1);
}
const created = await signUp.json();
console.log(`test account created: journey-${stamp}\n`);

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e).slice(0, 120)));

try {
  // ── 1. Sign in ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle", timeout: 45_000 });

  const paint = await page.evaluate(() => {
    const r = document.documentElement;
    return { base: r.dataset.base, mode: r.dataset.mode, paper: getComputedStyle(r).getPropertyValue("--paper").trim() };
  });
  check("swan is the ground at first paint", paint.base === "swan" && paint.mode === "light", `base=${paint.base} mode=${paint.mode}`);

  await page.locator('input[type="email"], input[placeholder*="mail" i]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  await page.waitForTimeout(6000);

  const afterSignIn = new URL(page.url()).pathname;
  check("sign-in leaves /auth", afterSignIn !== "/auth", `landed on ${afterSignIn}`);

  // ── 2. Onboarding: ten pages, one question each after the first ──────────
  if (!afterSignIn.startsWith("/onboard")) {
    await page.goto(`${BASE}/onboard`, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(2500);
  }

  let pagesSeen = 0;
  const questionsPerPage = [];
  for (let i = 0; i < 14; i++) {
    if (!new URL(page.url()).pathname.startsWith("/onboard")) break;
    pagesSeen++;

    // How many prompts are on screen? Page 1 legitimately carries two.
    const prompts = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,legend,[role=heading]")]
        .map(e => e.textContent.trim())
        .filter(t => t.endsWith("?")).length);
    questionsPerPage.push(prompts);

    // Answer EVERY question on the page. Page 1 carries two (board and
    // subjects) and "Next" stays disabled until both are answered, which is
    // correct behaviour and stalled an earlier version of this walker.
    const answered = await page.evaluate(() => {
      // Group the option buttons by the heading they sit under, so one option
      // is chosen per question rather than one per page.
      const stops = [...document.querySelectorAll("h1,h2,h3,legend")];
      const isControl = t => /^(next|back|continue|skip|light|dark|sign)/i.test(t.trim()) || t.trim().length === 0;
      let clicked = 0;
      for (let i = 0; i < stops.length; i++) {
        let el = stops[i].nextElementSibling;
        const end = stops[i + 1] ?? null;
        while (el && el !== end) {
          const btn = el.matches?.("button") ? el : el.querySelector?.("button");
          if (btn && !isControl(btn.textContent) && !btn.disabled) { btn.click(); clicked++; break; }
          el = el.nextElementSibling;
        }
      }
      return clicked;
    });
    await page.waitForTimeout(500);

    // ANCHORED (^) on purpose. Page 8's answers include "See it done
    // correctly" and "Try similar ones again"; an unanchored /next/i matched
    // an option, so the walker re-answered one question twelve times and
    // reported the product as stuck.
    //
    // The last page's control is "Open my ledger →", not "Finish", and a page
    // whose question is optional offers "Skip →" rather than "Next →". Both
    // are legitimate ways forward, so both are named.
    const cont = page.getByRole("button", { name: /^(next|continue|finish|done|start|open my ledger|skip)\b/i }).first();
    if (!(await cont.count())) { check("a way forward exists on every onboarding page", false, `page ${pagesSeen} has no next control`); break; }
    if (await cont.isDisabled()) {
      check("Next enables once a page is answered", false, `page ${pagesSeen}: answered ${answered} question(s), Next still disabled`);
      break;
    }
    await cont.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  check("onboarding is ten pages", pagesSeen === 10, `walked ${pagesSeen}`);
  check(
    "one question per page after the first",
    questionsPerPage.slice(1).every(q => q <= 1),
    `prompts per page: ${questionsPerPage.join(",")}`,
  );

  // ── 3. Finishing lands on /dashboard ────────────────────────────────────
  await page.waitForTimeout(2500);
  const landed = new URL(page.url()).pathname;
  check("onboarding lands on /dashboard", landed === "/dashboard", `landed on ${landed}`);

  // ── 4. Every main surface answers for a signed-in student ───────────────
  for (const route of ["/dashboard", "/today", "/diagnosis", "/record", "/settings"]) {
    const r = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45_000 });
    const text = await page.evaluate(() => document.body.innerText.trim());
    const signedOut = /sign in|create account/i.test(text.slice(0, 400));
    check(`${route} serves a signed-in student`, r.status() === 200 && !signedOut, `HTTP ${r.status()}${signedOut ? ", shows sign-in" : ""}`);
  }

  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  // Remove the account: a walk must not leave residue in a real project.
  await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${created.id}`, {
    method: "DELETE",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  console.log(`\ntest account removed.`);
}

const failed = checks.filter(c => !c.ok);
console.log(failed.length === 0
  ? "\nThe journey holds end to end."
  : `\n${failed.length} of ${checks.length} checks failed.`);
process.exit(failed.length ? 1 : 0);
