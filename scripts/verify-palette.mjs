// Real-browser verification of the nav trim and the command palette.
//
// A passing build proves the code compiles, not that ⌘K opens, that Enter
// navigates, or that the overflow menu stays on screen. Everything below is
// measured from the live DOM: element counts, computed styles, and the URL
// after a genuine key event dispatched through the browser's input pipeline
// (not a synthetic JS event, which would bypass the real listener).
//
// Usage: node scripts/verify-palette.mjs [baseUrl]
//
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const chromePath = CHROME_PATHS.find(p => existsSync(p));
if (!chromePath) {
  console.error("No Chrome or Edge found. Skipping.");
  process.exit(2);
}

const profileDir = mkdtempSync(path.join(tmpdir(), "sl-cmd-"));
const PORT = 9335;
const chrome = spawn(chromePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  "--headless=new", "--no-first-run", "--no-default-browser-check",
  "--disable-extensions", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    const onMessage = ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
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

  const evaluate = async expression => {
    const r = await rpc(ws, "Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  const goto = async url => {
    await rpc(ws, "Page.navigate", { url }, sessionId);
    for (let i = 0; i < 50; i++) {
      await sleep(200);
      if (await evaluate(`document.readyState === "complete"`)) break;
    }
    await sleep(900); // let hydration settle
  };

  // A real key event through the input pipeline. Synthetic dispatch from JS
  // would prove nothing about a listener bound at the window.
  const KEYS = {
    Escape:    { keyCode: 27, code: "Escape" },
    Enter:     { keyCode: 13, code: "Enter" },
    ArrowDown: { keyCode: 40, code: "ArrowDown" },
    ArrowUp:   { keyCode: 38, code: "ArrowUp" },
  };
  const key = async (name, { ctrl = false } = {}) => {
    const spec = KEYS[name] ?? { keyCode: name.toUpperCase().charCodeAt(0), code: `Key${name.toUpperCase()}` };
    const base = {
      key: name, code: spec.code, windowsVirtualKeyCode: spec.keyCode,
      nativeVirtualKeyCode: spec.keyCode, modifiers: ctrl ? 2 : 0,
    };
    await rpc(ws, "Input.dispatchKeyEvent", { type: "keyDown", ...base }, sessionId);
    await rpc(ws, "Input.dispatchKeyEvent", { type: "keyUp", ...base }, sessionId);
  };

  // Chrome inserts a character for any event carrying `text`. Sending it on
  // both keyDown and char types each letter twice ("pomodoro" arrives as
  // "ppoommooddoorroo"), so the keyDown must be a rawKeyDown with no text.
  const typeText = async text => {
    for (const ch of text) {
      await rpc(ws, "Input.dispatchKeyEvent", { type: "rawKeyDown", key: ch }, sessionId);
      await rpc(ws, "Input.dispatchKeyEvent", { type: "char", text: ch, key: ch }, sessionId);
      await rpc(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: ch }, sessionId);
      await sleep(25);
    }
  };

  // Guards the guard: if this ever regresses, every search assertion below
  // becomes meaningless, so the typed value is asserted directly.
  const assertTyped = async expected => {
    const actual = await evaluate(`document.querySelector('.os-cmd input')?.value ?? null`);
    check(`typed text arrives intact ("${expected}")`, actual === expected, `got "${actual}"`);
  };

  // ── 1. The bar carries five items, not twelve ──────────────────────────
  await goto(`${BASE}/journey`);
  const nav = await evaluate(`
    (() => {
      const items = [...document.querySelectorAll('.os-nav > .os-nav-item')];
      return {
        labels: items.map(a => a.textContent.replace(/[0-9]+$/, '').trim()),
        hasMore: !!document.querySelector('.os-more-btn'),
        menuOpen: !!document.querySelector('.os-more-menu'),
      };
    })()
  `);
  check("nav shows 5 primary items", nav.labels.length === 5, nav.labels.join(" / "));
  check("overflow trigger present", nav.hasMore === true);
  check("overflow menu starts closed", nav.menuOpen === false);

  // The "More" control is a <button> sitting among <a>s. globals.css styles
  // bare buttons with the legacy dark theme, which rendered it near-white on
  // near-white paper in a different face and size — invisible, and only
  // caught by looking at a screenshot. It must be indistinguishable from the
  // links beside it, so it is compared against one rather than to a
  // hardcoded value that could drift from the nav's own styling.
  const parity = await evaluate(`
    (() => {
      const links = [...document.querySelectorAll('.os-nav > a.os-nav-item')];
      const link = links[links.length - 1];
      const btn = document.querySelector('.os-more-btn');
      if (!link || !btn) return { ok: false };
      const a = getComputedStyle(link), b = getComputedStyle(btn);
      const same = k => a[k] === b[k];
      return {
        ok: true,
        color: same('color'), size: same('fontSize'),
        weight: same('fontWeight'), family: same('fontFamily'),
        got: { color: b.color, size: b.fontSize, weight: b.fontWeight,
               family: b.fontFamily.split(',')[0].replace(/["']/g, '') },
        want: { color: a.color, size: a.fontSize, weight: a.fontWeight,
                family: a.fontFamily.split(',')[0].replace(/["']/g, '') },
      };
    })()
  `);
  check("'More' matches its sibling links exactly",
    parity.ok && parity.color && parity.size && parity.weight && parity.family,
    parity.ok ? `got ${JSON.stringify(parity.got)} want ${JSON.stringify(parity.want)}` : "elements missing");

  // ── 2. The overflow menu holds the remaining seven ─────────────────────
  await evaluate(`document.querySelector('.os-more-btn').click()`);
  await sleep(350);
  const more = await evaluate(`
    (() => {
      const menu = document.querySelector('.os-more-menu');
      if (!menu) return { open: false };
      const items = [...menu.querySelectorAll('.os-more-item')];
      const r = menu.getBoundingClientRect();
      return {
        open: true,
        count: items.length,
        labels: items.map(a => a.textContent.replace(/[0-9]+$/, '').trim()),
        onScreen: r.right <= window.innerWidth + 1 && r.left >= -1,
        bgImage: getComputedStyle(menu).backgroundImage,
      };
    })()
  `);
  check("overflow menu opens", more.open === true);
  check("holds the other 7 sections", more.count === 7, (more.labels || []).join(" / "));
  check("menu stays on screen", more.onScreen === true);
  check("menu uses no gradient", more.bgImage === "none", String(more.bgImage));

  await key("Escape");
  await sleep(300);
  check("Escape closes overflow", await evaluate(`!document.querySelector('.os-more-menu')`) === true);

  // ── 3. Ctrl-K opens the palette ────────────────────────────────────────
  await key("k", { ctrl: true });
  await sleep(500);
  const opened = await evaluate(`
    (() => {
      const el = document.querySelector('.os-cmd');
      if (!el) return { open: false };
      return {
        open: true,
        focused: document.activeElement === el.querySelector('input'),
        rows: el.querySelectorAll('.os-cmd-row').length,
      };
    })()
  `);
  check("Ctrl-K opens palette", opened.open === true);
  check("input auto-focused", opened.focused === true);
  check("shows sections when empty", opened.rows > 0, `${opened.rows} rows`);

  // ── 4. Keyword search: finds a tool by what it does, not its name ──────
  await typeText("pomodoro");
  await sleep(500);
  await assertTyped("pomodoro");
  const search = await evaluate(`
    (() => {
      const rows = [...document.querySelectorAll('.os-cmd-row')];
      return {
        count: rows.length,
        first: rows[0]?.querySelector('.os-cmd-label')?.textContent ?? null,
        activeIsFirst: rows[0]?.dataset.active === 'true',
      };
    })()
  `);
  check("'pomodoro' matches a tool by keyword", search.count > 0, `top: ${search.first}`);
  check("first row is preselected", search.activeIsFirst === true);

  // ── 5. Enter navigates, and the palette closes behind it ───────────────
  // Polled rather than slept: in dev the destination route may be compiled on
  // first request, which is slow once and fast forever after. A fixed wait
  // would report a routing bug that does not exist.
  //
  // The destination is /tools/* which sits behind AuthGuard, so a signed-out
  // browser legitimately lands on /auth. Both outcomes prove the palette
  // routed correctly; asserting the tool path alone would make this test pass
  // or fail on whether the throwaway Chrome profile happened to hold a
  // session, which has nothing to do with the palette.
  await key("Enter");
  let url = "/journey";
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    url = await evaluate(`location.pathname`);
    if (url !== "/journey") break;
  }
  const after = await evaluate(`({ palette: !!document.querySelector('.os-cmd') })`);
  check("Enter navigates away from /journey", url !== "/journey", `→ ${url}`);
  check("routes to the selected tool (or its auth gate)",
    url === "/tools/focus-lab" || url.startsWith("/auth"), url);
  check("palette closes after navigating", after.palette === false);

  // ── 6. Arrow keys move the selection ───────────────────────────────────
  await goto(`${BASE}/journey`);
  await key("k", { ctrl: true });
  await sleep(450);
  await key("ArrowDown");
  await sleep(250);
  const idx = await evaluate(`
    [...document.querySelectorAll('.os-cmd-row')].findIndex(r => r.dataset.active === 'true')
  `);
  check("ArrowDown moves selection to row 2", idx === 1, `index ${idx}`);

  // ── 7. A query matching nothing says so, rather than listing everything ─
  await typeText("zzzqqq");
  await sleep(500);
  await assertTyped("zzzqqq");
  const empty = await evaluate(`
    ({ rows: document.querySelectorAll('.os-cmd-row').length,
       msg: !!document.querySelector('.os-cmd-empty') })
  `);
  check("no-match shows guidance, not results", empty.rows === 0 && empty.msg === true);
  await key("Escape");
  await sleep(300);

  // ── 8. Mobile ──────────────────────────────────────────────────────────
  await rpc(ws, "Emulation.setDeviceMetricsOverride", {
    width: 375, height: 812, deviceScaleFactor: 2, mobile: true,
  }, sessionId);
  await goto(`${BASE}/journey`);
  const mobile = await evaluate(`
    (() => {
      const hint = document.querySelector('.os-cmd-hint');
      const de = document.documentElement;
      return {
        hintHidden: !hint || getComputedStyle(hint).display === 'none',
        overflow: de.scrollWidth - de.clientWidth,
      };
    })()
  `);
  check("⌘K hint hidden on mobile", mobile.hintHidden === true);
  check("no horizontal overflow at 375px", mobile.overflow <= 1, `${mobile.overflow}px`);

  await evaluate(`document.querySelector('.os-more-btn')?.click()`);
  await sleep(400);
  const mMenu = await evaluate(`
    (() => {
      const menu = document.querySelector('.os-more-menu');
      if (!menu) return { ok: false };
      const r = menu.getBoundingClientRect();
      const small = [...menu.querySelectorAll('.os-more-item')]
        .filter(a => a.getBoundingClientRect().height < 44).length;
      return { ok: true, inView: r.left >= -1 && r.right <= window.innerWidth + 1, small };
    })()
  `);
  check("mobile overflow menu fits viewport", mMenu.ok === true && mMenu.inView === true);
  check("mobile menu tap targets >= 44px", mMenu.small === 0, `${mMenu.small} too small`);

  ws.close();
}

main()
  .catch(err => { console.error("\nverification error:", err.message); results.push({ name: "run", pass: false, detail: err.message }); })
  .finally(async () => {
    try { chrome.kill(); } catch {}
    await sleep(400);
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
    const failed = results.filter(r => !r.pass);
    console.log(`\n  ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      console.log("  FAILURES:");
      for (const f of failed) console.log(`    - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    }
    process.exit(failed.length ? 1 : 0);
  });
