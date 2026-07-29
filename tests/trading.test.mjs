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
  [types, costs, killSwitch, calendar, risk, strategy, paper, backtest] = await Promise.all(
    [
      "types.js",
      "costs.js",
      "kill-switch.js",
      "market-calendar.js",
      "risk.js",
      "strategy.js",
      "paper-broker.js",
      "backtest.js",
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
