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

const pages = [
  ["landing", "http://localhost:3000/"],
  ["privacy", "http://localhost:3000/privacy"],
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
