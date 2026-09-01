import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import {
  buildParentEmailHtml,
  computeRiskFlags,
  digestSubject,
  type DigestMode,
  type ParentDigestData,
} from "@/lib/parent-digest";
import { getCurrentSharePolicy, buildParentProjectionForDelivery } from "@/lib/parent-projection-server";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// REBUILT for M17. The old version read `user_data.parentCode/parentEmail`
// (one parent per student). A student can now have several active parent
// connections, so this sends to every one of them whose share policy has
// `digest_enabled` — and reads the digest content ONLY from
// `buildParentProjectionForDelivery()`, which is scoped to the same five
// Shared views the interactive parent report reads (architecture N.5/N.6).
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set." }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  const isCronCaller = isInternalCaller(req);
  let sessionUserId: string | null = null;
  if (!isCronCaller) {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const { data: { user } } = token
      ? await supabaseServer.auth.getUser(token)
      : { data: { user: null } };
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    sessionUserId = user.id;
  }

  let userId: string, mode: DigestMode;
  try {
    const body = await req.json();
    userId = body.userId;
    mode = body.mode ?? "digest";
    if (!userId || !["digest", "exam-risk"].includes(mode)) throw new Error("bad input");
  } catch {
    return NextResponse.json({ error: "Expected { userId, mode? }." }, { status: 400 });
  }
  if (sessionUserId && sessionUserId !== userId) {
    return NextResponse.json({ error: "Cannot send a digest for another account." }, { status: 403 });
  }

  const policy = await getCurrentSharePolicy(userId);
  if (!policy || !policy.digest_enabled) {
    return NextResponse.json({ error: "Parent digest is not enabled for this account." }, { status: 403 });
  }

  const { data: connections } = await supabaseServer
    .from("parent_connections")
    .select("connection_id, parent_id")
    .eq("student_id", userId)
    .eq("state", "active");

  if (!connections?.length) {
    return NextResponse.json({ ok: true, skipped: "no active parent connection" });
  }

  const { data: studentAuth } = await supabaseServer.auth.admin.getUserById(userId);
  const studentName = studentAuth?.user?.user_metadata?.full_name || studentAuth?.user?.email?.split("@")[0] || "Your student";

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    const projection = await buildParentProjectionForDelivery(userId, conn.parent_id, conn.connection_id, policy);
    const digest: ParentDigestData = { studentName, projection };
    const flags = computeRiskFlags(digest);

    if (mode === "exam-risk" && !flags.examSoon) continue; // no-op, not an email, per connection

    const { data: parentAuth } = await supabaseServer.auth.admin.getUserById(conn.parent_id);
    const parentEmail = parentAuth?.user?.email;
    if (!parentEmail) continue;

    const { error: sendError } = await resend.emails.send({
      from: "Ledger <reports@studyledger.in>",
      to: parentEmail,
      subject: digestSubject(mode, digest, flags),
      html: buildParentEmailHtml(mode, digest, flags),
    });
    if (sendError) errors.push(sendError.message);
    else sent++;
  }

  if (sent === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sent });
}
