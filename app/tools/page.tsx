"use client";

// ═══════════════════════════════════════════════════════════════════════════
// /tools — THE INDEX. Previously absent: every `/tools/<slug>` page existed,
// but nothing listed them, so `/tools` itself 404'd (or, for a signed-out
// visitor, bounced to `/auth` before Next ever got to routing — the auth
// guard runs first).
//
// ONE SOURCE, NOT A HAND-WRITTEN LIST. `NAV_CATEGORIES` (`lib/tools-registry
// .ts`) is the same manifest the command palette and the nav already read —
// "one list of tools exists" (M2). Adding or retiring a tool here is a
// registry change, never an edit to this file.
//
// Matches its siblings' own idiom (`app/tools/flashcards/page.tsx` etc): the
// `mono`/`--ink-3` header convention, `.btn`, no Console primitives — this
// route sits inside `ToolsLayout` alongside every tool page it links to, and
// looks like one of them rather than a foreign Console surface bolted on top.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { NAV_CATEGORIES, NAV_TOOLS, type ToolTier } from "@/lib/tools-registry";

const TIER_LABEL: Record<ToolTier, string | null> = {
  Free: null,
  Pro: "PRO",
  "Pro+": "PRO+",
};

export default function ToolsIndexPage() {
  return (
    <>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>All Tools</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{NAV_TOOLS.length} tools</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 28, letterSpacing: "-0.015em" }}>
            Every tool, in one place.
          </div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>
            Grouped the same way the command palette (⌘K) groups them — this is the browsable version.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {NAV_CATEGORIES.map((category) => (
            <section key={category.label}>
              <div
                className="mono"
                style={{
                  color: "var(--ink-3)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  paddingBottom: 10,
                  marginBottom: 4,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                {category.label} · {category.tools.length}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {category.tools.map((tool) => {
                  const tierLabel = TIER_LABEL[tool.tier];
                  return (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="tools-index-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 16,
                        padding: "14px 4px",
                        borderBottom: "1px solid var(--rule)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <div style={{ color: "var(--ink)", fontSize: 14, fontWeight: 500 }}>
                          {tool.title}
                        </div>
                        <div style={{ color: "var(--ink-3)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tool.subtitle}
                        </div>
                      </div>
                      {tierLabel && (
                        <div className="mono" style={{ flexShrink: 0, fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-3)" }}>
                          {tierLabel}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
          <Link href="/today" className="mono" style={{ color: "var(--ink-3)" }}>
            ← Today
          </Link>
        </div>
      </main>

      <style jsx>{`
        .tools-index-row {
          transition: background 120ms ease;
        }
        .tools-index-row:hover {
          background: color-mix(in srgb, var(--ink) 5%, transparent);
        }
      `}</style>
    </>
  );
}
