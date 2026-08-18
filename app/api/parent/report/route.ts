import { NextResponse } from "next/server";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";
import { supabaseServer } from "@/lib/supabase-server";
import { linkAuditEntry } from "@/lib/audit";
import type { ParentProjection } from "@/lib/parent-space";

export const dynamic = "force-dynamic";

// THE parent read path. Calls public.get_parent_projection() — the only
// function in the database that can produce this payload (029_parent_space.sql
// §7) — as the PARENT's own identity, so the connection-state and
// share-policy checks inside it run against auth.uid(), not an argument a
// caller could forge.
//
// A revoked or never-granted connection fails INSIDE the RPC (42501) and this
// route surfaces that as 404 — the same "this link is invalid" the old
// `/parent/[code]` page showed, but now it is actually enforced rather than
// merely a possible outcome of a bad code.
export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required." }, { status: 400 });

  const client = userRpcClient(auth.token);
  const { data, error } = await client.rpc("get_parent_projection", { p_student_id: studentId });

  if (error) {
    // 42501 is the RPC's own "no active connection" refusal — never
    // distinguished from "not found" in the response, so a caller cannot
    // probe for whether a connection ever existed.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const projection = data as ParentProjection;

  // A second, independent audit trail alongside parent_access_log
  // (029_parent_space.sql §7 already wrote that row inside the RPC). This one
  // is hash-chained and tamper-evident (architecture O.6, lib/audit.ts) —
  // 'parent_read' has been in AUDIT_ACTIONS' closed set since M7-4, reserved
  // for exactly this milestone.
  try {
    const { data: tip } = await supabaseServer.rpc("audit_chain_tip");
    const entry = linkAuditEntry(
      {
        actor: "parent",
        action: "parent_read",
        student_id: studentId,
        target_table: "get_parent_projection",
        target_id: studentId,
        reason: null,
        details: { categoriesRead: Object.keys(projection).filter(k => k !== "system") },
        policy_version: String(projection.system?.policyVersion ?? 0),
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
    // The read already happened and parent_access_log already has it; the
    // hash-chained copy is defense in depth, not the only record.
  }

  return NextResponse.json({ projection });
}
