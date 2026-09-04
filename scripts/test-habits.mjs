import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1100,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 900 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));

await page.goto("http://localhost:3000/tools/habits", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));

await page.type('input[placeholder="e.g. Review flashcards"]', "Review flashcards");
await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}\\habits-added.png` });

// toggle it on
await page.evaluate(() => {
  const sw = document.querySelector('[role="switch"]');
  sw?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}\\habits-toggled.png` });

console.log("done");
await browser.close();
