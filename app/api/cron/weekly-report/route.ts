import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { enqueueJob } from "@/lib/jobs";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: optedIn, error } = await supabaseServer
    .from("user_data")
    .select("id, emailEnabled")
    .eq("emailEnabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enqueued = 0;
  for (const row of optedIn ?? []) {
    const { data: authUser } = await supabaseServer.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) continue;
    await enqueueJob("send-report", { userId: row.id, email, name: email.split("@")[0] });
    enqueued++;
  }

  // Parent weekly digests — independent opt-in (student adds a parent email
  // in the dashboard SharePanel).
  const { data: parentOptIn } = await supabaseServer
    .from("user_data")
    .select("id")
    .eq("parentDigestEnabled", true)
    .not("parentEmail", "is", null);
  let parentEnqueued = 0;
  for (const row of parentOptIn ?? []) {
    await enqueueJob("send-parent-digest", { userId: row.id, mode: "digest" });
    parentEnqueued++;
  }

  return NextResponse.json({ enqueued, parentEnqueued });
}
