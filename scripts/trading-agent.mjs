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

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { compileTradingModules, loadTradingModule } from "./lib/build-trading.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  compileTradingModules();

  const [{ toPaise, rupees }, killSwitchMod, backtestMod, syntheticMod] = await Promise.all([
    loadTradingModule("types.js"),
    loadTradingModule("kill-switch.js"),
    loadTradingModule("backtest.js"),
    loadTradingModule("synthetic.js"),
  ]);

  // Minute bars from the CLI: slower than the terminal's five-minute tape, but
  // this is the surface where a slow, faithful run is the point.
  const series = args.csv
    ? loadCsv(args.csv)
    : [{
        symbol: "SYNTH",
        candles: syntheticMod.syntheticTape({
          sessions: args.days,
          barMinutes: 1,
          seed: args.seed,
        }),
      }];
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
