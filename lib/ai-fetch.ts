import { getLocalProfile } from "./user-data";

export async function callAI(body: Record<string, unknown>): Promise<Response> {
  const profile = getLocalProfile();
  return fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, ...profile }),
  });
}
