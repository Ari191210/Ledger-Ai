import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreTier } from "@/lib/ledger-score";

export const dynamic = "force-dynamic";

// The synced blob stores raw localStorage strings (see lib/sync.ts).
function blobJSON<T>(blob: Record<string, string> | null, key: string, fallback: T): T {
  try {
    const v = blob?.[key];
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

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
  const syllabusSubjects = blobJSON<string[]>(blob, "ledger-syllabus-subjects", []);
  const breakdown = computeScoreFromInputs({
    papersLog:        blobJSON(blob, "ledger-papers-log", []),
    syllabusSubjects,
    syllabusUploaded: syllabusSubjects.length > 0 || !!blob?.["ledger-syllabus"],
    notesHistory:     blobJSON(blob, "ledger-notes-history", []),
    mistakes:         blobJSON(blob, "ledger-mistakes", []),
    streak:           parseInt(blob?.["ledger-focus-streak"] ?? "0", 10) || 0,
  });

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
