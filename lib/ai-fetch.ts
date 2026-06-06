import { supabase } from "./supabase";
import { getLocalProfile } from "./user-data";
import { sounds } from "./sounds";
import { track } from "./posthog";

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
  sounds.aiStart();
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
  const tool = (body.tool as string) ?? "unknown";
  const t0 = Date.now();

  track.aiCall(tool);

  let res: Response;
  try {
    res = await callAI(body);
  } catch {
    track.aiError(tool, "network");
    throw new AIError(
      "Network error — check your connection and try again.",
      "network",
    );
  }

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    if (res.status === 429) {
      track.aiError(tool, "rate_limit");
      track.rateLimitHit(tool);
      if (typeof window !== "undefined") {
        window.location.href = "/limit";
      }
      throw new AIError(
        (data.error as string) || "You've reached your daily AI limit. It resets at midnight.",
        "rate_limit",
      );
    }
    if (res.status === 403) {
      track.aiError(tool, "moderation");
      throw new AIError(
        (data.error as string) || "Your AI access has been suspended.",
        "moderation",
      );
    }
    if (res.status === 400) {
      track.aiError(tool, "moderation");
      throw new AIError(
        (data.error as string) || "This topic isn't something Ledger can help with.",
        "moderation",
      );
    }
    track.aiError(tool, res.status >= 500 ? "server" : "unknown");
    throw new AIError(
      (data.error as string) || "Something went wrong. Please try again.",
      res.status >= 500 ? "server" : "unknown",
    );
  }

  track.aiComplete(tool, Date.now() - t0);
  return data as T;
}
