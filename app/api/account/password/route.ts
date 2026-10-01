import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BREACHED_MESSAGE, isBreachedPassword, passwordProblem } from "@/lib/auth/password";
import { sessionClaims, sessionOwesSecondFactor } from "@/lib/auth/two-factor-check";

/**
 * Change the signed-in student's password, on the server.
 *
 * It used to happen in the browser: re-sign-in with the current password, then
 * updateUser. Two things were wrong with that. The rules (length, breach check)
 * ran only in the browser, where they can be skipped. And the re-sign-in
 * replaced the student's session with a fresh one, which under two-factor is a
 * sign-in that has not entered its code, so the next click bounced them to
 * /auth/mfa. Here the current password is checked on a throwaway client that
 * never touches the student's cookies, and their own session carries on.
 *
 * A changed password should also end whoever else was using the old one;
 * Supabase signs out every other session on the account when it changes.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (await sessionOwesSecondFactor(supabase)) {
    return NextResponse.json({ error: "Two-factor code required." }, { status: 401 });
  }

  const problem = passwordProblem(next, user.email);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (await isBreachedPassword(next)) return NextResponse.json({ error: BREACHED_MESSAGE }, { status: 400 });

  const check = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  await check.auth.signOut({ scope: "local" });

  // Through the student's own session, not the admin API: an admin password
  // update ends EVERY session including this one (checked 2026-10-01), while
  // this keeps the current sign-in and ends all the others.
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    const msg =
      error.code === "reauthentication_needed"
        ? "For safety, sign out and back in, then change your password."
        : error.code === "same_password"
          ? "That's your current password. Choose a new one."
          : "Couldn't update the password. Try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();
  const claims = await sessionClaims(supabase);
  await admin.rpc("two_factor_forget", { p_user: user.id, p_keep: claims?.sessionId ?? null });

  return NextResponse.json({ ok: true });
}
