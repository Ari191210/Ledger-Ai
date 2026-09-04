import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1300,1400"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 1400 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));

await page.goto("http://localhost:3000/tools", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}\\tools-grid.png`, fullPage: true });
console.log("shot grid");

await page.goto("http://localhost:3000/tools/planner", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\tools-detail.png`, fullPage: true });
console.log("shot detail");

await browser.close();
