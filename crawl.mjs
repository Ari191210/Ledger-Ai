// Full runtime crawl: every page, signed in, at three widths.
// Reports console errors, failed requests, horizontal overflow, broken links,
// missing page headings, images without alt, and buttons with no accessible name.
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE || "https://studyledger.in";

const ROUTES = [
  "/dashboard",
  "/score",
  "/tools",
  "/settings",
  "/tools/circadian",
  "/tools/coach",
  "/tools/crunch",
  "/tools/deadlines",
  "/tools/debt-meter",
  "/tools/doubt",
  "/tools/essay-grader",
  "/tools/exam-planner",
  "/tools/exam-sim",
  "/tools/flashcards",
  "/tools/focus",
  "/tools/formula",
  "/tools/habits",
  "/tools/mark-scheme",
  "/tools/mistake-dna",
  "/tools/model-answer",
  "/tools/notes",
  "/tools/patterns",
  "/tools/peer-heatmap",
  "/tools/planner",
  "/tools/practice",
  "/tools/spaced-review",
  "/tools/syllabus",
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const findings = [];
let consoleErrors = [];
let failedReqs = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
});
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 160)));
page.on("requestfailed", (r) => {
  // An RSC prefetch aborted because the user navigated is not a failure.
  const aborted = (r.failure()?.errorText || "").includes("ABORTED");
  if (aborted || r.url().includes("_rsc=")) return;
  failedReqs.push(`${r.method()} ${r.url().slice(0, 90)}`);
});
page.on("response", (r) => {
  if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url().slice(0, 90)}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', process.env.PREVIEW_PASS);
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 2500));

const allLinks = new Set();

for (const route of ROUTES) {
  for (const [w, h, tag] of [
    [390, 844, "phone"],
    [1440, 900, "laptop"],
    [2560, 1300, "wide"],
  ]) {
    consoleErrors = [];
    failedReqs = [];
    await page.setViewport({ width: w, height: h });
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" }).catch(() => null);
    await new Promise((r) => setTimeout(r, 700));

    if (!resp || resp.status() >= 400) {
      findings.push({ route, tag, kind: "PAGE STATUS", detail: resp ? resp.status() : "no response" });
      continue;
    }

    const audit = await page.evaluate(() => {
      const out = {};
      out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
      out.overflowBy = document.documentElement.scrollWidth - window.innerWidth;
      out.h1 = document.querySelectorAll("h1").length;
      out.imgsNoAlt = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
      out.namelessButtons = [...document.querySelectorAll("button")].filter(
        (b) => !b.textContent.trim() && !b.getAttribute("aria-label") && !b.getAttribute("title"),
      ).length;
      out.emptyLinks = [...document.querySelectorAll("a")].filter(
        (a) => !a.textContent.trim() && !a.getAttribute("aria-label"),
      ).length;
      out.links = [...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href"));
      // Any element whose text is clipped by its own box.
      out.clipped = [...document.querySelectorAll("p,span,h1,h2,h3,button,a")].filter(
        (e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible",
      ).length;
      return out;
    });

    audit.links.forEach((l) => allLinks.add(l));

    if (audit.overflowX)
      findings.push({ route, tag, kind: "H-SCROLL", detail: `${audit.overflowBy}px wider than viewport` });
    if (tag === "laptop" && audit.h1 === 0)
      findings.push({ route, tag, kind: "NO H1", detail: "page has no heading" });
    if (audit.h1 > 1)
      findings.push({ route, tag, kind: "MULTIPLE H1", detail: `${audit.h1} h1 elements` });
    if (audit.imgsNoAlt) findings.push({ route, tag, kind: "IMG NO ALT", detail: audit.imgsNoAlt });
    if (audit.namelessButtons)
      findings.push({ route, tag, kind: "BUTTON NO NAME", detail: audit.namelessButtons });
    if (audit.emptyLinks) findings.push({ route, tag, kind: "LINK NO NAME", detail: audit.emptyLinks });
    if (consoleErrors.length)
      findings.push({ route, tag, kind: "CONSOLE ERROR", detail: [...new Set(consoleErrors)].join(" | ") });
    const realFails = failedReqs.filter((f) => !f.includes("favicon"));
    if (realFails.length)
      findings.push({ route, tag, kind: "REQUEST FAILED", detail: [...new Set(realFails)].join(" | ") });
  }
}

// Every internal link reachable?
console.log(`\nchecking ${allLinks.size} distinct internal links...`);
for (const href of allLinks) {
  if (href.startsWith("/auth")) continue;
  const r = await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" }).catch(() => null);
  if (!r || r.status() >= 400) {
    findings.push({ route: href, tag: "link", kind: "BROKEN LINK", detail: r ? r.status() : "no response" });
  }
}

console.log(`\n${"=".repeat(78)}\nFINDINGS: ${findings.length}\n${"=".repeat(78)}`);
const byKind = {};
for (const f of findings) (byKind[f.kind] ??= []).push(f);
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n### ${kind} (${list.length})`);
  for (const f of list) console.log(`  ${f.route} [${f.tag}]: ${f.detail}`);
}
if (!findings.length) console.log("\nnothing found");
await browser.close();
