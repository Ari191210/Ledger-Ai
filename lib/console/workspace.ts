import {
  AA_GRAPHIC,
  AA_TEXT,
  ensureContrast,
  hexToHsl,
  hslToHex,
  type Hex,
} from "./color";

// ═══════════════════════════════════════════════════════════════════════════
// THE WORKSPACE ENGINE — WORKSPACE.md v2.
//
//   FOUNDATION   the physics. 4px unit · ramp ratios · 3 durations · 2 curves
//       ↓        immutable, and not represented here because nothing may write it
//   IDENTITY     WorkspaceDNA. Four traits. The only layer a student touches.
//       ↓
//   SEMANTIC     derive(dna). Writable by nobody. Computed, never stored.
//       ↓
//   PRIMITIVES   consume the emitted tokens only.
//
// derive() is the product. It is pure, browser-free, and every colour it emits
// has passed through ensureContrast(), so an illegible workspace cannot be
// expressed — 108 combinations are proven in CI instead of reviewed by eye.
//
// DELIBERATE DEVIATION FROM §2, flagged for ruling: the emitted token NAMES are
// the existing `--g-*` ramp rather than intent names (`--surface-raised`).
// Renaming would require editing all thirteen frozen primitives, which the
// standing constraint forbids, and §9 requires STUDIO to be byte-identical on
// day one. The `--g-*` ramp already IS the semantic layer — each step has
// exactly one documented role. Renaming is cosmetic and can follow later.
// ═══════════════════════════════════════════════════════════════════════════

// ── IDENTITY ───────────────────────────────────────────────────────────────

export type Material = "paper" | "deep" | "warm" | "contrast";
export type Voice = "plex" | "neutral" | "compact";
export type Pressure = "relaxed" | "standard" | "tight";
export type Temperament = "reserved" | "standard" | "expressive";

export type WorkspaceDNA = {
  material: Material;
  voice: Voice;
  pressure: Pressure;
  temperament: Temperament;
};

export const MATERIALS: readonly Material[] = ["paper", "deep", "warm", "contrast"];
export const VOICES: readonly Voice[] = ["plex", "neutral", "compact"];
export const PRESSURES: readonly Pressure[] = ["relaxed", "standard", "tight"];
export const TEMPERAMENTS: readonly Temperament[] = ["reserved", "standard", "expressive"];

/** 4 × 3 × 3 × 3. Every one provably legible. */
export const COMBINATION_COUNT =
  MATERIALS.length * VOICES.length * PRESSURES.length * TEMPERAMENTS.length;

// ── MATERIAL ───────────────────────────────────────────────────────────────
// The neutral ramp, and by derivation the edge radius. Radius is never chosen;
// choosing it would let a student pair an industrial material with soft edges.
//
// Roles are fixed across every material:
//   0 page · 1 recessed · 2 surface · 3 raised · 4 hairline
//   5 disabled · 6 secondary · 7 ink
// Depth is tone in both directions: raised is always lighter than the page,
// recessed always darker. There are no shadows in any material.

type MaterialSpec = {
  ramp: readonly [Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex];
  /** Derived, not chosen. Hardware has tight corners; softer materials relent. */
  radius: { control: number; panel: number };
  /** Dark housing needs `color-scheme: dark` so form controls and scrollbars follow. */
  scheme: "light" | "dark";
};

const MATERIAL_SPEC: Record<Material, MaterialSpec> = {
  // The shipped values, unchanged. STUDIO must be byte-identical (§9).
  paper: {
    ramp: ["#f6f7f8", "#eceef0", "#fbfbfc", "#ffffff", "#c8cdd4", "#a6acb4", "#5a6875", "#0f1d2b"],
    radius: { control: 4, panel: 8 },
    scheme: "light",
  },
  // Dark navy housing. Sharper edges: a deep material implies a machined one.
  deep: {
    ramp: ["#101820", "#0a1119", "#151f29", "#1b2732", "#35434f", "#5d6b78", "#9daab6", "#eef2f5"],
    radius: { control: 2, panel: 4 },
    scheme: "dark",
  },
  // Warm neutral — a warmer grey, NOT parchment. Cream and paper texture are
  // the rejected editorial direction; this shifts hue only, never brightness.
  warm: {
    ramp: ["#f7f6f4", "#efedea", "#fcfbfa", "#ffffff", "#d2cdc6", "#ada7a0", "#6b645c", "#211d19"],
    radius: { control: 6, panel: 12 },
    scheme: "light",
  },
  // Maximum legibility. Surfaces collapse to white and hairlines do all the
  // structural work, which is what CONSOLE.md already asks of them.
  contrast: {
    ramp: ["#ffffff", "#f2f2f2", "#ffffff", "#ffffff", "#5f5f5f", "#767676", "#454545", "#000000"],
    radius: { control: 4, panel: 8 },
    scheme: "light",
  },
};

// ── VOICE ──────────────────────────────────────────────────────────────────
// Curated pairings, never a picker. A free font picker guarantees someone
// pairs a display face with a script face and the product stops being itself.
//
// Every pack carries Devanagari and Tamil in its stack (§5). Without it Hindi
// and Tamil content silently falls back to a system font — for an Indian
// student product that is a broken workspace, not a rough edge.

// Loaded in app/console/layout.tsx with `preload: false`, so a student reading
// only English pays nothing: the browser fetches a face solely when a glyph in
// it is actually required.
const INDIC = `var(--console-deva), var(--console-tamil)`;

type VoiceSpec = { interface: string; instrument: string };

const VOICE_SPEC: Record<Voice, VoiceSpec> = {
  // Current, and the default. Engineered without being cold.
  plex: {
    interface: `var(--console-sans), ${INDIC}, ui-sans-serif, system-ui, sans-serif`,
    instrument: `var(--console-mono), ${INDIC}, ui-monospace, monospace`,
  },
  // Maximum script coverage — the pack for a student whose content is mixed.
  neutral: {
    interface: `"Noto Sans", ${INDIC}, ui-sans-serif, system-ui, sans-serif`,
    instrument: `"Noto Sans Mono", ${INDIC}, ui-monospace, monospace`,
  },
  // More words per line at the same size. Pairs naturally with `tight`.
  compact: {
    interface: `"IBM Plex Sans Condensed", var(--console-sans), ${INDIC}, ui-sans-serif, sans-serif`,
    instrument: `var(--console-mono), ${INDIC}, ui-monospace, monospace`,
  },
};

// ── PRESSURE ───────────────────────────────────────────────────────────────
// Density and tempo are ONE preference (§3). A student who wants more on screen
// also wants it to respond faster. Splitting them asks the same question twice.
//
// Behaviour owns the stops and their floors; Identity only selects among them.
// Every stop is a multiple of the 4px foundation unit — the multiplier is not
// applied arithmetically, because arithmetic drifts off the grid.

type PressureSpec = {
  space: readonly [number, number, number, number, number, number];
  motion: { fast: number; base: number; slow: number };
  /** Vertical control padding. The 44px touch floor is asserted in tests. */
  controlPadY: number;
};

const PRESSURE_SPEC: Record<Pressure, PressureSpec> = {
  relaxed: {
    space: [4, 12, 20, 32, 48, 80],
    motion: { fast: 140, base: 300, slow: 1000 },
    controlPadY: 14,
  },
  // The shipped values, unchanged.
  standard: {
    space: [4, 8, 16, 24, 40, 64],
    motion: { fast: 120, base: 260, slow: 900 },
    controlPadY: 12,
  },
  // NOTE the padding does NOT shrink here, and that is the ruling, not an
  // oversight. Under the worst-case line-height a control at 11px lands at
  // 42px and breaches the 44px touch floor. The floor belongs to Behaviour, so
  // `tight` is floor-bound: its density comes entirely from the spacing scale,
  // and a personality choice is not permitted to shrink a tap target.
  tight: {
    space: [4, 8, 12, 20, 32, 48],
    motion: { fast: 100, base: 220, slow: 780 },
    controlPadY: 12,
  },
};

// ── TEMPERAMENT ────────────────────────────────────────────────────────────
// The only trait that touches colour, and it controls RESTRAINT rather than
// palette. A student cannot pick "purple". They decide how loud earned colour
// becomes once they have earned it — never whether it appears at all.

type TemperamentSpec = { vitalityCeiling: number; saturation: number };

const TEMPERAMENT_SPEC: Record<Temperament, TemperamentSpec> = {
  reserved: { vitalityCeiling: 0.55, saturation: 0.82 },
  standard: { vitalityCeiling: 1, saturation: 1 },
  expressive: { vitalityCeiling: 1, saturation: 1.18 },
};

// ── SEMANTIC HUES ──────────────────────────────────────────────────────────
// Roles are fixed forever. The hue MAPPING is locale-aware (§5) — red as danger
// is not universal — which is safe because direction is always also carried by
// a glyph (▲▼), never by colour alone.

const HUE_BASE = {
  progress: "#2f6b4f",
  info: "#35506b",
  warn: "#8a6a1f",
  error: "#a33a2e",
} as const;

// ── DERIVATION ─────────────────────────────────────────────────────────────

export type SemanticTokens = Record<string, string>;

export type DerivedWorkspace = {
  /** CSS custom properties, written to the single [data-console] element. */
  tokens: SemanticTokens;
  /** TEMPERAMENT's cap on --vitality. Applied by the shell, not by CSS. */
  vitalityCeiling: number;
  scheme: "light" | "dark";
};

function saturate(hex: Hex, factor: number): Hex {
  if (factor === 1) return hex;
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.min(1, s * factor), l);
}

/**
 * The whole engine. Pure: same DNA in, same tokens out, no DOM, no clock.
 *
 * Contrast is guaranteed by construction rather than checked afterwards —
 * every text-bearing colour is passed through ensureContrast() against the
 * surface it actually sits on before it is emitted.
 */
export function derive(dna: WorkspaceDNA): DerivedWorkspace {
  const material = MATERIAL_SPEC[dna.material];
  const voice = VOICE_SPEC[dna.voice];
  const pressure = PRESSURE_SPEC[dna.pressure];
  const temperament = TEMPERAMENT_SPEC[dna.temperament];

  const ramp = material.ramp;
  const page = ramp[0];
  const recessed = ramp[1];

  const tokens: SemanticTokens = {};

  // Neutrals. Ink and secondary text are contrast-guaranteed against the page;
  // hairline and disabled are not, deliberately — WCAG exempts disabled
  // controls, and a hairline that clears AA is a border shouting for attention.
  ramp.forEach((value, i) => {
    tokens[`--g-${i}`] = value;
  });
  tokens["--g-7"] = ensureContrast(ramp[7], page, AA_TEXT);
  tokens["--g-6"] = ensureContrast(ramp[6], page, AA_TEXT);

  // Semantic hues. Saturation moves within TEMPERAMENT's bounds first, then
  // contrast clamps — so restraint is honoured where it can be and overruled
  // where it cannot. Behaviour wins over Identity, always (§3).
  //
  // All four are guaranteed legible as TEXT on the page, which is how Chip and
  // every inline signal use them.
  for (const [role, base] of Object.entries(HUE_BASE)) {
    const tinted = saturate(base, temperament.saturation);
    tokens[`--${role === "progress" ? "progress-full" : role}`] =
      ensureContrast(tinted, page, AA_TEXT);
  }

  // Progress alone gets a second, GRAPHIC-safe variant, because progress alone
  // is painted as a fill — the Track sits on the recessed bed, not on the page,
  // and a hue tuned for text on --g-0 is not guaranteed against --g-1. The
  // other three roles have no fill anywhere in the product, so they get no
  // second variant: an emitted token nothing renders is a claim nothing tests.
  tokens["--progress-graphic"] = ensureContrast(
    saturate(HUE_BASE.progress, temperament.saturation),
    recessed,
    AA_GRAPHIC,
  );

  // Type.
  tokens["--type-interface"] = voice.interface;
  tokens["--type-instrument"] = voice.instrument;

  // Space. Six steps, every one on the 4px foundation grid.
  pressure.space.forEach((px, i) => {
    tokens[`--s-${i + 1}`] = `${px}px`;
  });
  tokens["--control-pad-y"] = `${pressure.controlPadY}px`;

  // Motion. PRESSURE scales duration only — never the curves, never the count.
  tokens["--m-fast"] = `${pressure.motion.fast}ms`;
  tokens["--m-base"] = `${pressure.motion.base}ms`;
  tokens["--m-slow"] = `${pressure.motion.slow}ms`;

  // Geometry. Derived from MATERIAL. The track stays a full round: it is a
  // foundation shape, not a material one.
  tokens["--r-control"] = `${material.radius.control}px`;
  tokens["--r-panel"] = `${material.radius.panel}px`;

  return { tokens, vitalityCeiling: temperament.vitalityCeiling, scheme: material.scheme };
}

// ── PRESETS ────────────────────────────────────────────────────────────────
// Starting points, not skins. Seven, capped forever — every preset added
// widens the surface that must stay coherent, and preset sprawl is how
// identity systems die quietly. Two slots are held in reserve.

export const PRESET_CAP = 7;

export const PRESETS = {
  STUDIO: { material: "paper", voice: "plex", pressure: "standard", temperament: "standard" },
  TERMINAL: { material: "deep", voice: "plex", pressure: "tight", temperament: "reserved" },
  DESK: { material: "warm", voice: "neutral", pressure: "relaxed", temperament: "standard" },
  FIELD: { material: "contrast", voice: "neutral", pressure: "relaxed", temperament: "reserved" },
  PAPER: { material: "paper", voice: "compact", pressure: "relaxed", temperament: "reserved" },
} as const satisfies Record<string, WorkspaceDNA>;

export type PresetName = keyof typeof PRESETS;

/** STUDIO is the shipped product. Day one is byte-identical for all 16 users. */
export const DEFAULT_DNA: WorkspaceDNA = PRESETS.STUDIO;

// ── STORAGE ────────────────────────────────────────────────────────────────
// Four fields of CHOICES, never computed values, so every future improvement
// to derive() upgrades all existing workspaces retroactively and for free.

const STORAGE_KEY = "console:workspace";

const IS_VALID: Record<keyof WorkspaceDNA, readonly string[]> = {
  material: MATERIALS,
  voice: VOICES,
  pressure: PRESSURES,
  temperament: TEMPERAMENTS,
};

/**
 * Coerce untrusted input to a valid DNA, field by field. A workspace loaded
 * from storage or an API is attacker-influenced input at a system boundary:
 * one unknown value must degrade that single trait to its default, not throw
 * and leave the student with no workspace at all.
 *
 * Own properties only. A plain member read walks the prototype chain, so an
 * object carrying a poisoned prototype could supply traits it does not own —
 * harmless for a workspace today, but this is the one function that turns
 * untrusted data into a rendered interface, and boundaries are where that
 * habit has to hold.
 */
export function parseDNA(raw: unknown): WorkspaceDNA {
  const src = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const pick = <K extends keyof WorkspaceDNA>(key: K): WorkspaceDNA[K] =>
    (Object.hasOwn(src, key) && IS_VALID[key].includes(src[key] as string)
      ? src[key]
      : DEFAULT_DNA[key]) as WorkspaceDNA[K];
  return {
    material: pick("material"),
    voice: pick("voice"),
    pressure: pick("pressure"),
    temperament: pick("temperament"),
  };
}

export function readStoredDNA(): WorkspaceDNA {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseDNA(JSON.parse(raw)) : DEFAULT_DNA;
  } catch {
    return DEFAULT_DNA;
  }
}

export function writeStoredDNA(dna: WorkspaceDNA): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseDNA(dna)));
  } catch {
    /* storage unavailable — the workspace stays the default, which is valid */
  }
}
