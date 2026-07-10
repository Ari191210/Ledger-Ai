import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { enqueueJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: optedIn, error } = await supabaseServer
    .from("user_data")
    .select("id, emailEnabled")
    .eq("emailEnabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!optedIn?.length) return NextResponse.json({ enqueued: 0 });

  let enqueued = 0;
  for (const row of optedIn) {
    const { data: authUser } = await supabaseServer.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) continue;
    await enqueueJob("send-report", { userId: row.id, email, name: email.split("@")[0] });
    enqueued++;
  }

  return NextResponse.json({ enqueued });
}
