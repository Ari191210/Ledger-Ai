import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob, scoreTier } from "@/lib/ledger-score";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("user_data")
    .select("exams, marks, focus, weakTopics, papersCount, parentName, blob")
    .eq("parentCode", code)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute the Ledger Score server-side from the synced blob. Never return
  // the blob itself — it holds the student's full working data.
  const blob = (data.blob ?? null) as Record<string, string> | null;
  const breakdown = computeScoreFromInputs(scoreInputsFromBlob(blob));

  const { blob: _omit, ...publicData } = data;
  return NextResponse.json({
    ...publicData,
    score: {
      total: breakdown.total,
      tier: scoreTier(breakdown.total).label,
      pqa: breakdown.pqaScore,
      syllabus: breakdown.syllabusScore,
      mistakes: breakdown.mistakeScore,
      consistency: breakdown.consistencyScore,
    },
  });
}
