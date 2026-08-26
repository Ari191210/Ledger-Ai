"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The academic OS component vocabulary.
//
// Every element here carries a class from os.css rather than inline styles, so
// the design system is edited in one file and the components stay readable.
//
// Two of these enforce product rules rather than visual ones:
//
//   <Figure>  will not render a number it does not have. It shows an em-dash
//             and the reason instead, because "0%" and "not measured" look
//             identical on screen and mean opposite things.
//   <Empty>   always states what is missing and links to where it is fixed.
//             An empty module is a prompt, never a dead end.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "good" | "warn" | "risk";

export function PageHead({
  title, sub, eyebrow, action,
}: { title: string; sub?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <header className="os-head">
      {eyebrow && <p className="os-eyebrow">{eyebrow}</p>}
      <div className="os-row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="os-title">{title}</h1>
          {sub && <p className="os-sub">{sub}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Card({
  title, meta, children, action, raised = false,
}: {
  title?: string; meta?: string; children: ReactNode;
  action?: ReactNode; raised?: boolean;
}) {
  return (
    <section className={`os-card${raised ? " os-card-raised" : ""}`}>
      {(title || meta || action) && (
        <div className="os-card-head">
          {title && <h2 className="os-card-title">{title}</h2>}
          {meta && <span className="os-card-meta">{meta}</span>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A number, or an honest statement that there is not one.
 *
 *  `available: false` renders an em-dash and the reason. This is the single
 *  most important rule in the product: a figure that was decoration makes
 *  every other figure suspect. */
export function Figure({
  label, value, unit, available, basis, size = "md",
}: {
  label: string;
  value?: number | string;
  unit?: string;
  available: boolean;
  basis?: string;
  size?: "md" | "lg";
}) {
  const show = available && value !== undefined && value !== null;
  return (
    <div style={{ minWidth: 0 }}>
      <div className="os-figure-label">{label}</div>
      <div className="os-figure-value os-num" data-size={size} data-empty={!show}>
        {show ? value : "—"}
        {show && unit && <span className="os-figure-unit">{unit}</span>}
      </div>
      {basis && <p className="os-basis">{basis}</p>}
    </div>
  );
}

export function Basis({ children }: { children: ReactNode }) {
  return <p className="os-basis">{children}</p>;
}

/** A progress bar that renders a dashed empty track when unmeasured, so a
 *  zero-width fill is never mistaken for a measured zero. */
export function Meter({
  percent, available, tone,
}: { percent: number; available: boolean; tone?: Tone }) {
  const resolved: Tone = tone
    ?? (percent >= 75 ? "good" : percent >= 35 ? "accent" : "warn");
  return (
    <div className="os-meter">
      {available
        ? <div className="os-meter-fill" data-tone={resolved}
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
        : <div className="os-meter-empty" />}
    </div>
  );
}

export function Pill({
  children, tone = "neutral",
}: { children: ReactNode; tone?: Tone }) {
  return <span className="os-pill" data-tone={tone}>{children}</span>;
}

export function Empty({
  title, body, href, cta,
}: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="os-empty">
      <p className="os-empty-title">{title}</p>
      <p className="os-empty-body">{body}</p>
      {href && cta && (
        <Link href={href} className="os-link" style={{ display: "inline-block", marginTop: 12 }}>
          {cta} &rarr;
        </Link>
      )}
    </div>
  );
}

export function Button({
  children, onClick, href, variant = "default", size = "md", disabled, type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls = "os-btn";
  if (href) {
    return (
      <Link href={href} className={cls} data-variant={variant} data-size={size}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} data-variant={variant} data-size={size}
      onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Field({
  label, children,
}: { label?: string; children: ReactNode }) {
  return (
    <label className="os-field">
      {label && <span className="os-field-label">{label}</span>}
      {children}
    </label>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <div className="os-section">{children}</div>;
}
