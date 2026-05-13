export type Density = "compact" | "default" | "comfortable";
const KEY = "ledger-density";

export function getDensity(): Density {
  if (typeof window === "undefined") return "default";
  return (localStorage.getItem(KEY) as Density) ?? "default";
}

export function applyDensity(d: Density) {
  if (d === "default") {
    delete document.documentElement.dataset.density;
  } else {
    document.documentElement.dataset.density = d;
  }
  localStorage.setItem(KEY, d);
  window.dispatchEvent(new CustomEvent("ledger-density", { detail: d }));
}
