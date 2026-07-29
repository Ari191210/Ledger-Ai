#!/usr/bin/env node
// Runner for the trading agent in lib/trading.
//
//   node scripts/trading-agent.mjs                    # 60 synthetic sessions
//   node scripts/trading-agent.mjs --days 250         # a full trading year
//   node scripts/trading-agent.mjs --target 0.10      # required daily return
//   node scripts/trading-agent.mjs --grace 5          # misses tolerated
//   node scripts/trading-agent.mjs --no-destroy       # survive and report
//   node scripts/trading-agent.mjs --csv data.csv     # real candles
//
// CSV columns: symbol,timestamp,open,high,low,close,volume
// `timestamp` is anything Date can parse; ISO-8601 with an offset is safest.
//
// The synthetic tape is a seeded random walk with mild intraday momentum and
// a volatility typical of an NSE large-cap. It is there to exercise the
// engine, not to predict anything — treat any number it produces as a
// property of the simulator, not of the market.

import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".test-build", "lib", "trading");

function parseArgs(argv) {
  const args = {
    days: 60,
    target: 0.1,
    grace: 0,
    capital: 100_000,
    destroy: true,
    seed: 42,
    csv: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    switch (flag) {
      case "--days": args.days = Number(next()); break;
      case "--target": args.target = Number(next()); break;
      case "--grace": args.grace = Number(next()); break;
      case "--capital": args.capital = Number(next()); break;
      case "--seed": args.seed = Number(next()); break;
      case "--csv": args.csv = next(); break;
      case "--no-destroy": args.destroy = false; break;
      case "--help":
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")
          .split("\n").filter((l) => l.startsWith("//")).join("\n"));
        process.exit(0);
        break;
      default:
        console.error(`unknown flag: ${flag}`);
        process.exit(2);
    }
  }
  return args;
}

function build() {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tests/trading.tsconfig.json"],
    { cwd: root, stdio: "inherit" },
  );
  for (const file of fs.readdirSync(outDir).filter((f) => f.endsWith(".js"))) {
    const p = path.join(outDir, file);
    fs.writeFileSync(
      p,
      fs.readFileSync(p, "utf8").replace(/(from\s+")(\.\/[\w-]+)(")/g, "$1$2.js$3"),
    );
  }
  // Nearest-package-json wins, so this marks only this output directory as
  // ESM without changing how the rest of .test-build is interpreted.
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
}

/** Deterministic PRNG so a given --seed always reproduces the same tape. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller, for normally distributed returns. */
function gaussian(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Epoch ms for an IST wall-clock time. IST is UTC+5:30. */
const ist = (y, m, d, hh, mm) => Date.UTC(y, m - 1, d, hh - 5, mm - 30);

/**
 * `days` sessions of 1-minute candles, 09:15–15:29 IST, skipping weekends.
 * ~1.4% daily volatility, near-martingale.
 *
 * The momentum term is deliberately tiny. An earlier version used a strongly
 * autocorrelated drift, and the breakout strategy "earned" several hundred
 * percent a year on it — not because the strategy is good, but because the
 * generator had been handed the exact pattern the strategy looks for. A
 * simulator that bakes in the edge you are testing for cannot tell you
 * anything. Real minute bars are close to unpredictable, so this one is too.
 */
function syntheticTape(days, seed) {
  const rand = mulberry32(seed);
  const BARS = 375;
  const minuteVol = 0.014 / Math.sqrt(BARS);
  const candles = [];

  let price = 1500;
  let momentum = 0;
  const cursor = new Date(Date.UTC(2025, 0, 1));

  for (let d = 0; d < days; ) {
    const day = cursor.getUTCDay();
    if (day === 0 || day === 6) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    const [y, m, dd] = [cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()];
    const open = ist(y, m, dd, 9, 15);

    for (let bar = 0; bar < BARS; bar++) {
      momentum = momentum * 0.7 + gaussian(rand) * minuteVol * 0.05;
      const shock = gaussian(rand) * minuteVol + momentum;
      const prev = price;
      price = Math.max(price * (1 + shock), 1);
      const wick = Math.abs(gaussian(rand)) * price * minuteVol * 0.5;
      candles.push({
        time: open + bar * 60_000,
        open: prev,
        high: Math.max(prev, price) + wick,
        low: Math.max(Math.min(prev, price) - wick, 0.01),
        close: price,
        volume: Math.round(5_000 + rand() * 20_000),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    d++;
  }

  return [{ symbol: "SYNTH", candles }];
}

function loadCsv(file) {
  const rows = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`CSV is missing a "${name}" column`);
    return i;
  };
  const idx = {
    symbol: col("symbol"), timestamp: col("timestamp"), open: col("open"),
    high: col("high"), low: col("low"), close: col("close"),
    volume: header.indexOf("volume"),
  };

  const bySymbol = new Map();
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(",");
    const time = new Date(cells[idx.timestamp].trim()).getTime();
    if (Number.isNaN(time)) throw new Error(`row ${i + 1}: unparseable timestamp`);
    const symbol = cells[idx.symbol].trim();
    const candle = {
      time,
      open: Number(cells[idx.open]),
      high: Number(cells[idx.high]),
      low: Number(cells[idx.low]),
      close: Number(cells[idx.close]),
      volume: idx.volume >= 0 ? Number(cells[idx.volume]) : 0,
    };
    for (const k of ["open", "high", "low", "close"]) {
      if (!Number.isFinite(candle[k]) || candle[k] <= 0) {
        throw new Error(`row ${i + 1}: invalid ${k}`);
      }
    }
    const bucket = bySymbol.get(symbol);
    if (bucket) bucket.push(candle);
    else bySymbol.set(symbol, [candle]);
  }

  return [...bySymbol.entries()].map(([symbol, candles]) => ({
    symbol,
    candles: candles.sort((a, b) => a.time - b.time),
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  build();

  const load = (n) => import(pathToFileURL(path.join(outDir, n)).href);
  const [{ toPaise, rupees }, killSwitchMod, backtestMod] = await Promise.all([
    load("types.js"), load("kill-switch.js"), load("backtest.js"),
  ]);

  const series = args.csv ? loadCsv(args.csv) : syntheticTape(args.days, args.seed);
  const bars = series.reduce((n, s) => n + s.candles.length, 0);

  console.log(
    `\nTape: ${series.length} symbol(s), ${bars.toLocaleString("en-IN")} bars` +
    `${args.csv ? ` from ${args.csv}` : ` (synthetic, seed ${args.seed})`}`,
  );
  console.log(
    `Rule: destroy the agent if it returns less than ` +
    `${(args.target * 100).toFixed(2)}% in a session, ` +
    `after ${args.grace} grace session(s)` +
    `${args.destroy ? "" : "  [DISABLED via --no-destroy]"}\n`,
  );

  const report = backtestMod.backtest(series, {
    startingCapital: toPaise(args.capital),
    killSwitch: {
      ...killSwitchMod.DEFAULT_KILL_SWITCH,
      dailyReturnTarget: args.target,
      graceDays: args.grace,
      destroyOnTargetMiss: args.destroy,
    },
  });

  console.log(backtestMod.formatReport(report));

  const best = [...report.sessions].sort((a, b) => b.returnPct - a.returnPct)[0];
  if (best) {
    console.log(
      `\nBest session     : ${best.date} at ${(best.returnPct * 100).toFixed(2)}%` +
      ` — the target was ${(args.target * 100).toFixed(2)}%`,
    );
  }
  console.log(
    `Compounded, ${(args.target * 100).toFixed(2)}%/session over 250 sessions is ` +
    `${Math.pow(1 + args.target, 250).toExponential(2)}x starting capital ` +
    `(₹${rupees(toPaise(args.capital)).toLocaleString("en-IN")} → ` +
    `₹${(args.capital * Math.pow(1 + args.target, 250)).toExponential(2)}).\n`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
