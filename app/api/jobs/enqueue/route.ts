import { NextResponse } from "next/server";
import { enqueueJob, JobType } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let type: string, payload: Record<string, unknown>;
  try {
    const body = await req.json();
    type = body.type;
    payload = body.payload;
    if (!type || !payload) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    await enqueueJob(type as JobType, payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
