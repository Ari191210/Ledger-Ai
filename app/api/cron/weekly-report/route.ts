import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all users who have opted in to email reports and have an email
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { email: string; ok?: boolean; error?: string }[] = [];

  for (const user of users.users) {
    if (!user.email) continue;

    // Check if user has emailEnabled in their data
    const { data: ud } = await supabaseAdmin
      .from("user_data")
      .select("emailEnabled")
      .eq("id", user.id)
      .single();

    if (!ud?.emailEnabled) continue;

    // Call the send-report endpoint for this user
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";
      const res = await fetch(`${base}/api/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split("@")[0],
        }),
      });
      const json = await res.json();
      results.push({ email: user.email, ...(res.ok ? { ok: true } : { error: json.error }) });
    } catch (e) {
      results.push({ email: user.email, error: String(e) });
    }
  }

  return NextResponse.json({ sent: results.length, results });
}
