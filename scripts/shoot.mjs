// dev-only visual check: logs in, screenshots /dashboard in both themes
import puppeteer from "puppeteer-core";

const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1440,1200"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 2500));
console.log("landed:", page.url());

for (const theme of ["dark", "light"]) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("sl-theme", t);
    } catch {}
  }, theme);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}\\dash-${theme}.png`, fullPage: true });
  console.log("shot", theme);
}

await browser.close();
