import { supabaseServer } from "@/lib/supabase-server";
import { checkAdminKey } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await checkAdminKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now           = new Date();
  const fiveMinAgo    = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const dayAgo        = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    activeRes, todayRes, allRes, viewsRes, toolRes, recentRes,
    historyCountRes, recentQueriesRes,
    registeredRes, gradeRes, boardRes, allTimeToolRes,
    errorsRes, signupsRes, announcementRes,
  ] = await Promise.all([
    supabaseServer.from("page_events").select("session_id").gte("created_at", fiveMinAgo).limit(5000),
    supabaseServer.from("page_events").select("session_id").gte("created_at", dayAgo).limit(5000),
    supabaseServer.from("page_events").select("session_id").limit(10000),
    supabaseServer.from("page_events").select("*", { count: "exact", head: true }),
    supabaseServer.from("page_events").select("tool").gte("created_at", dayAgo).not("tool", "is", null).limit(5000),
    supabaseServer.from("page_events").select("session_id,page,tool,created_at").order("created_at", { ascending: false }).limit(25),
    supabaseServer.from("ai_history").select("tool,created_at").gte("created_at", dayAgo).limit(1000),
    supabaseServer.from("ai_history").select("user_id,tool,input_text,created_at").order("created_at", { ascending: false }).limit(50),
    supabaseServer.from("user_data").select("id", { count: "exact", head: true }),
    supabaseServer.from("user_data").select("grade").not("grade", "is", null).limit(10000),
    supabaseServer.from("user_data").select("board").not("board", "is", null).limit(10000),
    supabaseServer.from("ai_history").select("tool,grade,board").limit(100000),
    supabaseServer.from("error_logs").select("id,type,route,message,created_at,user_id").order("created_at", { ascending: false }).limit(20),
    supabaseServer.from("user_data").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    supabaseServer.from("announcements").select("*").eq("active", true).limit(1),
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

  // ── New analytics ──────────────────────────────────────────────────────────
  const registeredUsers = registeredRes.count ?? 0;

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  for (const row of gradeRes.data ?? []) {
    if (row.grade) gradeCounts[row.grade] = (gradeCounts[row.grade] || 0) + 1;
  }
  const gradeDistribution = Object.entries(gradeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([grade, count]) => ({ grade, count }));

  // Board distribution
  const boardCounts: Record<string, number> = {};
  for (const row of boardRes.data ?? []) {
    if (row.board) boardCounts[row.board] = (boardCounts[row.board] || 0) + 1;
  }
  const boardDistribution = Object.entries(boardCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([board, count]) => ({ board, count }));

  // All-time tool usage
  const allTimeCounts: Record<string, number> = {};
  for (const row of allTimeToolRes.data ?? []) {
    if (row.tool) allTimeCounts[row.tool] = (allTimeCounts[row.tool] || 0) + 1;
  }
  const allTimeTools = Object.entries(allTimeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tool, count]) => ({ tool, count }));

  const totalAiAllTime = Object.values(allTimeCounts).reduce((s, n) => s + n, 0);

  return NextResponse.json({
    activeNow, todayUsers, totalUsers, totalViews, topTools, totalAiToday,
    recent: recentRes.data ?? [],
    recentQueries: recentQueriesRes.data ?? [],
    registeredUsers,
    gradeDistribution,
    boardDistribution,
    allTimeTools,
    totalAiAllTime,
    recentErrors:    errorsRes.data ?? [],
    todaySignups:    signupsRes.count ?? 0,
    activeAnnouncement: announcementRes.data?.[0] ?? null,
    timestamp: now.toISOString(),
  });
}
