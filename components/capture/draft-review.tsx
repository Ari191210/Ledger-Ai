"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, Control, Panel, Row, Rule, Spacer, Stack, Text } from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// M8-5 — THE CONFIRMATION SURFACE.
//
// Draft occurrences, and one control that turns a draft into record.
//
// THE UI IS NOT THE GATE, AND SAYS SO. `020`'s RLS policy refuses a second
// confirmation and an un-confirmation; this component simply stops rendering
// the control, because there is nothing left to press. If a client re-sent the
// request anyway — a stale tab, a retried fetch, a curl — the database would
// answer, not this file. That is the M8-5 done-when.
//
// It renders EXTRACTED and TYPED drafts identically, on purpose. Both are
// proposals; `origin` is shown as provenance ("read from your paper" / "typed
// by you") and buys neither of them any standing.
//
// No new visual language: console primitives only, the same vocabulary
// `/capture` already speaks.
// ═══════════════════════════════════════════════════════════════════════════

export interface DraftRow {
  id: string;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  question_ref?: string | null;
  marks_lost?: number | null;
  marks_available?: number | null;
  cognitive_error?: string | null;
  execution_error?: string | null;
  origin?: string | null;
  proposal_confidence?: number | null;
  confirmed_at?: string | null;
}

export interface ReviewItem {
  question: string;
  candidates: Array<{ label: string; confidence: number; rationale: string }>;
}

interface Props {
  /** Drafts the parent already has (a fresh extraction, a fresh manual entry). */
  seed?: DraftRow[];
  /** What the reading declined to assert. Shown, never swallowed. */
  review?: ReviewItem[];
  /** The run these drafts belong to, so confirming also closes `008`'s gate. */
  runId?: string | null;
  /** Invoked when the student asks to type one in instead. */
  onManual?: () => void;
}

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "sending" }
  | { phase: "error"; detail: string };

const errorOf = (d: DraftRow): string =>
  [d.cognitive_error, d.execution_error].filter(Boolean).join(" · ") || "unclassified";

const originLabel = (origin?: string | null): string =>
  origin === "manual" ? "Typed by you" : origin === "extraction" ? "Read from your paper" : "Proposed";

export default function DraftReview({ seed = [], review = [], runId = null, onManual }: Props) {
  const [drafts, setDrafts] = useState<DraftRow[]>(seed);
  const [confirmed, setConfirmed] = useState<DraftRow[]>([]);
  const [state, setState] = useState<State>({ phase: "idle" });

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/capture/confirm", { method: "GET" });
      const data = (await res.json()) as { ok?: boolean; drafts?: DraftRow[] };
      if (!res.ok || !data.ok) {
        setState({ phase: "error", detail: "your drafts could not be read" });
        return;
      }
      setDrafts(data.drafts ?? []);
      setState({ phase: "idle" });
    } catch {
      setState({ phase: "error", detail: "the network did not answer" });
    }
  }, []);

  useEffect(() => {
    if (seed.length > 0) {
      setDrafts(seed);
      return;
    }
    void load();
  }, [seed, load]);

  async function confirm(ids: string[]) {
    if (ids.length === 0) return;
    setState({ phase: "sending" });
    try {
      const res = await fetch("/api/capture/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occurrence_ids: ids, run_id: runId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        confirmed?: DraftRow[];
        refused?: Array<{ occurrenceId: string; detail: string }>;
      };

      if (!res.ok || !data.ok) {
        setState({ phase: "error", detail: "nothing was confirmed" });
        return;
      }

      const done = new Set((data.confirmed ?? []).map(r => r.id));
      setConfirmed(prev => [...prev, ...(data.confirmed ?? [])]);
      // A refused id is REMOVED from the list too. The database has already
      // decided about it; leaving a dead control on screen would invite a
      // second press the policy will refuse again.
      const refusedIds = new Set((data.refused ?? []).map(r => r.occurrenceId));
      setDrafts(prev => prev.filter(d => !done.has(d.id) && !refusedIds.has(d.id)));
      setState({ phase: "idle" });
    } catch {
      setState({ phase: "error", detail: "the network did not answer" });
    }
  }

  const busy = state.phase === "sending" || state.phase === "loading";

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Text step="label">Waiting for you</Text>
        <Text step="body" tone="secondary">
          Nothing below is in your record yet. Confirm the ones that are right —
          it happens once, and cannot be undone.
        </Text>
      </Stack>

      {drafts.length === 0 && confirmed.length === 0 && state.phase !== "loading" && (
        <Stack gap={3}>
          <Text step="body">Nothing is waiting.</Text>
          {onManual && (
            <Row gap={2}>
              <Control tier="secondary" onClick={onManual}>
                Type in what you got wrong
              </Control>
            </Row>
          )}
        </Stack>
      )}

      {drafts.map(d => (
        <Panel key={d.id} tone="raised" pad={4} bordered>
          <Stack gap={3}>
            <Row gap={2}>
              <Text step="label" weight={600}>
                {d.question_ref || "—"}
              </Text>
              <Spacer />
              <Chip tone="info">{originLabel(d.origin)}</Chip>
            </Row>

            <Text step="body">
              {[d.subject, d.chapter, d.topic].filter(Boolean).join(" · ") || "—"}
            </Text>

            <Row gap={3}>
              <Text step="micro" tone="secondary">
                {d.marks_lost ?? "—"} of {d.marks_available ?? "—"} marks
              </Text>
              <Text step="micro" tone="secondary">{errorOf(d)}</Text>
              {typeof d.proposal_confidence === "number" && (
                <Text step="micro" tone="secondary">
                  read at {Math.round(d.proposal_confidence * 100)}%
                </Text>
              )}
            </Row>

            <Row gap={2}>
              <Control tier="primary" onClick={() => confirm([d.id])} disabled={busy}>
                Confirm
              </Control>
            </Row>
          </Stack>
        </Panel>
      ))}

      {drafts.length > 1 && (
        <Row gap={2}>
          <Control tier="secondary" onClick={() => confirm(drafts.map(d => d.id))} disabled={busy}>
            Confirm all {drafts.length}
          </Control>
        </Row>
      )}

      {confirmed.length > 0 && (
        <>
          <Rule />
          <Stack gap={2}>
            <Chip tone="progress">In your record</Chip>
            <Text step="body">
              {confirmed.length} confirmed. That is now part of the record and stays there.
            </Text>
          </Stack>
        </>
      )}

      {review.length > 0 && (
        <>
          <Rule />
          <Stack gap={3}>
            <Text step="label">Not confident enough to propose</Text>
            <Text step="body" tone="secondary">
              These were considered and not written. Nothing was guessed.
            </Text>
            {review.map((item, i) => (
              <Panel key={`${item.question}-${i}`} tone="recessed" pad={3}>
                <Stack gap={2}>
                  <Text step="body">{item.question}</Text>
                  {item.candidates.map((c, j) => (
                    <Text key={j} step="micro" tone="secondary">
                      {c.label} — {c.rationale}
                    </Text>
                  ))}
                </Stack>
              </Panel>
            ))}
            {onManual && (
              <Row gap={2}>
                <Control tier="secondary" onClick={onManual}>
                  Type it in yourself
                </Control>
              </Row>
            )}
          </Stack>
        </>
      )}

      {state.phase === "error" && (
        <Stack gap={2}>
          <Chip tone="error">Not confirmed</Chip>
          <Text step="body">{state.detail}</Text>
        </Stack>
      )}
    </Stack>
  );
}
