// Creates .env.local from the example, pre-filling every value that can be
// generated locally (the cron secret and the VAPID keypair need no account),
// and leaving the rest clearly marked as needing a real credential.
//
// Refuses to overwrite an existing .env.local — that file may hold live
// secrets, and clobbering it is not recoverable.
//
//   node scripts/env-init.mjs
//
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".env.local");
const example = path.join(root, ".env.local.example");

if (fs.existsSync(target)) {
  console.error(".env.local already exists. Refusing to overwrite it.");
  console.error("Run `node scripts/env-doctor.mjs` to see what is still missing.");
  process.exit(1);
}
if (!fs.existsSync(example)) {
  console.error("No .env.local.example to work from.");
  process.exit(1);
}

const vapid = webpush.generateVAPIDKeys();
const generated = {
  CRON_SECRET: crypto.randomBytes(32).toString("hex"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

const out = fs.readFileSync(example, "utf8")
  .split("\n")
  .map(line => {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) return line;
    const [, key] = m;
    if (key in generated) return `${key}=${generated[key]}`;
    // Placeholder values in the example would read as configured but fail at
    // runtime, so blank them and let the doctor report them as missing.
    return `${key}=`;
  })
  .join("\n");

fs.writeFileSync(target, out);
console.log("Created .env.local");
console.log("Generated locally (no account needed):");
for (const k of Object.keys(generated)) console.log(`  ${k}`);
console.log("\nEverything else is blank and needs a real credential.");
console.log("Run `node scripts/env-doctor.mjs` to see what breaks without each one.");
