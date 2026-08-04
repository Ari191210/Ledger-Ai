import type { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TEXT — the type ramp, enforced by the compiler.
//
// This is the single highest-leverage primitive in Console. The anti-pattern
// detector found that EVERY font-size in this codebase was invented on the
// spot — 13.5, 16.5, 17, 19, 22, 25, 26, 38 — and that, more than any colour
// choice, is what made the product read as template slop.
//
// The fix is not a lint rule or a code review. It is a type: `step` accepts
// only the six documented ramp values, so `<Text step={17}>` does not compile.
// Good design is the path of least resistance when the wrong path is closed.
//
// There is deliberately NO `style` prop. If a caller needs a size, weight or
// colour the ramp cannot express, the primitive is wrong and should be
// strengthened — patching the call site is how design systems die
// (CONSOLE.md §6).
// ═══════════════════════════════════════════════════════════════════════════

/** The six documented steps. There is no seventh. */
export type TypeStep = "display" | "figure" | "title" | "body" | "label" | "micro";

/** Semantic colour roles. Never a hex, never a raw token. */
export type TextTone =
  | "ink"        // primary — the default
  | "secondary"  // supporting copy, units
  | "ghost"      // disabled, de-emphasised
  | "progress"   // realised advancement (earned via --vitality)
  | "info"
  | "warn"
  | "error";

const TONE: Record<TextTone, string> = {
  ink: "var(--g-7)",
  secondary: "var(--g-6)",
  ghost: "var(--g-5)",
  progress: "var(--progress)",
  info: "var(--info)",
  warn: "var(--warn)",
  error: "var(--error)",
};

/** Weights the interface voice is permitted to use. */
export type TextWeight = 400 | 500 | 600;

type El = "span" | "p" | "div" | "h1" | "h2" | "h3" | "label";

export type TextProps = {
  step?: TypeStep;
  tone?: TextTone;
  weight?: TextWeight;
  as?: El;
  /** Renders in the instrument voice (mono) with tabular figures. */
  numeric?: boolean;
  align?: "start" | "end";
  children: ReactNode;
  id?: string;
  htmlFor?: string;
};

/**
 * `label` and `micro` are the instrument voice by definition — they are the
 * machine speaking — so they carry the mono treatment automatically rather
 * than relying on every call site to remember a class.
 */
export default function Text({
  step = "body",
  tone = "ink",
  weight,
  as,
  numeric = false,
  align,
  children,
  id,
  htmlFor,
}: TextProps) {
  const instrument = step === "label" || step === "micro" || numeric;
  const Tag = (as ?? (step === "title" ? "h2" : "span")) as El;

  const className = [
    instrument ? "c-readout" : undefined,
    step === "label" ? "c-label" : undefined,
    step === "micro" ? "c-micro" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  // label/micro own their size, colour and tracking through their class, so
  // re-declaring them here would be two sources of truth for one decision.
  const sized = step !== "label" && step !== "micro";

  return (
    <Tag
      id={id}
      {...(Tag === "label" && htmlFor ? { htmlFor } : {})}
      className={className || undefined}
      style={{
        ...(sized ? { fontSize: `var(--t-${step})` } : null),
        ...(sized || tone !== "secondary" ? { color: TONE[tone] } : null),
        ...(weight ? { fontWeight: weight } : null),
        ...(align === "end" ? { textAlign: "right" as const } : null),
        ...(step === "display" ? { lineHeight: 1, display: "block" } : null),
        ...(step === "title" ? { lineHeight: 1.25, letterSpacing: "-0.01em", margin: 0 } : null),
        ...(as === "p" ? { margin: 0 } : null),
      }}
    >
      {children}
    </Tag>
  );
}
