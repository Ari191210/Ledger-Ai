export type DashSection = "recommendation" | "recent" | "score" | "exams" | "features";
export type DashLayout  = Record<DashSection, boolean>;

const KEY = "ledger-dash-layout";

export const DASH_DEFAULTS: DashLayout = {
  recommendation: true,
  recent:         true,
  score:          true,
  exams:          true,
  features:       true,
};

export function getDashLayout(): DashLayout {
  if (typeof window === "undefined") return DASH_DEFAULTS;
  try {
    return { ...DASH_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch { return DASH_DEFAULTS; }
}

export function saveDashLayout(prefs: DashLayout) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
