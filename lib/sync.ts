import { supabase } from "./supabase";

// All localStorage keys that should survive across devices
export const SYNC_KEYS = [
  "ledger-profile",
  "ledger-onboarding-done",
  "ledger-focus-streak",
  "ledger-focus-last",
  "ledger-habits-list",
  "ledger-habits-log",
  "ledger-weak-topics",
  "ledger-deadlines",
  "ledger-notes-history",
  "ledger-plan-v1",
  "ledger-papers-log",
  "ledger-mistakes",
  "ledger-syllabus",
  "ledger-syllabus-subjects",
  "ledger-formula-history",
  "ledger-career-answers",
  "ledger-career-output",
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

function readLocalBlob(): Record<string, string> {
  const blob: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) blob[key] = v;
  }
  return blob;
}

// Write all synced localStorage keys to Supabase
export async function pushToCloud(userId: string): Promise<void> {
  const blob = readLocalBlob();
  await supabase.from("user_data").upsert({
    id: userId,
    blob,
    updated_at: new Date().toISOString(),
  });
}

// Read Supabase blob and hydrate localStorage.
// Returns true if any data was written (i.e. cloud had data the device didn't).
export async function pullFromCloud(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_data")
    .select("blob")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.blob || typeof data.blob !== "object") return false;

  let wrote = false;
  for (const [key, value] of Object.entries(data.blob as Record<string, string>)) {
    if ((SYNC_KEYS as readonly string[]).includes(key) && value !== null) {
      // Only write if local is empty or cloud is newer / longer
      const local = localStorage.getItem(key as SyncKey);
      if (!local || value.length > local.length) {
        localStorage.setItem(key, value);
        wrote = true;
      }
    }
  }
  return wrote;
}
