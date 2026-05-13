const RECENT_KEY = "ledger-recent-tools";
const FAVS_KEY   = "ledger-fav-tools";

export function trackToolVisit(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [slug, ...prev.filter(s => s !== slug)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentTools(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

export function getFavTools(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAVS_KEY) || "[]"); } catch { return []; }
}

export function saveFavTools(slugs: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(FAVS_KEY, JSON.stringify(slugs)); } catch {}
}
