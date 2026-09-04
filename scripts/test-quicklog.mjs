import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1300,1200"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 1200 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));

// open the header "+ log" trigger
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.trim() === "log",
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\quicklog-open.png` });

// switch to mistake tab, fill it, submit
const tabs = await page.$$('[role="tab"]');
for (const t of tabs) {
  const text = await t.evaluate((el) => el.textContent);
  if (text === "mistake") await t.click();
}
await new Promise((r) => setTimeout(r, 200));
await page.type('input[placeholder="e.g. Rotational motion"]', "Test topic from quicklog");
await page.screenshot({ path: `${OUT}\\quicklog-filled.png` });

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.trim() === "Add",
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}\\quicklog-after-submit.png` });

console.log("done — check dashboard for 'Test topic from quicklog' in Fix Next");
await browser.close();
