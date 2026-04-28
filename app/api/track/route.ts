import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export async function POST(req: Request) {
  try {
    const { sessionId, page, tool } = await req.json();
    if (!sessionId || !page) return NextResponse.json({ ok: false });
    await supabase.from("page_events").insert({ session_id: sessionId, page, tool: tool || null });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
