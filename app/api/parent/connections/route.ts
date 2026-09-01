import { NextResponse } from "next/server";
import { requireBearerUser } from "@/lib/parent-space-server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Returns the caller's connections — as a student ("who can see my data") or
// as a parent ("which students have I been given access to"). Which rows
// come back is determined entirely by the WHERE clauses below, run with the
// service role but scoped explicitly to auth.uid() — RLS would give the same
// answer to an authenticated client, this just avoids a second round trip.
export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [asStudent, asParent] = await Promise.all([
    supabaseServer
      .from("parent_connections")
      .select("connection_id, parent_id, state, created_at, revoked_at")
      .eq("student_id", auth.userId)
      .order("created_at", { ascending: false }),
    supabaseServer
      .from("parent_connections")
      .select("connection_id, student_id, state, created_at, revoked_at")
      .eq("parent_id", auth.userId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    asStudent: asStudent.data ?? [],
    asParent: asParent.data ?? [],
  });
}
