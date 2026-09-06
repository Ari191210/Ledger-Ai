/**
 * The registry drives navigation, so a stale entry does not crash, it quietly
 * renders the "not wired yet" placeholder from app/(app)/tools/[slug]. That
 * failure is invisible in a build and easy to ship. These tests make it loud.
 */

import { readdirSync, readFileSync } from "node:fs";
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

  // Both directions, which is only possible now that `kind` is honest. This
  // test was previously one-directional because six tools claimed kind "ai"
  // while making no model call, and the comment excusing that was wrong: they
  // did not build prompts of their own, they had no prompts at all.
  it("gives every AI tool a prompt to run", () => {
    const unwired = TOOLS.filter((t) => t.kind === "ai" && !PROMPTS[t.slug]).map((t) => t.slug);
    expect(unwired).toEqual([]);
  });

  it("leaves no prompt behind for a tool that is not an AI tool", () => {
    const stranded = Object.keys(PROMPTS).filter(
      (slug) => !TOOLS.some((t) => t.slug === slug && t.kind === "ai"),
    );
    expect(stranded).toEqual([]);
  });

  // A local tool that quietly starts calling the model is a cost surprise, and
  // the registry is where anyone would look to find out that it does.
  it("keeps the AI count where the registry says it is", () => {
    expect(TOOLS.filter((t) => t.kind === "ai")).toHaveLength(Object.keys(PROMPTS).length);
  });

  it("leaves no category empty", () => {
    const empty = CATEGORIES.filter((c) => !TOOLS.some((t) => t.category === c.id)).map((c) => c.id);
    expect(empty).toEqual([]);
  });

  // The count is quoted in the page title, the OG image, the landing copy and
  // the terms. Cutting a tool is easy; remembering all four is not, and a
  // wrong number on the marketing surface is the kind of thing a reader
  // notices before we do.
  it("keeps the advertised tool count honest", () => {
    const surfaces = ["app/layout.tsx", "app/opengraph-image.tsx", "app/page.tsx", "app/terms/page.tsx"];
    const stale = surfaces.filter((f) => {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      const counts = [...src.matchAll(/(\d+) tools/g)].map((m) => Number(m[1]));
      return counts.some((n) => n !== TOOLS.length);
    });
    expect(stale).toEqual([]);
  });

  it("keeps slugs and icons unique so nothing shadows anything else", () => {
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length);
  });
});
