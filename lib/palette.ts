export const PALETTE_IDS = [
  "ledger", "paper", "void", "dusk", "amber", "rose", "frost", "forest", "ember",
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
    description: "Warm parchment with dark ink and terracotta accent",
    paper: "#f7f3ec",    paper2: "#ede8e0",
    ink: "#1a1410",      ink2: "#4a3f35",       ink3: "#7a6f65",
    accent: "#c2410c",   accentMid: "#9a3412",
    rule: "rgba(26,20,16,0.14)", rule2: "rgba(26,20,16,0.07)",
    glowA: "rgba(194,65,12,0.14)", glowB: "rgba(154,52,18,0.07)",
    highlight: "rgba(194,65,12,0.10)",
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
