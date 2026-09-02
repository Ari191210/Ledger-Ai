import fs from "node:fs";

// 7.14 was appended at the end of the FILE, which falls inside §9. A §7 entry
// belongs immediately after 7.13, before the rule that closes the section.
const p = "PRODUCT_DECISIONS.md";
let s = fs.readFileSync(p, "utf8");

const start = s.indexOf("### 7.14 The welcome email was broken");
if (start < 0) throw new Error("7.14 not found");

// The section runs to the end of the file, since it was appended there.
const block = s.slice(start).trimEnd();
s = s.slice(0, start).trimEnd() + "\n";

// Re-insert directly before the horizontal rule that ends §7.13.
const anchor = "### 7.13 A fourth schema drift";
const at = s.indexOf(anchor);
if (at < 0) throw new Error("7.13 not found");

const after = s.slice(at);
const ruleAt = after.indexOf("\n\n---");
if (ruleAt < 0) throw new Error("no rule closing 7.13");

const insertAt = at + ruleAt;
s = s.slice(0, insertAt) + "\n\n" + block + s.slice(insertAt);

fs.writeFileSync(p, s);
console.log("7.14 moved into section 7, after 7.13");
