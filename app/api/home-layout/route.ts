// ═══════════════════════════════════════════════════════════════════════════
// M22-2 / M22-3 — HOME LAYOUT, SERVER-PERSISTED, IMPORTANCE COMPUTED SERVER-
// SIDE.
//
// GET  — reads the student's `home_layout` row (or the registry defaults if
//        none exists yet), computes REAL importance signals from live state
//        (the same "reused, not reinvented" posture `app/api/today/route.ts`
//        takes toward `lib/recommendations/engine.ts`), resolves the M.3
//        merge via `lib/home/layout.ts`'s `resolveHomeComposition`, and logs
//        every promotion to `home_importance_promotions` (M.5.5) — as
//        `service_role`, the ONLY role granted INSERT on that table (034 §2).
//
// PUT  — validates the submitted layout against the M.2 registry
//        (`validateHomeLayout` — unknown component ids, out-of-range sizes,
//        and any attempt to hide the Score are all refused HERE, before a
//        single row is written, in addition to `034`'s own DB-level
//        triggers) and upserts `home_layout`. Importance is NEVER accepted
//        from the client — there is no field on the PUT body this route
//        reads for it, which is the same "physically incapable of
//        expressing it" guarantee `034`'s table comment states for the
//        column.
//
// EVERYTHING IS READ/WRITTEN AS THE STUDENT (`createStudentServerClient`) —
// RLS is what makes "a layout that is not theirs is not visible or writable
// at all" true here, not an application-layer filter — same posture
// `app/api/today/route.ts` and `app/api/assessment/verify/route.ts` take.
// The one exception is the promotions INSERT, which explicitly needs
// `service_role` (034 §2's whole point), so that single write uses the
// service client.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createStudentServerClient } from "@/lib/supabase-server";
import {
  buildImportanceSignal,
  defaultHomeLayout,
  listHomeComponents,
  resolveHomeComposition,
  validateHomeLayout,
  type HomeImportanceSignal,
  type HomeLayout,
  type HomeViewport,
} from "@/lib/home";
import { EXAM_DAY_PROXIMITY_DAYS, soonestExam } from "@/lib/exam-day";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** M.4's "an exam within CRITICAL_EXAM_DAYS" — mirrors `lib/exam-day.ts`'s
 *  `EXAM_DAY_PROXIMITY_DAYS` ("when a paper is tomorrow") rather than
 *  inventing a second exam-proximity constant, the same mirror-with-test
 *  discipline `EXAM_NEAR_DAYS` already documents for `EXAM_RISK_WINDOW_DAYS`.
 *  Asserted against its source in `tests/home-composition.test.mjs`. */
const CRITICAL_EXAM_DAYS = EXAM_DAY_PROXIMITY_DAYS;

async function authenticate(req: Request) {
  const supabase = await createStudentServerClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData, error } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();
  return { supabase, user: userData?.user ?? null, error };
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(req: Request) {
  const { supabase, user, error: authError } = await authenticate(req);
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const studentId = user.id;
  const nowMs = Date.now();
  const url = new URL(req.url);
  const viewport: HomeViewport = url.searchParams.get("viewport") === "mobile" ? "mobile" : "desktop";

  // ── the student's HomeLayout (or defaults) ────────────────────────────────
  const { data: layoutRow } = await supabase
    .from("home_layout")
    .select("entries, updated_at")
    .eq("student_id", studentId)
    .maybeSingle();

  const layout: HomeLayout = layoutRow
    ? {
        entries: (layoutRow.entries ?? []) as HomeLayout["entries"],
        updatedAtMs: layoutRow.updated_at ? Date.parse(layoutRow.updated_at as string) : null,
      }
    : defaultHomeLayout();

  // ── availableData — which of M.2's declared dependencies are actually met ─
  // `score` and `features` declare no dependency at all and are always
  // available; the others are declared available honestly, from data this
  // route reads below for the SAME purpose (importance), rather than a
  // second, duplicate existence probe.
  const availableData = new Set<string>(["score_snapshot"]); // the score reads are already the shell's own concern (app/home/page.tsx)

  // ── recommendation (T2) — reused from Today's own query shape, not reinvented ─
  const { data: patternRows } = await supabase
    .from("patterns")
    .select("id")
    .eq("student_id", studentId)
    .eq("tier", "concept")
    .eq("status", "open")
    .limit(1);
  const { data: retestRows } = await supabase
    .from("mistake_retest_schedule")
    .select("pattern_id, due_at")
    .eq("student_id", studentId)
    .lte("due_at", new Date(nowMs).toISOString())
    .limit(1);
  const hasOpenPattern = (patternRows?.length ?? 0) > 0;
  const hasDueRetest = (retestRows?.length ?? 0) > 0;
  if (hasOpenPattern || hasDueRetest) availableData.add("next_best_action");

  // ── recent_activity (T1) — a session closed since the layout was last read ─
  const { data: recentSessionRows } = await supabase
    .from("study_sessions")
    .select("session_id, closed_at")
    .eq("student_id", studentId)
    .eq("state", "VERIFIED")
    .order("closed_at", { ascending: false })
    .limit(1);
  const lastAccomplishment = recentSessionRows?.[0] as { session_id: string; closed_at: string } | undefined;
  if (lastAccomplishment) availableData.add("accomplishments");

  // ── exams (T3) — the record's own dated papers, read the same way
  //    app/home/page.tsx's client-side soonestExam() does, server-side here ─
  const { data: userDataRow } = await supabase.from("user_data").select("blob").eq("user_id", studentId).maybeSingle();
  const blob = (userDataRow?.blob ?? null) as { exams?: unknown } | null;
  const exams = Array.isArray(blob?.exams) ? (blob!.exams as Parameters<typeof soonestExam>[0]) : undefined;
  const nextExam = soonestExam(exams);
  if (nextExam) availableData.add("upcoming_exams");

  // ── build the signals a component can legitimately carry ─────────────────
  const signals: HomeImportanceSignal[] = [];

  if (nextExam && nextExam.days <= CRITICAL_EXAM_DAYS) {
    signals.push(
      buildImportanceSignal({
        componentId: "exams",
        tier: "critical",
        trigger: "exam_within_critical_window",
        evidenceRefs: [{ refKind: "exam", id: `${nextExam.subject}:${nextExam.name}` }],
        // Resolution condition, not a deadline field the exam object itself
        // carries — the condition IS the deadline passing.
        resolvesAtMs: nowMs + nextExam.days * 86_400_000,
      }),
    );
  }

  if (hasDueRetest) {
    signals.push(
      buildImportanceSignal({
        componentId: "recommendation",
        tier: "promoted",
        trigger: "due_retest",
        evidenceRefs: [{ refKind: "pattern", id: String(retestRows?.[0]?.pattern_id ?? "unknown") }],
      }),
    );
  } else if (hasOpenPattern) {
    signals.push(
      buildImportanceSignal({
        componentId: "recommendation",
        tier: "promoted",
        trigger: "recurrence",
        evidenceRefs: [{ refKind: "pattern", id: String(patternRows?.[0]?.id ?? "unknown") }],
      }),
    );
  }

  if (lastAccomplishment) {
    const closedAtMs = Date.parse(lastAccomplishment.closed_at);
    // Only "recent" if it happened since the layout itself was last read —
    // an accomplishment from months ago is not a fresh highlight.
    if (layout.updatedAtMs === null || closedAtMs > layout.updatedAtMs) {
      signals.push(
        buildImportanceSignal({
          componentId: "recent_activity",
          tier: "highlighted",
          trigger: "new_accomplishment",
          evidenceRefs: [{ refKind: "session", id: lastAccomplishment.session_id }],
        }),
      );
    }
  }

  const composition = resolveHomeComposition({ layout, availableData, importanceSignals: signals, viewport, nowMs });

  // ── M.5.5 — log every promotion, as service_role (034 §2's whole point) ──
  if (composition.promotions.length > 0) {
    const svc = serviceClient();
    await svc.from("home_importance_promotions").insert(
      composition.promotions.map(p => ({
        student_id: studentId,
        component_id: p.componentId,
        tier: p.tier,
        trigger: p.trigger,
        evidence_refs: p.evidenceRefs,
        promoted_at: new Date(p.promotedAtMs).toISOString(),
      })),
    );
  }

  // ── content — the small, honest facts each widget needs to render, drawn
  // from the SAME reads above (never a second, duplicate query, never a
  // fabricated figure for a component the availableData set already omits) ─
  const content: Record<string, unknown> = {};
  if (hasDueRetest || hasOpenPattern) {
    content.recommendation = { hasDueRetest, hasOpenPattern };
  }
  if (lastAccomplishment) {
    content.recent_activity = { sessionId: lastAccomplishment.session_id, closedAtMs: Date.parse(lastAccomplishment.closed_at) };
  }
  if (nextExam) {
    content.exams = { subject: nextExam.subject, name: nextExam.name, days: nextExam.days };
  }

  return NextResponse.json({
    ok: true,
    layout,
    registry: listHomeComponents(),
    composition,
    content,
  });
}

export async function PUT(req: Request) {
  const { supabase, user, error: authError } = await authenticate(req);
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // The one gate — same function `tests/home-composition.test.mjs` exercises
  // directly. Never trust a client's own validation; re-validate here.
  const result = validateHomeLayout(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  const studentId = user.id;
  const { error: upsertError } = await supabase
    .from("home_layout")
    .upsert({ student_id: studentId, entries: result.layout.entries }, { onConflict: "student_id" });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, layout: result.layout });
}

