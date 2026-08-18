"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DataSection, DATA_UPDATED,
  IPSection, IP_UPDATED,
  PrivacySection, PRIVACY_UPDATED,
  TermsSection, TERMS_UPDATED,
} from "@/components/legal/sections";

// ═══════════════════════════════════════════════════════════════════════════
// /legal — M16-2, and the destination of `/legal/privacy`'s, `/legal/terms`'s,
// `/legal/data`'s and `/legal/ip`'s redirects.
//
// `PRODUCT_DECISIONS` §2.4: *"**Legal** ← `terms`, `privacy`, `data`, `ip`.
// Four routes, one page."* §3, route 9: *"`/legal` — Legally required."*
//
// ONE WORKSPACE, FOUR MODES (`PRINCIPLES` law 8) — the `?section=` pattern
// `/capture`, `/diagnosis` and `/record` already use, read on mount exactly as
// `/tools/dna → /tools/post-exam?tab=dna` was in M3, so a redirect can land a
// reader on the section their old bookmark named instead of always on
// Privacy.
// ═══════════════════════════════════════════════════════════════════════════

type SectionId = "privacy" | "terms" | "data" | "ip";

const SECTIONS: ReadonlyArray<{ id: SectionId; label: string; updated: string; render: () => React.ReactNode }> = [
  { id: "privacy", label: "Privacy Policy",    updated: PRIVACY_UPDATED, render: () => <PrivacySection /> },
  { id: "terms",   label: "Terms of Use",      updated: TERMS_UPDATED,   render: () => <TermsSection /> },
  { id: "data",    label: "Data & Compliance", updated: DATA_UPDATED,    render: () => <DataSection /> },
  { id: "ip",      label: "IP & Copyright",    updated: IP_UPDATED,      render: () => <IPSection /> },
];

const TITLE: Record<SectionId, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  data: "Data & Compliance",
  ip: "IP & Copyright",
};

export default function LegalPage() {
  const [section, setSection] = useState<SectionId>("privacy");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section");
    if (s === "privacy" || s === "terms" || s === "data" || s === "ip") setSection(s);
  }, []);

  const active = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];

  return (
    <main id="main-content" style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid var(--rule)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink)", textDecoration: "none" }}>LEDGER</Link>
        <Link href="/settings" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none" }}>Settings →</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 40px 96px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 12 }}>Legal</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 8 }}>{TITLE[section]}</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 32 }}>Last updated: {active.updated}</p>

        <div role="tablist" aria-label="Legal sections" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 48, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
          {SECTIONS.map(s => {
            const isAct = s.id === section;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isAct}
                onClick={() => setSection(s.id)}
                style={{
                  fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "8px 14px", border: `1px solid ${isAct ? "var(--ink)" : "var(--rule)"}`,
                  background: isAct ? "var(--ink)" : "transparent", color: isAct ? "var(--paper)" : "var(--ink-3)",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {active.render()}
      </div>
    </main>
  );
}
