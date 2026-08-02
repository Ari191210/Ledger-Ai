#!/usr/bin/env node
// The Kite Connect login handshake — the one manual step this codebase
// never automates. See lib/trading/kite/auth.ts for why.
//
//   node scripts/kite-login.mjs
//
// Reads KITE_API_KEY and KITE_API_SECRET from the environment (the Kite
// Connect *app* credentials from developers.kite.trade — not your personal
// Zerodha login). Prints a login URL, waits for you to log in with your own
// browser and your own password/2FA, then asks you to paste the URL the
// browser lands on afterward. Exchanges that for an access_token and prints
// it — nothing is written to disk by this script.
//
// The access_token Kite issues is scoped to one day and expires at market
// close, so this has to be run again each trading day before anything that
// uses lib/trading/kite/broker.ts against a real account.
//
// What to do with the token this prints: export it yourself, e.g.
//   export KITE_ACCESS_TOKEN=<the value printed below>
// Do not commit it, do not put it in .env.local, and do not paste it back
// into a chat transcript — treat it exactly like a password with a
// same-day expiry.

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { compileTradingModules, loadTradingModule } from "./lib/build-trading.mjs";

async function main() {
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error(
      "KITE_API_KEY and KITE_API_SECRET must be set in the environment.\n" +
        "These are your Kite Connect app credentials from developers.kite.trade — " +
        "not your Zerodha login password.",
    );
    process.exit(2);
  }

  compileTradingModules();
  const auth = await loadTradingModule("kite/auth.js");

  console.log("\n1. Open this URL in a browser and log in with your own Zerodha credentials:\n");
  console.log(`   ${auth.kiteLoginUrl(apiKey)}\n`);
  console.log("2. After logging in, the browser will land on your app's redirect URL.");
  console.log("   Copy that entire URL — it contains a request_token.\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const pasted = await rl.question("Paste the redirect URL here: ");
  rl.close();

  let requestToken;
  try {
    requestToken = auth.parseRequestToken(pasted.trim());
  } catch (err) {
    console.error(`\nCould not read a request_token from that: ${err.message}`);
    process.exit(1);
  }

  try {
    const session = await auth.exchangeRequestToken({ apiKey, apiSecret, requestToken });
    console.log(`\nLogged in as ${session.userId}. Access token (expires at today's market close):\n`);
    console.log(`   ${session.accessToken}\n`);
    console.log("Export it for anything that constructs a KiteBroker, e.g.:");
    console.log(`   export KITE_ACCESS_TOKEN=${session.accessToken}\n`);
  } catch (err) {
    console.error(`\nToken exchange failed: ${err.message}`);
    process.exit(1);
  }
}

main();
