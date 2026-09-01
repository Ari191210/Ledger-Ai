// ═══════════════════════════════════════════════════════════════════════════
// M18-1 — REQUEST AN EXPORT. Enqueues; does not build the bundle inline
// (O.1: "Export is asynchronous").
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createStudentServerClient } from "@/lib/supabase-server";
import { enqueueExport } from "@/lib/data-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const studentId = userData?.user?.id;
  if (authError || !studentId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  await enqueueExport(studentId);
  return NextResponse.json({ ok: true, status: "queued" });
}
