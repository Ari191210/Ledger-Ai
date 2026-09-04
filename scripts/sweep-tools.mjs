import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3100";

const slugs = [
  "planner","focus","habits","deadlines","exam-planner","debt-meter","circadian",
  "notes","doubt","tutor","syllabus","formula",
  "essay-grader","assignment","model-answer",
  "spaced-review","mistake-dna","flashcards","exam-sim","practice","mark-scheme","crunch",
  "career","peer-heatmap","coach",
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "preview@studyledger.test");
await page.type('input[type="password"]', "preview-pass-12345");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1000));

const results = [];
for (const slug of slugs) {
  try {
    await page.goto(`${BASE}/tools/${slug}`, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 300));
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflow = scrollWidth > clientWidth;
    results.push({ slug, scrollWidth, clientWidth, overflow });
    console.log(slug.padEnd(16), scrollWidth, "/", clientWidth, overflow ? "OVERFLOW" : "ok");
  } catch (e) {
    console.log(slug.padEnd(16), "ERROR", e.message);
  }
}

const bad = results.filter((r) => r.overflow);
console.log("\n--- overflowing:", bad.length, "---");
console.log(bad.map((r) => r.slug).join(", "));

await browser.close();
