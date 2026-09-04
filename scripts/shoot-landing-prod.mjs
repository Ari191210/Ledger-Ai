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
await page.goto("https://www.studyledger.in/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
const heroWidth = await page.evaluate(() => {
  const p = [...document.querySelectorAll("p")].find((el) =>
    el.textContent?.includes("Every PYQ"),
  );
  return p ? { width: p.getBoundingClientRect().width, className: p.className } : null;
});
console.log("hero subcopy box:", JSON.stringify(heroWidth));
await page.screenshot({ path: `${OUT}\\landing-prod.png`, fullPage: true });
console.log("shot prod landing");
await browser.close();
