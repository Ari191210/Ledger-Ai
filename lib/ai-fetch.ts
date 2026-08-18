import { toast } from "sonner";
import { supabase } from "./supabase";
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
//
// M15-1 — THE PROFILE NO LONGER TRAVELS WITH THE REQUEST.
//
// This function used to read `getLocalProfile()` and spread it over every body:
// `{ ...body, ...profile }`. Two things were wrong with that, and both are the
// same defect seen from different ends.
//
//   · The server personalised from it. `buildProfileContext` in `/api/ai` read
//     `params.grade`, `params.board`, `params.aiProfile` — the BROWSER's copy —
//     so a stale or edited cache decided how the model addressed the student.
//     Architecture Q.1(a) and Finding A.6.b. The route now reads the profile
//     itself, through `getStudentContext()`, and cannot be told otherwise.
//
//   · The spread came LAST, so the cache also overwrote arguments the tool had
//     just been given. Ask the formula sheet for a CBSE chapter while the cache
//     said ICSE and the cache won.
//
// Only the ambient profile is removed. A tool that passes `board` or `grade` as
// its own argument still does, and that argument is now what the server sees;
// where a request omits them the server fills them from its own record.
export async function callAI(body: Record<string, unknown>): Promise<Response> {
  sounds.aiStart();
  const { data: { session } } = await supabase.auth.getSession();
  return fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    // Same-origin, so the cookie session M4-1 put on the wire rides along and
    // `getStudentContext()` can see it.
    credentials: "same-origin",
    body: JSON.stringify(body),
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
    toast.error("Connection error — check your network.");
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
      toast.error((data.error as string) || "Your AI access has been suspended.");
      throw new AIError(
        (data.error as string) || "Your AI access has been suspended.",
        "moderation",
      );
    }
    if (res.status === 400) {
      track.aiError(tool, "moderation");
      toast.error((data.error as string) || "This topic isn't something Ledger can help with.");
      throw new AIError(
        (data.error as string) || "This topic isn't something Ledger can help with.",
        "moderation",
      );
    }
    track.aiError(tool, res.status >= 500 ? "server" : "unknown");
    toast.error((data.error as string) || "Something went wrong — please try again.");
    throw new AIError(
      (data.error as string) || "Something went wrong. Please try again.",
      res.status >= 500 ? "server" : "unknown",
    );
  }

  track.aiComplete(tool, Date.now() - t0);
  toast.success("Result ready", { duration: 2000 });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ai-complete"));
  }
  return data as T;
}
