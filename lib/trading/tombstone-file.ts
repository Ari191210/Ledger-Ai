// A tombstone that survives the process.
//
// Deliberately in its own module: it imports `node:fs`, and lib/trading is
// otherwise safe to bundle for a browser. Nothing that renders a page should
// ever reach this file.
//
// The write is atomic — a temp file plus a rename — because the one moment
// this store must not fail is the moment the agent is being destroyed. A
// half-written tombstone is a tombstone that does not parse, and a tombstone
// that does not parse reads as "no tombstone", which resurrects the agent.

import fs from "node:fs";
import path from "node:path";
import { Tombstone } from "./kill-switch";
import { TombstoneStore } from "./guard";

const REASONS = new Set([
  "DAILY_LOSS_LIMIT",
  "MAX_DRAWDOWN",
  "DAILY_TARGET_MISSED",
  "MANUAL",
]);

/** Structural check — a corrupt file must not be trusted into a live run. */
function parseTombstone(raw: string): Tombstone | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const t = value as Record<string, unknown>;
  const numeric = ["destroyedAt", "finalEquity", "peakEquity", "sessionsSurvived"];
  if (typeof t.reason !== "string" || !REASONS.has(t.reason)) return null;
  if (typeof t.detail !== "string") return null;
  if (numeric.some((k) => typeof t[k] !== "number" || !Number.isFinite(t[k] as number))) {
    return null;
  }
  return value as unknown as Tombstone;
}

export class FileTombstoneStore implements TombstoneStore {
  constructor(private readonly file: string) {}

  read(): Tombstone | null {
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, "utf8");
    } catch {
      return null; // absent is the normal case for a living agent
    }

    const tombstone = parseTombstone(raw);
    if (tombstone === null) {
      // A file that exists but will not parse is the dangerous case: it means
      // *something* was written here. Fail closed rather than treating it as
      // an absent tombstone and letting the agent trade.
      throw new Error(
        `Tombstone at ${this.file} exists but is unreadable. ` +
          `Refusing to start — inspect it and delete it deliberately if the ` +
          `agent is meant to run again.`,
      );
    }
    return tombstone;
  }

  write(tombstone: Tombstone): void {
    // First writer wins: never overwrite the original cause of death.
    if (fs.existsSync(this.file)) return;

    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(tombstone, null, 2), "utf8");
    fs.renameSync(temp, this.file);
  }

  /** Explicit revival. Deliberately not called by anything automatic. */
  clear(): void {
    try {
      fs.unlinkSync(this.file);
    } catch {
      /* already gone */
    }
  }
}
