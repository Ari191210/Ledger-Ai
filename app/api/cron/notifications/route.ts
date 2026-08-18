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
  blob?: Record<string, string> | null;
};

// M4-3: engine state moved off the student-writable `user_data` row into
// `notification_state` — RLS on, zero policies, service role only (migration
// 011). `notifState.sent` is the "already sent" dedup map; while it lived on
// `user_data` a student could clear it from devtools and re-open the entire
// suppressed push backlog (architecture R.2, Finding A.5.e).
type NotifStateRow = {
  user_id: string;
  sent: Record<string, string> | null;
  last_high_priority_day: string | null;
  last_milestone: number | null;
};

function toNotifState(row: NotifStateRow | undefined): NotifState {
  if (!row) return {};
  return {
    sent: row.sent ?? {},
    lastHighPriorityDay: row.last_high_priority_day ?? undefined,
    lastMilestone: row.last_milestone ?? undefined,
  };
}

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
    .select("id, exams, plan, blob")
    .in("id", [...tzByUser.keys()]);
  if (udErr) return NextResponse.json({ error: udErr.message }, { status: 500 });

  // One read for the whole batch. A failed read must NOT degrade to "{}" — an
  // empty state means "nothing has been sent", and acting on that would
  // re-send every nudge the engine had already suppressed. Fail the run; the
  // next hourly pass picks it up.
  const { data: stateRows, error: nsErr } = await supabaseServer
    .from("notification_state")
    .select("user_id, sent, last_high_priority_day, last_milestone")
    .in("user_id", [...tzByUser.keys()]);
  if (nsErr) return NextResponse.json({ error: nsErr.message }, { status: 500 });
  const stateByUser = new Map<string, NotifStateRow>();
  for (const s of (stateRows ?? []) as NotifStateRow[]) stateByUser.set(s.user_id, s);

  let sent = 0, cleaned = 0;
  for (const raw of (rows ?? []) as Row[]) {
    try {
      const tz = tzByUser.get(raw.id)!;
      // The user's current wall-clock time, as a Date whose local fields
      // carry the tz-adjusted values (standard sv-SE round-trip trick).
      const localNow = new Date(new Date().toLocaleString("sv-SE", { timeZone: tz }));

      const blob = raw.blob ?? null;
      const breakdown = computeScoreFromInputs(scoreInputsFromBlob(blob));
      // M0-6: the streak, its last-counted date and its shield are no longer
      // read here. The decision engine cannot express a streak-at-risk send,
      // so there is nothing to feed it.
      const result = decideNotifications({
        breakdown,
        exams: raw.exams ?? [],
        chronotype: raw.plan?.chronotype,
        state: toNotifState(stateByUser.get(raw.id)),
        now: localNow,
      });

      if (result.send.length === 0) continue;

      // Persist state BEFORE sending: if the send partially fails we drop a
      // nudge (fine) instead of ever double-sending one (not fine).
      const { error: stErr } = await supabaseServer
        .from("notification_state")
        .upsert(
          {
            user_id: raw.id,
            sent: result.nextState.sent ?? {},
            last_high_priority_day: result.nextState.lastHighPriorityDay ?? null,
            last_milestone: result.nextState.lastMilestone ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
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
