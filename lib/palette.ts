// ── Theme system: 15 base surfaces × 15 accent colours = 225 combinations ──
// A "base" defines the neutral surface (paper/ink hierarchy, light or dark).
// An "accent" defines the single expressive colour (buttons, glows, highlights).
// They're independent — any base can pair with any accent — so ink colours in
// each base are deliberately neutral, not tinted toward one fixed accent.

export const BASE_IDS = [
  "obsidian", "void", "graphite", "ink-navy", "deep-forest",
  "espresso", "wine", "violet-night", "slate-storm", "charcoal-warm",
  "paper", "linen", "fog", "porcelain", "bone",
] as const
export type BaseId = (typeof BASE_IDS)[number]

export interface BaseDef {
  name: string
  description: string
  paper: string
  paper2: string
  ink: string
  ink2: string
  ink3: string
  isLight?: boolean
}

export const BASE_META: Record<BaseId, BaseDef> = {
  obsidian:      { name: "Obsidian",     description: "Neutral near-black, warm undertone",   paper: "#0a0a0d", paper2: "#101014", ink: "#f2f1ed", ink2: "#a6a49e", ink3: "#68665f" },
  void:          { name: "Void",         description: "True AMOLED black",                    paper: "#000000", paper2: "#0a0a0a", ink: "#f0f0f0", ink2: "#999999", ink3: "#5c5c5c" },
  graphite:      { name: "Graphite",     description: "Cool dark gray, understated",           paper: "#0d0e11", paper2: "#15171b", ink: "#edeef0", ink2: "#9ba0a8", ink3: "#61666e" },
  "ink-navy":    { name: "Ink Navy",     description: "Deep blue-black",                       paper: "#06080f", paper2: "#0c1019", ink: "#e7ecf6", ink2: "#8d94ab", ink3: "#545b72" },
  "deep-forest": { name: "Deep Forest",  description: "Dark green-black",                      paper: "#070b09", paper2: "#0d130f", ink: "#e6f0ea", ink2: "#8ba796", ink3: "#52685a" },
  espresso:      { name: "Espresso",     description: "Warm brown-black",                      paper: "#0d0906", paper2: "#150f0a", ink: "#f2ebe3", ink2: "#ab9a89", ink3: "#6c5f51" },
  wine:          { name: "Wine",         description: "Dark burgundy-black",                   paper: "#0c0709", paper2: "#140b0e", ink: "#f2e8ea", ink2: "#a68d92", ink3: "#6a555a" },
  "violet-night":{ name: "Violet Night", description: "Dark purple-black",                     paper: "#0a0810", paper2: "#120e1c", ink: "#ece8f5", ink2: "#a29aba", ink3: "#675f80" },
  "slate-storm": { name: "Slate Storm",  description: "Dark blue-gray",                        paper: "#090b0f", paper2: "#0f131a", ink: "#e9ecf1", ink2: "#9aa1ad", ink3: "#5f6672" },
  "charcoal-warm":{ name: "Charcoal",    description: "Warm neutral dark",                     paper: "#0b0a08", paper2: "#14120e", ink: "#f0ede6", ink2: "#a29c8d", ink3: "#666256" },
  paper:         { name: "Paper",        description: "Warm off-white, studio light",          paper: "#faf9f7", paper2: "#f3f1ee", ink: "#1a1917", ink2: "#5c5952", ink3: "#9a968c", isLight: true },
  linen:         { name: "Linen",        description: "Warm cream",                            paper: "#faf7ef", paper2: "#f4efe2", ink: "#201a0f", ink2: "#61543d", ink3: "#a2937a", isLight: true },
  fog:           { name: "Fog",          description: "Cool gray-white",                       paper: "#f7f8fa", paper2: "#eef0f3", ink: "#14171c", ink2: "#4d545e", ink3: "#8b93a0", isLight: true },
  porcelain:     { name: "Porcelain",    description: "Cool blue-white",                       paper: "#f5f8fb", paper2: "#eaf1f7", ink: "#0f1a24", ink2: "#445868", ink3: "#7d95a6", isLight: true },
  bone:          { name: "Bone",         description: "Warm neutral white",                    paper: "#f8f7f4", paper2: "#f0ede7", ink: "#1c1a16", ink2: "#58544a", ink3: "#948e80", isLight: true },
}

export const ACCENT_IDS = [
  "cinnabar", "amber", "saffron", "sage", "emerald",
  "teal", "sky", "indigo", "violet", "plum",
  "rose", "crimson", "copper", "slate", "bronze",
] as const
export type AccentId = (typeof ACCENT_IDS)[number]

export interface AccentDef {
  name: string
  accent: string
  accentMid: string
}

export const ACCENT_META: Record<AccentId, AccentDef> = {
  cinnabar: { name: "Cinnabar", accent: "#ff7c5c", accentMid: "#e8623f" },
  amber:    { name: "Amber",    accent: "#f59e0b", accentMid: "#d97706" },
  saffron:  { name: "Saffron",  accent: "#eab308", accentMid: "#ca8a04" },
  sage:     { name: "Sage",     accent: "#a3e635", accentMid: "#84cc16" },
  emerald:  { name: "Emerald",  accent: "#10b981", accentMid: "#059669" },
  teal:     { name: "Teal",     accent: "#14b8a6", accentMid: "#0d9488" },
  sky:      { name: "Sky",      accent: "#0ea5e9", accentMid: "#0284c7" },
  indigo:   { name: "Indigo",   accent: "#6366f1", accentMid: "#4f46e5" },
  violet:   { name: "Violet",   accent: "#8b5cf6", accentMid: "#7c3aed" },
  plum:     { name: "Plum",     accent: "#d946ef", accentMid: "#a21caf" },
  rose:     { name: "Rose",     accent: "#f43f5e", accentMid: "#e11d48" },
  crimson:  { name: "Crimson",  accent: "#dc2626", accentMid: "#b91c1c" },
  copper:   { name: "Copper",   accent: "#ea580c", accentMid: "#c2410c" },
  slate:    { name: "Slate",    accent: "#64748b", accentMid: "#475569" },
  bronze:   { name: "Bronze",   accent: "#b45309", accentMid: "#92400e" },
}

export const DEFAULT_BASE: BaseId = "obsidian"
export const DEFAULT_ACCENT: AccentId = "cinnabar"

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r},${g},${b},${a})`
}

export interface ResolvedTheme {
  paper: string; paper2: string; ink: string; ink2: string; ink3: string
  accent: string; accentMid: string
  rule: string; rule2: string; glowA: string; glowB: string; highlight: string
  isLight?: boolean
}

// Border/rule stays neutral (derived from the base's own ink3) so it reads
// as structure, not colour. Glow/highlight carry the accent — that's the
// "personality" layer, and it's what actually changes when you swap accents.
export function resolveTheme(base: BaseId, accent: AccentId): ResolvedTheme {
  const b = BASE_META[base]
  const a = ACCENT_META[accent]
  const ink3Rgb = hexToRgb(b.ink3)
  const accentRgb = hexToRgb(a.accent)
  const accentMidRgb = hexToRgb(a.accentMid)
  return {
    paper: b.paper, paper2: b.paper2, ink: b.ink, ink2: b.ink2, ink3: b.ink3,
    accent: a.accent, accentMid: a.accentMid,
    rule: rgba(ink3Rgb, 0.20),
    rule2: rgba(ink3Rgb, 0.08),
    glowA: rgba(accentRgb, 0.20),
    glowB: rgba(accentMidRgb, 0.10),
    highlight: rgba(accentRgb, 0.16),
    isLight: b.isLight,
  }
}

const CSS_VARS: Array<[keyof ResolvedTheme, string]> = [
  ["paper", "--paper"], ["paper2", "--paper-2"],
  ["ink", "--ink"], ["ink2", "--ink-2"], ["ink3", "--ink-3"],
  ["accent", "--cinnabar-ink"], ["accentMid", "--cinnabar"],
  ["rule", "--rule"], ["rule2", "--rule-2"],
  ["glowA", "--page-glow-a"], ["glowB", "--page-glow-b"], ["highlight", "--highlight"],
]

export function applyTheme(base: BaseId, accent: AccentId) {
  const t = resolveTheme(base, accent)
  const root = document.documentElement
  for (const [key, cssVar] of CSS_VARS) root.style.setProperty(cssVar, t[key] as string)
  root.dataset.base = base
  root.dataset.accent = accent
  root.dataset.palette = base // kept for components/CSS still keying off data-palette as a cache/scope key
  if (t.isLight) root.dataset.mode = "light"
  else delete root.dataset.mode
  localStorage.setItem("theme-base", base)
  localStorage.setItem("theme-accent", accent)
  window.dispatchEvent(new CustomEvent("ledger-theme", { detail: { base, accent } }))
}

export function getActiveBase(): BaseId {
  const saved = localStorage.getItem("theme-base") as BaseId | null
  return saved && (BASE_IDS as readonly string[]).includes(saved) ? saved : DEFAULT_BASE
}

export function getActiveAccent(): AccentId {
  const saved = localStorage.getItem("theme-accent") as AccentId | null
  return saved && (ACCENT_IDS as readonly string[]).includes(saved) ? saved : DEFAULT_ACCENT
}

export function initTheme() {
  if (typeof window === "undefined") return
  applyTheme(getActiveBase(), getActiveAccent())
}
