import { NextResponse } from "next/server";
import { runPendingJobs } from "@/lib/jobs";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runPendingJobs();
  return NextResponse.json(result);
}
