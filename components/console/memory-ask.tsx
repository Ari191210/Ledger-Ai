"use client";

import { useState } from "react";
import { Control, Field, Panel, Row, Stack, Text } from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// M23-2/M23-3 — ASK THE RECORD.
//
// The entry point Part H specifies: a question in, a cited answer or an
// honest refusal out — never a guess. Lives on `/record` because H.4's five
// example questions are all questions ABOUT the longitudinal asset that page
// already is ("Proof the ledger accumulates" — app/record/page.tsx's own
// header), and CONSOLE.md §6.7: *"No surface ever lists tools. Search and
// command are how a student reaches anything."* This is not a tool in the
// nav — it is the record answering a question about itself.
//
// One fetch, no client-side Supabase — `/api/memory/query` reads identity
// from the session cookie exactly as `/api/capture/extract` already does
// (`createStudentServerClient()`), so this component carries no auth code of
// its own.
// ═══════════════════════════════════════════════════════════════════════════

type Citation = { recordType: string; id: string; timestamp: string | null };
type Outcome =
  | { ok: true; query: unknown; answer: string; citations: Citation[]; rows: unknown[] }
  | { ok: false; reason: "unanswerable" | "unparseable"; message: string; offeredFilters: unknown };

export default function MemoryAsk() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "done"; outcome: Outcome } | { kind: "error"; detail: string }
  >({ kind: "idle" });

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/memory/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        setState({ kind: "error", detail: "That couldn't be answered right now — try again." });
        return;
      }
      const body = (await res.json()) as { ok: boolean; outcome?: Outcome; error?: string };
      if (!body.ok || !body.outcome) {
        setState({ kind: "error", detail: "That couldn't be answered right now — try again." });
        return;
      }
      setState({ kind: "done", outcome: body.outcome });
    } catch {
      setState({ kind: "error", detail: "That couldn't be answered right now — try again." });
    }
  };

  return (
    <Panel tone="raised" pad={4}>
      <Stack gap={3}>
        <Text step="label" tone="ink" weight={600}>
          Ask the record
        </Text>
        <Field
          label="Ask a question about what you've studied"
          hideLabel
          value={question}
          onChange={setQuestion}
          placeholder="e.g. What have I studied but never been tested on?"
        />
        <Row gap={2}>
          <Control tier="secondary" type="submit" onClick={ask} disabled={state.kind === "loading" || !question.trim()}>
            {state.kind === "loading" ? "Reading the record…" : "Ask"}
          </Control>
        </Row>

        {state.kind === "error" && (
          <Text step="body" tone="secondary">
            {state.detail}
          </Text>
        )}

        {state.kind === "done" && state.outcome.ok && (
          <Stack gap={2}>
            <Text step="body">{state.outcome.answer}</Text>
            {state.outcome.citations.length > 0 && (
              <Text step="micro" tone="secondary">
                {state.outcome.citations.length} record{state.outcome.citations.length === 1 ? "" : "s"} cited:{" "}
                {state.outcome.citations.map(c => `${c.recordType}:${c.id.slice(0, 8)}`).join(", ")}
              </Text>
            )}
          </Stack>
        )}

        {state.kind === "done" && !state.outcome.ok && (
          <Stack gap={2}>
            <Text step="body">{state.outcome.message}</Text>
            <Text step="micro" tone="secondary">
              Try: {(state.outcome.offeredFilters as { intents: string[] }).intents.join(", ")}
            </Text>
          </Stack>
        )}
      </Stack>
    </Panel>
  );
}
