// Unit tests for the trading agent (lib/trading/*).
//
// Self-contained in the same style as score-projection.test.mjs: compile the
// pure modules with the project's own TypeScript, then run under node:test.
//
//   node --test tests/
//   node tests/trading.test.mjs
//
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".test-build", "lib", "trading");

let types, costs, killSwitch, calendar, risk, strategy, paper, backtest;
let synthetic, terminal, fmt, guard, falsify, evidence;

before(async () => {
  // Invoke the compiler via node + typescript's real entry point rather than
  // the node_modules/.bin/tsc shim, which is not resolvable by name on
  // Windows. Same approach as score-projection.test.mjs.
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      "tests/trading.tsconfig.json",
    ],
    { cwd: root },
  );

  // tsc emits ES modules but leaves import specifiers extensionless, which
  // Node's ESM resolver rejects. Add the extension the resolver needs.
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

  const load = (name) => import(pathToFileURL(path.join(outDir, name)).href);
  [types, costs, killSwitch, calendar, risk, strategy, paper, backtest, synthetic, terminal, fmt, guard, falsify, evidence] =
    await Promise.all(
      [
        "types.js",
        "costs.js",
        "kill-switch.js",
        "market-calendar.js",
        "risk.js",
        "strategy.js",
        "paper-broker.js",
        "backtest.js",
        "synthetic.js",
        "terminal-data.js",
        "format.js",
        "guard.js",
        "falsify.js",
        "evidence.js",
      ].map(load),
    );
});

// ── helpers ────────────────────────────────────────────────────────────────

/** Epoch ms for an IST wall-clock time on a given date. IST is UTC+5:30. */
function ist(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour - 5, minute - 30);
}

/**
 * Build one session of 1-minute candles from a close-price series, starting
 * at 09:15 IST. Highs and lows straddle each close by `wiggle`.
 */
function session(date, closes, wiggle = 0.5) {
  const [y, m, d] = date;
  return closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1];
    return {
      time: ist(y, m, d, 9, 15) + i * 60_000,
      open,
      high: Math.max(open, close) + wiggle,
      low: Math.min(open, close) - wiggle,
      close,
      volume: 10_000,
    };
  });
}

/** Flat chop for `n` bars, then a sustained ramp of `n` bars. */
function chopThenRamp(base, chopBars, rampBars, step) {
  const closes = [];
  for (let i = 0; i < chopBars; i++) closes.push(base + (i % 2 === 0 ? 0.25 : -0.25));
  for (let i = 1; i <= rampBars; i++) closes.push(base + i * step);
  return closes;
}

// ── costs ──────────────────────────────────────────────────────────────────

describe("costs", () => {
  test("STT applies to the sell leg only", () => {
    const buy = costs.chargesForOrder(100_000, "BUY");
    const sell = costs.chargesForOrder(100_000, "SELL");
    assert.equal(buy.stt, 0);
    assert.ok(sell.stt > 0);
  });

  test("stamp duty applies to the buy leg only", () => {
    assert.ok(costs.chargesForOrder(100_000, "BUY").stamp > 0);
    assert.equal(costs.chargesForOrder(100_000, "SELL").stamp, 0);
  });

  test("brokerage is capped at the flat fee on large turnover", () => {
    // 0.03% of ₹10,00,000 is ₹300, so the ₹20 cap binds.
    const { brokerage } = costs.chargesForOrder(1_000_000, "BUY");
    assert.equal(types.rupees(brokerage), 20);
  });

  test("brokerage is percentage-based on small turnover", () => {
    // 0.03% of ₹10,000 is ₹3, below the ₹20 cap.
    const { brokerage } = costs.chargesForOrder(10_000, "BUY");
    assert.equal(types.rupees(brokerage), 3);
  });

  test("round-trip cost on a ₹1,00,000 position lands near 8 bps", () => {
    const cost = costs.roundTripCostPct(100_000);
    assert.ok(cost > 0.0007 && cost < 0.001, `expected ~0.0008, got ${cost}`);
  });

  test("breakdown sums to the reported total", () => {
    const b = costs.chargesForOrder(250_000, "SELL");
    const sum = b.brokerage + b.stt + b.exchangeTxn + b.sebi + b.ipft + b.stamp + b.gst;
    // Each component is rounded to paise independently, so allow 1p of drift.
    assert.ok(Math.abs(sum - b.total) <= 7, `${sum} vs ${b.total}`);
  });

  test("negative turnover is rejected", () => {
    assert.throws(() => costs.chargesForOrder(-1, "BUY"), RangeError);
  });
});

// ── market calendar ────────────────────────────────────────────────────────

describe("market calendar", () => {
  test("resolves IST dates from UTC instants across the midnight boundary", () => {
    // 2025-01-15 23:00 UTC is 2025-01-16 04:30 IST.
    assert.equal(calendar.istDate(Date.UTC(2025, 0, 15, 23, 0)), "2025-01-16");
  });

  test("market is open at 09:15 and closed at 15:30 IST", () => {
    assert.equal(calendar.isMarketOpen(ist(2025, 1, 15, 9, 15)), true); // Wednesday
    assert.equal(calendar.isMarketOpen(ist(2025, 1, 15, 15, 29)), true);
    assert.equal(calendar.isMarketOpen(ist(2025, 1, 15, 15, 30)), false);
    assert.equal(calendar.isMarketOpen(ist(2025, 1, 15, 9, 14)), false);
  });

  test("weekends are not trading days", () => {
    assert.equal(calendar.isTradingDay(ist(2025, 1, 18, 10, 0)), false); // Saturday
    assert.equal(calendar.isTradingDay(ist(2025, 1, 19, 10, 0)), false); // Sunday
    assert.equal(calendar.isTradingDay(ist(2025, 1, 20, 10, 0)), true); // Monday
  });

  test("declared holidays are excluded", () => {
    const holidays = new Set(["2025-01-15"]);
    assert.equal(calendar.isTradingDay(ist(2025, 1, 15, 10, 0), holidays), false);
    assert.equal(calendar.isMarketOpen(ist(2025, 1, 15, 10, 0), holidays), false);
  });

  test("square-off boundary is 15:15 IST", () => {
    assert.equal(calendar.isPastSquareOff(ist(2025, 1, 15, 15, 14)), false);
    assert.equal(calendar.isPastSquareOff(ist(2025, 1, 15, 15, 15)), true);
  });
});

// ── kill switch ────────────────────────────────────────────────────────────

describe("kill switch", () => {
  // Resolved in a nested hook: the describe body runs at collection time,
  // before the top-level hook has compiled and imported the modules.
  let config, start;
  before(() => {
    config = killSwitch.DEFAULT_KILL_SWITCH;
    start = types.toPaise(100_000);
  });

  const sessionResult = (returnPct, date = "2025-01-15") => ({
    date,
    openingEquity: start,
    closingEquity: start + types.toPaise(100_000 * returnPct),
    returnPct,
    charges: 0,
    trades: 1,
  });

  test("destroys the agent on the first missed target with zero grace", () => {
    const state = killSwitch.initKillSwitch(start);
    // A +5% session is an exceptional day by any real standard, and still
    // less than half the configured target.
    const { state: after } = killSwitch.onSessionClose(state, sessionResult(0.05), config);
    assert.equal(after.state, "DESTROYED");
    assert.equal(after.tombstone.reason, "DAILY_TARGET_MISSED");
  });

  test("survives a session that meets the target exactly", () => {
    const state = killSwitch.initKillSwitch(start);
    const { state: after, hitTarget } = killSwitch.onSessionClose(
      state,
      sessionResult(0.1),
      config,
    );
    assert.equal(hitTarget, true);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.consecutiveMisses, 0);
  });

  test("grace days delay destruction until the streak exceeds them", () => {
    const graced = { ...config, graceDays: 2 };
    let state = killSwitch.initKillSwitch(start);

    state = killSwitch.onSessionClose(state, sessionResult(0.01, "d1"), graced).state;
    assert.equal(state.state, "RUNNING");
    state = killSwitch.onSessionClose(state, sessionResult(0.01, "d2"), graced).state;
    assert.equal(state.state, "RUNNING");
    state = killSwitch.onSessionClose(state, sessionResult(0.01, "d3"), graced).state;
    assert.equal(state.state, "DESTROYED");
  });

  test("a hit target resets the miss streak", () => {
    const graced = { ...config, graceDays: 2 };
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onSessionClose(state, sessionResult(0.01, "d1"), graced).state;
    state = killSwitch.onSessionClose(state, sessionResult(0.12, "d2"), graced).state;
    assert.equal(state.consecutiveMisses, 0);
    state = killSwitch.onSessionClose(state, sessionResult(0.01, "d3"), graced).state;
    assert.equal(state.state, "RUNNING");
  });

  test("destroyOnTargetMiss=false keeps the agent alive through misses", () => {
    const lenient = { ...config, destroyOnTargetMiss: false };
    let state = killSwitch.initKillSwitch(start);
    for (let i = 0; i < 50; i++) {
      state = killSwitch.onSessionClose(state, sessionResult(0.001, `d${i}`), lenient).state;
    }
    assert.equal(state.state, "RUNNING");
  });

  test("intraday loss beyond the daily limit halts but does not destroy", () => {
    const state = killSwitch.initKillSwitch(start);
    const after = killSwitch.onEquityTick(state, types.toPaise(97_500), config);
    assert.equal(after.state, "HALTED_FOR_DAY");
    assert.equal(killSwitch.canTrade(after), false);
  });

  test("a loss inside the daily limit leaves the agent running", () => {
    const state = killSwitch.initKillSwitch(start);
    const after = killSwitch.onEquityTick(state, types.toPaise(99_000), config);
    assert.equal(after.state, "RUNNING");
    assert.equal(killSwitch.canTrade(after), true);
  });

  test("max drawdown destroys the agent", () => {
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onEquityTick(state, types.toPaise(120_000), config); // new peak
    state = killSwitch.onEquityTick(state, types.toPaise(107_000), config); // -10.8%
    assert.equal(state.state, "DESTROYED");
    assert.equal(state.tombstone.reason, "MAX_DRAWDOWN");
  });

  test("peak equity never decreases", () => {
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onEquityTick(state, types.toPaise(110_000), config);
    state = killSwitch.onEquityTick(state, types.toPaise(105_000), config);
    assert.equal(state.peakEquity, types.toPaise(110_000));
  });

  test("destruction is terminal — later sessions cannot revive the agent", () => {
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onSessionClose(state, sessionResult(0.0), config).state;
    assert.equal(state.state, "DESTROYED");

    // A spectacular session afterwards changes nothing.
    const { state: after } = killSwitch.onSessionClose(state, sessionResult(0.5), config);
    assert.equal(after.state, "DESTROYED");
    assert.equal(killSwitch.canTrade(after), false);
  });

  test("assertAlive throws for a destroyed agent and carries the tombstone", () => {
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onSessionClose(state, sessionResult(0.0), config).state;
    assert.throws(
      () => killSwitch.assertAlive(state),
      (err) => err.name === "AgentDestroyedError" && err.tombstone.reason === "DAILY_TARGET_MISSED",
    );
  });

  test("assertAlive passes for a running agent", () => {
    assert.doesNotThrow(() => killSwitch.assertAlive(killSwitch.initKillSwitch(start)));
  });

  test("a new session clears an intraday halt", () => {
    let state = killSwitch.initKillSwitch(start);
    state = killSwitch.onEquityTick(state, types.toPaise(97_000), config);
    assert.equal(state.state, "HALTED_FOR_DAY");
    const lenient = { ...config, destroyOnTargetMiss: false };
    state = killSwitch.onSessionClose(state, sessionResult(-0.03), lenient).state;
    assert.equal(state.state, "RUNNING");
  });

  test("rejects a non-positive starting equity", () => {
    assert.throws(() => killSwitch.initKillSwitch(0), RangeError);
    assert.throws(() => killSwitch.initKillSwitch(-1), RangeError);
  });
});

// ── risk ───────────────────────────────────────────────────────────────────

describe("risk sizing", () => {
  let equity;
  before(() => {
    equity = types.toPaise(100_000);
  });
  const flat = () => paper.emptyPortfolio(equity);

  test("sizes to the risk budget divided by the stop distance", () => {
    // 0.5% of ₹1,00,000 is ₹500; a ₹5 stop distance buys 100 shares.
    const result = risk.sizePosition({
      symbol: "RELIANCE",
      side: "LONG",
      entry: 500,
      stop: 495,
      equity,
      portfolio: flat(),
    });
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 60); // notional cap binds first: 30% of 1L / 500
  });

  test("the notional cap binds before the risk budget when stops are tight", () => {
    const wide = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 1, maxLeverage: 1 };
    const result = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat() },
      wide,
    );
    assert.equal(result.quantity, 100);
  });

  test("a wider stop yields a smaller position for the same risk", () => {
    const wide = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 1 };
    const tight = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat() },
      wide,
    );
    const loose = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 480, equity, portfolio: flat() },
      wide,
    );
    assert.ok(loose.quantity < tight.quantity);
    // Rupee risk is roughly constant either way.
    assert.ok(Math.abs(types.rupees(loose.riskAmount) - types.rupees(tight.riskAmount)) < 30);
  });

  test("rejects an entry with no stop", () => {
    const result = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 500,
      stop: undefined,
      equity,
      portfolio: flat(),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "NO_STOP");
  });

  test("rejects a stop on the wrong side of the entry", () => {
    const long = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 500,
      stop: 505,
      equity,
      portfolio: flat(),
    });
    assert.equal(long.reason, "STOP_ON_WRONG_SIDE");

    const short = risk.sizePosition({
      symbol: "X",
      side: "SHORT",
      entry: 500,
      stop: 495,
      equity,
      portfolio: flat(),
    });
    assert.equal(short.reason, "STOP_ON_WRONG_SIDE");
  });

  test("shorts size off the stop above the entry", () => {
    const result = risk.sizePosition({
      symbol: "X",
      side: "SHORT",
      entry: 500,
      stop: 505,
      equity,
      portfolio: flat(),
    });
    assert.equal(result.ok, true);
    assert.ok(result.quantity > 0);
  });

  test("refuses to exceed the open-position limit", () => {
    const portfolio = flat();
    for (const symbol of ["A", "B", "C"]) {
      portfolio.positions.set(symbol, {
        symbol,
        quantity: 1,
        averagePrice: 100,
        openedAt: 0,
      });
    }
    const result = risk.sizePosition({
      symbol: "D",
      side: "LONG",
      entry: 500,
      stop: 495,
      equity,
      portfolio,
    });
    assert.equal(result.reason, "TOO_MANY_POSITIONS");
  });

  test("refuses to pyramid into a symbol already held", () => {
    const portfolio = flat();
    portfolio.positions.set("X", { symbol: "X", quantity: 10, averagePrice: 500, openedAt: 0 });
    const result = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 500,
      stop: 495,
      equity,
      portfolio,
    });
    assert.equal(result.reason, "ALREADY_IN_POSITION");
  });

  test("rejects a position that rounds below one share", () => {
    const result = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 50_000,
      stop: 40_000,
      equity: types.toPaise(10_000),
      portfolio: paper.emptyPortfolio(types.toPaise(10_000)),
    });
    assert.equal(result.ok, false);
  });

  test("equity marks open positions to market", () => {
    const portfolio = flat();
    portfolio.cash = types.toPaise(50_000);
    portfolio.positions.set("X", { symbol: "X", quantity: 100, averagePrice: 500, openedAt: 0 });
    const marks = new Map([["X", 510]]);
    assert.equal(types.rupees(risk.equityOf(portfolio, marks)), 101_000);
  });

  test("equity handles short positions", () => {
    const portfolio = flat();
    portfolio.cash = types.toPaise(150_000);
    portfolio.positions.set("X", { symbol: "X", quantity: -100, averagePrice: 500, openedAt: 0 });
    const marks = new Map([["X", 490]]);
    assert.equal(types.rupees(risk.equityOf(portfolio, marks)), 101_000);
  });

  // ── confidence-scaled sizing (Law 14) ────────────────────────────────────

  test("omitting confidence sizes at full budget, unchanged from before", () => {
    const wide = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 1 };
    const result = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat() },
      wide,
    );
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 100);
  });

  test("half confidence halves the risk budget and so the quantity", () => {
    const wide = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 1 };
    const full = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 1 },
      wide,
    );
    const half = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 0.5 },
      wide,
    );
    assert.equal(full.quantity, 100);
    assert.equal(half.quantity, 50);
  });

  test("confidence below the configured minimum is refused, not just shrunk", () => {
    const result = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 500,
      stop: 495,
      equity,
      portfolio: flat(),
      confidence: 0.05,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "LOW_CONFIDENCE");
  });

  test("confidence exactly at the minimum is accepted; just under it is not", () => {
    const config = { ...risk.DEFAULT_RISK, minConfidence: 0.2 };
    const atLine = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 0.2 },
      config,
    );
    const underLine = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 0.199 },
      config,
    );
    assert.equal(atLine.ok, true);
    assert.equal(underLine.ok, false);
  });

  test("out-of-range confidence is clamped rather than thrown", () => {
    const wide = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 1 };
    assert.doesNotThrow(() =>
      risk.sizePosition(
        { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 5 },
        wide,
      ),
    );
    const over = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 5 },
      wide,
    );
    const exactlyOne = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 1 },
      wide,
    );
    assert.equal(over.quantity, exactlyOne.quantity, "confidence > 1 must not size beyond full budget");
  });

  test("NaN confidence is treated as zero trust and refused", () => {
    const result = risk.sizePosition({
      symbol: "X",
      side: "LONG",
      entry: 500,
      stop: 495,
      equity,
      portfolio: flat(),
      confidence: NaN,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "LOW_CONFIDENCE");
  });

  test("the notional cap and buying power stay independent of confidence", () => {
    // A tight cap should bind identically regardless of how little the
    // signal is trusted — confidence shrinks the risk budget, never the
    // hard limits on capital.
    const tightCap = { ...risk.DEFAULT_RISK, maxPositionNotionalPct: 0.05 };
    const full = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 1 },
      tightCap,
    );
    const half = risk.sizePosition(
      { symbol: "X", side: "LONG", entry: 500, stop: 495, equity, portfolio: flat(), confidence: 0.5 },
      tightCap,
    );
    assert.equal(full.ok, true);
    assert.equal(half.ok, true);
    assert.equal(full.quantity, half.quantity, "both are pinned by the same notional cap");
  });
});

// ── evidence & confidence ────────────────────────────────────────────────────

describe("evidence", () => {
  test("a single fact yields the fact weight", () => {
    assert.equal(
      evidence.confidenceFromEvidence([{ kind: "fact", statement: "x" }]),
      0.5,
    );
  });

  test("two facts in the same correlation group score the same as one", () => {
    const grouped = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
      { kind: "fact", statement: "b", correlationGroup: "trend" },
    ]);
    const single = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
    ]);
    assert.equal(grouped, single, "correlated evidence must not stack — Law 9");
  });

  test("two facts in different groups score higher than either alone", () => {
    const two = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
      { kind: "fact", statement: "b", correlationGroup: "volume" },
    ]);
    const one = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
    ]);
    assert.ok(two > one, "genuinely independent evidence should add confidence");
  });

  test("ungrouped lines each count as their own independent group", () => {
    const two = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a" },
      { kind: "fact", statement: "b" },
    ]);
    const one = evidence.confidenceFromEvidence([{ kind: "fact", statement: "a" }]);
    assert.ok(two > one);
  });

  test("assumptions never add confidence", () => {
    const withAssumption = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
      { kind: "assumption", statement: "premise" },
    ]);
    const factOnly = evidence.confidenceFromEvidence([
      { kind: "fact", statement: "a", correlationGroup: "trend" },
    ]);
    assert.equal(withAssumption, factOnly);
  });

  test("inferences count for less than facts", () => {
    const fact = evidence.confidenceFromEvidence([{ kind: "fact", statement: "a" }]);
    const inference = evidence.confidenceFromEvidence([{ kind: "inference", statement: "a" }]);
    assert.ok(inference < fact);
  });

  test("confidence never exceeds MAX_CONFIDENCE regardless of evidence volume", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      kind: "fact",
      statement: `fact ${i}`,
      correlationGroup: `group-${i}`,
    }));
    assert.equal(evidence.confidenceFromEvidence(many), evidence.MAX_CONFIDENCE);
  });

  test("no evidence yields zero confidence", () => {
    assert.equal(evidence.confidenceFromEvidence([]), 0);
  });
});

// ── indicators & strategy ──────────────────────────────────────────────────

describe("indicators", () => {
  const candlesFrom = (closes) =>
    closes.map((c, i) => ({ time: i * 60_000, open: c, high: c, low: c, close: c, volume: 1 }));

  test("EMA of a constant series is that constant", () => {
    assert.equal(strategy.ema(candlesFrom(Array(30).fill(100)), 10), 100);
  });

  test("EMA seeds with the SMA when exactly one period is available", () => {
    assert.equal(strategy.ema(candlesFrom([1, 2, 3, 4, 5]), 5), 3);
  });

  test("EMA is undefined before it is seeded", () => {
    assert.equal(strategy.ema(candlesFrom([1, 2, 3]), 5), undefined);
  });

  test("EMA tracks a rising series above its seed", () => {
    const rising = strategy.ema(candlesFrom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 5);
    assert.ok(rising > 3 && rising < 10);
  });

  test("ATR of a constant series with fixed bar height equals that height", () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      time: i * 60_000,
      open: 100,
      high: 102,
      low: 100,
      close: 100,
      volume: 1,
    }));
    assert.equal(strategy.atr(candles, 14), 2);
  });

  test("ATR is undefined before it is seeded", () => {
    assert.equal(strategy.atr(candlesFrom([1, 2, 3]), 14), undefined);
  });

  test("indicator periods must be positive", () => {
    assert.throws(() => strategy.ema(candlesFrom([1, 2, 3]), 0), RangeError);
    assert.throws(() => strategy.atr(candlesFrom([1, 2, 3]), -1), RangeError);
  });
});

describe("strategy", () => {
  test("opening range covers only the first N minutes of the session", () => {
    const closes = Array.from({ length: 40 }, (_, i) => (i < 15 ? 100 + i * 0.1 : 200));
    const candles = session([2025, 1, 15], closes, 0);
    const range = strategy.openingRange(candles, 15);
    assert.equal(range.bars, 15);
    assert.ok(range.high < 110, "the 200-priced bars after the window must be excluded");
  });

  test("holds while the opening range is still forming", () => {
    const candles = session([2025, 1, 15], [100, 101, 102]);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: false });
    assert.equal(signal.kind, "HOLD");
  });

  test("goes long on a breakout above the opening range with trend", () => {
    const candles = session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: false });
    assert.equal(signal.kind, "ENTER_LONG");
    assert.ok(signal.stop < signal.price, "long entries need a stop below the entry");
  });

  test("goes short on a breakdown below the opening range with trend", () => {
    const closes = chopThenRamp(100, 20, 25, -0.4);
    const candles = session([2025, 1, 15], closes, 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: false });
    assert.equal(signal.kind, "ENTER_SHORT");
    assert.ok(signal.stop > signal.price, "short entries need a stop above the entry");
  });

  // ── evidence and confidence on entries ───────────────────────────────────

  test("every entry carries an assessment; HOLD and EXIT do not", () => {
    const long = strategy.evaluate({
      symbol: "X",
      candles: session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2),
      inPosition: false,
    });
    assert.equal(long.kind, "ENTER_LONG");
    assert.ok(long.assessment, "an entry is a recommendation and must carry an assessment");

    const hold = strategy.evaluate({
      symbol: "X",
      candles: session([2025, 1, 15], [100, 101, 102]),
      inPosition: false,
    });
    assert.equal(hold.kind, "HOLD");
    assert.equal(hold.assessment, undefined, "a HOLD is not a call to assess");
  });

  test("an entry's two indicators are one correlation group, not two", () => {
    const signal = strategy.evaluate({
      symbol: "X",
      candles: session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2),
      inPosition: false,
    });
    const groups = new Set(
      signal.assessment.evidence
        .filter((e) => e.kind !== "assumption")
        .map((e) => e.correlationGroup),
    );
    assert.equal(groups.size, 1, "the breakout and the EMA read are the same underlying claim");
    assert.equal(signal.assessment.confidence, strategy.strategyEntryConfidence());
  });

  test("an entry's assessment discloses invalidation, an alternative reading, and a known risk", () => {
    const signal = strategy.evaluate({
      symbol: "X",
      candles: session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2),
      inPosition: false,
    });
    for (const field of ["invalidation", "alternative", "missingInformation", "knownRisk"]) {
      assert.ok(
        typeof signal.assessment[field] === "string" && signal.assessment[field].length > 10,
        `assessment.${field} should be a substantial string`,
      );
    }
  });

  test("confidence is bounded strictly between zero and one for a real entry", () => {
    const signal = strategy.evaluate({
      symbol: "X",
      candles: session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2),
      inPosition: false,
    });
    assert.ok(signal.assessment.confidence > 0);
    assert.ok(signal.assessment.confidence < 1, "a single-thesis strategy should never claim near-certainty");
  });

  test("does not re-enter while a position is open", () => {
    const candles = session([2025, 1, 15], chopThenRamp(100, 20, 25, 0.4), 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: true });
    assert.equal(signal.kind, "HOLD");
  });

  test("exits an open position at square-off", () => {
    // 09:15 + 361 minutes is 15:16 IST, past the 15:15 square-off.
    const closes = Array.from({ length: 362 }, (_, i) => 100 + i * 0.1);
    const candles = session([2025, 1, 15], closes, 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: true });
    assert.equal(signal.kind, "EXIT");
    assert.equal(signal.reason, "square-off");
  });

  test("opens nothing new past square-off", () => {
    const closes = Array.from({ length: 362 }, (_, i) => 100 + i * 0.1);
    const candles = session([2025, 1, 15], closes, 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: false });
    assert.equal(signal.kind, "HOLD");
  });

  test("holds inside the opening range", () => {
    const candles = session([2025, 1, 15], Array(40).fill(100).map((v, i) => v + (i % 2 ? 0.1 : -0.1)), 0.2);
    const signal = strategy.evaluate({ symbol: "X", candles, inPosition: false });
    assert.equal(signal.kind, "HOLD");
  });
});

// ── paper broker ───────────────────────────────────────────────────────────

describe("paper broker", () => {
  let cash;
  before(() => {
    cash = types.toPaise(100_000);
  });
  const noFriction = { slippagePct: 0, tickSize: 0.05 };

  test("a profitable long round trip realises the gross move minus charges", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    broker.setPrice("X", 110);
    broker.marketOrder("X", "SELL", 10, 1);

    assert.equal(types.rupees(broker.portfolio().realised), 100);
    const net = types.rupees(broker.portfolio().cash) - 100_000;
    assert.ok(net > 98 && net < 100, `net ₹${net} should be just under the ₹100 gross`);
    assert.equal(broker.position("X"), undefined);
  });

  test("a profitable short round trip realises the inverse move", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "SELL", 10, 0);
    assert.equal(broker.position("X").quantity, -10);
    broker.setPrice("X", 90);
    broker.marketOrder("X", "BUY", 10, 1);
    assert.equal(types.rupees(broker.portfolio().realised), 100);
  });

  test("slippage always works against the order", () => {
    const broker = new paper.PaperBroker(cash, { slippagePct: 0.01, tickSize: 0 });
    broker.setPrice("X", 100);
    const buy = broker.marketOrder("X", "BUY", 1, 0);
    assert.equal(buy.price, 101);
    broker.setPrice("Y", 100);
    const sell = broker.marketOrder("Y", "SELL", 1, 0);
    assert.equal(sell.price, 99);
  });

  test("adding to a position volume-weights the average price", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    broker.setPrice("X", 120);
    broker.marketOrder("X", "BUY", 10, 1);
    const position = broker.position("X");
    assert.equal(position.quantity, 20);
    assert.equal(position.averagePrice, 110);
  });

  test("a partial close realises only the closed quantity", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    broker.setPrice("X", 110);
    broker.marketOrder("X", "SELL", 4, 1);
    assert.equal(types.rupees(broker.portfolio().realised), 40);
    assert.equal(broker.position("X").quantity, 6);
    assert.equal(broker.position("X").averagePrice, 100);
  });

  test("charges accumulate on the portfolio", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 100, 0);
    assert.ok(broker.portfolio().charges > 0);
  });

  test("equity is conserved across a flat round trip, less charges", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 50, 0);
    broker.marketOrder("X", "SELL", 50, 1);
    const equity = risk.equityOf(broker.portfolio(), broker.marks());
    assert.equal(equity, cash - broker.portfolio().charges);
  });

  test("ordering without a price is an error, not a silent fill", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    assert.throws(() => broker.marketOrder("X", "BUY", 1, 0), /no market price/);
  });

  test("fractional and non-positive quantities are rejected", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    broker.setPrice("X", 100);
    assert.throws(() => broker.marketOrder("X", "BUY", 1.5, 0), RangeError);
    assert.throws(() => broker.marketOrder("X", "BUY", 0, 0), RangeError);
  });

  test("non-positive prices are rejected", () => {
    const broker = new paper.PaperBroker(cash, noFriction);
    assert.throws(() => broker.setPrice("X", 0), RangeError);
  });
});

// ── end to end ─────────────────────────────────────────────────────────────

describe("backtest", () => {
  /** A strongly trending week — the friendliest possible tape for breakouts. */
  const trendingWeek = () => {
    const days = [15, 16, 17, 20, 21].map((d) =>
      session([2025, 1, d], chopThenRamp(100, 20, 300, 0.05), 0.2),
    );
    return [{ symbol: "TREND", candles: days.flat() }];
  };

  test("the 10%-per-day rule destroys the agent on a trending tape", () => {
    const report = backtest.backtest(trendingWeek());
    assert.equal(report.killSwitch.state, "DESTROYED");
    assert.equal(report.killSwitch.tombstone.reason, "DAILY_TARGET_MISSED");
    assert.ok(report.destroyedOn, "a destruction date should be recorded");
  });

  test("simulation stops at destruction rather than running the full tape", () => {
    const report = backtest.backtest(trendingWeek());
    assert.ok(
      report.sessions.length < 5,
      `expected an early stop, simulated ${report.sessions.length} sessions`,
    );
  });

  test("with the target guard off, the agent survives and reports honestly", () => {
    const report = backtest.backtest(trendingWeek(), {
      killSwitch: { ...killSwitch.DEFAULT_KILL_SWITCH, destroyOnTargetMiss: false },
    });
    assert.notEqual(report.killSwitch.state, "DESTROYED");
    assert.equal(report.sessions.length, 5);
    assert.equal(report.targetHitRate, 0, "no session should reach +10%");
  });

  test("every session's return is far below the 10% target", () => {
    const report = backtest.backtest(trendingWeek(), {
      killSwitch: { ...killSwitch.DEFAULT_KILL_SWITCH, destroyOnTargetMiss: false },
    });
    for (const s of report.sessions) {
      assert.ok(s.returnPct < 0.1, `${s.date} returned ${(s.returnPct * 100).toFixed(2)}%`);
    }
  });

  test("positions are always flat at the end of every session", () => {
    const report = backtest.backtest(trendingWeek(), {
      killSwitch: { ...killSwitch.DEFAULT_KILL_SWITCH, destroyOnTargetMiss: false },
    });
    // Equity equals cash only when nothing is held overnight.
    assert.ok(report.sessions.length > 0);
    assert.equal(report.finalEquity > 0, true);
  });

  test("a flat tape produces no trades and no charges", () => {
    const flat = [
      { symbol: "FLAT", candles: session([2025, 1, 15], Array(300).fill(100), 0.05) },
    ];
    const report = backtest.backtest(flat, {
      killSwitch: { ...killSwitch.DEFAULT_KILL_SWITCH, destroyOnTargetMiss: false },
    });
    assert.equal(report.trades, 0);
    assert.equal(report.totalCharges, 0);
    assert.equal(report.finalEquity, report.startingEquity);
  });

  test("the drawdown guard destroys the agent on a collapsing tape", () => {
    // A hard sustained decline: the agent goes long on the open ramp, then
    // the tape reverses and keeps falling.
    const closes = [...chopThenRamp(100, 20, 30, 0.5)];
    for (let i = 0; i < 250; i++) closes.push(closes[closes.length - 1] - 1.2);
    const collapsing = [
      { symbol: "CRASH", candles: session([2025, 1, 15], closes.map((c) => Math.max(c, 1)), 0.3) },
    ];
    const report = backtest.backtest(collapsing, {
      killSwitch: {
        ...killSwitch.DEFAULT_KILL_SWITCH,
        destroyOnTargetMiss: false,
        maxDailyLossPct: 0.02,
      },
      risk: { ...risk.DEFAULT_RISK, riskPerTradePct: 0.05, maxPositionNotionalPct: 1 },
    });
    // Either the daily-loss halt or the drawdown kill must have engaged; the
    // agent must not have ridden the whole collapse down.
    assert.ok(report.totalReturnPct > -0.15, `lost ${(report.totalReturnPct * 100).toFixed(2)}%`);
  });

  test("formatReport renders the tombstone when the agent is destroyed", () => {
    const text = backtest.formatReport(backtest.backtest(trendingWeek()));
    assert.match(text, /DESTROYED/);
    assert.match(text, /DAILY_TARGET_MISSED/);
  });
});

// ── synthetic tape ─────────────────────────────────────────────────────────

describe("synthetic tape", () => {
  test("is deterministic for a given seed", () => {
    const a = synthetic.syntheticTape({ sessions: 3, seed: 7 });
    const b = synthetic.syntheticTape({ sessions: 3, seed: 7 });
    assert.deepEqual(a, b);
  });

  test("a different seed produces a different tape", () => {
    const a = synthetic.syntheticTape({ sessions: 3, seed: 7 });
    const b = synthetic.syntheticTape({ sessions: 3, seed: 8 });
    assert.notDeepEqual(a, b);
  });

  test("emits the expected bar count per session", () => {
    // 09:15–15:30 is 375 minutes; at 5-minute bars that is 75 per session.
    const candles = synthetic.syntheticTape({ sessions: 4, barMinutes: 5 });
    assert.equal(candles.length, 4 * 75);
  });

  test("every session falls on a weekday", () => {
    const candles = synthetic.syntheticTape({ sessions: 10, barMinutes: 5 });
    for (const candle of candles) {
      assert.equal(calendar.isTradingDay(candle.time), true);
    }
  });

  test("every bar lands inside continuous trading hours", () => {
    const candles = synthetic.syntheticTape({ sessions: 5, barMinutes: 5 });
    for (const candle of candles) {
      assert.equal(calendar.isMarketOpen(candle.time), true);
    }
  });

  test("candles are OHLC-consistent and strictly positive", () => {
    for (const c of synthetic.syntheticTape({ sessions: 6, barMinutes: 5 })) {
      assert.ok(c.high >= Math.max(c.open, c.close), "high must top open and close");
      assert.ok(c.low <= Math.min(c.open, c.close), "low must sit under open and close");
      assert.ok(c.low > 0 && c.open > 0 && c.close > 0);
    }
  });

  test("bars are strictly ordered in time", () => {
    const candles = synthetic.syntheticTape({ sessions: 5, barMinutes: 5 });
    for (let i = 1; i < candles.length; i++) {
      assert.ok(candles[i].time > candles[i - 1].time);
    }
  });

  test("carries no exploitable drift — the strategy's edge must come from the tape, not the generator", () => {
    // Mean bar return should be indistinguishable from zero. If this fails,
    // the generator is handing the breakout strategy its own answer.
    const candles = synthetic.syntheticTape({ sessions: 60, barMinutes: 5, seed: 3 });
    const returns = candles.map((c) => (c.close - c.open) / c.open);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    assert.ok(Math.abs(mean) < 2e-4, `mean bar return ${mean} is too far from zero`);
  });

  test("rejects a non-positive bar interval", () => {
    assert.throws(() => synthetic.syntheticTape({ barMinutes: 0 }), RangeError);
  });

  test("zero sessions yields an empty tape", () => {
    assert.deepEqual(synthetic.syntheticTape({ sessions: 0 }), []);
  });
});

// ── formatting ─────────────────────────────────────────────────────────────

describe("format", () => {
  test("uses Indian digit grouping", () => {
    assert.match(fmt.inr(100000), /1,00,000/);
    assert.match(fmt.inr(10000000), /1,00,00,000/);
  });

  test("signed percentages carry an explicit sign", () => {
    assert.equal(fmt.signedPct(0.0029), "+0.29%");
    assert.equal(fmt.signedPct(-0.0114), "−1.14%");
    assert.equal(fmt.signedPct(0), "0.00%");
  });

  test("non-finite figures render as an em dash, never as NaN", () => {
    assert.equal(fmt.inr(NaN), "—");
    assert.equal(fmt.signedPct(Infinity), "—");
    assert.equal(fmt.magnitude(NaN), "—");
    assert.equal(fmt.multiple(NaN), "—");
  });

  test("very large figures render with real superscript glyphs, not carets", () => {
    assert.equal(fmt.magnitude(2.23e15), "₹2.23 × 10¹⁵");
    assert.equal(fmt.multiple(2.23e10), "2.2 × 10¹⁰");
    assert.doesNotMatch(fmt.magnitude(2.23e15), /\^/);
  });

  test("superscript typesets each digit", () => {
    assert.equal(fmt.superscript(0), "⁰");
    assert.equal(fmt.superscript(15), "¹⁵");
    assert.equal(fmt.superscript(-3), "⁻³");
  });

  test("multipleParts splits the exponent out for markup typesetting", () => {
    const big = fmt.multipleParts(2.23e10);
    assert.equal(big.mantissa, "2.2 × 10");
    assert.equal(big.exponent, 10);
    // No Unicode superscript in the parts form — that is the caller's job.
    assert.doesNotMatch(big.mantissa, /[⁰¹²³⁴⁵⁶⁷⁸⁹]/);
  });

  test("multipleParts leaves small figures without an exponent", () => {
    const small = fmt.multipleParts(7.8);
    assert.equal(small.exponent, null);
    assert.equal(small.mantissa, "7.8×");
  });

  test("multipleParts handles non-finite input", () => {
    assert.deepEqual(fmt.multipleParts(NaN), { mantissa: "—", exponent: null });
  });

  test("multipleParts and multiple agree on the value", () => {
    const parts = fmt.multipleParts(2.23e10);
    assert.equal(`${parts.mantissa}${fmt.superscript(parts.exponent)}`, fmt.multiple(2.23e10));
  });

  test("large multiples drop the trailing times sign, small ones keep it", () => {
    assert.ok(fmt.multiple(2.23e10).endsWith("¹⁰"));
    assert.ok(fmt.multiple(7.84, 2).endsWith("×"));
  });

  test("ordinary multiples stay decimal", () => {
    assert.equal(fmt.multiple(7.84, 2), "7.84×");
  });

  test("direction maps to the editorial market classes", () => {
    assert.equal(fmt.direction(0.01), "ed-up");
    assert.equal(fmt.direction(-0.01), "ed-down");
    assert.equal(fmt.direction(0), "ed-flat");
  });
});

// ── terminal data ──────────────────────────────────────────────────────────

describe("terminal data", () => {
  test("mandate arithmetic compounds the target across a trading year", () => {
    const m = terminal.mandateArithmetic(0.1, types.toPaise(100_000));
    // 1.1^250 is ~2.2e10.
    assert.ok(m.yearMultiple > 1e10 && m.yearMultiple < 1e11, `got ${m.yearMultiple}`);
    assert.equal(m.sessionsPerYear, 250);
  });

  test("a 1% target compounds to a far smaller multiple than 10%", () => {
    const modest = terminal.mandateArithmetic(0.01, types.toPaise(100_000));
    const steep = terminal.mandateArithmetic(0.1, types.toPaise(100_000));
    assert.ok(modest.yearMultiple < steep.yearMultiple / 1e6);
  });

  test("sessions-to-a-crore is consistent with the target", () => {
    const m = terminal.mandateArithmetic(0.1, types.toPaise(100_000));
    // ₹1L → ₹1cr is 100×; log(100)/log(1.1) ≈ 48.3, so 49 sessions.
    assert.equal(m.sessionsToOneCrore, 49);
    assert.ok(Math.pow(1.1, m.sessionsToOneCrore) * 100_000 >= 10_000_000);
  });

  test("a zero target never reaches a crore", () => {
    const m = terminal.mandateArithmetic(0, types.toPaise(100_000));
    assert.equal(m.sessionsToOneCrore, Infinity);
    assert.equal(m.yearMultiple, 1);
  });

  test("the cost model itemises every statutory charge", () => {
    const model = terminal.costModel(100_000, 0.1);
    const labels = model.lines.map((l) => l.label);
    for (const required of ["Brokerage", "STT", "Stamp duty", "GST"]) {
      assert.ok(labels.includes(required), `missing ${required}`);
    }
    assert.ok(model.totalRoundTrip > 0);
  });

  test("cost lines sum to the reported round trip", () => {
    const model = terminal.costModel(100_000, 0.1);
    const sum = model.lines.reduce((a, l) => a + l.amount, 0);
    assert.ok(Math.abs(sum - model.totalRoundTrip) < 0.05, `${sum} vs ${model.totalRoundTrip}`);
  });

  test("gross needed exceeds the target by the modelled friction", () => {
    const model = terminal.costModel(100_000, 0.1);
    assert.ok(model.grossNeededForTarget > 0.1);
    assert.ok(model.grossNeededForTarget < 0.11, "friction should be bps, not points");
  });

  test("the terminal report never claims a live record", () => {
    const report = terminal.buildTerminalReport({ tape: { sessions: 6 } });
    assert.equal(report.liveRecord, null);
  });

  test("under the mandate the agent is destroyed", () => {
    const report = terminal.buildTerminalReport({ tape: { sessions: 6 } });
    assert.equal(report.underMandate.report.killSwitch.state, "DESTROYED");
    assert.equal(
      report.underMandate.report.killSwitch.tombstone.reason,
      "DAILY_TARGET_MISSED",
    );
  });

  test("with the rule disabled the run completes and no session hits the target", () => {
    const report = terminal.buildTerminalReport({ tape: { sessions: 8 } });
    assert.equal(report.unconstrained.report.sessions.length, 8);
    assert.equal(report.unconstrained.sessionsAtTarget, 0);
  });

  test("the equity series starts at the opening capital and tracks each session", () => {
    const report = terminal.buildTerminalReport({ tape: { sessions: 8 } });
    const equity = report.unconstrained.equity;
    assert.equal(equity.length, 9); // session 0 plus eight closes
    assert.equal(equity[0].session, 0);
    assert.equal(equity[0].value, types.rupees(report.startingCapital));
  });

  test("the summary's best and worst bracket the median", () => {
    const { unconstrained } = terminal.buildTerminalReport({ tape: { sessions: 10 } });
    assert.ok(unconstrained.best.returnPct >= unconstrained.medianReturn);
    assert.ok(unconstrained.worst.returnPct <= unconstrained.medianReturn);
  });

  test("is deterministic — the same config renders the same page twice", () => {
    const a = terminal.buildTerminalReport({ tape: { sessions: 6 } });
    const b = terminal.buildTerminalReport({ tape: { sessions: 6 } });
    assert.deepEqual(a.unconstrained.equity, b.unconstrained.equity);
    assert.equal(a.mandate.yearMultiple, b.mandate.yearMultiple);
  });
});

// ── guard: enforcement ─────────────────────────────────────────────────────

describe("guard", () => {
  const cfg = () => ({ ...killSwitch.DEFAULT_KILL_SWITCH });
  const start = () => types.toPaise(100_000);

  const losingSession = (returnPct) => ({
    date: "2025-01-15",
    openingEquity: start(),
    closingEquity: start() + types.toPaise(100_000 * returnPct),
    returnPct,
    charges: 0,
    trades: 1,
  });

  test("a fresh guard permits opening", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start() });
    assert.equal(g.canOpen(), true);
    assert.equal(g.assertMayOpen(), true);
  });

  test("a missed target destroys and blocks opening", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start() });
    g.closeSession(losingSession(0.01));
    assert.equal(g.state.state, "DESTROYED");
    assert.equal(g.canOpen(), false);
    assert.throws(() => g.assertMayOpen(), (e) => e.name === "AgentDestroyedError");
  });

  test("a halt blocks opening without throwing", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start() });
    g.markEquity(types.toPaise(97_000)); // past the 2% daily loss limit
    assert.equal(g.state.state, "HALTED_FOR_DAY");
    assert.equal(g.assertMayOpen(), false, "a halt is an ordinary event, not an exception");
  });

  test("destruction persists to the store", () => {
    const store = new guard.MemoryTombstoneStore();
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start(), store });
    g.closeSession(losingSession(0.0));
    assert.ok(store.read(), "the tombstone must reach the store");
    assert.equal(store.read().reason, "DAILY_TARGET_MISSED");
  });

  test("a destroyed agent stays destroyed across a restart", () => {
    // This is the hole the guard exists to close: state used to live only in
    // memory, so a new process started a destroyed agent up again.
    const store = new guard.MemoryTombstoneStore();
    const first = new guard.TradingGuard({ config: cfg(), startingEquity: start(), store });
    first.closeSession(losingSession(0.0));
    assert.equal(first.state.state, "DESTROYED");

    const reborn = new guard.TradingGuard({ config: cfg(), startingEquity: start(), store });
    assert.equal(reborn.state.state, "DESTROYED", "a restart must not revive the agent");
    assert.equal(reborn.canOpen(), false);
    assert.throws(() => reborn.assertMayOpen(), (e) => e.name === "AgentDestroyedError");
  });

  test("the store keeps the original cause of death", () => {
    const store = new guard.MemoryTombstoneStore();
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start(), store });
    g.closeSession(losingSession(0.0));
    const original = store.read().reason;
    store.write({ ...store.read(), reason: "MANUAL", detail: "overwritten" });
    assert.equal(store.read().reason, original, "first writer must win");
  });

  test("a manual stop is recorded like any other destruction", () => {
    const store = new guard.MemoryTombstoneStore();
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start(), store });
    g.destroyManually("operator pulled it", start());
    assert.equal(g.state.state, "DESTROYED");
    assert.equal(store.read().reason, "MANUAL");
  });

  test("sessions after destruction change nothing", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: start() });
    g.closeSession(losingSession(0.0));
    g.closeSession(losingSession(0.5)); // a spectacular session, too late
    assert.equal(g.state.state, "DESTROYED");
  });

  test("rejects a configuration that could never fire", () => {
    assert.throws(
      () => new guard.TradingGuard({
        config: { ...cfg(), maxDrawdownPct: 2 },
        startingEquity: start(),
      }),
      (e) => e.name === "InvalidKillSwitchConfig",
    );
  });

  test("rejects non-positive and fractional limits", () => {
    assert.ok(guard.validateKillSwitchConfig({ ...cfg(), maxDailyLossPct: 0 }).length);
    assert.ok(guard.validateKillSwitchConfig({ ...cfg(), maxDrawdownPct: -0.1 }).length);
    assert.ok(guard.validateKillSwitchConfig({ ...cfg(), graceDays: 1.5 }).length);
    assert.ok(guard.validateKillSwitchConfig({ ...cfg(), graceDays: -1 }).length);
    assert.equal(guard.validateKillSwitchConfig(cfg()).length, 0);
  });
});

// ── guard: enforcement at the broker ───────────────────────────────────────

describe("broker enforcement", () => {
  const cfg = () => ({ ...killSwitch.DEFAULT_KILL_SWITCH });
  const cash = () => types.toPaise(100_000);
  const noFriction = { slippagePct: 0, tickSize: 0.05 };

  function destroyedGuard() {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    g.destroyManually("test", cash());
    return g;
  }

  test("a guarded broker accepts orders while running", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    const broker = new paper.PaperBroker(cash(), noFriction, g);
    broker.setPrice("X", 100);
    assert.ok(broker.marketOrder("X", "BUY", 10, 0));
  });

  test("a destroyed agent cannot open a position through the broker", () => {
    // The orchestrator is bypassed entirely here — this calls the broker
    // directly, which is exactly the hole the guard closes.
    const broker = new paper.PaperBroker(cash(), noFriction, destroyedGuard());
    broker.setPrice("X", 100);
    assert.throws(
      () => broker.marketOrder("X", "BUY", 10, 0),
      (e) => e.name === "AgentDestroyedError",
    );
    assert.equal(broker.position("X"), undefined, "no position may exist");
  });

  test("a destroyed agent cannot open a short either", () => {
    const broker = new paper.PaperBroker(cash(), noFriction, destroyedGuard());
    broker.setPrice("X", 100);
    assert.throws(() => broker.marketOrder("X", "SELL", 10, 0), (e) => e.name === "AgentDestroyedError");
  });

  test("a destroyed agent can still flatten an open position", () => {
    // Trapping a destroyed agent in live risk would be worse than the failure
    // the kill switch prevents, so reducing orders always pass.
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    const broker = new paper.PaperBroker(cash(), noFriction, g);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);

    g.destroyManually("mid-position", cash());
    assert.doesNotThrow(() => broker.marketOrder("X", "SELL", 10, 1));
    assert.equal(broker.position("X"), undefined);
  });

  test("a partial reduction is permitted while destroyed", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    const broker = new paper.PaperBroker(cash(), noFriction, g);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    g.destroyManually("mid-position", cash());
    assert.doesNotThrow(() => broker.marketOrder("X", "SELL", 4, 1));
    assert.equal(broker.position("X").quantity, 6);
  });

  test("a reversal beyond the held quantity is not a reduction and is blocked", () => {
    // Selling 25 against a 10 long would close 10 and open a 15 short. That
    // second half is new risk, so the whole order must be refused.
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    const broker = new paper.PaperBroker(cash(), noFriction, g);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    g.destroyManually("mid-position", cash());
    assert.throws(() => broker.marketOrder("X", "SELL", 25, 1), (e) => e.name === "AgentDestroyedError");
    assert.equal(broker.position("X").quantity, 10, "position must be untouched");
  });

  test("a halted agent is refused new positions but not flattening", () => {
    const g = new guard.TradingGuard({ config: cfg(), startingEquity: cash() });
    const broker = new paper.PaperBroker(cash(), noFriction, g);
    broker.setPrice("X", 100);
    broker.marketOrder("X", "BUY", 10, 0);
    g.markEquity(types.toPaise(97_000));
    assert.equal(g.state.state, "HALTED_FOR_DAY");

    assert.throws(() => broker.marketOrder("Y", "BUY", 1, 1), (e) => e.name === "OrderRejected");
    broker.setPrice("X", 99);
    assert.doesNotThrow(() => broker.marketOrder("X", "SELL", 10, 2));
  });

  test("an unguarded broker is unchanged — the guard is opt-in", () => {
    const broker = new paper.PaperBroker(cash(), noFriction);
    broker.setPrice("X", 100);
    assert.doesNotThrow(() => broker.marketOrder("X", "BUY", 10, 0));
  });
});

// ── falsification ──────────────────────────────────────────────────────────

describe("null model", () => {
  const ist = (y, m, d, hh, mm) => Date.UTC(y, m - 1, d, hh - 5, mm - 30);
  const bars = (n, at) =>
    Array.from({ length: n }, (_, i) => ({
      time: at + i * 300_000,
      open: 100,
      high: 101,
      low: 99,
      close: 100 + (i % 3),
      volume: 1,
    }));

  test("never fires before its warmup", () => {
    const fn = falsify.randomEntrySignal(1, 7, 14, 1.5, 30);
    const signal = fn({ symbol: "X", candles: bars(10, ist(2025, 1, 15, 9, 15)), inPosition: false });
    assert.equal(signal.kind, "HOLD");
  });

  test("never opens a second position", () => {
    const fn = falsify.randomEntrySignal(1, 7, 14, 1.5, 5);
    const signal = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 9, 15)), inPosition: true });
    assert.equal(signal.kind, "HOLD");
  });

  test("exits at square-off like the strategy does", () => {
    // 09:15 + 361 minutes is past the 15:15 bell.
    const late = bars(60, ist(2025, 1, 15, 15, 20));
    const fn = falsify.randomEntrySignal(1, 7, 14, 1.5, 5);
    assert.equal(fn({ symbol: "X", candles: late, inPosition: true }).kind, "EXIT");
    assert.equal(fn({ symbol: "X", candles: late, inPosition: false }).kind, "HOLD");
  });

  test("a rate of zero never enters", () => {
    const fn = falsify.randomEntrySignal(0, 7, 14, 1.5, 5);
    for (let i = 0; i < 50; i++) {
      const s = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false });
      assert.equal(s.kind, "HOLD");
    }
  });

  test("entries always carry a protective stop on the correct side", () => {
    const fn = falsify.randomEntrySignal(1, 3, 14, 1.5, 5);
    let entries = 0;
    for (let i = 0; i < 40; i++) {
      const s = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false });
      if (s.kind === "ENTER_LONG") { entries++; assert.ok(s.stop < s.price); }
      if (s.kind === "ENTER_SHORT") { entries++; assert.ok(s.stop > s.price); }
    }
    assert.ok(entries > 0, "a rate of 1 should produce entries");
  });

  test("is deterministic for a seed", () => {
    const draw = (seed) => {
      const fn = falsify.randomEntrySignal(0.5, seed, 14, 1.5, 5);
      return Array.from({ length: 20 }, () =>
        fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false }).kind);
    };
    assert.deepEqual(draw(9), draw(9));
    assert.notDeepEqual(draw(9), draw(10));
  });

  test("entries default to the strategy's confidence, so sizing stays matched", () => {
    const fn = falsify.randomEntrySignal(1, 3, 14, 1.5, 5);
    for (let i = 0; i < 40; i++) {
      const s = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false });
      if (s.kind === "ENTER_LONG" || s.kind === "ENTER_SHORT") {
        assert.equal(s.assessment.confidence, strategy.strategyEntryConfidence());
        return;
      }
    }
    assert.fail("expected at least one entry at rate 1");
  });

  test("an explicit confidence overrides the matched default", () => {
    const fn = falsify.randomEntrySignal(1, 3, 14, 1.5, 5, 0.9);
    for (let i = 0; i < 40; i++) {
      const s = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false });
      if (s.kind === "ENTER_LONG" || s.kind === "ENTER_SHORT") {
        assert.equal(s.assessment.confidence, 0.9);
        return;
      }
    }
    assert.fail("expected at least one entry at rate 1");
  });

  test("the null's assessment says plainly that it carries no reasoning", () => {
    const fn = falsify.randomEntrySignal(1, 3, 14, 1.5, 5);
    for (let i = 0; i < 40; i++) {
      const s = fn({ symbol: "X", candles: bars(60, ist(2025, 1, 15, 10, 0)), inPosition: false });
      if (s.kind === "ENTER_LONG" || s.kind === "ENTER_SHORT") {
        assert.match(s.assessment.evidence[0].statement, /no reasoning of its own/);
        return;
      }
    }
    assert.fail("expected at least one entry at rate 1");
  });
});

describe("falsify", () => {
  const small = { tapeSeeds: [11, 23], nullTrialsPerTape: 6, tape: { sessions: 6 } };

  test("the strategy does not separate from random entry", () => {
    // The headline claim of the whole engine, under test. If this ever flips,
    // the change that flipped it needs explaining before it is trusted.
    const r = falsify.falsify(small);
    assert.equal(r.verdict, "INDISTINGUISHABLE_FROM_CHANCE");
    assert.ok(r.pValue > r.alpha, `p=${r.pValue} should exceed alpha=${r.alpha}`);
  });

  test("runs every tape and every trial", () => {
    const r = falsify.falsify(small);
    assert.equal(r.tapes, 2);
    assert.equal(r.strategyReturns.length, 2);
    assert.equal(r.nullReturns.length, 12);
    assert.equal(r.trials, 12);
  });

  test("the p-value is a probability and never exactly zero", () => {
    const r = falsify.falsify(small);
    assert.ok(r.pValue > 0, "the +1 correction must keep it above zero");
    assert.ok(r.pValue <= 1);
  });

  test("an alpha of 1 always rejects the null — a sanity check on the comparison", () => {
    const r = falsify.falsify({ ...small, alpha: 1 });
    assert.equal(r.verdict, "SEPARATES_FROM_CHANCE");
  });

  test("the null actually trades — an idle null would prove nothing", () => {
    const r = falsify.falsify(small);
    assert.ok(r.meanEntries > 0, "the strategy must open positions for the test to mean anything");
    assert.ok(
      r.nullReturns.some((x) => x !== 0),
      "a null that never traded would return exactly 0 every time",
    );
  });

  test("is deterministic — the same config gives the same verdict twice", () => {
    const a = falsify.falsify(small);
    const b = falsify.falsify(small);
    assert.equal(a.pValue, b.pValue);
    assert.deepEqual(a.strategyReturns, b.strategyReturns);
  });

  test("reports what would overturn the verdict", () => {
    const r = falsify.falsify(small);
    assert.ok(r.whatWouldChangeIt.length > 40);
  });

  test("multiple tapes are used, not one — single-path results are selection bias", () => {
    const r = falsify.falsify(small);
    assert.ok(new Set(r.strategyReturns).size > 1, "independent tapes should differ");
  });
});
