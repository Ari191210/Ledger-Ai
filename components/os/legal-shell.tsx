"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Legal shell.
//
// The four legal documents already carry real, specific content — actual
// vendor names, actual retention periods, actual contact addresses. That text
// is the valuable part and it is not touched here; only the chrome around it
// moves into the academic OS.
//
// Legal pages are where a parent decides whether to trust the product, so
// they are set for reading: a single measure, generous leading, and clear
// section anchors. No motion beyond the page arrival.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import type { ReactNode } from "react";

const DOCS = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms",   label: "Terms" },
  { href: "/legal/data",    label: "Your data" },
  { href: "/legal/ip",      label: "Content & IP" },
] as const;

export function LegalShell({
  title, updated, current, children,
}: {
  title: string;
  updated: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <div data-os>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/" className="os-wordmark">StudyLedger</Link>
          <nav className="os-nav" aria-label="Legal documents">
            {DOCS.map(d => (
              <Link
                key={d.href}
                href={d.href}
                className="os-nav-item"
                data-active={d.href === current}
              >{d.label}</Link>
            ))}
          </nav>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/journey" className="os-btn" data-size="sm">Open StudyLedger</Link>
          </div>
        </div>
      </div>

      <main className="os-shell" id="main-content">
        <div className="os-measure" style={{ paddingTop: 64 }}>
          <p className="os-eyebrow">Legal</p>
          <h1 className="os-title" style={{ fontSize: "clamp(30px, 4.5vw, 42px)" }}>{title}</h1>
          <p className="os-basis" style={{ marginTop: 10, fontFamily: "var(--os-mono)" }}>
            Last updated: {updated}
          </p>

          <div className="os-legal">{children}</div>

          <div className="os-card" style={{ marginTop: 48 }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--os-ink-3)", margin: 0 }}>
              Something here unclear, or you want your data removed?{" "}
              <a className="os-link" href="mailto:hello@studyledger.in">hello@studyledger.in</a>.
              A person reads that inbox.
            </p>
          </div>

          <footer style={{
            borderTop: "1px solid var(--os-line)", marginTop: 40, paddingTop: 24, paddingBottom: 56,
            display: "flex", gap: 18, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 13, color: "var(--os-ink-4)" }}>
              StudyLedger — built by a student, in Delhi.
            </span>
            <div className="os-row" style={{ marginLeft: "auto", gap: 16 }}>
              {DOCS.filter(d => d.href !== current).map(d => (
                <Link key={d.href} href={d.href} className="os-link">{d.label}</Link>
              ))}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* The primitives the documents are written with. Exported so each page keeps
   its existing structure and only its styling changes. */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section id={id} style={{ marginTop: 44 }}>
      <h2 style={{
        fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em",
        color: "var(--os-ink)", margin: "0 0 14px",
      }}>{title}</h2>
      {children}
    </section>
  );
}

export function H3({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <h3 style={{
      fontSize: 15, fontWeight: 600, color: "var(--os-ink-2)", margin: "22px 0 6px",
      ...style,
    }}>{children}</h3>
  );
}

export function P({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize: 15.5, lineHeight: 1.72, color: "var(--os-ink-3)", margin: "0 0 14px",
      ...style,
    }}>{children}</p>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="os-link" style={{ fontSize: "inherit" }}>{children}</a>;
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul style={{
      fontSize: 15.5, lineHeight: 1.85, color: "var(--os-ink-3)",
      paddingLeft: 20, margin: "0 0 14px",
    }}>{children}</ul>
  );
}
