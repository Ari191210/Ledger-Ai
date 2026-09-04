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

await page.goto("http://localhost:3000/tools/exam-sim", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 500));
await page.type('input[type="text"]', "Chemical bonding", { delay: 5 });
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("generate"))?.click();
});

const start = Date.now();
while (Date.now() - start < 45000) {
  const thinking = await page.evaluate(() => document.body.innerText.includes("thinking…"));
  if (!thinking) break;
  await new Promise((r) => setTimeout(r, 500));
}
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}\\ai-exam-sim.png`, fullPage: true });
console.log("shot exam-sim");

await browser.close();
