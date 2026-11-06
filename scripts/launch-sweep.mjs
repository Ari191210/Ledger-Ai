// Pre-launch sweep of the live site: every page at phone and laptop width,
// logged out and logged in. Records console errors, failed requests, 4xx/5xx,
// horizontal overflow, and an em dash anywhere in visible text.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = process.argv[2];
const BASE = "https://studyledger.in";
fs.mkdirSync(OUT, { recursive: true });

const PUBLIC = ["/", "/login", "/login?mode=signup", "/sample", "/privacy", "/terms", "/contact", "/nope-404"];
const APP = [
  "/dashboard", "/score", "/settings", "/tools",
  ...["circadian","coach","crunch","deadlines","debt-meter","doubt","essay-grader","exam-planner","exam-sim","flashcards","focus","formula","habits","mark-scheme","mistake-dna","model-answer","notes","patterns","planner","practice","spaced-review","syllabus"].map((s) => `/tools/${s}`),
];
const SIZES = [
  { name: "m", width: 390, height: 844, mobile: true },
  { name: "d", width: 1440, height: 900, mobile: false },
];

const report = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

async function sweep(page, size, paths, tag) {
  for (const p of paths) {
    const issues = [];
    const onConsole = (m) => { if (m.type() === "error") issues.push("console: " + m.text().slice(0, 160)); };
    const onFail = (r) => { const u = r.url(); if (!u.includes("_vercel/insights") && !u.includes("sentry")) issues.push("reqfail: " + u.slice(0, 120) + " " + (r.failure()?.errorText ?? "")); };
    const onResp = (r) => { const s = r.status(); const u = r.url(); if (s >= 400 && u.startsWith(BASE) && !u.includes("nope-404")) issues.push(`http ${s}: ${u.slice(0, 120)}`); };
    page.on("console", onConsole); page.on("requestfailed", onFail); page.on("response", onResp);
    let status = 0;
    try {
      const res = await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 30000 });
      status = res?.status() ?? 0;
    } catch (e) { issues.push("goto: " + e.message.slice(0, 100)); }
    await new Promise((r) => setTimeout(r, 900));
    const info = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const txt = document.body.innerText;
      const dash = txt.includes("\u2014");
      const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > cw + 2 && r.width > 0 && getComputedStyle(el).position !== "fixed"; }).slice(0, 3).map((el) => el.tagName + "." + String(el.className).slice(0, 40));
      const small = [...document.querySelectorAll("a,button")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24); }).length;
      return { sw, cw, dash, wide, small, title: document.title, url: location.pathname };
    });
    if (info.sw > info.cw + 1) issues.push(`overflow ${info.sw}>${info.cw} ${info.wide.join(" ")}`);
    if (info.dash) issues.push("em dash in visible text");
    const file = `${tag}-${size.name}-${p.replace(/[/?=]/g, "_") || "home"}.png`;
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    report.push({ tag, size: size.name, path: p, status, landed: info.url, title: info.title, smallTargets: info.small, issues });
    page.off("console", onConsole); page.off("requestfailed", onFail); page.off("response", onResp);
  }
}

for (const size of SIZES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: size.width, height: size.height, isMobile: size.mobile, hasTouch: size.mobile, deviceScaleFactor: 1 });
  await sweep(page, size, PUBLIC, "pub");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', process.env.SWEEP_EMAIL);
  await page.type('input[type="password"]', process.env.SWEEP_PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}), page.click('button[type="submit"]')]);
  await new Promise((r) => setTimeout(r, 1500));
  report.push({ tag: "login", size: size.name, landed: page.url() });
  await sweep(page, size, APP, "app");
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
for (const r of report) console.log(r.size, r.tag, r.path ?? "", r.status ?? "", r.landed, r.issues?.length ? "\n   " + r.issues.join("\n   ") : "");
