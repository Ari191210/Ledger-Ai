import { AA_GRAPHIC, AA_TEXT, ensureContrast, hexToHsl, hslToHex, } from "./color.js";
export const MATERIALS = ["swan", "swan-night", "paper", "deep", "warm", "contrast"];
export const VOICES = ["plex", "neutral", "compact"];
export const PRESSURES = ["relaxed", "standard", "tight"];
export const TEMPERAMENTS = ["reserved", "standard", "expressive"];
/** 4 × 3 × 3 × 3. Every one provably legible. */
export const COMBINATION_COUNT = MATERIALS.length * VOICES.length * PRESSURES.length * TEMPERAMENTS.length;
const MATERIAL_SPEC = {
    // SWAN — the shipped material since 2026-08-30. A warm off-white housing with
    // a near-black warm ink. The bird, not the colour of paper: white body, dark
    // bill, and nothing else competing.
    //
    // Chosen over `paper` because paper's ramp is a COOL grey (#f6f7f8 sits on a
    // blue hue) and read on a real screen as unfinished rather than restrained —
    // founder verdict on the shipped landing page, live: "it looks html... there
    // are no vibrant colours." The fix is not more colour; §6.2 and the
    // strip-all-colour test still hold. The fix is a ground with a temperature,
    // so that neutral reads as CHOSEN.
    //
    // Warm without being cream: hue sits near 40deg at very low saturation, so it
    // never reaches parchment, which is the rejected editorial direction and the
    // 2026 AI default both.
    swan: {
        ramp: ["#fbfaf8", "#f1efeb", "#fdfdfb", "#ffffff", "#e2ded7", "#b0aaa2", "#6a645d", "#17150f"],
        radius: { control: 4, panel: 8 },
        scheme: "light",
    },
    // SWAN AT NIGHT — the dark counterpart, selected by the toggle rather than by
    // a separate stylesheet. Deep warm charcoal, not navy and not true black:
    // the same hue family as `swan` with the ramp inverted, so a student who
    // switches at midnight is in the same product, unlit.
    "swan-night": {
        ramp: ["#14130f", "#0e0d0b", "#1b1a16", "#23211c", "#3a3730", "#625d55", "#a8a29a", "#f5f3ef"],
        radius: { control: 4, panel: 8 },
        scheme: "dark",
    },
    // The previous default. Retained, not deleted: it is a legitimate material
    // and some students will prefer the cool cast.
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
const VOICE_SPEC = {
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
const PRESSURE_SPEC = {
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
const TEMPERAMENT_SPEC = {
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
    // PRODUCT_PRINCIPLES §6.2, amended 2026-08-21: one bounded brand accent,
    // additive to the semantic hues above. Emphasis only — never state. A
    // consumer that reads --accent as progress/warning/error is a violation,
    // not a variation; nothing here enforces that, so it must hold by review.
    //
    // Retuned 2026-08-30 with SWAN. Was #d9622b, a bright construction orange
    // that sat outside the ground's hue family and read as a highlighter on a
    // warm page. This is the same gesture at a lower pitch: deeper, redder,
    // closer to a wax seal or a red pencil than to a safety cone. It still
    // clears AA against the swan ground through ensureContrast() below.
    accent: "#a8442a",
};
function saturate(hex, factor) {
    if (factor === 1)
        return hex;
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
export function derive(dna) {
    const material = MATERIAL_SPEC[dna.material];
    const voice = VOICE_SPEC[dna.voice];
    const pressure = PRESSURE_SPEC[dna.pressure];
    const temperament = TEMPERAMENT_SPEC[dna.temperament];
    const ramp = material.ramp;
    const page = ramp[0];
    const recessed = ramp[1];
    const tokens = {};
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
    tokens["--progress-graphic"] = ensureContrast(saturate(HUE_BASE.progress, temperament.saturation), recessed, AA_GRAPHIC);
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
    STUDIO: { material: "swan", voice: "plex", pressure: "standard", temperament: "standard" },
    NIGHT: { material: "swan-night", voice: "plex", pressure: "standard", temperament: "standard" },
    TERMINAL: { material: "deep", voice: "plex", pressure: "tight", temperament: "reserved" },
    DESK: { material: "warm", voice: "neutral", pressure: "relaxed", temperament: "standard" },
    FIELD: { material: "contrast", voice: "neutral", pressure: "relaxed", temperament: "reserved" },
    PAPER: { material: "paper", voice: "compact", pressure: "relaxed", temperament: "reserved" },
};
/**
 * STUDIO is the shipped product, and since 2026-08-30 it is SWAN.
 *
 * Light is the default and stays the default: a student opens this in a lit
 * room far more often than in a dark one, and the dark material is a choice
 * they make rather than one the operating system makes for them. NIGHT is the
 * same DNA on the `swan-night` ramp, which is what the dark-mode toggle
 * selects — not a second stylesheet, not a `.dark` class, just the other
 * material through the same derivation.
 */
export const DEFAULT_DNA = PRESETS.STUDIO;
/** The two halves of the light/dark toggle. Everything else is a preset. */
export const LIGHT_MATERIAL = "swan";
export const DARK_MATERIAL = "swan-night";
// ── STORAGE ────────────────────────────────────────────────────────────────
// Four fields of CHOICES, never computed values, so every future improvement
// to derive() upgrades all existing workspaces retroactively and for free.
//
// M24 — GENERALISATION. The engine was `/console`-only; this key is read by
// `VitalityShell` on every shell now (`/home`, `/settings`, `/capture`,
// `/diagnosis`, `/record`, `/console` — architecture S.6). The key itself is
// renamed off the `console:` prefix for the same reason `SYNC_KEYS` uses
// `ledger-*` for every other device-preference key (`lib/sync.ts`) — a
// workspace choice is no longer a Console-scoped fact. `LEGACY_STORAGE_KEY`
// is the one-time read-through so a student who already chose a non-default
// workspace under the old key does not silently lose it (Law 7 — never a
// silent change in behaviour).
const STORAGE_KEY = "ledger-workspace";
/** Pre-M24 key. Read-only, one-time migration path. Never written again. */
const LEGACY_STORAGE_KEY = "console:workspace";
/**
 * Fired on `window` after a successful `writeStoredDNA`, so every mounted
 * `VitalityShell` — not just the one the student changed their workspace in —
 * re-reads and re-derives immediately. This is what makes "customisation
 * applies outside /console" a live fact rather than something only true after
 * a reload: the shell is shared (S.6), so one dispatch reaches all of them.
 */
export const WORKSPACE_CHANGE_EVENT = "ledger-workspace-changed";
const IS_VALID = {
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
export function parseDNA(raw) {
    const src = (typeof raw === "object" && raw !== null ? raw : {});
    const pick = (key) => (Object.hasOwn(src, key) && IS_VALID[key].includes(src[key])
        ? src[key]
        : DEFAULT_DNA[key]);
    return {
        material: pick("material"),
        voice: pick("voice"),
        pressure: pick("pressure"),
        temperament: pick("temperament"),
    };
}
export function readStoredDNA() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        return raw ? parseDNA(JSON.parse(raw)) : DEFAULT_DNA;
    }
    catch {
        return DEFAULT_DNA;
    }
}
/**
 * Writes the CHOICE only — the four DNA fields, never a derived token. Also
 * dispatches `WORKSPACE_CHANGE_EVENT` so every mounted shell (not only the
 * one the student is on) re-derives immediately; see the constant's doc.
 */
export function writeStoredDNA(dna) {
    try {
        const valid = parseDNA(dna);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: valid }));
        }
    }
    catch {
        /* storage unavailable — the workspace stays the default, which is valid */
    }
}
