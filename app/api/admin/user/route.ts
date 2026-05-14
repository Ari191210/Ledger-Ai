import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key   = searchParams.get("key") ?? "";
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const stored = process.env.ADMIN_KEY ?? "";
  if (!stored || key !== stored) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Find user in Supabase Auth
  const { data: authData, error: authErr } = await supabaseServer.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return NextResponse.json({ error: "Auth lookup failed" }, { status: 500 });

  const authUser = authData.users.find(u => u.email?.toLowerCase() === email);
  if (!authUser) return NextResponse.json({ error: "No user found with that email" }, { status: 404 });

  const userId = authUser.id;

  const [userDataRes, aiRes, errorRes] = await Promise.all([
    supabaseServer.from("user_data").select("*").eq("user_id", userId).single(),
    supabaseServer.from("ai_history").select("tool,input_text,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabaseServer.from("error_logs").select("type,route,message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  // Tool usage summary
  const toolCounts: Record<string, number> = {};
  for (const row of aiRes.data ?? []) {
    toolCounts[row.tool] = (toolCounts[row.tool] || 0) + 1;
  }
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tool, count]) => ({ tool, count }));

  const userData = userDataRes.data;

  return NextResponse.json({
    // Auth info
    id:          userId,
    email:       authUser.email,
    createdAt:   authUser.created_at,
    lastSignIn:  authUser.last_sign_in_at,
    confirmed:   !!authUser.email_confirmed_at,
    // Profile
    grade:       userData?.grade       ?? null,
    board:       userData?.board       ?? null,
    stream:      userData?.stream      ?? null,
    onboarded:   userData?.onboarding_done ?? null,
    parentCode:  userData?.parent_code ?? null,
    focusStreak: userData?.focus_streak ?? null,
    weakTopics:  userData?.weak_topics  ?? null,
    // Activity
    totalAiCalls:  aiRes.data?.length ?? 0,
    topTools,
    recentQueries: aiRes.data?.slice(0, 10) ?? [],
    lastAiCall:    aiRes.data?.[0]?.created_at ?? null,
    firstAiCall:   aiRes.data?.at(-1)?.created_at ?? null,
    // Errors this user triggered
    userErrors: errorRes.data ?? [],
  });
}
