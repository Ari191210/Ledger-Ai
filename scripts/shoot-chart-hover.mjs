import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1440,1000"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));

const rects = await page.$$("rect");
// hover the last bar (worst case for edge clamping)
const last = rects[rects.length - 1];
const box = await last.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\chart-hover-last.png` });

// hover the first bar too
const first = rects[0];
const box2 = await first.boundingBox();
await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\chart-hover-first.png` });

console.log("shot");
await browser.close();
