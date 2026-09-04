import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1100,1200"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1200 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1000));

async function waitForResultOrError(timeoutMs = 45000) {
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return body.includes("time's up") === false && (
        document.querySelector(".text-negative") || body.length > 0
      );
    },
    { timeout: 1000 },
  ).catch(() => {});
  // poll for the button label to leave "thinking…"
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stillThinking = await page.evaluate(() =>
      document.body.innerText.includes("thinking…"),
    );
    if (!stillThinking) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => setTimeout(r, 500));
}

// ── Doubt Solver (text) ─────────────────────────────────────────────────
await page.goto("http://localhost:3000/tools/doubt", { waitUntil: "networkidle2" });
await page.click('button[role="tab"]::-p-text(Physics)').catch(() => {});
await page.type("textarea", "Why does a ball thrown upward decelerate at exactly g?");
await page.click("::-p-text(generate)");
await waitForResultOrError();
await page.screenshot({ path: `${OUT}\\ai-doubt.png`, fullPage: true });
console.log("shot doubt");

// ── Notes (list) ─────────────────────────────────────────────────────────
await page.goto("http://localhost:3000/tools/notes", { waitUntil: "networkidle2" });
await page.type(
  "textarea",
  "Newton's laws: 1st law - object stays at rest or in motion unless acted on by a force. 2nd law - F=ma. 3rd law - every action has an equal and opposite reaction. Momentum p=mv is conserved in a closed system.",
);
await page.click("::-p-text(generate)");
await waitForResultOrError();
await page.screenshot({ path: `${OUT}\\ai-notes.png`, fullPage: true });
console.log("shot notes");

// ── Flashcards (qa) ──────────────────────────────────────────────────────
await page.goto("http://localhost:3000/tools/flashcards", { waitUntil: "networkidle2" });
await page.type('input[type="text"]', "Photosynthesis", { delay: 5 });
await page.click("::-p-text(generate)");
await waitForResultOrError();
await page.screenshot({ path: `${OUT}\\ai-flashcards.png`, fullPage: true });
console.log("shot flashcards (before reveal)");

// ── Essay Grader (score) ─────────────────────────────────────────────────
await page.goto("http://localhost:3000/tools/essay-grader", { waitUntil: "networkidle2" });
const essayText =
  "Industrialisation changed the world in profound ways. Factories replaced cottage industries, and cities grew rapidly as workers moved for jobs. However, this growth came at a cost: pollution increased, working conditions were often unsafe, and child labour was widespread. Over time, reforms improved conditions, but the early decades of industrialisation were marked by significant human and environmental cost. In conclusion, industrialisation was a double edged sword, driving economic growth while creating serious social problems that took decades to address.";
await page.type("textarea", essayText);
await page.click("::-p-text(generate)");
await waitForResultOrError();
await page.screenshot({ path: `${OUT}\\ai-essay-grader.png`, fullPage: true });
console.log("shot essay-grader");

// ── Crunch Mode (data-grounded list) ─────────────────────────────────────
await page.goto("http://localhost:3000/tools/crunch", { waitUntil: "networkidle2" });
await page.click("::-p-text(generate)");
await waitForResultOrError();
await page.screenshot({ path: `${OUT}\\ai-crunch.png`, fullPage: true });
console.log("shot crunch");

await browser.close();
