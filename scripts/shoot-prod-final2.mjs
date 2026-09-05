import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";
const BASE = "https://www.studyledger.in";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.screenshot({ path: `${OUT}\\prod-login-final.png` });
console.log("shot prod login");

await browser.close();
