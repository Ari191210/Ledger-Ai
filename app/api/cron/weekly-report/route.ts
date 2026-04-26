import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all users who opted in — join user_data with auth.users via Supabase admin
  const { data: optedIn, error } = await supabaseAdmin
    .from("user_data")
    .select("id, emailEnabled")
    .eq("emailEnabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!optedIn?.length) return NextResponse.json({ sent: 0 });

  const results: { id: string; ok?: boolean; error?: string }[] = [];
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";

  for (const row of optedIn) {
    // Look up email via Supabase admin auth API
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const name = email.split("@")[0];

    try {
      const res = await fetch(`${base}/api/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, email, name }),
      });
      const json = await res.json();
      results.push({ id: row.id, ...(res.ok ? { ok: true } : { error: json.error }) });
    } catch (e) {
      results.push({ id: row.id, error: String(e) });
    }
  }

  return NextResponse.json({ sent: results.length, results });
}
