import type { CSSProperties, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT — Stack, Row, Panel, Rule, Spacer.
//
// Spacing is the second-largest drift vector after type: this codebase has
// 435 inline style objects in a single file, most of them one-off margins.
// Every gap here is one of six documented steps, enforced by a union type, so
// `gap={13}` does not compile.
//
// Stack and Row own ALL spacing between siblings. Children never carry their
// own margins — a margin is a child making a decision about its parent's
// layout, and it is why spacing systems rot.
// ═══════════════════════════════════════════════════════════════════════════

/** The six documented steps. `none` is the absence of space, not a seventh. */
export type Space = "none" | 1 | 2 | 3 | 4 | 5 | 6;

const gapOf = (s: Space): string | undefined => (s === "none" ? undefined : `var(--s-${s})`);

type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between";

const ALIGN: Record<Align, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};
const JUSTIFY: Record<Justify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

type FlexProps = {
  gap?: Space;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  /** Fills available space along the parent's main axis. */
  grow?: boolean;
  children: ReactNode;
};

function flexStyle(dir: "column" | "row", p: FlexProps): CSSProperties {
  return {
    display: "flex",
    flexDirection: dir,
    gap: gapOf(p.gap ?? "none"),
    alignItems: p.align ? ALIGN[p.align] : undefined,
    justifyContent: p.justify ? JUSTIFY[p.justify] : undefined,
    flexWrap: p.wrap ? "wrap" : undefined,
    flex: p.grow ? 1 : undefined,
    minWidth: 0, // flex children overflow without this; a footgun, not a choice
  };
}

/** Vertical rhythm. The default container for anything stacked. */
export function Stack(props: FlexProps) {
  return <div style={flexStyle("column", props)}>{props.children}</div>;
}

/**
 * Horizontal grouping. Defaults to `align="center"`, which is correct for the
 * common case of mixing text with controls of differing heights.
 *
 * Pass `align="baseline"` when a row is figures and their units — a readout
 * next to "of 1,000" should sit on a shared baseline, not a shared centre.
 */
export function Row(props: FlexProps) {
  return (
    <div style={flexStyle("row", { align: "center", ...props })}>{props.children}</div>
  );
}

/** Pushes siblings apart inside a Row or Stack without a one-off margin. */
export function Spacer() {
  return <span style={{ flex: 1 }} aria-hidden="true" />;
}

// ── PANEL ────────────────────────────────────────────────────────────────
// A machined plate. Depth is TONE, never shadow: `raised` is lighter than the
// page, `recessed` is darker. There is no elevation prop that adds a shadow,
// because Console has none (CONSOLE.md §2.4).

export type PanelTone = "flat" | "raised" | "recessed";

const PANEL_BG: Record<PanelTone, string> = {
  flat: "transparent",
  raised: "var(--g-2)",
  recessed: "var(--g-1)",
};

export type PanelProps = {
  tone?: PanelTone;
  pad?: Space;
  /** Draws the hairline edge. Panels that sit on a page usually want it. */
  bordered?: boolean;
  children: ReactNode;
};

export function Panel({ tone = "flat", pad = 4, bordered = false, children }: PanelProps) {
  return (
    <div
      style={{
        background: PANEL_BG[tone],
        padding: gapOf(pad),
        border: bordered ? "1px solid var(--g-4)" : undefined,
        borderRadius: bordered || tone !== "flat" ? "var(--r-panel)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** A hairline. Borders over shadows, always. */
export function Rule() {
  return <hr style={{ border: 0, borderTop: "1px solid var(--g-4)", margin: 0 }} />;
}

/**
 * The reading column. One measure for the whole product so no surface invents
 * its own width — `wide` exists for grids and tables, which are not prose.
 */
export function Measure({
  wide = false,
  pad = 4,
  children,
}: {
  wide?: boolean;
  /** Gutter. The column owns its own padding so no page has to invent one. */
  pad?: Space;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        maxWidth: wide ? 1120 : 620,
        width: "100%",
        marginInline: "auto",
        paddingInline: gapOf(pad),
        paddingBlock: gapOf(pad),
      }}
    >
      {children}
    </div>
  );
}
