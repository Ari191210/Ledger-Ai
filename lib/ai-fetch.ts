import { supabase } from "./supabase";
import { getLocalProfile } from "./user-data";

export async function callAI(body: Record<string, unknown>): Promise<Response> {
  const profile = getLocalProfile();
  const { data: { session } } = await supabase.auth.getSession();
  return fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ ...body, ...profile }),
  });
}
