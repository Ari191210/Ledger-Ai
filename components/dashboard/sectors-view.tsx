"use client";

import type { CSSProperties } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// WHY — THE FOUR SECTORS, VIEW (Component 4A, controlled presentational)
//
// Region 3 of the dashboard: the evidence. The four sectors that make up the
// official close — Examination, Coverage, Recovery, Momentum — as a ruled list.
// They are the breakdown OF the index (they sum to Standing), read from the same
// MarketReport, so the dashboard reconciles end to end (single source of truth).
//
// CONTROLLED, STATELESS VIEW. Open state and toggling are owned by the container
// (4B); this view renders rows and emits toggles. No data, no logic, no motion
// (the unfold Reveal is 4C).
//
// Constitutional basis:
//   • Visual v1 §10.2 / Stance I — a ruled list, not cards. Rows are separated
//     by hairlines; structure is alignment, not boxes.
//   • Visual v1 IA III — the filled portion (.ed-bar) is drawn before the
//     remaining: progress before remaining.
//   • Visual v1 §9 — a sector delta is a REALISED movement since the previous
//     close, so advance/retreat colour is honest here (unlike Next Move's
//     projection). Direction is glyph-carried (.ed-up/.ed-down/.ed-flat).
//   • Motion v5 §2.6 — one row open at a time (enforced by the container's
//     single openKey).
//   • Emotional v1 §6 (one question) — each row states one fact; detail is one
//     line, on demand. Never a wall of numbers.
//
// Rows are div[role=button] (not <button>) so they do not pick up the editorial
// bare-button fill; the .dash-sector class (editorial.css) supplies the CSS-only
// hover contrast and focus ring. Renders inside data-ui="editorial".
// ═══════════════════════════════════════════════════════════════════════════

export type SectorRow = {
  /** Stable key, e.g. "examination". */
  key: string;
  label: string;
  /** The close-of-record value for this sector. 0 is a true zero, shown as "0". */
  value: number;
  max: number;
  /** Movement since the previous close, or null when there is no prior close. */
  delta: { delta: number } | null;
  /** One plain-language evidence line, revealed on expand. Null → not expandable. */
  evidence: string | null;
};

export type SectorsViewProps =
  | { state: "loading" }
  | { state: "empty" }
  | { state: "unavailable" }
  | { state: "ready"; rows: SectorRow[]; openKey: string | null; onToggle: (key: string) => void };

const fmt = (n: number) => n.toLocaleString("en-US");

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  borderTop: "1px solid var(--ink)",
};

// Body — DESIGN.md §3 (Inter 15 / lh 1.65).
const nameStyle: CSSProperties = {
  fontFamily: "var(--sans)",
  fontWeight: 600,
  fontSize: 15,
  lineHeight: 1.65,
  color: "inherit",
};

const dataStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  fontFamily: "var(--data)",
  fontVariantNumeric: "tabular-nums",
};

const evidenceStyle: CSSProperties = {
  padding: "2px 0 15px",
  fontFamily: "var(--sans)",
  fontSize: 15,
  lineHeight: 1.65,
  color: "var(--ink-2)",
};

const messageStyle: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 15,
  lineHeight: 1.65,
  color: "var(--ink-2)",
  margin: 0,
};

const loadingRowStyle: CSSProperties = {
  display: "block",
  height: 34,
  borderBottom: "1px solid var(--rule-2)",
};

function rowLabel(r: SectorRow): string {
  const base = `${r.label}, ${fmt(r.value)} of ${r.max}`;
  const d = r.delta;
  const move =
    !d ? "" : d.delta > 0
      ? `, up ${fmt(d.delta)} since previous close`
      : d.delta < 0
        ? `, down ${fmt(Math.abs(d.delta))} since previous close`
        : ", unchanged since previous close";
  return `${base}${move}.`;
}

function Row({
  row,
  open,
  onToggle,
}: {
  row: SectorRow;
  open: boolean;
  onToggle: (key: string) => void;
}) {
  const expandable = row.evidence != null;
  const panelId = `sector-panel-${row.key}`;
  const fill = Math.max(0, Math.min(1, row.max > 0 ? row.value / row.max : 0));

  const deltaClass =
    row.delta == null ? null : row.delta.delta > 0 ? "ed-up" : row.delta.delta < 0 ? "ed-down" : "ed-flat";
  const deltaText =
    row.delta == null ? null : row.delta.delta === 0 ? "unchanged" : fmt(Math.abs(row.delta.delta));

  const inner = (
    <>
      <div
        aria-hidden="true"
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}
      >
        <span style={nameStyle}>{row.label}</span>
        <span style={dataStyle}>
          <span style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>
            {fmt(row.value)}
            <span style={{ color: "var(--ink-2)", fontWeight: 400 }}>/{row.max}</span>
          </span>
          {deltaClass && (
            <span className={deltaClass} style={{ fontSize: 13.5 }}>
              {deltaText}
            </span>
          )}
          {expandable && (
            <span style={{ color: "var(--ink-2)", fontSize: 18, width: 14, textAlign: "center" }}>
              {open ? "–" : "+"}
            </span>
          )}
        </span>
      </div>
      <div className="ed-bar" aria-hidden="true" style={{ marginTop: 9 }}>
        <span style={{ transform: `scaleX(${fill.toFixed(4)})`, width: "100%" }} />
      </div>
    </>
  );

  return (
    <li style={{ borderBottom: "1px solid var(--rule-2)" }}>
      {expandable ? (
        <div
          className="dash-sector"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={rowLabel(row)}
          onClick={() => onToggle(row.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(row.key);
            }
          }}
          style={{ padding: "13px 0" }}
        >
          {inner}
        </div>
      ) : (
        <div aria-label={rowLabel(row)} style={{ padding: "13px 0", color: "var(--ink-2)" }}>
          {inner}
        </div>
      )}
      {expandable && (
        // 4C — the unfold. The panel is always present (so aria-controls always
        // resolves and the size can transition); it reveals via grid-template-rows
        // 0fr→1fr. aria-hidden removes the line from the a11y tree while collapsed.
        <div className="dash-sector-panel" data-open={open ? "true" : "false"}>
          <div className="dash-sector-panel__inner">
            <div id={panelId} aria-hidden={!open} style={evidenceStyle}>
              {row.evidence}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function SectorsView(props: SectorsViewProps) {
  if (props.state === "loading") {
    return (
      <div aria-hidden="true" style={{ borderTop: "1px solid var(--ink)" }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={loadingRowStyle} />
        ))}
      </div>
    );
  }

  if (props.state === "empty") {
    return <p style={messageStyle}>Your sector performance appears at your first close.</p>;
  }

  if (props.state === "unavailable") {
    return (
      <p style={{ ...messageStyle, fontFamily: "var(--data)", fontSize: 13, color: "var(--ink-3)" }}>
        Sector performance is momentarily unavailable.
      </p>
    );
  }

  const { rows, openKey, onToggle } = props;
  return (
    <ul role="list" style={listStyle}>
      {rows.map((row) => (
        <Row key={row.key} row={row} open={openKey === row.key} onToggle={onToggle} />
      ))}
    </ul>
  );
}
