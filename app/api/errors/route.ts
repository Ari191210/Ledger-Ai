import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, stack, url, route, user_agent, user_id, context } = body;
    if (!type) return NextResponse.json({ ok: false });

    await supabaseServer.from("error_logs").insert({
      type,
      message: message?.slice(0, 2000) ?? null,
      stack:   stack?.slice(0, 5000)   ?? null,
      url:     url   ?? null,
      route:   route ?? null,
      user_agent: user_agent ?? null,
      user_id:    user_id    ?? null,
      context:    context    ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
