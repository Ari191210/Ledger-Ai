import { supabase } from "./supabase";

export type Exam = {
  name: string;
  subject: string;
  date: string;
  board: string;
};

export type UserData = {
  plan?: {
    subjects: unknown[];
    hoursPerDay: number;
    chronotype: string;
  };
  marks?: {
    subjects: unknown[];
    target: number;
  };
  focus?: {
    streak: number;
    lastDate: string;
  };
  exams?: Exam[];
  weakTopics?: Record<string, number>;
  papersCount?: number;
  emailEnabled?: boolean;
  parentCode?: string;
  parentName?: string;
  referralCode?: string;
  username?: string;
  // Onboarding profile
  onboardingDone?: boolean;
  grade?: string;
  board?: string;
  stream?: string;
  interests?: string[];
  targetExam?: string;
};

export type UserProfile = Pick<UserData, "grade" | "board" | "stream" | "interests" | "targetExam">;

const PROFILE_FIELDS = ["onboardingDone", "grade", "board", "stream", "interests", "targetExam"] as const;

function readLocalProfile(): Partial<UserData> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("ledger-profile");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocalProfile(updates: Partial<UserData>) {
  try {
    if (typeof window === "undefined") return;
    const existing = readLocalProfile();
    const next = { ...existing };
    PROFILE_FIELDS.forEach(k => {
      if (updates[k] !== undefined) (next as Record<string, unknown>)[k] = updates[k];
    });
    localStorage.setItem("ledger-profile", JSON.stringify(next));
  } catch {}
}

// Reads from localStorage so profile persists even if Supabase columns are missing
export function getLocalProfile(): UserProfile {
  const p = readLocalProfile();
  return { grade: p.grade, board: p.board, stream: p.stream, interests: p.interests, targetExam: p.targetExam };
}

export async function loadUserData(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", userId)
    .single();

  // Merge localStorage profile — these fields may not exist as Supabase columns yet
  const localProfile = readLocalProfile();

  if (error || !data) {
    return Object.keys(localProfile).length > 0 ? (localProfile as UserData) : null;
  }

  return { ...(data as UserData), ...localProfile };
}

export async function saveUserData(userId: string, updates: Partial<UserData>) {
  // Always persist profile fields to localStorage so they survive across sessions
  writeLocalProfile(updates);

  await supabase.from("user_data").upsert({
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function patchUserData(userId: string, key: keyof UserData, value: unknown) {
  const existing = await loadUserData(userId);
  await saveUserData(userId, { ...(existing ?? {}), [key]: value });
}
