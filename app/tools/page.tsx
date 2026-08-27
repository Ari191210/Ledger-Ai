"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TOOLS_REGISTRY, CAT_COLOR, type ToolCategory, type ToolEntry } from "@/lib/tools-registry";
import { useUI } from "@/components/ui-context";

// ═══════════════════════════════════════════════════════════════════════════
// THE TOOLS INDEX
//
// Every instrument in one place, on one route. The top nav carries a single
// "Tools" link here instead of hosting the whole catalogue in a drawer: the
// nav bar is for navigation, not for browsing 55 items.
//
// Flat, ruled, ink-on-paper. No cards, no gradients, no glass.
// ═══════════════════════════════════════════════════════════════════════════

const CAT_ORDER: ToolCategory[] = ["PLAN", "LEARN", "WRITE", "PRACTISE", "FUTURE", "TRACK"];

const CAT_NOTE: Record<ToolCategory, string> = {
  PLAN:     "Decide what today is for.",
  LEARN:    "Turn material into understanding.",
  WRITE:    "Produce work that earns the marks.",
  PRACTISE: "Test yourself before the paper does.",
  FUTURE:   "Where the record is eventually spent.",
  TRACK:    "Keep the record honest.",
};

function matches(t: ToolEntry, q: string) {
  if (!q) return true;
  const hay = [t.title, t.subtitle, t.slug, ...(t.keywords ?? [])].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(term => hay.includes(term));
}

export default function ToolsIndexPage() {
  const { setSplitSlug } = useUI();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ToolCategory | "ALL">("ALL");

  const groups = useMemo(() => {
    return CAT_ORDER
      .filter(c => cat === "ALL" || c === cat)
      .map(c => ({
        cat: c,
        tools: TOOLS_REGISTRY.filter(t => t.cat === c && matches(t, query)),
      }))
      .filter(g => g.tools.length > 0);
  }, [query, cat]);

  const shown = groups.reduce((n, g) => n + g.tools.length, 0);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: "3px solid var(--ink)", paddingBottom: 18, marginBottom: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          The Instruments
        </div>
        <h1 style={{
          fontFamily: "'Melodrama', var(--serif)", fontWeight: 700,
          fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.02,
          letterSpacing: "-0.02em", margin: "8px 0 10px", color: "var(--ink)",
        }}>
          Tools
        </h1>
        <p style={{ margin: 0, maxWidth: "58ch", fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)" }}>
          {TOOLS_REGISTRY.length} instruments, grouped by the decision they serve.
          Open one in full, or split it beside whatever you already have on screen.
        </p>
      </header>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 0,
        borderBottom: "1px solid var(--rule)",
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          style={{
            flex: "1 1 240px", minWidth: 0,
            padding: "12px 14px",
            border: "none", borderRight: "1px solid var(--rule)",
            background: "transparent", color: "var(--ink)",
            fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em",
            outline: "none", borderRadius: 0,
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {(["ALL", ...CAT_ORDER] as const).map(c => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={active}
                style={{
                  padding: "12px 14px", cursor: "pointer",
                  background: active ? "var(--paper-2)" : "transparent",
                  border: "none", borderRight: "1px solid var(--rule)",
                  borderRadius: 0, boxShadow: active ? "inset 0 -2px 0 0 " + (c === "ALL" ? "var(--ink)" : CAT_COLOR[c]) : "none",
                  color: active ? (c === "ALL" ? "var(--ink)" : CAT_COLOR[c]) : "var(--ink-3)",
                  fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        padding: "8px 2px", borderBottom: "1px solid var(--rule)",
        fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--ink-3)",
      }}>
        Showing {shown} of {TOOLS_REGISTRY.length}
      </div>

      {/* ── Groups ─────────────────────────────────────────────────────── */}
      {groups.length === 0 && (
        <p style={{ padding: "40px 0", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
          Nothing matches “{query}”.
        </p>
      )}

      {groups.map(g => (
        <section key={g.cat} style={{ marginTop: 40 }}>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 12,
            borderBottom: "1px solid var(--ink)", paddingBottom: 7,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLOR[g.cat], display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: CAT_COLOR[g.cat] }}>
              {g.cat}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>{CAT_NOTE[g.cat]}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)" }}>
              {g.tools.length}
            </span>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {g.tools.map(t => (
              <li
                key={t.slug}
                className="tools-index-row"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 12px",
                  borderBottom: "1px solid var(--rule)",
                  borderLeft: "3px solid transparent",
                }}
              >
                <Link
                  href={`/tools/${t.slug}`}
                  style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                >
                  <div style={{
                    fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16,
                    color: "var(--ink)", lineHeight: 1.25,
                  }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>
                    {t.subtitle}
                  </div>
                </Link>
                <button
                  onClick={() => setSplitSlug(t.slug)}
                  aria-label={`Split view with ${t.title}`}
                  style={{
                    flexShrink: 0, padding: "6px 12px", cursor: "pointer",
                    border: "1px solid var(--rule)", background: "transparent",
                    color: "var(--ink-3)", borderRadius: 0, boxShadow: "none",
                    fontFamily: "var(--mono)", fontSize: 9,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}
                >
                  Split
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <style jsx>{`
        .tools-index-row:hover {
          background: var(--paper-2);
          border-left-color: var(--ink-3);
        }
      `}</style>
    </main>
  );
}
