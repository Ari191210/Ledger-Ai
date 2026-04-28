import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("key") !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now        = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const dayAgo     = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [activeRes, todayRes, allRes, viewsRes, toolRes, recentRes] = await Promise.all([
    supabase.from("page_events").select("session_id").gte("created_at", fiveMinAgo).limit(5000),
    supabase.from("page_events").select("session_id").gte("created_at", dayAgo).limit(5000),
    supabase.from("page_events").select("session_id").limit(10000),
    supabase.from("page_events").select("*", { count: "exact", head: true }),
    supabase.from("page_events").select("tool").gte("created_at", dayAgo).not("tool", "is", null).limit(5000),
    supabase.from("page_events").select("session_id,page,tool,created_at").order("created_at", { ascending: false }).limit(25),
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

  return NextResponse.json({
    activeNow,
    todayUsers,
    totalUsers,
    totalViews,
    topTools,
    recent: recentRes.data ?? [],
    timestamp: now.toISOString(),
  });
}
