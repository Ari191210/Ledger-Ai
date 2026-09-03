// Print the exact boundaries of a pending part, so a paste can be checked
// against them. `relation "against" does not exist` is what Postgres says when
// a paste begins partway through one of the `--` comment banners: the rest of
// the prose is then read as statements.
import fs from "node:fs";

const which = process.argv[2] ?? "part-08.sql";
const src = fs.readFileSync(`supabase/pending/${which}`, "utf8");
const lines = src.split(/\r?\n/);
const nonEmpty = lines.filter(l => l.trim());

console.log(`\n${which}: ${lines.length} lines, ${(Buffer.byteLength(src) / 1024).toFixed(0)} KB\n`);

console.log("YOUR PASTE MUST BEGIN WITH THESE 3 LINES:");
lines.slice(0, 3).forEach((l, i) => console.log(`  ${i + 1}| ${l.slice(0, 74)}`));

console.log("\nAND END WITH THESE 3 LINES:");
nonEmpty.slice(-3).forEach(l => console.log(`   | ${l.slice(0, 74)}`));

console.log(`
CHECKLIST, because a partial run still reports success:
  1. In the Supabase SQL editor, press Ctrl+A then Delete FIRST.
     The editor executes only the SELECTED text if anything is highlighted.
  2. Paste the WHOLE file. Confirm line 1 is the long banner above, not
     prose from the middle.
  3. Run. The last statement prints the migration ledger, so you should
     see a row listing version 037.`);
