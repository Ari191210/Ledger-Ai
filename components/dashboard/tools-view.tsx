"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { TOOLS_REGISTRY, CAT_COLOR, type ToolCategory } from "@/lib/tools-registry";
import { trackToolVisit } from "@/lib/recent-tools";

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — VIEW (Dashboard V2)
//
// All 41 tools as a directory that obeys DESIGN.md rather than inventing a
// style. Every value below comes from the documented system:
//   • Type ramp only — Title-sm (Orbitron 700/28), Body (Inter 15/1.65),
//     Label (Space Mono 600/11, .14em, upper), Label-sm (Space Mono 600/10).
//     No ad-hoc sizes: arbitrary type is the defining tell of template slop.
//   • The No-Drop-Shadow Rule — zero box-shadow. Depth is tonal (--paper →
//     --paper-2), never a shadow.
//   • One accent per SECTION (the category rule), never per row — a colour on
//     every item is the "rainbow dots" tell.
//   • No rounded cards with side accent borders ("Side-Tab Cards" is a named
//     AI-slop antipattern). Rows are separated by hairlines.
// ═══════════════════════════════════════════════════════════════════════════

const CAT_ORDER: ToolCategory[] = ["PLAN", "LEARN", "WRITE", "PRACTISE", "FUTURE", "TRACK"];

// DESIGN.md §3 — the only legal type steps used here.
const LABEL: CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const LABEL_SM: CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
};
const BODY: CSSProperties = { fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.65 };

function ToolRow({ slug, title, subtitle }: { slug: string; title: string; subtitle: string }) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={`/tools/${slug}`}
      onClick={() => trackToolVisit(slug)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        textDecoration: "none",
        padding: "11px 10px 12px",
        borderTop: "1px solid var(--rule-2)",
        // Tonal step on hover — DESIGN.md elevation, no shadow.
        background: hover ? "var(--paper-2)" : "transparent",
        transition: "background 140ms",
      }}
    >
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={{ ...BODY, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
        <span aria-hidden="true" style={{ ...LABEL_SM, color: "var(--ink-3)", opacity: hover ? 1 : 0, transition: "opacity 140ms" }}>
          →
        </span>
      </span>
      <span style={{ ...BODY, display: "block", color: "var(--ink-2)" }}>{subtitle}</span>
    </Link>
  );
}

export default function ToolsView() {
  const groups = CAT_ORDER.map((cat) => ({
    cat,
    tools: TOOLS_REGISTRY.filter((t) => t.cat === cat),
  })).filter((g) => g.tools.length > 0);

  return (
    <div>
      {groups.map(({ cat, tools }) => (
        <section key={cat} style={{ marginBottom: 40 }}>
          {/* The section's single accent: one rule in the category colour. */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingBottom: 8,
              borderBottom: `1px solid ${CAT_COLOR[cat]}`,
            }}
          >
            <h3 style={{ ...LABEL, margin: 0, color: "var(--ink)" }}>{cat}</h3>
            <span style={{ ...LABEL_SM, color: "var(--ink-3)" }}>{tools.length}</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              columnGap: 40,
            }}
          >
            {tools.map((t) => (
              <ToolRow key={t.slug} slug={t.slug} title={t.title} subtitle={t.subtitle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
