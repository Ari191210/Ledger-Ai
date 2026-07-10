import { supabase } from "./supabase";

export type Exam = {
  name: string;
  subject: string;
  date: string;
  board: string;
};

export type AiProfile = {
  learningStyle?: "examples-first" | "theory-first" | "bullet-points" | "step-by-step";
  communicationStyle?: "simple" | "conversational" | "detailed" | "direct";
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
  // AI personalization profile
  aiProfile?: AiProfile;
};

export type UserProfile = Pick<UserData, "grade" | "board" | "stream" | "interests" | "targetExam" | "aiProfile">;

const PROFILE_FIELDS = ["onboardingDone", "grade", "board", "stream", "interests", "targetExam", "aiProfile"] as const;

function readLocalProfile(): Partial<UserData> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("ledger-profile");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function writeLocalProfile(updates: Partial<UserData>) {
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
  return { grade: p.grade, board: p.board, stream: p.stream, interests: p.interests, targetExam: p.targetExam, aiProfile: p.aiProfile };
}

// Dedup concurrent loadUserData calls for the same user. The dashboard mounts
// several independent components (main page, ExamSchedule, SharePanel) that
// each called this on mount, firing 3 identical Supabase queries per load.
// Short TTL — this is a same-render-cycle dedup, not a data cache; writes
// invalidate it immediately below so no caller ever sees stale data.
const inflightLoads = new Map<string, { promise: Promise<UserData | null>; ts: number }>();
const LOAD_DEDUP_MS = 3000;

export async function loadUserData(userId: string): Promise<UserData | null> {
  const cached = inflightLoads.get(userId);
  if (cached && Date.now() - cached.ts < LOAD_DEDUP_MS) {
    return cached.promise;
  }
  const promise = fetchUserData(userId);
  inflightLoads.set(userId, { promise, ts: Date.now() });
  return promise;
}

async function fetchUserData(userId: string): Promise<UserData | null> {
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

  // Cache profile from Supabase to localStorage so getLocalProfile() works on new devices
  if (!localProfile.grade && (data as UserData).grade) {
    writeLocalProfile(data as UserData);
  }

  return { ...(data as UserData), ...localProfile };
}

export async function saveUserData(userId: string, updates: Partial<UserData>): Promise<{ error: string | null }> {
  // Always persist profile fields to localStorage so they survive across sessions
  writeLocalProfile(updates);

  const { error } = await supabase.from("user_data").upsert({
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  });
  if (!error) inflightLoads.delete(userId);
  return { error: error?.message ?? null };
}

export async function patchUserData(userId: string, key: keyof UserData, value: unknown): Promise<{ error: string | null }> {
  const existing = await loadUserData(userId);
  return saveUserData(userId, { ...(existing ?? {}), [key]: value });
}
