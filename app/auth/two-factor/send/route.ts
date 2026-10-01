import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskEmail } from "@/lib/auth/mfa";
import { sessionClaims, sessionOwesSecondFactor } from "@/lib/auth/two-factor-check";
import { PURPOSES, hashCode, newCode, sendCodeEmail, type Purpose } from "@/lib/auth/two-factor-server";

/**
 * Email a two-factor code to the signed-in student.
 *
 * Under /auth, so the proxy's two-factor gate never blocks it: a half-signed-in
 * student has to be able to ask for the code that finishes signing them in.
 * Everything that matters is checked here instead. The code is bound to this
 * sign-in (the session_id in the verified token), never to anything the
 * request body says.
 */
export async function POST(req: Request) {
  // Route handlers get no built-in CSRF check. JSON from our own pages only.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const purpose = body?.purpose as Purpose;
  if (!PURPOSES.includes(purpose)) return NextResponse.json({ error: "Unknown request." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const claims = await sessionClaims(supabase);
  if (!claims?.sessionId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // From the auth server (getUser), not the token, which can be an hour stale.
  const on = user.app_metadata?.two_factor === "email";
  if (purpose === "signin" && !on) return NextResponse.json({ error: "Two-factor is off." }, { status: 400 });
  if (purpose === "enable") {
    if (on) return NextResponse.json({ error: "Two-factor is already on." }, { status: 400 });
    if (!user.identities?.some((i) => i.provider === "email")) {
      return NextResponse.json(
        { error: "You sign in with Google, which already checks it's you. Two-factor protects password sign-in." },
        { status: 400 },
      );
    }
  }
  if (purpose === "disable") {
    if (!on) return NextResponse.json({ error: "Two-factor is already off." }, { status: 400 });
    if (await sessionOwesSecondFactor(supabase)) {
      return NextResponse.json({ error: "Two-factor code required." }, { status: 401 });
    }
  }

  const code = newCode();
  const admin = createAdminClient();
  const { data: issued, error } = await admin.rpc("two_factor_issue", {
    p_user: user.id,
    p_session: claims.sessionId,
    p_purpose: purpose,
    p_hash: hashCode(user.id, claims.sessionId, purpose, code),
  });
  if (error) return NextResponse.json({ error: "Couldn't create a code. Try again in a minute." }, { status: 500 });
  if (issued === "too_soon") {
    return NextResponse.json(
      { error: "A code was sent less than a minute ago. Check your inbox, or resend in a minute.", to: maskEmail(user.email) },
      { status: 429 },
    );
  }
  if (issued === "too_many") {
    return NextResponse.json({ error: "Too many codes this hour. Try again later." }, { status: 429 });
  }

  if (!(await sendCodeEmail(user.email, purpose, code))) {
    return NextResponse.json({ error: "Couldn't send the email. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to: maskEmail(user.email) });
}
