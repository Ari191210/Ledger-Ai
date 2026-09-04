import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1200,700"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 700 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));

await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}\\toggle-before.png`, clip: { x: 280, y: 280, width: 700, height: 220 } });

// click the Appearance switch
const switches = await page.$$('[role="switch"]');
await switches[0].click();
await new Promise((r) => setTimeout(r, 60)); // catch the flash mid-fade
await page.screenshot({ path: `${OUT}\\toggle-flash.png` });
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}\\toggle-after.png`, clip: { x: 280, y: 280, width: 700, height: 220 } });

console.log("shot");
await browser.close();
