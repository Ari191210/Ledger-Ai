import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { supabaseServer } from "@/lib/supabase-server";
import { isInternalCaller } from "@/lib/cron-auth";
import { ACCURACY_PROJECTION } from "@/lib/concept-accuracy";
import {
  ACADEMIC_RECORD_DRIFT_VIEW,
  ACADEMIC_RECORD_TABLE,
  CONCEPT_ASSESSMENT_EVIDENCE_VIEW,
  type CoverageState,
} from "@/lib/coverage-state";
import {
  CHECKED_PROJECTIONS,
  LAG_TOLERANCE_EVENTS,
  REPAIR_POLICY,
  consistencyAuditReason,
  runConsistencyCheck,
  type ConsistencyInput,
  type CoverageComparison,
  type StreamFacts,
  type WatermarkRow,
} from "@/lib/projection-consistency";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ═══════════════════════════════════════════════════════════════════════════
// M12-3 — the consistency job's I/O half.
//
// The decision is `lib/projection-consistency.ts` and it is pure; this file is
// the three things it refuses to contain — a Supabase client, a clock and a
// read. Same split as M7-7's `lib/event-compaction.ts` /
// `app/api/cron/event-compaction/route.ts`, and for the same reason: the
// done-when is a property of a decision, and a decision with no I/O is provable
// with no live database in reach (U.3).
//
// **IT REPORTS AND IT DOES NOT REPAIR.** There is no write in this file at all
// — only reads, a Sentry message, and a JSON body. `REPAIR_POLICY` is
// `"report_only"` and is echoed into the response, so a caller reading the JSON
// can see which posture produced it. T8 asks for a job that *"verifies each
// projection's watermark against the stream"*; Part H.1 authorises no
// self-healing, and H.2's rebuild is O.4's deliberate replay-from-checkpoint —
// not something a timer does to a student's record unattended.
//
// NOT SCHEDULED. Nothing in `vercel.json` calls this, which is the posture
// `app/api/cron/event-compaction` and `app/api/cron/score-snapshot` both
// document: Vercel Hobby caps cron count and frequency, and the schedule lives
// in GitHub Actions alongside the other internal jobs.
//
// It is safe to call today and reports nothing: `projection_watermarks` is
// empty until 026 is applied and a catch-up run has written a mark, and every
// read below degrades to an empty list rather than throwing (the 015/016
// pre-deployment posture `lib/events.ts` established).
// ═══════════════════════════════════════════════════════════════════════════

const WATERMARK_LIMIT = 2000;
const COVERAGE_LIMIT = 5000;

/** A read that has not happened yet is an empty list and never an exception —
 *  a monitoring job that dies on a missing table stops monitoring everything
 *  else in the same breath. */
async function rows<T>(table: string, select: string, limit: number): Promise<T[]> {
  const { data, error } = await supabaseServer.from(table).select(select).limit(limit);
  if (error || !data) return [];
  return data as unknown as T[];
}

export async function GET(req: Request) {
  if (!isInternalCaller(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watermarks = await rows<WatermarkRow>(
      "projection_watermarks",
      "projection, student_id, last_seq, last_event_id, events_processed",
      WATERMARK_LIMIT,
    );

    // ── the stream, per student named by a watermark ────────────────────────
    //
    // Only students with a mark are read. A student with events and no
    // projection is not drift — it is a projection that has not run yet, and
    // reporting it would make the first run of every new account an incident.
    const studentIds = [...new Set(watermarks.map(w => w.student_id))];
    const byStudent = new Map<string, WatermarkRow[]>();
    for (const w of watermarks) {
      const list = byStudent.get(w.student_id) ?? [];
      list.push(w);
      byStudent.set(w.student_id, list);
    }

    const streams: StreamFacts[] = [];
    for (const studentId of studentIds) {
      const { data: head, error: headErr } = await supabaseServer
        .from("academic_events")
        // R.10: `seq` orders, and there is no parameter here that could ask for
        // another ordering.
        .select("seq", { count: "exact" })
        .eq("student_id", studentId)
        .order("seq", { ascending: false })
        .limit(1);

      if (headErr) continue;

      const { count } = await supabaseServer
        .from("academic_events")
        .select("event_id", { count: "exact", head: true })
        .eq("student_id", studentId);

      const maxSeq = Number((head?.[0] as { seq?: number } | undefined)?.seq ?? 0);

      // Each of this student's marks names an event; the stream is asked
      // whether that event exists and at which `seq`. A dangling or misordered
      // mark is the difference between "behind" and "broken".
      for (const w of byStudent.get(studentId) ?? []) {
        if (w.last_event_id === null) {
          streams.push({ student_id: studentId, max_seq: maxSeq, event_count: count ?? 0 });
          continue;
        }
        const { data: named } = await supabaseServer
          .from("academic_events")
          .select("seq")
          .eq("student_id", studentId)
          .eq("event_id", w.last_event_id)
          .maybeSingle();

        streams.push({
          student_id: studentId,
          max_seq: maxSeq,
          event_count: count ?? 0,
          has_event_id: Boolean(named),
          watermark_event_seq: named ? Number((named as { seq: number }).seq) : null,
        });
      }
    }

    // ── the cache against the evidence ceiling ─────────────────────────────
    //
    // 026 §6's `academic_record_drift` view answers this in one query, and it
    // is read here rather than re-derived: a job that computed its own second
    // opinion about coverage would be a third source of truth, one worse than
    // the second H.1.a forbids. Every row it returns is already a
    // disagreement — a cached `assessed` or `proven` with no M10 evidence
    // behind it — so the mapping below is a rename, not a second filter.
    //
    // `derived_state` is NULL when there is no assessment evidence at all, and
    // the honest floor for a row the assessment layer has never seen is
    // `studied`: the student confirmed the concept and the episode happened,
    // which is what got it into the cache in the first place.
    const drift = await rows<{
      student_id: string;
      concept_ref: string;
      cached_state: CoverageState;
      derived_state: CoverageState | null;
    }>(ACADEMIC_RECORD_DRIFT_VIEW, "student_id, concept_ref, cached_state, derived_state", COVERAGE_LIMIT);

    const coverage: CoverageComparison[] = drift.map(d => ({
      student_id: d.student_id,
      concept_ref: d.concept_ref,
      cached: d.cached_state,
      derived: d.derived_state ?? "studied",
    }));

    const input: ConsistencyInput = {
      watermarks,
      streams,
      coverage,
      lag_tolerance: LAG_TOLERANCE_EVENTS,
    };

    const report = runConsistencyCheck(input);

    // ── WHERE A FINDING GOES, AND WHY NOT INTO THE AUDIT CHAIN ─────────────
    //
    // O.6's `AUDIT_ACTIONS` (`lib/audit.ts`) is a CLOSED list of twelve, and
    // `016_audit_entries.sql` holds the same twelve in a CHECK. None of them is
    // "a projection was checked", and adding one means editing an M7 module and
    // an applied migration's checksum (T1) — an edit to verified work this pass
    // may not make. It is also arguably right that it stays out: O.6's chain
    // records ACTS TAKEN ON A STUDENT'S RECORD, and this job takes none. A
    // clean run has nothing to record, and a dirty run's finding is about the
    // SYSTEM.
    //
    // So a finding goes to Sentry, which is where this codebase already sends
    // *"something is wrong and no student did it"* (see M11's mistake-DNA
    // refusal in `app/api/assessment/answer/route.ts`), and into the response
    // body for the caller. Recorded here rather than resolved by widening an
    // enum in passing.
    if (report.errors > 0) {
      Sentry.captureMessage(consistencyAuditReason(report), {
        level: "error",
        tags: { route: "api/cron/projection-consistency", policy: REPAIR_POLICY },
        extra: {
          checked_projections: CHECKED_PROJECTIONS,
          evidence_view: CONCEPT_ASSESSMENT_EVIDENCE_VIEW,
          accuracy_projection: ACCURACY_PROJECTION,
          record_table: ACADEMIC_RECORD_TABLE,
          findings: report.findings.slice(0, 50),
        },
      });
    }

    // A run that found errors is reported with 200 and `ok: false`. The HTTP
    // call succeeded; the RECORD is what has a problem, and conflating the two
    // would make a monitoring failure indistinguishable from a monitored one.
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "consistency check failed", policy: REPAIR_POLICY },
      { status: 500 },
    );
  }
}
