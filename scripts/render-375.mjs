// ═══════════════════════════════════════════════════════════════════════════
// A REAL 375px render of every shipped route
//
// tests/mobile.test.mjs asserts eleven STRUCTURAL rules and they all pass, but
// a structural rule is a proxy. This drives a real Chrome at a real iPhone
// viewport and measures what actually happens.
//
// Earlier attempts failed and are not repeated: injecting width overrides into
// a live page and photographing it produced a broken image, and an iframe
// harness needed a browser bridge that would not start. This uses the Chrome
// already installed on the machine, over CDP, headless.
//
// What it measures, per route:
//   · horizontal overflow  — scrollWidth beyond 375 is the bug users feel
//   · WHICH element overflows, so a failure is actionable rather than a number
//   · tap targets under 44px
//   · text under 12px
//
//   node scripts/render-375.mjs            (against production)
//   node scripts/render-375.mjs --local    (against localhost:3311)
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from "playwright-core";
import fs from "node:fs";

const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]
  .find((p) => fs.existsSync(p));
if (!CHROME) { console.log("no local Chrome or Edge found"); process.exit(1); }

const local = process.argv.includes("--local");
const BASE = local ? "http://localhost:3311" : "https://www.studyledger.in";
const ROUTES = ["/", "/auth", "/onboard", "/capture", "/diagnosis", "/record", "/today"];
const WIDTH = 375, HEIGHT = 812;

const outDir = "artifacts/375";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    + "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

console.log(`${BASE} at ${WIDTH}x${HEIGHT}\n`);
let bad = 0;

for (const route of ROUTES) {
  const page = await ctx.newPage();
  try {
    const res = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(400);

    const report = await page.evaluate((vw) => {
      const doc = document.documentElement;

      // Which elements actually stick out past the viewport? Naming them is
      // what makes a failure fixable.
      const offenders = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const over = Math.round(r.right - vw);
        if (over > 1) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.visibility === "hidden") continue;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 40),
            over, width: Math.round(r.width),
            text: (el.textContent || "").trim().slice(0, 40),
          });
        }
      }
      // Report the outermost offenders only; children inherit the overflow.
      offenders.sort((a, b) => b.over - a.over);

      // Touch targets. 44px is the floor the workspace engine promises.
      const small = [];
      for (const el of document.querySelectorAll("a,button,input,select,textarea,[role=button]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 44) {
          small.push({
            tag: el.tagName.toLowerCase(), h: Math.round(r.height),
            text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 34),
          });
        }
      }

      // Text that would be uncomfortable on a phone.
      const tiny = new Set();
      for (const el of document.querySelectorAll("p,span,a,li,td,label,div")) {
        if (!el.childNodes.length) continue;
        const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!direct) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 12) tiny.add(`${el.tagName.toLowerCase()} ${size}px`);
      }

      return {
        scrollWidth: doc.scrollWidth,
        offenders: offenders.slice(0, 5),
        smallTargets: small.slice(0, 5),
        smallCount: small.length,
        tiny: [...tiny].slice(0, 4),
        title: document.title,
      };
    }, WIDTH);

    const overflow = report.scrollWidth - WIDTH;
    const problems = [];
    if (overflow > 0) problems.push(`scrolls ${overflow}px sideways`);
    if (report.smallCount > 0) problems.push(`${report.smallCount} target(s) under 44px`);
    if (report.tiny.length) problems.push(`text under 12px: ${report.tiny.join(", ")}`);

    if (problems.length) bad++;
    console.log(`  ${problems.length ? "ISSUE " : "ok    "} ${String(res.status()).padEnd(4)} ${route}`);
    for (const p of problems) console.log(`           ${p}`);
    for (const o of report.offenders) {
      console.log(`           +${o.over}px  <${o.tag}${o.cls ? " class=" + o.cls : ""}> w=${o.width} "${o.text}"`);
    }
    for (const s of report.smallTargets) {
      console.log(`           ${s.h}px  <${s.tag}> "${s.text}"`);
    }

    const name = route === "/" ? "home" : route.replace(/\//g, "");
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  } catch (e) {
    bad++;
    console.log(`  ERROR  ${route}: ${e.message.split("\n")[0].slice(0, 100)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nscreenshots in ${outDir}/`);
console.log(bad === 0
  ? "Every route renders cleanly at 375px."
  : `${bad} route(s) need attention.`);
process.exit(bad === 0 ? 0 : 1);
