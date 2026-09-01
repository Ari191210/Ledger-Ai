// lib/parent-projection-server.ts — the SERVICE-ROLE path to a parent
// projection, used only where there is no authenticated parent session to
// call `public.get_parent_projection()` as: the digest cron and the exam-risk
// cron (both dispatch to a PARENT's inbox, not to a parent's live request).
//
// This selects from exactly the same five views 029_parent_space.sql §5
// defines (`parent_score_view`, `parent_subject_view`, `parent_progress_view`,
// `parent_consistency_view`, `parent_assessment_view`) plus
// `parent_exams_view`, and NOTHING else — the structural guarantee is the
// same as the RPC's: there is no Private column in the SELECT list of any
// query in this file, because there is no Private column in any of those
// views to begin with. Category gating (which keys the caller may see) is
// applied here, in TypeScript, from the student's current share policy —
// the interactive path applies the identical gate inside the SQL function.
//
// Every call also appends a parent_access_log row, exactly as the RPC does,
// so a digest email is not an unlogged read (V.8.7).

import { supabaseServer } from "@/lib/supabase-server";
import type { ParentProjection } from "@/lib/parent-space";

type PolicyRow = {
  version: number;
  effective_from: string;
  score_trajectory: boolean;
  dimension_breakdown: boolean;
  subject_state: boolean;
  progress_fixing: boolean;
  consistency: boolean;
  upcoming_exams: boolean;
  assessment_activity: boolean;
  digest_enabled: boolean;
};

export async function getCurrentSharePolicy(studentId: string): Promise<PolicyRow | null> {
  const { data } = await supabaseServer
    .from("parent_share_policies")
    .select("version, effective_from, score_trajectory, dimension_breakdown, subject_state, progress_fixing, consistency, upcoming_exams, assessment_activity, digest_enabled")
    .eq("student_id", studentId)
    .eq("is_current", true)
    .maybeSingle();
  return (data as PolicyRow) ?? null;
}

/**
 * Builds a parent projection for `studentId` under `policy`, for delivery to
 * `connectionId`/`parentId` by a system process. Logs the read.
 */
export async function buildParentProjectionForDelivery(
  studentId: string,
  parentId: string,
  connectionId: string,
  policy: PolicyRow,
): Promise<ParentProjection> {
  const out: ParentProjection = {
    system: {
      connectionActive: true,
      connectionSince: policy.effective_from,
      policyVersion: policy.version,
      policyUpdatedAt: policy.effective_from,
    },
  };
  const categoriesRead: string[] = [];

  if (policy.score_trajectory) {
    const { data } = await supabaseServer
      .from("parent_score_view")
      .select("captured_on, total, pqa, syllabus, mistakes, consistency, confidence")
      .eq("student_id", studentId)
      .order("captured_on", { ascending: false })
      .limit(30);
    if (data) out.scoreTrajectory = data as ParentProjection["scoreTrajectory"];
    categoriesRead.push("score_trajectory");
  }

  if (policy.dimension_breakdown) {
    const { data } = await supabaseServer
      .from("parent_score_view")
      .select("captured_on, total, pqa, syllabus, mistakes, consistency, confidence")
      .eq("student_id", studentId)
      .order("captured_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) out.dimensionBreakdown = data as ParentProjection["dimensionBreakdown"];
    categoriesRead.push("dimension_breakdown");
  }

  if (policy.subject_state) {
    const { data } = await supabaseServer
      .from("parent_subject_view")
      .select("subject, proven_count, studied_count, untouched_count")
      .eq("student_id", studentId);
    out.subjectState = (data ?? []) as ParentProjection["subjectState"];
    categoriesRead.push("subject_state");
  }

  if (policy.progress_fixing) {
    const { data } = await supabaseServer
      .from("parent_progress_view")
      .select("being_worked_count, resolved_this_period_count")
      .eq("student_id", studentId)
      .maybeSingle();
    out.progressFixing = (data ?? { being_worked_count: 0, resolved_this_period_count: 0 }) as ParentProjection["progressFixing"];
    categoriesRead.push("progress_fixing");
  }

  if (policy.consistency) {
    const { data } = await supabaseServer
      .from("parent_consistency_view")
      .select("verified_sessions_count")
      .eq("student_id", studentId)
      .maybeSingle();
    out.consistency = (data ?? { verified_sessions_count: 0 }) as ParentProjection["consistency"];
    categoriesRead.push("consistency");
  }

  if (policy.upcoming_exams) {
    const { data } = await supabaseServer
      .from("parent_exams_view")
      .select("exams")
      .eq("student_id", studentId)
      .maybeSingle();
    out.upcomingExams = (data?.exams ?? []) as ParentProjection["upcomingExams"];
    categoriesRead.push("upcoming_exams");
  }

  if (policy.assessment_activity) {
    const { data } = await supabaseServer
      .from("parent_assessment_view")
      .select("assessments_completed_count")
      .eq("student_id", studentId)
      .maybeSingle();
    out.assessmentActivity = (data ?? { assessments_completed_count: 0 }) as ParentProjection["assessmentActivity"];
    categoriesRead.push("assessment_activity");
  }

  await supabaseServer.from("parent_access_log").insert({
    student_id: studentId,
    parent_id: parentId,
    connection_id: connectionId,
    policy_version: policy.version,
    categories_read: categoriesRead,
  });

  return out;
}
