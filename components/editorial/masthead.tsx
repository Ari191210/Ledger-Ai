"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { editionNumber, dateline } from "@/lib/score-market";

// ═══════════════════════════════════════════════════════════════════════════
// The masthead and the edition bar.
//
// Every publication opens the same way: the name, engraved; a rule; then the
// line of metadata that tells you which printing you are holding. That line is
// what makes it feel like an edition rather than a webpage.
// ═══════════════════════════════════════════════════════════════════════════

type Edition = "print" | "evening";

function useEdition(): [Edition, () => void] {
  // Start as null so the server and the first client render agree; the real
  // edition is already on <html data-edition> (set pre-paint in layout.tsx),
  // so there is nothing to flash — we are only syncing React to it.
  const [edition, setEdition] = useState<Edition>("print");

  useEffect(() => {
    const current = (document.documentElement.dataset.edition as Edition) ?? "print";
    setEdition(current);
  }, []);

  const toggle = () => {
    const next: Edition = edition === "print" ? "evening" : "print";
    document.documentElement.dataset.edition = next;
    try { localStorage.setItem("ledger-edition", next); } catch { /* private mode */ }
    setEdition(next);
  };

  return [edition, toggle];
}

/** The nameplate. Used once per page, at the top, and nowhere else. */
export function Masthead({ tagline = "The Daily Intelligence System For Students" }: { tagline?: string }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 28 }}>
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <h1 className="ed-masthead" style={{ margin: 0 }}>StudyLedger</h1>
      </Link>
      <p
        className="ed-dateline"
        style={{ margin: "10px 0 0", letterSpacing: "0.22em" }}
      >
        {tagline}
      </p>
    </div>
  );
}

/**
 * The line under the nameplate: issue number, dateline, edition.
 *
 * The issue number is DERIVED from the date, not stored — so it increments on
 * its own and is identical for every reader, which is exactly how a real paper
 * numbers its editions. It is rendered client-side after mount because the
 * server and the reader can be on different days; printing a server date into
 * static HTML would show a stale edition number to a cached visitor.
 */
export function EditionBar({ specimen = false }: { specimen?: boolean }) {
  const [edition, toggle] = useEdition();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => { setNow(new Date()); }, []);

  return (
    <div
      className="ed-rule-heavy"
      style={{
        marginTop: 18,
        borderBottom: "1px solid var(--rule)",
        padding: "9px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span className="ed-dateline">
        {now ? `No. ${editionNumber(now).toLocaleString()}` : " "}
      </span>

      <span className="ed-dateline" style={{ textAlign: "center", flex: "1 1 auto" }}>
        {now ? dateline(now) : " "}
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {specimen && (
          <span
            className="ed-dateline"
            style={{
              color: "var(--salmon-ink)",
              border: "1px solid var(--salmon-ink)",
              padding: "2px 7px",
              letterSpacing: "0.16em",
            }}
          >
            Specimen
          </span>
        )}
        <button
          onClick={toggle}
          className="ed-dateline"
          aria-label={`Switch to the ${edition === "print" ? "evening" : "print"} edition`}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            cursor: "pointer",
            color: "var(--ink-3)",
            // NOT `font: "inherit"` — the font shorthand resets font-family and
            // would override .ed-dateline's mono, rendering the toggle in body
            // serif. Only the properties that actually need resetting.
            fontSize: "inherit",
            fontWeight: "inherit",
            letterSpacing: "0.11em",
          }}
        >
          {edition === "print" ? "Evening Ed." : "Print Ed."}
        </button>
      </span>
    </div>
  );
}

/**
 * Category navigation — the section strip a paper carries under its masthead.
 * These are the publication's desks, not an app's nav bar.
 */
export function SectionStrip({
  items,
}: {
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <nav
      aria-label="Sections"
      style={{
        borderBottom: "1px solid var(--ink)",
        padding: "10px 0",
        display: "flex",
        gap: 26,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {items.map(i => (
        <Link
          key={i.href}
          href={i.href}
          className="ed-kicker"
          style={{
            textDecoration: "none",
            whiteSpace: "nowrap",
            color: "var(--ink-2)",
            letterSpacing: "0.17em",
          }}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
