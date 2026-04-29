import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { sessionId, page, tool } = await req.json();
    if (!sessionId || !page) return NextResponse.json({ ok: false });
    await supabaseServer.from("page_events").insert({ session_id: sessionId, page, tool: tool || null });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
