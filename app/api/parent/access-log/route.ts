import { NextResponse } from "next/server";
import { requireBearerUser } from "@/lib/parent-space-server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// V.8.7 — "the student can see who accessed what, and when." Reads
// parent_access_log directly (RLS-equivalent scoping applied explicitly,
// same belt-and-suspenders posture as the other student-facing GETs here).
export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("parent_access_log")
    .select("access_id, parent_id, policy_version, categories_read, accessed_at")
    .eq("student_id", auth.userId)
    .order("accessed_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data ?? [] });
}
