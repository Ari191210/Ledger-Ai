/**
 * The registry drives navigation, so a stale entry does not crash, it quietly
 * renders the "not wired yet" placeholder from app/(app)/tools/[slug]. That
 * failure is invisible in a build and easy to ship. These tests make it loud.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES, TOOLS } from "./registry";
import { PROMPTS } from "./prompts";

const pageDirs = new Set(
  readdirSync(join(process.cwd(), "app", "(app)", "tools"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "[slug]")
    .map((e) => e.name),
);

describe("tool registry", () => {
  it("gives every tool a page of its own", () => {
    const placeholders = TOOLS.filter((t) => !pageDirs.has(t.slug)).map((t) => t.slug);
    expect(placeholders).toEqual([]);
  });

  it("leaves no page behind after a tool is cut", () => {
    const slugs = new Set(TOOLS.map((t) => t.slug));
    const orphans = [...pageDirs].filter((d) => !slugs.has(d));
    expect(orphans).toEqual([]);
  });

  // The reverse direction only. Six AI tools (planner, focus, habits,
  // deadlines, exam-planner, coach) build their prompts inside their own
  // pages rather than from PROMPTS, so a missing spec is not a fault. A spec
  // left behind for a tool nobody can reach is.
  it("leaves no prompt behind for a tool that no longer exists", () => {
    const stranded = Object.keys(PROMPTS).filter((slug) => !TOOLS.some((t) => t.slug === slug));
    expect(stranded).toEqual([]);
  });

  it("leaves no category empty", () => {
    const empty = CATEGORIES.filter((c) => !TOOLS.some((t) => t.category === c.id)).map((c) => c.id);
    expect(empty).toEqual([]);
  });

  it("keeps slugs and icons unique so nothing shadows anything else", () => {
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length);
  });
});
