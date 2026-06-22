export const PALETTE_IDS = [
  "ledger", "paper", "void", "dusk", "amber", "rose", "frost", "forest", "ember",
  "midnight", "ocean", "sage", "crimson", "gold", "slate", "copper", "plum",
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export interface PaletteDef {
  name: string
  description: string
  paper: string
  paper2: string
  ink: string
  ink2: string
  ink3: string
  accent: string
  accentMid: string
  rule: string
  rule2: string
  glowA: string
  glowB: string
  highlight: string
}

export const PALETTE_META: Record<PaletteId, PaletteDef> = {
  ledger: {
    name: "Ledger",
    description: "Dark charcoal with warm peach and cream",
    paper: "#08090c",    paper2: "#0f1016",
    ink: "#f1ffc4",      ink2: "#dab894",       ink3: "#a7bed3",
    accent: "#ffcaaf",   accentMid: "#e89a80",
    rule: "rgba(167,190,211,0.20)", rule2: "rgba(167,190,211,0.08)",
    glowA: "rgba(255,202,175,0.20)", glowB: "rgba(167,190,211,0.12)",
    highlight: "rgba(255,202,175,0.16)",
  },
  paper: {
    name: "Paper",
    description: "Warm white with violet accent — clean studio light",
    paper: "#fafaf9",    paper2: "#f5f5f4",
    ink: "#1c1917",      ink2: "#57534e",       ink3: "#a8a29e",
    accent: "#7c3aed",   accentMid: "#6d28d9",
    rule: "rgba(28,25,23,0.09)", rule2: "rgba(28,25,23,0.05)",
    glowA: "rgba(124,58,237,0.12)", glowB: "rgba(109,40,217,0.06)",
    highlight: "rgba(124,58,237,0.09)",
  },
  void: {
    name: "Void",
    description: "AMOLED true black with electric violet",
    paper: "#000000",    paper2: "#0a0a0a",
    ink: "#f0f0f8",      ink2: "#9090b0",       ink3: "#505070",
    accent: "#a78bfa",   accentMid: "#7c3aed",
    rule: "rgba(167,150,255,0.18)", rule2: "rgba(167,150,255,0.07)",
    glowA: "rgba(167,139,250,0.22)", glowB: "rgba(124,58,237,0.10)",
    highlight: "rgba(167,139,250,0.18)",
  },
  dusk: {
    name: "Dusk",
    description: "Deep navy with soft indigo",
    paper: "#06070f",    paper2: "#090b18",
    ink: "#e8ecf8",      ink2: "#8890b8",       ink3: "#606888",
    accent: "#818cf8",   accentMid: "#6366f1",
    rule: "rgba(130,140,248,0.20)", rule2: "rgba(130,140,248,0.08)",
    glowA: "rgba(129,140,248,0.20)", glowB: "rgba(99,102,241,0.10)",
    highlight: "rgba(129,140,248,0.18)",
  },
  amber: {
    name: "Amber",
    description: "Warm dark with golden amber",
    paper: "#0e0a02",    paper2: "#120d03",
    ink: "#fff8e6",      ink2: "#c8a060",       ink3: "#886840",
    accent: "#fbbf24",   accentMid: "#d97706",
    rule: "rgba(251,191,36,0.20)", rule2: "rgba(251,191,36,0.08)",
    glowA: "rgba(251,191,36,0.20)", glowB: "rgba(217,119,6,0.10)",
    highlight: "rgba(251,191,36,0.16)",
  },
  rose: {
    name: "Rose",
    description: "Deep dark with rose pink",
    paper: "#100608",    paper2: "#18090c",
    ink: "#f8eef2",      ink2: "#c08898",       ink3: "#806070",
    accent: "#fb7185",   accentMid: "#e11d48",
    rule: "rgba(251,113,133,0.20)", rule2: "rgba(251,113,133,0.08)",
    glowA: "rgba(251,113,133,0.20)", glowB: "rgba(225,29,72,0.10)",
    highlight: "rgba(251,113,133,0.18)",
  },
  frost: {
    name: "Frost",
    description: "Arctic dark with sky blue",
    paper: "#040a14",    paper2: "#070e1e",
    ink: "#eef5ff",      ink2: "#90b8d8",       ink3: "#6090b0",
    accent: "#38bdf8",   accentMid: "#0284c7",
    rule: "rgba(56,189,248,0.20)", rule2: "rgba(56,189,248,0.08)",
    glowA: "rgba(56,189,248,0.20)", glowB: "rgba(2,132,199,0.10)",
    highlight: "rgba(56,189,248,0.18)",
  },
  forest: {
    name: "Forest",
    description: "Forest dark with mint green",
    paper: "#040e06",    paper2: "#071208",
    ink: "#e8f5ea",      ink2: "#80c888",       ink3: "#507058",
    accent: "#4ade80",   accentMid: "#16a34a",
    rule: "rgba(74,222,128,0.18)", rule2: "rgba(74,222,128,0.07)",
    glowA: "rgba(74,222,128,0.18)", glowB: "rgba(22,163,74,0.10)",
    highlight: "rgba(74,222,128,0.15)",
  },
  ember: {
    name: "Ember",
    description: "Deep dark with burnt orange",
    paper: "#120400",    paper2: "#1a0600",
    ink: "#fff0e8",      ink2: "#d08060",       ink3: "#906040",
    accent: "#f97316",   accentMid: "#c2410c",
    rule: "rgba(249,115,22,0.20)", rule2: "rgba(249,115,22,0.08)",
    glowA: "rgba(249,115,22,0.20)", glowB: "rgba(194,65,12,0.10)",
    highlight: "rgba(249,115,22,0.16)",
  },
  midnight: {
    name: "Midnight",
    description: "Deep black with electric violet",
    paper: "#040408",    paper2: "#0c0c14",
    ink: "#e8e0ff",      ink2: "#b8b0d8",       ink3: "#787098",
    accent: "#8b5cf6",   accentMid: "#7c3aed",
    rule: "rgba(232,224,255,0.18)", rule2: "rgba(232,224,255,0.07)",
    glowA: "rgba(139,92,246,0.22)", glowB: "rgba(124,58,237,0.10)",
    highlight: "rgba(139,92,246,0.16)",
  },
  ocean: {
    name: "Ocean",
    description: "Abyssal dark with ice blue",
    paper: "#020d18",    paper2: "#061422",
    ink: "#bae6fd",      ink2: "#7cbad0",       ink3: "#4a88a0",
    accent: "#0ea5e9",   accentMid: "#0284c7",
    rule: "rgba(186,230,253,0.18)", rule2: "rgba(186,230,253,0.07)",
    glowA: "rgba(14,165,233,0.22)", glowB: "rgba(2,132,199,0.10)",
    highlight: "rgba(14,165,233,0.16)",
  },
  sage: {
    name: "Sage",
    description: "Forest dark with emerald",
    paper: "#040a06",    paper2: "#081410",
    ink: "#d1fae5",      ink2: "#90d4b0",       ink3: "#508870",
    accent: "#10b981",   accentMid: "#059669",
    rule: "rgba(209,250,229,0.18)", rule2: "rgba(209,250,229,0.07)",
    glowA: "rgba(16,185,129,0.20)", glowB: "rgba(5,150,105,0.10)",
    highlight: "rgba(16,185,129,0.15)",
  },
  crimson: {
    name: "Crimson",
    description: "Dark with deep crimson red",
    paper: "#0f0406",    paper2: "#180609",
    ink: "#ffe4e6",      ink2: "#d0b0b8",       ink3: "#907080",
    accent: "#e11d48",   accentMid: "#be123c",
    rule: "rgba(255,228,230,0.18)", rule2: "rgba(255,228,230,0.07)",
    glowA: "rgba(225,29,72,0.22)", glowB: "rgba(190,18,60,0.10)",
    highlight: "rgba(225,29,72,0.16)",
  },
  gold: {
    name: "Gold",
    description: "Rich dark with antique gold",
    paper: "#0a0800",    paper2: "#140e00",
    ink: "#fef3c7",      ink2: "#d4c090",       ink3: "#948050",
    accent: "#f59e0b",   accentMid: "#d97706",
    rule: "rgba(254,243,199,0.18)", rule2: "rgba(254,243,199,0.07)",
    glowA: "rgba(245,158,11,0.22)", glowB: "rgba(217,119,6,0.10)",
    highlight: "rgba(245,158,11,0.16)",
  },
  slate: {
    name: "Slate",
    description: "Near-black with cool slate",
    paper: "#020408",    paper2: "#080c14",
    ink: "#e2e8f0",      ink2: "#a0b0c0",       ink3: "#607080",
    accent: "#64748b",   accentMid: "#475569",
    rule: "rgba(226,232,240,0.18)", rule2: "rgba(226,232,240,0.07)",
    glowA: "rgba(100,116,139,0.22)", glowB: "rgba(71,85,105,0.10)",
    highlight: "rgba(100,116,139,0.16)",
  },
  copper: {
    name: "Copper",
    description: "Dark with burnished copper",
    paper: "#0c0600",    paper2: "#160a00",
    ink: "#fed7aa",      ink2: "#d0a070",       ink3: "#906040",
    accent: "#ea580c",   accentMid: "#c2410c",
    rule: "rgba(254,215,170,0.18)", rule2: "rgba(254,215,170,0.07)",
    glowA: "rgba(234,88,12,0.22)", glowB: "rgba(194,65,12,0.10)",
    highlight: "rgba(234,88,12,0.16)",
  },
  plum: {
    name: "Plum",
    description: "Dark with vivid fuchsia",
    paper: "#0a0208",    paper2: "#12040f",
    ink: "#f0abfc",      ink2: "#c080d8",       ink3: "#805098",
    accent: "#d946ef",   accentMid: "#a21caf",
    rule: "rgba(240,171,252,0.18)", rule2: "rgba(240,171,252,0.07)",
    glowA: "rgba(217,70,239,0.22)", glowB: "rgba(162,28,175,0.10)",
    highlight: "rgba(217,70,239,0.16)",
  },
}

const CSS_VARS: Array<[keyof PaletteDef, string]> = [
  ["paper",     "--paper"],
  ["paper2",    "--paper-2"],
  ["ink",       "--ink"],
  ["ink2",      "--ink-2"],
  ["ink3",      "--ink-3"],
  ["accent",    "--cinnabar-ink"],
  ["accentMid", "--cinnabar"],
  ["rule",      "--rule"],
  ["rule2",     "--rule-2"],
  ["glowA",     "--page-glow-a"],
  ["glowB",     "--page-glow-b"],
  ["highlight", "--highlight"],
]

export function applyPalette(p: PaletteId) {
  const def = PALETTE_META[p]
  const root = document.documentElement
  for (const [key, cssVar] of CSS_VARS) {
    root.style.setProperty(cssVar, def[key] as string)
  }
  root.dataset.palette = p
  localStorage.setItem("palette", p)
  window.dispatchEvent(new CustomEvent("ledger-palette", { detail: p }))
}

export function getActivePalette(): PaletteId {
  const saved = localStorage.getItem("palette") as PaletteId | null
  return saved && (PALETTE_IDS as readonly string[]).includes(saved) ? saved : "ledger"
}

export function initPalette() {
  if (typeof window === "undefined") return
  applyPalette(getActivePalette())
}
