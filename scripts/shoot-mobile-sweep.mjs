import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1000));

const pages = [
  ["dashboard", "http://localhost:3000/dashboard"],
  ["score", "http://localhost:3000/score"],
  ["tools", "http://localhost:3000/tools"],
  ["settings", "http://localhost:3000/settings"],
  ["debt-meter", "http://localhost:3000/tools/debt-meter"],
  ["doubt", "http://localhost:3000/tools/doubt"],
];

for (const [name, url] of pages) {
  await page.goto(url, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(name, "scrollWidth:", scrollWidth, "clientWidth:", clientWidth, scrollWidth > clientWidth ? "OVERFLOW" : "ok");
  await page.screenshot({ path: `${OUT}\\mobile-${name}.png`, fullPage: true });
}

await browser.close();
