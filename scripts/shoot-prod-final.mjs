import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";
const BASE = "https://www.studyledger.in";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1100,1200"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1200 });

await page.goto(`${BASE}/privacy`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\prod-privacy.png`, fullPage: true });
console.log("shot prod privacy");

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1000));

await page.goto(`${BASE}/settings`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}\\prod-settings.png`, fullPage: true });
console.log("shot prod settings");

await browser.close();
