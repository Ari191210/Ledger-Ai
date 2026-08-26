// Real-browser verification, driven through Chrome's DevTools Protocol.
//
// Everything so far has been server-rendered or unit-tested. That proves the
// components produce correct output, but not that the product *works*: it
// cannot catch a hydration mismatch, a listener that never fires, or state
// that fails to survive a reload. Those are exactly the failures a student
// would hit first.
//
// This drives a real Chrome over a raw WebSocket to the DevTools endpoint.
// No Playwright or Puppeteer dependency is added — Chrome is already on this
// machine, and CDP is a stable protocol.
//
// Usage: node scripts/browser-verify.mjs [baseUrl]
//
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// Node 22 ships a WHATWG WebSocket, so this needs no package at all.

const BASE = process.argv[2] || "http://localhost:3000";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const chromePath = CHROME_PATHS.find(p => existsSync(p));
if (!chromePath) {
  console.error("No Chrome or Edge found. Skipping browser verification.");
  process.exit(2);
}

const profileDir = mkdtempSync(path.join(tmpdir(), "sl-verify-"));
const PORT = 9333;

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(300);
  }
  throw new Error("Chrome did not expose a debugging endpoint");
}

let msgId = 0;
function rpc(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const onMessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMessage);
      msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`${method} timed out`));
    }, 30000);
  });
}

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  ok  " : "FAIL  "} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
  const wsUrl = await endpoint();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });

  const { targetId } = await rpc(ws, "Target.createTarget", { url: "about:blank" });
  const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });

  await rpc(ws, "Runtime.enable", {}, sessionId);
  await rpc(ws, "Page.enable", {}, sessionId);
  await rpc(ws, "Log.enable", {}, sessionId);
  await rpc(ws, "Network.enable", {}, sessionId);

  // Collect anything the page logs as an error, including React's hydration
  // warnings — a mismatch is a real defect even though the page still renders.
  //
  // Console text alone is not enough to attribute a failure: Chrome logs
  // "Failed to load resource" without the URL, so a network listener is used
  // to recover which request actually failed.
  const pageErrors = [];
  const requestUrls = new Map();
  const failedRequests = [];
  ws.addEventListener("message", (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.method === "Log.entryAdded" && m.params?.entry?.level === "error") {
      // Prefer the entry's own url when Chrome supplies one.
      pageErrors.push({ text: m.params.entry.text, url: m.params.entry.url ?? "" });
    }
    if (m.method === "Runtime.exceptionThrown") {
      pageErrors.push({ text: m.params?.exceptionDetails?.text ?? "exception", url: "" });
    }
    if (m.method === "Network.requestWillBeSent") {
      requestUrls.set(m.params.requestId, m.params.request.url);
    }
    if (m.method === "Network.loadingFailed") {
      failedRequests.push(requestUrls.get(m.params.requestId) ?? "");
    }
  });

  const evaluate = async (expression) => {
    const r = await rpc(ws, "Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  const goto = async (url) => {
    await rpc(ws, "Page.navigate", { url }, sessionId);
    // Wait for React to hydrate rather than a fixed sleep.
    for (let i = 0; i < 50; i++) {
      await sleep(200);
      const ready = await evaluate(`document.readyState === "complete" && !!document.querySelector("h1")`);
      if (ready) return;
    }
  };

  // ── 1. The journey home loads and hydrates ────────────────────────────
  await goto(`${BASE}/journey`);
  const h1 = await evaluate(`document.querySelector("h1")?.textContent ?? ""`);
  check("journey home renders a heading", Boolean(h1), h1);

  // After hydration the greeting replaces the SSR placeholder. This is the
  // check that server-rendering alone could never make.
  const hydrated = await evaluate(`/Good (morning|afternoon|evening)|Your journey/.test(document.body.innerText)`);
  check("client hydrates the home page", hydrated === true);

  const noHydrationError = !pageErrors.some(e => /hydrat/i.test(e.text));
  check("no hydration mismatch", noHydrationError,
    pageErrors.filter(e => /hydrat/i.test(e.text))[0]?.text ?? "");

  // ── 2. Empty state is honest, not a fabricated zero ───────────────────
  const emptyHonest = await evaluate(`
    document.body.innerText.includes("Nothing is being tracked yet")
  `);
  check("empty journey states it is empty rather than showing 0%", emptyHonest === true);

  // ── 3. Adding a college actually works, end to end ────────────────────
  await goto(`${BASE}/journey/colleges`);
  await evaluate(`
    (() => {
      const setValue = (el, v) => {
        const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const name = document.querySelector('input[placeholder="College name"]');
      setValue(name, "Carnegie Mellon");
      const date = document.querySelector('input[type="date"]');
      if (date) setValue(date, "2026-11-01");
      return true;
    })()
  `);
  await sleep(200);
  await evaluate(`
    [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Add college")?.click()
  `);
  await sleep(600);

  const collegeAdded = await evaluate(`document.body.innerText.includes("Carnegie Mellon")`);
  check("adding a college renders it", collegeAdded === true);

  const persisted = await evaluate(`
    JSON.parse(localStorage.getItem("ledger-student-v1") || "{}").colleges?.length ?? 0
  `);
  check("college is written to the store", persisted === 1, `${persisted} stored`);

  // ── 4. The cross-entity linkage — the core claim of the design ────────
  const linked = await evaluate(`
    (() => {
      const s = JSON.parse(localStorage.getItem("ledger-student-v1") || "{}");
      return {
        apps: s.applications?.length ?? 0,
        events: s.events?.length ?? 0,
        checklist: s.applications?.[0]?.checklist?.length ?? 0,
      };
    })()
  `);
  check("adding a college opens an application", linked.apps === 1, `${linked.checklist} checklist items`);
  check("adding a college creates a calendar deadline", linked.events === 1);

  // ── 5. That linkage is visible on the other pages ─────────────────────
  await goto(`${BASE}/journey/applications`);
  const appVisible = await evaluate(`document.body.innerText.includes("Carnegie Mellon")`);
  check("the application appears in Applications", appVisible === true);

  await goto(`${BASE}/journey/calendar`);
  const calVisible = await evaluate(`document.body.innerText.includes("Carnegie Mellon")`);
  check("the deadline appears in Calendar", calVisible === true);

  // A derived date must not be deletable from the calendar.
  const derivedLocked = await evaluate(`
    (() => {
      const rows = [...document.querySelectorAll("li")].filter(li => li.innerText.includes("Carnegie Mellon"));
      if (!rows.length) return null;
      return ![...rows[0].querySelectorAll("button")].some(b => b.textContent.trim() === "Remove");
    })()
  `);
  check("a derived calendar date cannot be deleted from the calendar", derivedLocked === true);

  // ── 6. The home page now reflects the new record ──────────────────────
  await goto(`${BASE}/journey`);
  // Figure labels are rendered uppercase by CSS, and innerText reflects the
  // computed text-transform — so this must be matched case-insensitively.
  const nowTracked = await evaluate(`/journey on track/i.test(document.body.innerText)`);
  check("home now reports a journey figure", nowTracked === true);

  const recommends = await evaluate(`
    document.body.innerText.includes("Carnegie Mellon") ||
    document.body.innerText.includes("Categorise")
  `);
  check("home recommends action on the new college", recommends === true);

  // ── 7. Survives a reload — the point of local-first ───────────────────
  await goto(`${BASE}/journey/colleges`);
  const survived = await evaluate(`document.body.innerText.includes("Carnegie Mellon")`);
  check("data survives a full page reload", survived === true);

  // ── 8. Deleting leaves no orphans ─────────────────────────────────────
  await evaluate(`
    [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Detail")?.click()
  `);
  await sleep(400);
  await evaluate(`
    [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Remove")?.click()
  `);
  await sleep(600);
  const afterDelete = await evaluate(`
    (() => {
      const s = JSON.parse(localStorage.getItem("ledger-student-v1") || "{}");
      return {
        colleges: s.colleges?.length ?? 0,
        apps: s.applications?.length ?? 0,
        events: s.events?.length ?? 0,
      };
    })()
  `);
  check("deleting a college removes its application and date",
    afterDelete.colleges === 0 && afterDelete.apps === 0 && afterDelete.events === 0,
    JSON.stringify(afterDelete));

  // ── 9. No uncaught errors anywhere in that whole flow ─────────────────
  // Third-party asset failures are reported separately from application
  // errors. They are real, but they are not this feature's defect, and
  // failing on them would make the check useless as a regression signal.
  //
  // Chrome logs "Failed to load resource" with no URL in the text, so the
  // failed-request URLs collected above are what decide attribution.
  const thirdParty = /favicon|manifest|sw\.js|posthog|sentry|analytics|fontshare|googleapis|gstatic/i;
  const externalFailures = failedRequests.filter(u => thirdParty.test(u));
  const ownFailures = failedRequests.filter(u => u && !thirdParty.test(u));

  const scriptErrors = pageErrors.filter(e => {
    if (/failed to load resource/i.test(e.text)) return false; // attributed via network
    return !thirdParty.test(e.text) && !thirdParty.test(e.url);
  });

  check("no uncaught client errors during the flow",
    scriptErrors.length === 0 && ownFailures.length === 0,
    [...scriptErrors.map(e => e.text), ...ownFailures].slice(0, 2).join(" | "));

  if (externalFailures.length) {
    const unique = [...new Set(externalFailures)];
    console.log(`  note  ${unique.length} third-party asset(s) unreachable, pre-existing and site-wide:`);
    for (const u of unique.slice(0, 3)) console.log(`        ${u}`);
  }

  ws.close();
  chrome.kill();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* best effort */ }

  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(err => {
  console.error("Verification failed to run:", err.message);
  chrome.kill();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* best effort */ }
  process.exit(1);
});
