// ═══════════════════════════════════════════════════════════════════════════
// M18-1 — THE EXPORT JOB'S DISPATCH TARGET.
//
// `lib/jobs.ts`'s `dispatch()` calls this with the same CRON_SECRET-bearer
// discipline every other job dispatch uses (`isInternalCaller`,
// `lib/cron-auth.ts`) — never reachable by a client directly.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { isInternalCaller } from "@/lib/cron-auth";
import { runExport } from "@/lib/data-export";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const studentId = (body as { student_id?: unknown }).student_id;
  if (typeof studentId !== "string") {
    return NextResponse.json({ error: "missing student_id" }, { status: 400 });
  }

  const bundle = await runExport(studentId);
  const path = `${studentId}/${Date.now()}.json`;
  const { error } = await supabaseServer.storage
    .from("exports")
    .upload(path, JSON.stringify(bundle), { contentType: "application/json", upsert: true });

  if (error) {
    return NextResponse.json({ error: `upload failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path, row_counts: bundle.manifest.entities });
}
