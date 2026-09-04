import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";
const BASE = "http://localhost:3100";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

page.on("response", (res) => {
  if (res.url().includes("recover") || res.url().includes("supabase")) {
    console.log("net:", res.status(), res.url().replace(/apikey=[^&]+/, "apikey=***"));
  }
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.screenshot({ path: `${OUT}\\reset-01-login.png` });

// click "forgot?"
await page.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((el) => el.textContent?.trim() === "forgot?");
  a?.click();
});
await new Promise((r) => setTimeout(r, 800));
console.log("url after click:", page.url());
await page.screenshot({ path: `${OUT}\\reset-02-request-page.png` });

await page.type('input[type="email"]', "reset-flow-check@gmail.com");
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Send reset link"))?.click();
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${OUT}\\reset-03-after-submit.png` });

const bodyText = await page.evaluate(() => document.body.innerText);
console.log("has confirmation text:", bodyText.includes("on its way"));
console.log("has error text:", bodyText.toLowerCase().includes("error") || bodyText.toLowerCase().includes("invalid"));

await browser.close();
