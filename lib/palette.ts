export const PALETTE_IDS = [
  "porcelain", "ink", "dusk", "moss", "rose", "storm", "ember", "sand",
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export const PALETTE_META: Record<PaletteId, {
  name: string
  paper: string
  ink: string
  accent: string
  rule: string
}> = {
  porcelain: { name: "Porcelain", paper: "#0e0c08", ink: "#f5f0e6", accent: "#f0a030", rule: "rgba(255,240,180,0.18)" },
  ink:       { name: "Ink",       paper: "#050a10", ink: "#e6f0f8", accent: "#30c0f0", rule: "rgba(100,200,255,0.18)" },
  dusk:      { name: "Dusk",      paper: "#080510", ink: "#ede8f8", accent: "#a060f0", rule: "rgba(180,120,255,0.18)" },
  moss:      { name: "Moss",      paper: "#050e06", ink: "#e6f5e8", accent: "#40d060", rule: "rgba(100,220,120,0.18)" },
  rose:      { name: "Rose",      paper: "#100609", ink: "#f5e8ec", accent: "#e06090", rule: "rgba(255,160,200,0.18)" },
  storm:     { name: "Storm",     paper: "#080a0e", ink: "#e8ecf2", accent: "#7090c0", rule: "rgba(150,180,220,0.18)" },
  ember:     { name: "Ember",     paper: "#0e0800", ink: "#f8f0e0", accent: "#f07020", rule: "rgba(255,180,80,0.18)" },
  sand:      { name: "Sand",      paper: "#0c0a06", ink: "#f0ead8", accent: "#c89040", rule: "rgba(220,200,140,0.18)" },
};

export function applyPalette(p: PaletteId) {
  document.documentElement.dataset.palette = p;
  localStorage.setItem("palette", p);
  window.dispatchEvent(new CustomEvent("ledger-palette", { detail: p }));
}

export function getActivePalette(): PaletteId {
  const saved = localStorage.getItem("palette") as PaletteId | null;
  return saved && (PALETTE_IDS as readonly string[]).includes(saved) ? saved : "porcelain";
}
