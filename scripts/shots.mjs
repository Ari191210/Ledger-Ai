// Capture real screenshots of the OS surfaces, so the design can be judged as
// rendered rather than as markup. Uses the Chrome already on this machine over
// the DevTools protocol; no Playwright dependency.
//
//   node scripts/shots.mjs [baseUrl]
//
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.resolve("shots");
mkdirSync(OUT, { recursive: true });

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
if (!CHROME) { console.error("No Chrome found."); process.exit(2); }

const profile = mkdtempSync(path.join(tmpdir(), "shots-"));
const PORT = 9338;
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--no-first-run", "--disable-gpu",
  "--force-device-scale-factor=2", "--hide-scrollbars", "about:blank",
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
  { name: "01-landing",  url: "/os" },
  { name: "02-about",    url: "/about" },
  { name: "03-home",     url: "/journey" },
  { name: "04-colleges", url: "/journey/colleges" },
  { name: "05-testing",  url: "/journey/testing" },
  { name: "06-essays",   url: "/journey/essays" },
  { name: "07-pricing",  url: "/os/pricing" },
  { name: "08-auth",     url: "/os/auth" },
  { name: "09-academics",url: "/journey/academics" },
  { name: "10-calendar", url: "/journey/calendar" },
];

const ws = new WebSocket(await endpoint());
await new Promise(r => ws.addEventListener("open", r, { once: true }));
const { targetId } = await rpc(ws, "Target.createTarget", { url: "about:blank" });
const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
await rpc(ws, "Runtime.enable", {}, sessionId);
await rpc(ws, "Page.enable", {}, sessionId);
await rpc(ws, "Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false }, sessionId);

const ev = async e => (await rpc(ws, "Runtime.evaluate",
  { expression: e, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;

// Seed a realistic record once, so the screenshots show a populated system
// rather than a wall of empty states.
await rpc(ws, "Page.navigate", { url: `${BASE}/journey` }, sessionId);
await sleep(3000);
await ev(`
  (() => {
    const now = new Date().toISOString();
    const d = n => { const x = new Date(Date.now() + n*86400000);
      return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); };
    localStorage.setItem("ledger-student-v1", JSON.stringify({
      version: 1,
      profile: { name: "Aryamman", grade: 11, curriculum: "CBSE",
                 intendedMajor: "Computer Science", country: "India", careerInterests: [] },
      academics: { courses: [
          { id:"c1", subject:"Physics", score:72 },
          { id:"c2", subject:"Chemistry", score:81 },
          { id:"c3", subject:"Mathematics", score:88 },
          { id:"c4", subject:"Computer Science", score:94 }],
        weakTopics: [{ id:"w1", subject:"Physics", topic:"Rotational motion", source:"self", noticedAt: now }] },
      testing: {
        plans: [{ id:"tp1", kind:"SAT", targetScore:1550, testDate: d(96) }],
        scores: [
          { id:"s1", kind:"SAT", attempt:"practice", takenOn:"2026-06-14", total:1380, max:1600,
            sections:[{name:"Math",score:690,max:800},{name:"Reading & Writing",score:690,max:800}] },
          { id:"s2", kind:"SAT", attempt:"practice", takenOn:"2026-08-02", total:1450, max:1600,
            sections:[{name:"Math",score:710,max:800},{name:"Reading & Writing",score:740,max:800}] }] },
      activities: [
        { id:"a1", name:"RoboKnights", category:"technology", role:"Captain", leadership:true,
          impact:"Grew the team from 4 to 18 and placed 2nd of 40.", achievements:[], links:[] },
        { id:"a2", name:"Peer tutoring", category:"volunteering", leadership:false, achievements:[], links:[] }],
      awards: [], research: [], competitions: [],
      projects: [{ id:"p1", title:"HydroTwin", status:"building",
        problem:"Flood prediction from live rainfall and terrain data.",
        skills:["Python"], techStack:["Landlab"], milestones:[
          { id:"m1", title:"Benchmark against the 2023 flood", dueDate: d(12), done:false }],
        links:[], inPortfolio:true }],
      colleges: [
        { id:"col1", name:"Carnegie Mellon", location:"Pittsburgh", country:"USA", tier:"reach",
          round:"ED", deadline: d(58), intendedMajor:"Computer Science", testPolicy:"optional", addedAt: now },
        { id:"col2", name:"Purdue", location:"West Lafayette", country:"USA", tier:"target",
          round:"RD", deadline: d(74), intendedMajor:"Computer Science", testPolicy:"optional", addedAt: now },
        { id:"col3", name:"NUS", location:"Singapore", country:"Singapore", tier:"target",
          round:"RD", deadline: d(102), addedAt: now }],
      applications: [
        { id:"ap1", collegeId:"col1", submitted:false, checklist:
          ["Personal information","Academic records","Activities list","Main essay","Supplemental essays",
           "Recommendations","Transcript","Test scores","Application fee","Submit"]
          .map((l,i) => ({ id:"k"+i, label:l, done: i < 4 })) },
        { id:"ap2", collegeId:"col2", submitted:false, checklist:
          ["Personal information","Academic records","Activities list","Main essay","Supplemental essays",
           "Recommendations","Transcript","Test scores","Application fee","Submit"]
          .map((l,i) => ({ id:"j"+i, label:l, done: i < 2 })) },
        { id:"ap3", collegeId:"col3", submitted:false, checklist:
          ["Personal information","Academic records","Transcript","Submit"]
          .map((l,i) => ({ id:"n"+i, label:l, done: i < 1 })) }],
      recommenders: [{ id:"r1", name:"Ms Rao", subject:"Physics", status:"not-requested",
        collegeIds:["col1"], materialsProvided:false, deadline: d(40) }],
      essays: [
        { id:"e1", title:"Common App personal statement", kind:"common-app", status:"drafting",
          wordLimit:650, deadline: d(52), drafts:[{ id:"d1", body:"x ".repeat(310), savedAt: now, wordCount:310 }] },
        { id:"e2", title:"Why Carnegie Mellon", kind:"supplemental", collegeId:"col1",
          status:"not-started", wordLimit:300, deadline: d(56), drafts:[] }],
      opportunities: [
        { id:"o1", name:"NSEP", kind:"olympiad", organization:"IAPT", stage:"interested",
          deadline: d(9), fields:["Physics"], addedAt: now }],
      tasks: [
        { id:"t1", title:"Rotational motion — one past paper", priority:"high",
          dueDate: d(1), estimateMinutes:45, area:"academics", done:false, createdAt: now },
        { id:"t2", title:"Email Dr Rao about the HydroTwin benchmark", priority:"medium",
          dueDate: d(3), estimateMinutes:20, area:"projects", done:false, createdAt: now }],
      // The calendar is a projection: in the app these are written by the
      // action layer whenever a dated record is created. Seeding storage
      // directly bypasses that, so the equivalent events are written here —
      // otherwise the fixture would show "no dates tracked" beside three
      // colleges that plainly have deadlines.
      events: [
        { id:"ev1", title:"Carnegie Mellon — application deadline", date: d(58), kind:"deadline",
          source:{ kind:"college", id:"col1" } },
        { id:"ev2", title:"Purdue — application deadline", date: d(74), kind:"deadline",
          source:{ kind:"college", id:"col2" } },
        { id:"ev3", title:"NUS — application deadline", date: d(102), kind:"deadline",
          source:{ kind:"college", id:"col3" } },
        { id:"ev4", title:"SAT test date", date: d(96), kind:"test-date",
          source:{ kind:"test", id:"tp1" } },
        { id:"ev5", title:"Common App personal statement — due", date: d(52), kind:"deadline",
          source:{ kind:"essay", id:"e1" } },
        { id:"ev6", title:"Why Carnegie Mellon — due", date: d(56), kind:"deadline",
          source:{ kind:"essay", id:"e2" } },
        { id:"ev7", title:"NSEP — deadline", date: d(9), kind:"deadline",
          source:{ kind:"opportunity", id:"o1" } },
        { id:"ev8", title:"Recommendation due — Ms Rao", date: d(40), kind:"deadline",
          source:{ kind:"recommender", id:"r1" } },
        { id:"ev9", title:"HydroTwin — target date", date: d(12), kind:"milestone",
          source:{ kind:"project", id:"p1" } }],
      portfolio: { published:false, headline:"", about:"", skills:["Python"], links:[] },
      createdAt: now, updatedAt: now,
    }));
    return true;
  })()
`);

for (const p of PAGES) {
  await rpc(ws, "Page.navigate", { url: BASE + p.url }, sessionId);
  // Wait for hydration to replace the placeholder, then let type settle.
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    const ready = await ev(`document.readyState === "complete" && !!document.querySelector("h1")
      && !/Reading your /.test(document.body.innerText)`);
    if (ready) break;
  }
  await sleep(700);
  const { data } = await rpc(ws, "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true }, sessionId);
  const file = path.join(OUT, `${p.name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`${p.name}.png  ${(Buffer.from(data, "base64").length / 1024).toFixed(0)} KB  ${p.url}`);
}

ws.close(); chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(`\nWritten to ${OUT}`);
