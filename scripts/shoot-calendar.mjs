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

// click day "4" (today, has data) in the calendar
const buttons = await page.$$("section button");
for (const b of buttons) {
  const text = await b.evaluate((el) => el.textContent?.trim());
  if (text === "4") {
    await b.click();
    break;
  }
}
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}\\dash-calendar-click.png` });
console.log("shot");
await browser.close();
