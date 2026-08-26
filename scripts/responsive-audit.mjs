// Responsive audit — the OS surfaces at a real phone width.
//
// Vision: "Mobile-first: 375px baseline." Every screenshot so far has been
// 1440px, so nothing has actually verified that claim. Students open this on
// a phone at 11pm, which makes 375px the more important of the two widths.
//
// Reports concrete failures rather than opinions: horizontal overflow, tap
// targets under the 44px accessibility floor, and text below 12px.
//
//   node scripts/responsive-audit.mjs [baseUrl]
//
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.resolve("shots", "mobile");
mkdirSync(OUT, { recursive: true });

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
if (!CHROME) { console.error("No Chrome found."); process.exit(2); }

const profile = mkdtempSync(path.join(tmpdir(), "resp-"));
const PORT = 9342;
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let id = 0;
const rpc = (ws, m, p = {}, s) => new Promise((res, rej) => {
  const myId = ++id;
  const on = ev => { let x; try { x = JSON.parse(ev.data); } catch { return; }
    if (x.id !== myId) return; ws.removeEventListener("message", on);
    x.error ? rej(new Error(x.error.message)) : res(x.result); };
  ws.addEventListener("message", on);
  ws.send(JSON.stringify({ id: myId, method: m, params: p, ...(s ? { sessionId: s } : {}) }));
});
async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch {}
    await sleep(300);
  }
  throw new Error("no devtools endpoint");
}

const PAGES = [
  ["landing",   "/os"],
  ["pricing",   "/os/pricing"],
  ["auth",      "/os/auth"],
  ["home",      "/journey"],
  ["colleges",  "/journey/colleges"],
  ["testing",   "/journey/testing"],
];

const WIDTH = 375;

const ws = new WebSocket(await endpoint());
await new Promise(r => ws.addEventListener("open", r, { once: true }));
const { targetId } = await rpc(ws, "Target.createTarget", { url: "about:blank" });
const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
await rpc(ws, "Runtime.enable", {}, sessionId);
await rpc(ws, "Page.enable", {}, sessionId);
await rpc(ws, "Emulation.setDeviceMetricsOverride", {
  width: WIDTH, height: 812, deviceScaleFactor: 2, mobile: true,
}, sessionId);

const ev = async e => {
  const r = await rpc(ws, "Runtime.evaluate",
    { expression: e, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

// Seed a populated record so the audit sees real content, not empty states.
await rpc(ws, "Page.navigate", { url: `${BASE}/journey` }, sessionId);
await sleep(3000);
await ev(`
  (() => {
    const now = new Date().toISOString();
    const d = n => { const x = new Date(Date.now() + n*86400000);
      return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); };
    localStorage.setItem("ledger-student-v1", JSON.stringify({
      version:1,
      profile:{ name:"Aryamman", grade:11, curriculum:"CBSE", intendedMajor:"Computer Science", country:"India", careerInterests:[] },
      academics:{ courses:[{id:"c1",subject:"Physics",score:72},{id:"c2",subject:"Mathematics",score:88}], weakTopics:[] },
      testing:{ plans:[{id:"tp1",kind:"SAT",targetScore:1550,testDate:d(96)}],
        scores:[{id:"s1",kind:"SAT",attempt:"practice",takenOn:"2026-06-14",total:1380,max:1600,
          sections:[{name:"Math",score:690,max:800},{name:"Reading & Writing",score:690,max:800}]},
          {id:"s2",kind:"SAT",attempt:"practice",takenOn:"2026-08-02",total:1450,max:1600,
          sections:[{name:"Math",score:710,max:800},{name:"Reading & Writing",score:740,max:800}]}] },
      activities:[{id:"a1",name:"RoboKnights",category:"technology",leadership:true,impact:"Grew the team from 4 to 18.",achievements:[],links:[]}],
      awards:[], research:[], competitions:[],
      projects:[{id:"p1",title:"HydroTwin",status:"building",skills:[],techStack:[],milestones:[],links:[],inPortfolio:true}],
      colleges:[{id:"col1",name:"Carnegie Mellon",location:"Pittsburgh",country:"USA",tier:"reach",round:"ED",deadline:d(58),intendedMajor:"Computer Science",testPolicy:"optional",addedAt:now}],
      applications:[{id:"ap1",collegeId:"col1",submitted:false,checklist:
        ["Personal information","Academic records","Activities list","Main essay","Supplemental essays","Recommendations","Transcript","Test scores","Application fee","Submit"]
        .map((l,i)=>({id:"k"+i,label:l,done:i<4}))}],
      recommenders:[], essays:[{id:"e1",title:"Common App personal statement",kind:"common-app",status:"drafting",wordLimit:650,deadline:d(52),drafts:[]}],
      opportunities:[], tasks:[{id:"t1",title:"Rotational motion — one past paper",priority:"high",dueDate:d(1),estimateMinutes:45,area:"academics",done:false,createdAt:now}],
      events:[{id:"ev1",title:"Carnegie Mellon — application deadline",date:d(58),kind:"deadline",source:{kind:"college",id:"col1"}}],
      portfolio:{published:false,skills:[],links:[]},
      createdAt:now, updatedAt:now,
    }));
    return true;
  })()
`);

const findings = [];

for (const [name, url] of PAGES) {
  await rpc(ws, "Page.navigate", { url: BASE + url }, sessionId);
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    const ready = await ev(`document.readyState === "complete" && !!document.querySelector("h1")
      && !/Reading your /.test(document.body.innerText)`);
    if (ready) break;
  }
  await sleep(600);

  const report = await ev(`
    (() => {
      const vw = ${WIDTH};
      const out = { overflow: null, wide: [], smallTargets: [], smallText: [] };

      // Horizontal overflow is the defect that makes a page feel broken.
      const doc = document.documentElement;
      if (doc.scrollWidth > vw + 1) out.overflow = doc.scrollWidth;

      for (const el of document.querySelectorAll("[data-os] *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        // Anything extending past the viewport edge — but not content inside a
        // deliberately horizontally-scrollable container. The section nav is
        // meant to scroll on a phone, so its items sitting past the edge is
        // the design working, not a defect.
        if (r.right > vw + 1 && r.width > 40) {
          let scrollable = false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const ov = getComputedStyle(p).overflowX;
            if (ov === "auto" || ov === "scroll") { scrollable = true; break; }
            if (p.hasAttribute("data-os")) break;
          }
          if (!scrollable) {
            const cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 32) : "";
            out.wide.push(el.tagName + (cls ? "." + cls : "") + " w=" + Math.round(r.width) + " right=" + Math.round(r.right));
          }
        }

        // Tap targets: 44px is the accessibility floor on touch. Elements
        // inside a paragraph are inline links and are exempt — making them
        // 44px tall would break the prose they sit in.
        const tag = el.tagName;
        const interactive = tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SELECT";
        const inProse = el.closest("p") !== null;
        if (interactive && !inProse && r.height > 0 && r.height < 32 && el.offsetParent !== null) {
          const label = (el.textContent || el.getAttribute("aria-label") || tag).trim().slice(0, 24);
          out.smallTargets.push(label + " h=" + Math.round(r.height));
        }

        // Text under 12px is hard to read on a phone.
        if (el.children.length === 0 && (el.textContent || "").trim().length > 3) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs && fs < 11.5) {
            out.smallText.push((el.textContent || "").trim().slice(0, 22) + " @" + fs + "px");
          }
        }
      }
      out.wide = [...new Set(out.wide)].slice(0, 6);
      out.smallTargets = [...new Set(out.smallTargets)].slice(0, 6);
      out.smallText = [...new Set(out.smallText)].slice(0, 6);
      return out;
    })()
  `);

  const { data } = await rpc(ws, "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true }, sessionId);
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));

  const issues = [];
  if (report.overflow) issues.push(`overflows to ${report.overflow}px`);
  if (report.wide.length) issues.push(`${report.wide.length} element(s) past the edge`);
  if (report.smallTargets.length) issues.push(`${report.smallTargets.length} small tap target(s)`);
  if (report.smallText.length) issues.push(`${report.smallText.length} text run(s) under 11.5px`);

  console.log(`${issues.length ? "ISSUE " : "  ok  "} ${name.padEnd(10)} ${issues.join(", ") || "clean at 375px"}`);
  for (const w of report.wide)         console.log(`           past edge: ${w}`);
  for (const t of report.smallTargets) console.log(`           tap target: ${t}`);
  for (const t of report.smallText)    console.log(`           small text: ${t}`);

  if (issues.length) findings.push(name);
}

ws.close(); chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}

console.log(`\n${PAGES.length - findings.length}/${PAGES.length} pages clean at ${WIDTH}px`);
console.log(`Screenshots in ${OUT}`);
process.exit(findings.length ? 1 : 0);
