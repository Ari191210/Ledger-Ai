import { supabase } from "./supabase";

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
};

export async function loadUserData(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as UserData;
}

export async function saveUserData(userId: string, updates: Partial<UserData>) {
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
