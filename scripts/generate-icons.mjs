import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../public/icon.svg");
const svg = readFileSync(svgPath, "utf-8");

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const png = resvg.render().asPng();
  const outPath = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`✓ icon-${size}.png`);
}
