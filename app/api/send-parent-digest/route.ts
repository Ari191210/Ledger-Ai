import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import {
  buildParentEmailHtml,
  computeRiskFlags,
  digestSubject,
  type DigestMode,
} from "@/lib/parent-digest";

export const dynamic = "force-dynamic";

type Exam = { name: string; subject: string; date: string };
type Row = {
  exams?: Exam[];
  marks?: { subjects: Array<{ name: string; score: number }>; target: number };
  focus?: { streak: number; lastDate: string };
  weakTopics?: Record<string, number>;
  parentCode?: string;
  parentName?: string;
  parentEmail?: string;
  parentDigestEnabled?: boolean;
  blob?: Record<string, string> | null;
};

// Sends the parent weekly digest or a risk alert. Same caller contract as
// /api/send-report: the internal job runner (CRON_SECRET) or the signed-in
// student themselves ("send a test digest" style calls).
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set." }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  const isCronCaller = authHeader === `Bearer ${process.env.CRON_SECRET}`;
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
    if (!userId || !["digest", "inactivity", "exam-risk"].includes(mode)) throw new Error("bad input");
  } catch {
    return NextResponse.json({ error: "Expected { userId, mode? }." }, { status: 400 });
  }
  if (sessionUserId && sessionUserId !== userId) {
    return NextResponse.json({ error: "Cannot send a digest for another account." }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("user_data")
    .select("exams, marks, focus, weakTopics, parentCode, parentName, parentEmail, parentDigestEnabled, blob")
    .eq("id", userId)
    .single();
  if (error || !data) return NextResponse.json({ error: "User data not found." }, { status: 404 });

  const row = data as Row;
  if (!row.parentDigestEnabled || !row.parentEmail || !row.parentCode) {
    return NextResponse.json({ error: "Parent digest is not enabled for this account." }, { status: 403 });
  }

  const breakdown = computeScoreFromInputs(scoreInputsFromBlob(row.blob ?? null));
  const streak = row.focus?.streak ?? breakdown.streak;
  const lastStudied = row.focus?.lastDate ?? null;
  const exams = row.exams ?? [];

  const digest = {
    studentName: row.parentName || "Your student",
    parentCode: row.parentCode,
    breakdown,
    streak,
    lastStudied,
    exams,
    marks: row.marks?.subjects?.map(s => ({ name: s.name, score: s.score, target: row.marks!.target })) ?? [],
    weakTopics: Object.entries(row.weakTopics ?? {})
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => ({ topic, count })),
  };
  const flags = computeRiskFlags({ breakdown, streak, lastStudied, exams });

  // An alert send with nothing to alert about is a no-op, not an email —
  // the cron decides eligibility, but this is the final guard.
  if (mode === "inactivity" && flags.inactiveDays === undefined) {
    return NextResponse.json({ ok: true, skipped: "no inactivity risk" });
  }
  if (mode === "exam-risk" && !flags.examSoon) {
    return NextResponse.json({ ok: true, skipped: "no exam risk" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    from: "Ledger <reports@studyledger.in>",
    to: row.parentEmail,
    subject: digestSubject(mode, digest, flags),
    html: buildParentEmailHtml(mode, digest, flags),
  });
  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
