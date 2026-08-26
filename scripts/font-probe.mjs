// What font is the browser actually using for headings and body?
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => existsSync(p));
const dir = mkdtempSync(path.join(tmpdir(), "font-probe-"));
const PORT = 9337;
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`,
  "--headless=new", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });

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
  throw new Error("no endpoint");
}

const ws = new WebSocket(await endpoint());
await new Promise(r => ws.addEventListener("open", r, { once: true }));
const { targetId } = await rpc(ws, "Target.createTarget", { url: "about:blank" });
const { sessionId } = await rpc(ws, "Target.attachToTarget", { targetId, flatten: true });
await rpc(ws, "Runtime.enable", {}, sessionId);
await rpc(ws, "DOM.enable", {}, sessionId);
await rpc(ws, "CSS.enable", {}, sessionId);

const ev = async e => (await rpc(ws, "Runtime.evaluate",
  { expression: e, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;

for (const route of ["/journey", "/"]) {
  await rpc(ws, "Page.navigate", { url: BASE + route }, sessionId);
  await sleep(3500);
  console.log(`\n=== ${route} ===`);
  console.log("--serif resolves to:", await ev(
    `getComputedStyle(document.documentElement).getPropertyValue("--serif").trim()`));

  // The authoritative answer: which font did Chrome actually paint with?
  const { root } = await rpc(ws, "DOM.getDocument", {}, sessionId);
  const target = route === "/journey" ? "h1" : "h1, h2";
  const { nodeId } = await rpc(ws, "DOM.querySelector", { nodeId: root.nodeId, selector: target }, sessionId);
  if (nodeId) {
    const fonts = await rpc(ws, "CSS.getPlatformFontsForNode", { nodeId }, sessionId);
    console.log("heading painted with:", JSON.stringify(fonts.fonts?.map(f => `${f.familyName} (${f.glyphCount} glyphs)`)));
  }
  console.log("Orsiri loaded?", await ev(`document.fonts.check("16px Orsiri")`));
}

ws.close(); chrome.kill();
try { rmSync(dir, { recursive: true, force: true }); } catch {}
