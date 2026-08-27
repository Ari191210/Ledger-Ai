"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TOOLS_REGISTRY, CAT_COLOR, CAT_ORDER, toolMatches, type ToolCategory } from "@/lib/tools-registry";
import { useUI } from "@/components/ui-context";

// ═══════════════════════════════════════════════════════════════════════════
// THE TOOLS INDEX
//
// Every instrument on one route. The top nav carries a single "Tools" link
// here instead of hosting the whole catalogue in a slide-in drawer: the nav
// bar is for navigation, browsing is a page.
//
// This route is NOT in lib/editorial-routes.ts, so it renders in the legacy
// design system (globals.css), not the editorial one. It therefore follows
// the same chrome as the 46 tool pages it indexes — the 24px/44px header rule,
// the 40px/44px/80px main, and the mob-hp / mob-p responsive classes that
// carry the mobile padding. Deviating would make the index the only page in
// /tools that behaves differently from everything inside it.
//
// Flat, ruled, ink on paper. Category colour is used only as a category
// indicator, per the Category Rule — never as a button or heading colour.
// ═══════════════════════════════════════════════════════════════════════════

const CAT_NOTE: Record<ToolCategory, string> = {
  PLAN:     "Decide what today is for.",
  LEARN:    "Turn material into understanding.",
  WRITE:    "Produce work that earns the marks.",
  PRACTISE: "Test yourself before the paper does.",
  FUTURE:   "Where the record is eventually spent.",
  TRACK:    "Keep the record honest.",
};

export default function ToolsIndexPage() {
  const { setSplitSlug } = useUI();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ToolCategory | "ALL">("ALL");

  const groups = useMemo(
    () =>
      CAT_ORDER
        .filter(c => cat === "ALL" || c === cat)
        .map(c => ({ cat: c, tools: TOOLS_REGISTRY.filter(t => t.cat === c && toolMatches(t, query)) }))
        .filter(g => g.tools.length > 0),
    [query, cat],
  );

  const shown = groups.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div>
      {/* Header — matches every tool page's header rule */}
      <header
        className="mob-hp"
        style={{
          padding: "24px 44px", borderBottom: "1px solid var(--ink)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}
      >
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tools</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>
          {shown === TOOLS_REGISTRY.length
            ? `${TOOLS_REGISTRY.length} instruments`
            : `${shown} of ${TOOLS_REGISTRY.length} instruments`}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1000, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>The instruments</div>
        <h2
          style={{
            fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic",
            letterSpacing: "-0.015em", margin: "0 0 10px",
          }}
        >
          Every tool, grouped by the decision it serves.
        </h2>
        <p
          style={{
            fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)",
            lineHeight: 1.6, margin: "0 0 28px", maxWidth: "62ch",
          }}
        >
          Open one in full, or split it alongside whatever you already have on screen.
        </p>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Search</div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, purpose, or keyword — e.g. flashcards, pomodoro, citation…"
            aria-label="Search tools"
            style={{
              width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none",
              background: "var(--paper)", padding: "10px 12px", color: "var(--ink)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category filter */}
        <div style={{ marginBottom: 28 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Category</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(["ALL", ...CAT_ORDER] as const).map(c => {
              const active = cat === c;
              const tint = c === "ALL" ? "var(--ink)" : CAT_COLOR[c];
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  aria-pressed={active}
                  style={{
                    fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px",
                    border: `1px solid ${active ? tint : "var(--rule)"}`,
                    background: active ? tint : "var(--paper)",
                    color: active ? "var(--paper)" : "var(--ink)",
                    cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {groups.length === 0 && (
          <div style={{ padding: "28px 0", borderTop: "1px solid var(--rule)" }}>
            <div className="mono" style={{ color: "var(--ink-3)" }}>
              No tool matches “{query}”.
            </div>
          </div>
        )}

        {groups.map(group => (
          <section key={group.cat} style={{ marginBottom: 36 }}>
            <div
              style={{
                display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
                borderBottom: "1px solid var(--ink)", paddingBottom: 7, marginBottom: 2,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6, height: 6, borderRadius: "50%", background: CAT_COLOR[group.cat],
                  display: "inline-block", flexShrink: 0,
                }}
              />
              <span
                className="mono"
                style={{ color: CAT_COLOR[group.cat], letterSpacing: "0.14em" }}
              >
                {group.cat}
              </span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
                {CAT_NOTE[group.cat]}
              </span>
              <span className="mono" style={{ color: "var(--ink-3)", marginLeft: "auto" }}>
                {group.tools.length}
              </span>
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {group.tools.map(t => (
                <li
                  key={t.slug}
                  className="tools-row"
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 10px", borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <Link
                    href={`/tools/${t.slug}`}
                    style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)" }}>
                      {t.title}
                    </div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      {t.subtitle}
                    </div>
                  </Link>
                  <button
                    onClick={() => setSplitSlug(t.slug)}
                    aria-label={`Open ${t.title} in split view`}
                    className="mono"
                    style={{
                      flexShrink: 0, padding: "5px 10px", cursor: "pointer",
                      border: "1px solid var(--rule)", background: "transparent",
                      color: "var(--ink-3)", letterSpacing: "0.06em",
                    }}
                  >
                    Split
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <style jsx>{`
        .tools-row:hover { background: var(--paper-2); }
      `}</style>
    </div>
  );
}
