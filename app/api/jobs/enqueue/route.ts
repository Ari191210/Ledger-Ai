import { NextResponse } from "next/server";
import { enqueueJob, JobType } from "@/lib/jobs";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ── Authentication required ──────────────────────────────────────────────
  // This route previously accepted any type/payload from anyone, with no
  // auth check — letting anyone queue jobs (e.g. a "send-report" job) that
  // the cron runner would later dispatch with the attacker-supplied payload.
  // The only legitimate caller (auth-provider.tsx, on sign-in) always sends
  // the signed-in user's own id, so require a session and enforce that.
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { data: { user: authedUser } } = token
    ? await supabaseServer.auth.getUser(token)
    : { data: { user: null } };
  if (!authedUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let type: string, payload: Record<string, unknown>;
  try {
    const body = await req.json();
    type = body.type;
    payload = body.payload;
    if (!type || !payload) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (payload.userId !== authedUser.id) {
    return NextResponse.json({ error: "Cannot queue a job for another account." }, { status: 403 });
  }

  try {
    await enqueueJob(type as JobType, payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
