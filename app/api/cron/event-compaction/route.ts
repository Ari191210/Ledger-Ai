import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { isInternalCaller } from "@/lib/cron-auth";
import { writeAuditEntry } from "@/lib/events";
import {
  COMPACTABLE_EVENT_TYPES,
  COMPACTION_WINDOW_DAYS,
  runCompaction,
  type CompactableEvent,
  type CompactionAdapters,
  type CompactionSummary,
} from "@/lib/event-compaction";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ═══════════════════════════════════════════════════════════════════════════
// M7-7 — the compaction job's I/O half.
//
// The decision is `lib/event-compaction.ts` and it is pure; this file is the
// three things it refuses to contain — a Supabase client, a clock, and a run
// id. Same split as M7-2's `lib/event-ingest.ts` / `app/api/events/route.ts`.
//
// NOT SCHEDULED. Nothing in `vercel.json` calls this, which is the posture
// `app/api/cron/score-snapshot` documents: Vercel Hobby caps cron count and
// frequency, and the schedule lives in GitHub Actions alongside the other
// internal jobs. Scheduling it before any event exists would make the first
// real run also the first tested run of the delete path.
//
// It is safe to call today and does nothing: `academic_events` is empty until a
// tool is wired to emit (M8+), so `listCandidates` returns zero rows.
//
// D.5.a's order is enforced by `runCompaction`, not here: the summary is
// written BEFORE the raw rows are deleted, and a crash between them leaves the
// raw rows present for the retry to find.
// ═══════════════════════════════════════════════════════════════════════════

const CANDIDATE_LIMIT = 5000;

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = randomUUID();
  const nowMs = Date.now();

  const adapters: CompactionAdapters = {
    async listCandidates(limit) {
      const cutoff = new Date(nowMs - COMPACTION_WINDOW_DAYS * 86_400_000).toISOString();
      const { data, error } = await supabaseServer
        .from("academic_events")
        .select("event_id, student_id, seq, event_type, session_id, concept_id, received_at, occurred_at, payload")
        // The type filter is here as well as in the planner and in
        // `compact_attention_events()` because a query that could return a
        // `QUESTION_WRONG` is a query one careless edit away from deleting one.
        .in("event_type", COMPACTABLE_EVENT_TYPES as unknown as string[])
        .lt("received_at", cutoff)
        .order("seq", { ascending: true })
        .limit(limit);

      if (error || !data) return [];
      return data as unknown as CompactableEvent[];
    },

    async writeSummaries(summaries: CompactionSummary[]) {
      if (summaries.length === 0) return { written: 0 };
      const { data, error } = await supabaseServer
        .from("academic_event_compactions")
        .upsert(
          summaries.map(s => ({ ...s, run_id: runId })),
          { onConflict: "student_id,group_key,min_seq,max_seq", ignoreDuplicates: true },
        )
        .select("compaction_id");

      if (error) return { written: 0, error: error.message };
      return { written: data?.length ?? 0 };
    },

    async deleteRaw(studentId, eventIds, olderThanIso) {
      if (eventIds.length === 0) return { deleted: 0 };
      const { data, error } = await supabaseServer.rpc("compact_attention_events", {
        p_student_id: studentId,
        p_event_ids: eventIds,
        p_older_than: olderThanIso,
      });
      if (error) return { deleted: 0, error: error.message };
      return { deleted: typeof data === "number" ? data : 0 };
    },

    async recordAudit(entry) {
      // D.5.a: *"recorded in `AuditEntry` with the count and the range"*.
      // `student_id` is named rather than left null: this run touched one
      // student's stream, and O.6's export must be able to show them that it
      // did. `writeAuditEntry` never throws (see `lib/events.ts`).
      await writeAuditEntry({
        actor: "service_role",
        action: "compaction_run",
        student_id: entry.studentId,
        target_table: "academic_events",
        target_id: entry.runId,
        reason: `compacted ${entry.deleted} attention events older than ${entry.olderThanIso}`,
        details: {
          run_id: entry.runId,
          summaries: entry.summaries,
          deleted: entry.deleted,
          seq_range: { min: entry.minSeq, max: entry.maxSeq },
          window_days: COMPACTION_WINDOW_DAYS,
          compactable_types: COMPACTABLE_EVENT_TYPES,
        },
        policy_version: null,
        at: new Date().toISOString(),
      });
    },
  };

  try {
    const report = await runCompaction(adapters, {
      nowMs,
      runId,
      limit: CANDIDATE_LIMIT,
      // D.5.a's referenced-event exclusion. Empty because nothing in the schema
      // stores an event reference yet — `evidence` and `occurrences` (007)
      // predate the event layer and `AssessmentAttempt` is M10. The milestone
      // that first stores one wires this; 018 §3 names the gap.
      referencedEventIds: [],
    });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "compaction failed", run_id: runId },
      { status: 500 },
    );
  }
}
