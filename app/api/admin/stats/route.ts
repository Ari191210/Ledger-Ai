import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const submitted = searchParams.get("key") ?? "";
  const stored    = process.env.ADMIN_KEY ?? "";
  if (!stored || submitted !== stored) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now        = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const dayAgo     = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [activeRes, todayRes, allRes, viewsRes, toolRes, recentRes, historyCountRes, recentQueriesRes] = await Promise.all([
    supabaseServer.from("page_events").select("session_id").gte("created_at", fiveMinAgo).limit(5000),
    supabaseServer.from("page_events").select("session_id").gte("created_at", dayAgo).limit(5000),
    supabaseServer.from("page_events").select("session_id").limit(10000),
    supabaseServer.from("page_events").select("*", { count: "exact", head: true }),
    supabaseServer.from("page_events").select("tool").gte("created_at", dayAgo).not("tool", "is", null).limit(5000),
    supabaseServer.from("page_events").select("session_id,page,tool,created_at").order("created_at", { ascending: false }).limit(25),
    supabaseServer.from("ai_history").select("tool,created_at").gte("created_at", dayAgo).limit(1000),
    // Recent user queries — what people are actually asking
    supabaseServer.from("ai_history")
      .select("user_id,tool,input_text,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const activeNow  = new Set(activeRes.data?.map(r => r.session_id)).size;
  const todayUsers = new Set(todayRes.data?.map(r => r.session_id)).size;
  const totalUsers = new Set(allRes.data?.map(r => r.session_id)).size;
  const totalViews = viewsRes.count ?? 0;

  const toolCounts: Record<string, number> = {};
  for (const row of toolRes.data ?? []) {
    if (row.tool) toolCounts[row.tool] = (toolCounts[row.tool] || 0) + 1;
  }
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tool, count]) => ({ tool, count }));

  const aiCounts: Record<string, number> = {};
  for (const row of historyCountRes.data ?? []) {
    if (row.tool) aiCounts[row.tool] = (aiCounts[row.tool] || 0) + 1;
  }
  const totalAiToday = Object.values(aiCounts).reduce((s, n) => s + n, 0);

  return NextResponse.json({
    activeNow,
    todayUsers,
    totalUsers,
    totalViews,
    topTools,
    totalAiToday,
    recent: recentRes.data ?? [],
    recentQueries: recentQueriesRes.data ?? [],
    timestamp: now.toISOString(),
  });
}
