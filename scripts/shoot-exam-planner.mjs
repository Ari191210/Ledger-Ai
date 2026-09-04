import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1100,1000"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1000 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1200));

await page.goto("http://localhost:3000/tools/exam-planner", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\tool-exam-planner.png`, fullPage: true });
console.log("shot default");

await browser.close();
