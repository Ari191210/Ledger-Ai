import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { enqueueJob } from "@/lib/jobs";
import { computeRiskFlags } from "@/lib/parent-digest";
import { isInternalCaller } from "@/lib/cron-auth";
import type { ParentProjection } from "@/lib/parent-space";

export const dynamic = "force-dynamic";

type PolicyRow = { student_id: string; upcoming_exams: boolean; dimension_breakdown: boolean; digest_enabled: boolean };

// M4-3: the cooldown markers no longer live on the student's own row. They are
// read from and written to `parent_alert_state`, which has RLS on and no
// policies at all — service role only (migration 011). The student could
// previously clear `user_data.parentAlerts` from devtools, and the effect of
// doing so was that an exam-risk email to their PARENT fired a second time.
type AlertState = { examAlerts: Record<string, string> };

// Daily scan: for every student with the digest on AND both categories a
// risk flag needs (`upcoming_exams`, `dimension_breakdown`) shared, detect
// risk conditions and enqueue alert emails. REBUILT for M17: reads the same
// parent-safe views the live report reads (`parent_score_view`,
// `parent_exams_view`) rather than the raw blob — this scan itself must not
// see anything a parent projection could not, since its whole job is
// deciding what to hand to `send-parent-digest`.
//
// There is no inactivity scan. Days away from the product are not an
// academic risk signal and may not be escalated to a parent (M0-4). The one
// remaining flag is evidence-based: a dated exam is approaching *and* the
// readiness score is below the threshold. Absence alone reaches nobody.
export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: policies, error } = await supabaseServer
    .from("parent_share_policies")
    .select("student_id, upcoming_exams, dimension_breakdown, digest_enabled")
    .eq("is_current", true)
    .eq("digest_enabled", true)
    .eq("upcoming_exams", true)
    .eq("dimension_breakdown", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (policies ?? []) as PolicyRow[];
  if (rows.length === 0) return NextResponse.json({ scanned: 0, enqueued: 0 });

  const studentIds = rows.map(r => r.student_id);
  const [{ data: scores }, { data: examRows }, { data: states, error: stErr }] = await Promise.all([
    supabaseServer.from("parent_score_view").select("student_id, total, captured_on")
      .in("student_id", studentIds).order("captured_on", { ascending: false }),
    supabaseServer.from("parent_exams_view").select("student_id, exams").in("student_id", studentIds),
    supabaseServer.from("parent_alert_state").select("user_id, exam_alerts").in("user_id", studentIds),
  ]);
  // A failed state read must NOT be treated as "no alerts sent yet" — that
  // reading would re-send every parent alert the system had already
  // suppressed. Fail the run instead; the daily scan is idempotent and the
  // next one picks it up.
  if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });

  const latestScore = new Map<string, number>();
  for (const s of scores ?? []) if (!latestScore.has(s.student_id)) latestScore.set(s.student_id, s.total);
  const examsByStudent = new Map<string, ParentProjection["upcomingExams"]>();
  for (const e of examRows ?? []) examsByStudent.set(e.student_id, e.exams ?? []);
  const stateByUser = new Map<string, AlertState>();
  for (const s of states ?? []) stateByUser.set(s.user_id, { examAlerts: (s.exam_alerts ?? {}) as Record<string, string> });

  let enqueued = 0;

  for (const studentId of studentIds) {
    const total = latestScore.get(studentId);
    const exams = examsByStudent.get(studentId) ?? [];
    if (total === undefined || exams.length === 0) continue;

    const flags = computeRiskFlags({
      studentName: "",
      projection: {
        system: { connectionActive: true, connectionSince: "", policyVersion: 0, policyUpdatedAt: null },
        dimensionBreakdown: { captured_on: "", total, pqa: 0, syllabus: 0, mistakes: 0, consistency: 0, confidence: null },
        upcomingExams: exams,
      },
    });
    if (!flags.examSoon) continue;

    const alerts: AlertState = { examAlerts: { ...(stateByUser.get(studentId)?.examAlerts ?? {}) } };
    const exam = exams.find(e => e.name === flags.examSoon!.name);
    const key = `${flags.examSoon.name}@${exam?.date ?? ""}`;
    if (alerts.examAlerts[key]) continue;

    await enqueueJob("send-parent-digest", { userId: studentId, mode: "exam-risk" });
    alerts.examAlerts[key] = new Date().toISOString();
    enqueued++;

    await supabaseServer
      .from("parent_alert_state")
      .upsert(
        { user_id: studentId, exam_alerts: alerts.examAlerts, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  }

  return NextResponse.json({ scanned: studentIds.length, enqueued });
}
