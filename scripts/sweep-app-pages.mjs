import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3100";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1000));

const paths = ["/dashboard", "/tools", "/score", "/settings", "/onboard", "/", "/login", "/privacy", "/terms", "/contact"];
for (const p of paths) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 300));
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const overflow = scrollWidth > clientWidth;
  console.log(p.padEnd(14), scrollWidth, "/", clientWidth, overflow ? "OVERFLOW" : "ok");
}

await browser.close();
