import "server-only";

import { createHmac, randomInt } from "node:crypto";

export type Purpose = "signin" | "enable" | "disable";
export const PURPOSES: readonly Purpose[] = ["signin", "enable", "disable"];

/** A six-digit code from the OS's secure random source. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * What the database stores instead of the code: an HMAC keyed with a server
 * secret and bound to the user, the sign-in and the purpose. A leaked table row
 * can't be brute-forced offline (a bare hash of a six-digit code can, in
 * microseconds), and a code issued for one sign-in is worthless in another.
 */
export function hashCode(userId: string, sessionId: string, purpose: Purpose, code: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createHmac("sha256", secret).update(`two-factor:${userId}:${sessionId}:${purpose}:${code}`).digest("hex");
}

const SUBJECT: Record<Purpose, string> = {
  signin: "Your StudyLedger sign-in code",
  enable: "Confirm two-factor sign-in for StudyLedger",
  disable: "Confirm turning off two-factor sign-in",
};

function body(purpose: Purpose, code: string): { text: string; html: string } {
  const lead: Record<Purpose, string> = {
    signin:
      "Someone just signed in to your StudyLedger account with your password. If that was you, enter this code to finish signing in.",
    enable: "Enter this code in Settings to turn on two-factor sign-in.",
    disable: "Enter this code in Settings to turn off two-factor sign-in.",
  };
  const warn: Record<Purpose, string> = {
    signin:
      "If this wasn't you, your password is known to someone else. Reset it now at https://studyledger.in/auth/reset. They can't get in without this code.",
    enable: "If you didn't ask for this, you can ignore this email.",
    disable: "If you didn't ask for this, don't enter the code, and reset your password at https://studyledger.in/auth/reset.",
  };
  const text = `${lead[purpose]}\n\n${code}\n\nThe code works for 10 minutes.\n\n${warn[purpose]}\n\nStudyLedger`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#191918;max-width:480px">
<p>${lead[purpose]}</p>
<p style="font-family:ui-monospace,Menlo,monospace;font-size:28px;letter-spacing:6px;font-weight:700;margin:24px 0">${code}</p>
<p style="color:#6b6a65">The code works for 10 minutes.</p>
<p style="color:#6b6a65">${warn[purpose]}</p>
<p style="color:#6b6a65">StudyLedger</p>
</div>`;
  return { text, html };
}

/** Send the code with Resend (studyledger.in is a verified sending domain). */
export async function sendCodeEmail(to: string, purpose: Purpose, code: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[two-factor] RESEND_API_KEY is not set");
    return false;
  }
  const { text, html } = body(purpose, code);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "StudyLedger <hello@studyledger.in>", to: [to], subject: SUBJECT[purpose], text, html }),
  }).catch((e) => {
    console.error("[two-factor] Resend unreachable:", e instanceof Error ? e.message : e);
    return null;
  });
  if (res && !res.ok) {
    // Resend's error body names the cause (bad key, unverified domain, quota)
    // and carries no secret or recipient data.
    console.error(`[two-factor] Resend refused (${res.status}):`, (await res.text().catch(() => "")).slice(0, 300));
  }
  return !!res?.ok;
}
