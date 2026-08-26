"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Shared primitives for the journey modules.
//
// These exist so the honesty rules of the Constitution are enforced by the
// component, not by each author remembering them:
//
//   • <Figure> refuses to render a number that is unavailable, and shows the
//     reason instead. This is the difference between "0%" and "not measured",
//     which look identical on screen but mean opposite things.
//   • <EmptyState> always says what to do next, so an empty module is a
//     prompt rather than a dead end.
//   • <Basis> keeps the explanation attached to the figure it explains, so a
//     number is never shown without the ability to answer "why?".
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import type { ReactNode } from "react";

export function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <header style={{ marginBottom: 28 }}>
      <h1 style={{
        fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1.15,
        letterSpacing: "-0.01em", color: "var(--ink)", margin: 0,
      }}>{title}</h1>
      <p style={{
        fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-3)",
        margin: "8px 0 0", maxWidth: "62ch",
      }}>{sub}</p>
    </header>
  );
}

export function Panel({
  title, meta, children, action,
}: { title: string; meta?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={{
      border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)",
      background: "var(--paper-2)", padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12,
        marginBottom: 12, flexWrap: "wrap",
      }}>
        <h2 style={{
          fontFamily: "var(--serif)", fontSize: 16, margin: 0, color: "var(--ink)",
        }}>{title}</h2>
        {meta && (
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--ink-3)",
          }}>{meta}</span>
        )}
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** A number, or an honest statement that there is no number.
 *
 *  `available: false` renders the reason rather than a zero. Constitution §3:
 *  a figure that was decoration makes every other figure suspect. */
export function Figure({
  label, value, suffix = "", available, basis, big = false,
}: {
  label: string;
  value?: number | string;
  suffix?: string;
  available: boolean;
  basis?: string;
  big?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4,
      }}>{label}</div>
      {available && value !== undefined ? (
        <div style={{
          fontFamily: "var(--mono)", fontSize: big ? 34 : 22,
          lineHeight: 1.1, color: "var(--ink)",
        }}>{value}<span style={{ fontSize: big ? 18 : 13, color: "var(--ink-3)" }}>{suffix}</span></div>
      ) : (
        <div style={{
          fontFamily: "var(--mono)", fontSize: big ? 26 : 18,
          lineHeight: 1.2, color: "var(--ink-3)",
        }}>—</div>
      )}
      {basis && <Basis>{basis}</Basis>}
    </div>
  );
}

/** The explanation that travels with a figure. */
export function Basis({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: 11.5, lineHeight: 1.5, color: "var(--ink-3)", margin: "5px 0 0",
    }}>{children}</p>
  );
}

/** A bar that renders nothing rather than an empty track when unmeasured. */
export function Meter({ percent, available }: { percent: number; available: boolean }) {
  return (
    <div style={{
      height: 4, background: "var(--rule-2)", borderRadius: 2, overflow: "hidden",
    }}>
      {available && (
        <div style={{
          width: `${Math.max(0, Math.min(100, percent))}%`, height: "100%",
          background: percent >= 80 ? "var(--sage)" : percent >= 40 ? "var(--ochre)" : "var(--cinnabar-ink)",
        }} />
      )}
    </div>
  );
}

/** An empty module must say what to do, never just "nothing here". */
export function EmptyState({
  title, detail, href, cta,
}: { title: string; detail: string; href?: string; cta?: string }) {
  return (
    <div style={{
      border: "1px dashed var(--rule)", borderRadius: "var(--radius-sm)",
      padding: "22px 20px", textAlign: "left",
    }}>
      <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0, fontWeight: 500 }}>{title}</p>
      <p style={{
        fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-3)",
        margin: "6px 0 0", maxWidth: "56ch",
      }}>{detail}</p>
      {href && cta && (
        <Link href={href} style={{
          display: "inline-block", marginTop: 12, fontSize: 12.5,
          fontFamily: "var(--mono)", color: "var(--cinnabar-ink)", textDecoration: "none",
          borderBottom: "1px solid var(--cinnabar-ink)", paddingBottom: 1,
        }}>{cta} →</Link>
      )}
    </div>
  );
}

export function Pill({
  children, tone = "neutral",
}: { children: ReactNode; tone?: "neutral" | "warn" | "critical" | "good" }) {
  const colour =
    tone === "critical" ? "var(--cinnabar-ink)"
    : tone === "warn" ? "var(--ochre)"
    : tone === "good" ? "var(--sage)"
    : "var(--ink-3)";
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.06em",
      textTransform: "uppercase", color: colour,
      border: `1px solid ${colour}`, borderRadius: 3, padding: "2px 6px",
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
