/**
 * Read and flip which hostname is canonical for the ledger project.
 *
 * Vercel models this per project domain: the non-canonical host carries a
 * `redirect` pointing at the canonical one. There is no CLI command for it,
 * so this talks to the REST API using the token the CLI already stores.
 *
 *   node scripts/vercel-domains.mjs list
 *   node scripts/vercel-domains.mjs set-canonical <host>
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT = "ledger";
const TEAM = "ari191210s-projects";

// The CLI keeps two credential stores on Windows and only the xdg one is
// current; the com.vercel.cli/Data copy is stale and its token 403s.
const AUTH_STORES = [
  ["AppData", "Roaming", "xdg.data", "com.vercel.cli", "auth.json"],
  ["AppData", "Roaming", "com.vercel.cli", "Data", "auth.json"],
];

function token() {
  for (const parts of AUTH_STORES) {
    const p = path.join(os.homedir(), ...parts);
    if (!fs.existsSync(p)) continue;
    const { token: t, expiresAt } = JSON.parse(fs.readFileSync(p, "utf8"));
    if (t && (!expiresAt || expiresAt * 1000 > Date.now())) return t;
  }
  throw new Error("no unexpired vercel token; run `vercel login`");
}

async function api(endpoint, init = {}) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${endpoint}${sep}slug=${TEAM}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function list() {
  const { domains } = await api(`/v9/projects/${PROJECT}/domains`);
  for (const d of domains) {
    const to = d.redirect ? `→ ${d.redirect} (${d.redirectStatusCode})` : "CANONICAL";
    console.log(`  ${d.name.padEnd(24)} ${to}   verified=${d.verified}`);
  }
  return domains;
}

async function setCanonical(host) {
  const { domains } = await api(`/v9/projects/${PROJECT}/domains`);
  const names = domains.map((d) => d.name);
  if (!names.includes(host)) throw new Error(`${host} is not on the project: ${names.join(", ")}`);

  // Clear the canonical host's own redirect first, otherwise the other domain
  // would briefly point at a host that still redirects away.
  await api(`/v9/projects/${PROJECT}/domains/${host}`, {
    method: "PATCH",
    body: JSON.stringify({ redirect: null, redirectStatusCode: null }),
  });
  console.log(`  ${host}: now canonical`);

  // Only the apex/www pair for this site. The *.vercel.app deployment alias
  // must keep serving directly, so it is left alone.
  const apex = host.replace(/^www\./, "");
  const siblings = domains.filter((d) => d.name === apex || d.name === `www.${apex}`);

  for (const d of siblings) {
    if (d.name === host) continue;
    await api(`/v9/projects/${PROJECT}/domains/${d.name}`, {
      method: "PATCH",
      body: JSON.stringify({ redirect: host, redirectStatusCode: 308 }),
    });
    console.log(`  ${d.name}: → ${host} (308)`);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "list") await list();
else if (cmd === "set-canonical") await setCanonical(arg);
else {
  console.error("usage: list | set-canonical <host>");
  process.exit(1);
}
