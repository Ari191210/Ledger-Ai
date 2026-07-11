import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { computeScoreFromInputs, scoreInputsFromBlob } from "@/lib/ledger-score";
import { decideNotifications, type NotifState } from "@/lib/notifications";
import { isPushConfigured, sendToUser } from "@/lib/push";
import { isInternalCaller } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Row = {
  id: string;
  exams?: Array<{ name: string; subject?: string; date: string }>;
  plan?: { chronotype?: string };
  notifState?: NotifState;
  blob?: Record<string, string> | null;
};

// Hourly: run the notification decision engine for every user with at least
// one push subscription. All timing logic (quiet hours, chronotype windows,
// daily caps) lives in lib/notifications.ts against the user's LOCAL time —
// this route only converts server time via the subscription's stored tz.
export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ skipped: "push not configured" });
  }

  // Users with subscriptions, and each user's timezone (first device wins).
  const { data: subs, error } = await supabaseServer
    .from("push_subscriptions")
    .select("user_id, tz");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tzByUser = new Map<string, string>();
  for (const s of subs ?? []) if (!tzByUser.has(s.user_id)) tzByUser.set(s.user_id, s.tz || "Asia/Kolkata");
  if (tzByUser.size === 0) return NextResponse.json({ users: 0, sent: 0 });

  const { data: rows, error: udErr } = await supabaseServer
    .from("user_data")
    .select("id, exams, plan, notifState, blob")
    .in("id", [...tzByUser.keys()]);
  if (udErr) return NextResponse.json({ error: udErr.message }, { status: 500 });

  let sent = 0, cleaned = 0;
  for (const raw of (rows ?? []) as Row[]) {
    try {
      const tz = tzByUser.get(raw.id)!;
      // The user's current wall-clock time, as a Date whose local fields
      // carry the tz-adjusted values (standard sv-SE round-trip trick).
      const localNow = new Date(new Date().toLocaleString("sv-SE", { timeZone: tz }));

      const blob = raw.blob ?? null;
      const breakdown = computeScoreFromInputs(scoreInputsFromBlob(blob));
      const result = decideNotifications({
        breakdown,
        streak: parseInt(blob?.["ledger-focus-streak"] ?? "0", 10) || 0,
        lastDate: blob?.["ledger-focus-last"] ?? null,
        shieldUsedMonth: blob?.["ledger-focus-shield"] ?? null,
        exams: raw.exams ?? [],
        chronotype: raw.plan?.chronotype,
        state: raw.notifState ?? {},
        now: localNow,
      });

      if (result.send.length === 0) continue;

      // Persist state BEFORE sending: if the send partially fails we drop a
      // nudge (fine) instead of ever double-sending one (not fine).
      const { error: stErr } = await supabaseServer
        .from("user_data")
        .update({ notifState: result.nextState })
        .eq("id", raw.id);
      if (stErr) continue;

      for (const n of result.send) {
        const r = await sendToUser(raw.id, n);
        sent += r.delivered;
        cleaned += r.cleaned;
      }
    } catch (e) {
      console.error(`[notifications] user ${raw.id} failed:`, e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ users: tzByUser.size, sent, cleaned });
}
