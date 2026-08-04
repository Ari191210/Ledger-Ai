// ═══════════════════════════════════════════════════════════════════════════
// COLOUR — the contrast engine.
//
// This is the module that makes "the student configures character, the engine
// owns correctness" true rather than aspirational. Every semantic colour the
// Workspace Engine emits passes through ensureContrast(), so an illegible
// workspace is unreachable: the student expresses a preference and the engine
// renders it legibly, without ever telling them it adjusted anything.
//
// Warning them would imply they made a mistake. They did not — they stated a
// preference, and honouring it legibly is the engine's job (WORKSPACE.md §3).
//
// Pure functions, no DOM, no React. Unit-testable without a browser, which is
// the point: legibility is proven in CI across all 108 workspaces rather than
// reviewed by eye.
// ═══════════════════════════════════════════════════════════════════════════

export type Hex = string;

/** WCAG AA for body text and meaningful UI text. */
export const AA_TEXT = 4.5;
/** WCAG AA for graphics, borders and large text. */
export const AA_GRAPHIC = 3.0;

// ── conversion ─────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function hexToRgb(hex: Hex): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function rgbToHex(r: number, g: number, b: number): Hex {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** HSL, with L in 0–1. Lightness is the axis the engine adjusts. */
export function hexToHsl(hex: Hex): { h: number; s: number; l: number } {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255, g = g255 / 255, b = b255 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): Hex {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = clamp(s, 0, 1);
  const ll = clamp(l, 0, 1);
  if (ss === 0) {
    const v = ll * 255;
    return rgbToHex(v, v, v);
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbToHex(channel(hh + 1 / 3) * 255, channel(hh) * 255, channel(hh - 1 / 3) * 255);
}

// ── contrast ───────────────────────────────────────────────────────────────

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio. Always >= 1. */
export function contrast(a: Hex, b: Hex): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Adjust `fg` along its lightness axis until it clears `target` against `bg`,
 * preserving hue and saturation so the student's chosen character survives.
 *
 * BOTH directions are searched outward from the original in 1% steps, and the
 * nearer solution wins — so the result is the *closest* legible colour to what
 * was asked for, not an overcorrection to black or white.
 *
 * Searching both directions rather than guessing one is load-bearing. The
 * obvious heuristic — darken on light surfaces, lighten on dark — needs a
 * threshold, and the intuitive `luminance > 0.5` is wrong: relative luminance
 * is not perceptually centred, and the real crossover (where contrast-to-white
 * equals contrast-to-black) sits at ≈0.179. Against a mid grey the wrong guess
 * is unrecoverable — pure red can reach AA by darkening but never by
 * lightening, and the function would fall back to white and destroy the hue.
 * Searching both sides removes the threshold, and with it the bug class.
 *
 * Returns the original when it already passes — the common case, since the
 * shipped materials and hues are chosen to pass unaided.
 */
export function ensureContrast(fg: Hex, bg: Hex, target: number): Hex {
  if (contrast(fg, bg) >= target) return fg;

  const { h, s, l } = hexToHsl(fg);

  for (let step = 1; step <= 100; step++) {
    const darker = hslToHex(h, s, clamp(l - step * 0.01, 0, 1));
    if (contrast(darker, bg) >= target) return darker;
    const lighter = hslToHex(h, s, clamp(l + step * 0.01, 0, 1));
    if (contrast(lighter, bg) >= target) return lighter;
  }

  // Neither direction reaches the target — the surface itself is mid-tone
  // enough that no colour of this hue can. Take the extreme with the most
  // contrast: legibility outranks character, always, and silently
  // (WORKSPACE.md §3, Behaviour wins over Identity).
  return contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff";
}

/** Mix two colours in sRGB. Used for hairlines and hover steps. */
export function mix(a: Hex, b: Hex, amount: number): Hex {
  const t = clamp(amount, 0, 1);
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
