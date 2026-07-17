import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import { computeScoreFromInputsV2, scoreInputsV2FromBlob } from "@/lib/ledger-score-v2";
import { corroborateActiveDay } from "@/lib/active-close";
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

  // ── SHADOW MODE (Integrity Sprint, Week 1) ────────────────────────────────
  // v1 remains the close of record. v2 is computed alongside for every user
  // and the deltas are logged so Phase B's cutover is a measured decision,
  // not a hopeful one. The `active` flag marks whether the user's blob shows
  // corroborated evidence of a qualifying academic event today.
  let shadowCount = 0, shadowAbsSum = 0, shadowMax = 0;
  const snapshots = rows.map(r => {
    const blob = r.blob ?? null;
    const s = computeScoreFromInputs(scoreInputsFromBlob(blob));
    try {
      const v2 = computeScoreFromInputsV2(scoreInputsV2FromBlob(blob));
      const delta = v2.total - s.total;
      shadowCount += 1;
      shadowAbsSum += Math.abs(delta);
      if (Math.abs(delta) > Math.abs(shadowMax)) shadowMax = delta;
      console.log(`[shadow-v2] user=${r.id} v1=${s.total} v2=${v2.total} Δ=${delta} ` +
        `(exam=${v2.pqa} cov=${v2.syllabus} rec=${v2.mistakes} mom=${v2.consistency} open=${v2.openMistakes})`);
    } catch (e) {
      console.error(`[shadow-v2] user=${r.id} v2 compute failed:`, e);
    }
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
      active:          corroborateActiveDay(blob, today),
    };
  });

  // Chunked upsert — one round trip per 500 users rather than one per user.
  const CHUNK = 500;
  let written = 0;
  const failures: string[] = [];

  let activeColumnMissing = false;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    const { error: upsertErr } = await supabaseServer
      .from("score_history")
      .upsert(chunk, { onConflict: "user_id,captured_on" });

    if (upsertErr && /active/i.test(upsertErr.message) && /column|schema/i.test(upsertErr.message)) {
      // The `active` column hasn't been added yet (hand-run migration).
      // Deployable either way: retry the chunk without the flag so the close
      // of record is never blocked by the schema lagging the code.
      activeColumnMissing = true;
      const bare = chunk.map(({ active: _a, ...rest }) => rest);
      const { error: retryErr } = await supabaseServer
        .from("score_history")
        .upsert(bare, { onConflict: "user_id,captured_on" });
      if (retryErr) failures.push(retryErr.message);
      else written += bare.length;
    } else if (upsertErr) {
      failures.push(upsertErr.message);
    } else {
      written += chunk.length;
    }
  }

  return NextResponse.json({
    captured_on: today,
    users: rows.length,
    written,
    shadowV2: shadowCount > 0
      ? { users: shadowCount, meanAbsDelta: Math.round(shadowAbsSum / shadowCount), maxDelta: shadowMax }
      : null,
    ...(activeColumnMissing ? { note: "score_history.active column missing — closes written without flag; run the ALTER TABLE" } : {}),
    ...(failures.length ? { failures } : {}),
  }, { status: failures.length ? 500 : 200 });
}
