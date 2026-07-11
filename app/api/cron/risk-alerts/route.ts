import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { enqueueJob } from "@/lib/jobs";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import { computeRiskFlags, INACTIVITY_COOLDOWN_DAYS } from "@/lib/parent-digest";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  exams?: Array<{ name: string; date: string }>;
  focus?: { streak: number; lastDate: string };
  parentAlerts?: { inactivityAt?: string; examAlerts?: Record<string, string> };
  blob?: Record<string, string> | null;
};

// Daily scan: for every student with a parent digest enabled, detect risk
// conditions and enqueue alert emails. Cooldown markers in parentAlerts
// prevent repeats — inactivity re-alerts at most weekly, exam alerts fire
// once per exam occurrence.
export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("user_data")
    .select("id, exams, focus, parentAlerts, blob")
    .eq("parentDigestEnabled", true)
    .not("parentEmail", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enqueued = 0;
  const now = Date.now();

  for (const raw of (data ?? []) as Row[]) {
    const breakdown = computeScoreFromInputs(scoreInputsFromBlob(raw.blob ?? null));
    const flags = computeRiskFlags({
      breakdown,
      streak: raw.focus?.streak ?? breakdown.streak,
      lastStudied: raw.focus?.lastDate ?? null,
      exams: raw.exams ?? [],
    });
    const alerts: { inactivityAt?: string; examAlerts: Record<string, string> } = {
      inactivityAt: raw.parentAlerts?.inactivityAt,
      examAlerts: { ...(raw.parentAlerts?.examAlerts ?? {}) },
    };
    let dirty = false;

    if (flags.inactiveDays !== undefined) {
      const last = alerts.inactivityAt ? new Date(alerts.inactivityAt).getTime() : 0;
      if (now - last >= INACTIVITY_COOLDOWN_DAYS * 86400000) {
        await enqueueJob("send-parent-digest", { userId: raw.id, mode: "inactivity" });
        alerts.inactivityAt = new Date().toISOString();
        dirty = true;
        enqueued++;
      }
    }

    if (flags.examSoon) {
      const exam = (raw.exams ?? []).find(e => e.name === flags.examSoon!.name);
      const key = `${flags.examSoon.name}@${exam?.date ?? ""}`;
      if (!alerts.examAlerts[key]) {
        await enqueueJob("send-parent-digest", { userId: raw.id, mode: "exam-risk" });
        alerts.examAlerts[key] = new Date().toISOString();
        dirty = true;
        enqueued++;
      }
    }

    if (dirty) {
      await supabaseServer
        .from("user_data")
        .update({ parentAlerts: alerts })
        .eq("id", raw.id);
    }
  }

  return NextResponse.json({ scanned: data?.length ?? 0, enqueued });
}
