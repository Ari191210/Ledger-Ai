const STORAGE_KEY = "ledger-saved-outputs";
const MAX_SAVED = 50;

export type SavedOutput = {
  id: string;
  toolSlug: string;
  toolName: string;
  input: string;       // truncated display label
  outputText: string;  // main prose to show when reviewing
  savedAt: string;     // ISO date string
};

export function loadOutputs(): SavedOutput[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveOutput(entry: Omit<SavedOutput, "id" | "savedAt">): SavedOutput {
  const saved: SavedOutput = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  try {
    const existing = loadOutputs();
    const next = [saved, ...existing].slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return saved;
}

export function deleteOutput(id: string): void {
  try {
    const next = loadOutputs().filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}
