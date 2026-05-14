import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public GET — student dashboard reads this to show announcements
export async function GET() {
  const { data, error } = await supabaseServer
    .from("announcements")
    .select("id,message,style")
    .eq("active", true)
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ announcement: null });
  return NextResponse.json({ announcement: data });
}

// Admin POST — publish a new announcement
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") ?? "";
  const stored = process.env.ADMIN_KEY ?? "";
  if (!stored || key !== stored) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, style, active } = await req.json();

  if (active === false) {
    // Clear all active announcements
    await supabaseServer.from("announcements").update({ active: false }).eq("active", true);
    return NextResponse.json({ ok: true, cleared: true });
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (!["banner", "modal"].includes(style)) {
    return NextResponse.json({ error: "Style must be banner or modal" }, { status: 400 });
  }

  // Deactivate all existing first
  await supabaseServer.from("announcements").update({ active: false }).eq("active", true);

  // Insert new active announcement
  const { data, error } = await supabaseServer
    .from("announcements")
    .insert({ message: message.trim(), style, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, announcement: data });
}
