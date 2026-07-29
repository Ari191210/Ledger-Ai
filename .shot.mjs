import { chromium } from "playwright-core";
const [out, edition, mode] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1200 },
  deviceScaleFactor: 2,
  colorScheme: edition === "evening" ? "dark" : "light",
});
await page.goto("http://127.0.0.1:3000/terminal", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const marker = await page.evaluate(() =>
  (document.body.innerText.match(/not a trading record/gi) || []).length);
console.log("edition:", await page.evaluate(() => document.documentElement.dataset.edition),
            "| disclosure instances:", marker);
await page.screenshot({ path: out, fullPage: mode === "full" });
await browser.close();
