import { NextResponse } from "next/server";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";
import { supabaseServer } from "@/lib/supabase-server";
import { SHARE_CATEGORY_COLUMNS, type ShareCategory } from "@/lib/parent-space";

export const dynamic = "force-dynamic";

// The student's current share policy. Every category defaults FALSE at the
// database (029_parent_space.sql §3), so a student who has never visited
// Settings still has a fully-Private policy — there is no unset state that
// reads as "shared."
export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data } = await supabaseServer
    .from("parent_share_policies")
    .select("version, score_trajectory, dimension_breakdown, subject_state, progress_fixing, consistency, upcoming_exams, assessment_activity, digest_enabled, effective_from")
    .eq("student_id", auth.userId)
    .eq("is_current", true)
    .maybeSingle();

  return NextResponse.json({ policy: data ?? null });
}

// Toggle one or more categories. Every write is a new appended version
// (N.7) via set_parent_share_policy() — never an UPDATE — so an already-sent
// report's stamped policy_version keeps describing exactly what was true
// when it was sent (V.8.5).
export async function POST(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const args: Record<string, boolean | string | null> = {};
  for (const cat of Object.keys(SHARE_CATEGORY_COLUMNS) as ShareCategory[]) {
    if (typeof body[cat] === "boolean") {
      args[`p_${SHARE_CATEGORY_COLUMNS[cat]}`] = body[cat] as boolean;
    }
  }
  if (typeof body.digestEnabled === "boolean") args.p_digest_enabled = body.digestEnabled as boolean;
  args.p_change_reason = typeof body.reason === "string" ? body.reason : "student updated sharing settings";

  const client = userRpcClient(auth.token);
  const { data, error } = await client.rpc("set_parent_share_policy", args);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // O.6: every policy change is audited. append_audit_entry() already exists
  // (M7-4) and 'policy_change' is already in its closed action set — this is
  // a call site, not a schema change.
  try {
    const { linkAuditEntry } = await import("@/lib/audit");
    const { data: tip } = await supabaseServer.rpc("audit_chain_tip");
    const entry = linkAuditEntry(
      {
        actor: "student",
        action: "policy_change",
        student_id: auth.userId,
        target_table: "parent_share_policies",
        target_id: data?.student_id ? `${data.student_id}:${data.version}` : null,
        reason: typeof body.reason === "string" ? body.reason : null,
        details: { version: data?.version ?? null },
        policy_version: data?.version ? String(data.version) : null,
        at: new Date().toISOString(),
      },
      (tip as string) ?? "0".repeat(64),
    );
    await supabaseServer.rpc("append_audit_entry", {
      p_actor: entry.actor,
      p_action: entry.action,
      p_student_id: entry.student_id,
      p_target_table: entry.target_table,
      p_target_id: entry.target_id,
      p_reason: entry.reason,
      p_details: entry.details,
      p_policy_version: entry.policy_version,
      p_at: entry.at,
      p_hash_version: entry.hash_version,
      p_before_hash: entry.before_hash,
      p_after_hash: entry.after_hash,
    });
  } catch {
    // The policy change itself already succeeded and is the source of truth;
    // a failed audit write must not roll it back or block the response.
  }

  return NextResponse.json({ ok: true, policy: data });
}
