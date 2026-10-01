import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanCode } from "@/lib/auth/mfa";
import { sessionClaims } from "@/lib/auth/two-factor-check";
import { PURPOSES, hashCode, type Purpose } from "@/lib/auth/two-factor-server";

const MESSAGES: Record<string, string> = {
  wrong: "That code isn't right. Check the latest email from StudyLedger.",
  expired: "That code has expired. Send a new one.",
  locked: "Too many wrong tries. Send a new code.",
  none: "No code is waiting for this sign-in. Send a new one.",
};

/**
 * Check a two-factor code for this sign-in, then act on it:
 *   signin  - this sign-in is marked as verified (the database rule reads that)
 *   enable  - two-factor turns on, and every other sign-in on the account ends
 *   disable - two-factor turns off
 * Under /auth for the same reason as ./send.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const purpose = body?.purpose as Purpose;
  const code = cleanCode(String(body?.code ?? ""));
  if (!PURPOSES.includes(purpose) || code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const claims = await sessionClaims(supabase);
  if (!claims?.sessionId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("two_factor_consume", {
    p_user: user.id,
    p_session: claims.sessionId,
    p_purpose: purpose,
    p_hash: hashCode(user.id, claims.sessionId, purpose, code),
  });
  if (error) return NextResponse.json({ error: "Couldn't check the code. Try again." }, { status: 500 });
  if (result !== "ok") {
    return NextResponse.json({ error: MESSAGES[String(result)] ?? MESSAGES.wrong }, { status: 400 });
  }

  if (purpose === "enable") {
    const { error: e } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { two_factor: "email" } });
    if (e) return NextResponse.json({ error: "Couldn't turn it on. Try again." }, { status: 500 });
    // Whoever else is signed in to this account signed in without a code.
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) await admin.auth.admin.signOut(token, "others");
  }
  if (purpose === "disable") {
    const { error: e } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { two_factor: null } });
    if (e) return NextResponse.json({ error: "Couldn't turn it off. Try again." }, { status: 500 });
    await admin.rpc("two_factor_forget", { p_user: user.id, p_keep: null });
  }
  return NextResponse.json({ ok: true });
}
