import { supabase } from "./supabase";
import { getLocalProfile } from "./user-data";

// ── Typed AI error ────────────────────────────────────────────────────────────
export class AIError extends Error {
  code: "network" | "rate_limit" | "server" | "moderation" | "unknown";
  constructor(
    message: string,
    code: AIError["code"] = "unknown",
  ) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}

// ── Raw fetch — returns Response, caller handles status ───────────────────────
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

// ── Typed helper — throws AIError on any failure ──────────────────────────────
export async function callAIOrThrow<T = unknown>(
  body: Record<string, unknown>,
): Promise<T> {
  let res: Response;
  try {
    res = await callAI(body);
  } catch {
    throw new AIError(
      "Network error — check your connection and try again.",
      "network",
    );
  }

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    if (res.status === 429) {
      throw new AIError(
        (data.error as string) || "You've reached your daily AI limit. It resets at midnight.",
        "rate_limit",
      );
    }
    if (res.status === 400 && typeof data.error === "string" && data.error.includes("off_topic")) {
      throw new AIError(
        "This topic isn't something Ledger can help with. Please keep questions related to your studies.",
        "moderation",
      );
    }
    throw new AIError(
      (data.error as string) || "Something went wrong. Please try again.",
      res.status >= 500 ? "server" : "unknown",
    );
  }

  return data as T;
}
