import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ═══════════════════════════════════════════════════════════════════════════
// Daily close.
//
// Computes every user's Ledger Score SERVER-SIDE from the synced
// user_data.blob and writes one row per user per day into score_history.
// This is the only writer of that table — score_history has no INSERT policy
// for authenticated users, so a student cannot manufacture a track record.
//
// Idempotent: score_history has UNIQUE (user_id, captured_on), so re-running
// on the same day upserts rather than duplicating. A retried or double-fired
// cron cannot corrupt the series.
//
// Runs from GitHub Actions, not vercel.json — Vercel Hobby caps cron count and
// frequency, and vercel.json already declares three. Same pattern (and same
// CRON_SECRET) as the hourly notification engine.
// ═══════════════════════════════════════════════════════════════════════════

type Row = { id: string; blob?: Record<string, string> | null };

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC close)

  const { data, error } = await supabaseServer
    .from("user_data")
    .select("id, blob");

  if (error) {
    return NextResponse.json({ error: `read user_data: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return NextResponse.json({ captured_on: today, users: 0, written: 0 });
  }

  const snapshots = rows.map(r => {
    const s = computeScoreFromInputs(scoreInputsFromBlob(r.blob ?? null));
    return {
      user_id:         r.id,
      captured_on:     today,
      total:           s.total,
      pqa:             s.pqaScore,
      syllabus:        s.syllabusScore,
      mistakes:        s.mistakeScore,
      consistency:     s.consistencyScore,
      streak:          s.streak,
      papers_count:    s.papersCount,
      recent_mistakes: s.recentMistakes,
    };
  });

  // Chunked upsert — one round trip per 500 users rather than one per user.
  const CHUNK = 500;
  let written = 0;
  const failures: string[] = [];

  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    const { error: upsertErr } = await supabaseServer
      .from("score_history")
      .upsert(chunk, { onConflict: "user_id,captured_on" });

    if (upsertErr) failures.push(upsertErr.message);
    else written += chunk.length;
  }

  return NextResponse.json({
    captured_on: today,
    users: rows.length,
    written,
    ...(failures.length ? { failures } : {}),
  }, { status: failures.length ? 500 : 200 });
}
