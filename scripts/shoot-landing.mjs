import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT =
  "C:\\Users\\DELL\\AppData\\Local\\Temp\\claude\\C--Users-DELL\\4c35c787-6729-4f38-ac07-1c8702faf298\\scratchpad";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,1000"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\landing-dark.png`, fullPage: true });
console.log("shot landing (dark)");

await page.goto("http://localhost:3000/?theme=light", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${OUT}\\landing-light.png`, fullPage: true });
console.log("shot landing (light)");

await browser.close();
