// Presentation helpers for the terminal.
//
// Kept out of the components so the formatting of a figure is testable
// independently of the markup that prints it — and so every surface renders
// the same number the same way.

/** Indian digit grouping: ₹1,00,000 rather than ₹100,000. */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function inr(rupees: number, withPaise = false): string {
  if (!Number.isFinite(rupees)) return "—";
  return (withPaise ? inrPaiseFormatter : inrFormatter).format(rupees);
}

/** A percentage with an explicit sign, e.g. "+0.29%" / "−1.14%". */
export function signedPct(fraction: number, dp = 2): string {
  if (!Number.isFinite(fraction)) return "—";
  const value = fraction * 100;
  // U+2212 MINUS SIGN, not a hyphen: it aligns with tabular figures.
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(dp)}%`;
}

export function pct(fraction: number, dp = 2): string {
  if (!Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(dp)}%`;
}

const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/**
 * Typeset an exponent as real superscript glyphs. A financial page sets
 * 10¹⁰, not "10^10" — the caret is a programmer's notation and reads as a
 * typo in body copy.
 */
export function superscript(n: number): string {
  const sign = n < 0 ? "⁻" : "";
  return (
    sign +
    Math.abs(Math.trunc(n))
      .toString()
      .split("")
      .map((d) => SUPERSCRIPT_DIGITS[Number(d)])
      .join("")
  );
}

/**
 * Figures past the point where digit grouping helps. ₹2.23 quadrillion is not
 * a number a reader parses — the exponent is the honest rendering.
 */
export function magnitude(value: number, dp = 2): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1e7) return inr(value);
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);
  return `₹${mantissa.toFixed(dp)} × 10${superscript(exponent)}`;
}

/**
 * A capital multiple. Small ones take a trailing "×" ("7.8×"); large ones are
 * set in scientific notation and drop it, because "2.2 × 10¹⁰×" makes the
 * same glyph mean both "multiplied by" and "times capital" in one figure.
 */
export function multiple(value: number, dp = 1): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return `${value.toFixed(dp)}×`;
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);
  return `${mantissa.toFixed(dp)} × 10${superscript(exponent)}`;
}

/** The editorial direction class for a signed figure. */
export function direction(fraction: number): "ed-up" | "ed-down" | "ed-flat" {
  if (fraction > 0) return "ed-up";
  if (fraction < 0) return "ed-down";
  return "ed-flat";
}
