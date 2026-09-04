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
let anonKey = null;
page.on("request", (req) => {
  const h = req.headers();
  if (h.apikey && !anonKey) anonKey = h.apikey;
});
await page.setViewport({ width: 1100, height: 1200 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));
console.log("URL after login:", page.url());

if (page.url().includes("/dashboard")) {
  await page.screenshot({ path: `${OUT}\\prod-dashboard.png`, fullPage: true });
  console.log("shot prod dashboard");

  await page.goto(`${BASE}/tools/doubt`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
  await page.type("textarea", "Why does ice float on water?");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("generate"))?.click();
  });
  const start = Date.now();
  while (Date.now() - start < 40000) {
    const thinking = await page.evaluate(() => document.body.innerText.includes("thinking…"));
    if (!thinking) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}\\prod-doubt-live.png`, fullPage: true });
  console.log("shot prod doubt");
}

console.log("captured anon key prefix:", anonKey ? anonKey.slice(0, 12) : "none");

await browser.close();
