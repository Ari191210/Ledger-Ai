"use client";

import { useState } from "react";
import { Chip, Control, Field, Row, Stack, Text } from "@/components/console/primitives";
import type { DraftRow } from "./draft-review";

// ═══════════════════════════════════════════════════════════════════════════
// M8-6 — MANUAL ENTRY.
//
// *"A paper can be captured with zero model involvement."*
//
// This form posts to `/api/capture/manual`, which imports nothing that could
// reach a model. It is not the extraction form with a checkbox: there is no
// shared request, no shared endpoint and no shared flag. The only thing it
// shares with extraction is where the result goes — a DRAFT occurrence, through
// the same `/api/capture/confirm` gate, under the same `020` policy.
//
// The error taxonomy is presented as two rows of controls rather than a select,
// because the cognitive/execution split is the most important distinction in
// the schema (`PRODUCT_DECISIONS` §4.5) and burying it in a dropdown would make
// the two look like fourteen equivalent options. A student picks one, or one of
// each, and nothing is preselected — a default here would be the product
// guessing what went wrong, which is the one thing this path exists to avoid.
// ═══════════════════════════════════════════════════════════════════════════

const COGNITIVE = [
  "not-known", "misconception", "wrong-method",
  "incomplete-understanding", "misapplied-rule", "cannot-recall-formula",
] as const;

const EXECUTION = [
  "misread-question", "arithmetic-slip", "sign-error", "unit-error",
  "ran-out-of-time", "incomplete-answer", "missed-working",
  "transcription", "presentation",
] as const;

const label = (id: string) => id.replace(/-/g, " ");

interface Props {
  /** A paper already captured, if this entry is about one. Optional: without
   *  it the endpoint stores what was typed as `manual` evidence, which is the
   *  honest source (it is what the student actually gave us). */
  evidenceId?: string | null;
  onDrafted?: (drafts: DraftRow[], runId: string | null) => void;
}

type State =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "refused"; detail: string }
  | { phase: "done"; count: number };

export default function ManualEntry({ evidenceId = null, onDrafted }: Props) {
  const [topic, setTopic] = useState("");
  const [questionRef, setQuestionRef] = useState("");
  const [marksLost, setMarksLost] = useState("");
  const [marksAvailable, setMarksAvailable] = useState("");
  const [cognitive, setCognitive] = useState<string | null>(null);
  const [execution, setExecution] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });

  const ready =
    topic.trim().length > 0 &&
    (cognitive !== null || execution !== null) &&
    marksLost.trim().length > 0 &&
    marksAvailable.trim().length > 0;

  async function send() {
    if (!ready) return;
    setState({ phase: "sending" });
    try {
      const res = await fetch("/api/capture/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          evidence_id: evidenceId,
          topic: topic.trim(),
          question_ref: questionRef.trim(),
          marks_lost: Number(marksLost),
          marks_available: Number(marksAvailable),
          cognitive_error: cognitive,
          execution_error: execution,
          student_answer: answer.trim(),
          note: note.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        declared_text?: string;
        drafts?: DraftRow[];
        run_id?: string | null;
      };

      if (!res.ok || !data.ok) {
        // The unresolved-topic refusal hands the student their own words back
        // verbatim, because the system did not understand them and pretending
        // otherwise would put the mistake in the wrong chapter forever (B.4).
        const detail =
          data.error === "unresolved_topic"
            ? `"${data.declared_text ?? topic}" is not a topic in the syllabus we hold yet. ` +
              "Nothing was written. Try the chapter's own words for it."
            : data.detail ?? data.error ?? "the entry was refused";
        setState({ phase: "refused", detail });
        return;
      }

      const drafts = data.drafts ?? [];
      setState({ phase: "done", count: drafts.length });
      onDrafted?.(drafts, data.run_id ?? null);
      setTopic("");
      setQuestionRef("");
      setMarksLost("");
      setMarksAvailable("");
      setCognitive(null);
      setExecution(null);
      setAnswer("");
      setNote("");
    } catch {
      setState({ phase: "refused", detail: "the network did not answer" });
    }
  }

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Text step="label">Type it in</Text>
        <Text step="body" tone="secondary">
          No reading, no model, nothing interpreted. What you type is what is
          proposed, and you still confirm it before it enters the record.
        </Text>
      </Stack>

      <Field
        label="What was the question about"
        value={topic}
        onChange={setTopic}
        placeholder="Newton's second law"
        hint="The topic as your syllabus names it."
      />

      <Row gap={3}>
        <Field label="Question" value={questionRef} onChange={setQuestionRef} placeholder="Q7(b)" />
        <Field label="Marks lost" value={marksLost} onChange={setMarksLost} type="number" />
        <Field label="Out of" value={marksAvailable} onChange={setMarksAvailable} type="number" />
      </Row>

      <Stack gap={3}>
        <Text step="label">You did not know it</Text>
        <Row gap={2}>
          {COGNITIVE.map(id => (
            <Control
              key={id}
              tier={cognitive === id ? "primary" : "secondary"}
              onClick={() => setCognitive(cognitive === id ? null : id)}
            >
              {label(id)}
            </Control>
          ))}
        </Row>
      </Stack>

      <Stack gap={3}>
        <Text step="label">You knew it and lost the mark anyway</Text>
        <Row gap={2}>
          {EXECUTION.map(id => (
            <Control
              key={id}
              tier={execution === id ? "primary" : "secondary"}
              onClick={() => setExecution(execution === id ? null : id)}
            >
              {label(id)}
            </Control>
          ))}
        </Row>
      </Stack>

      <Field
        label="What you wrote"
        value={answer}
        onChange={setAnswer}
        multiline
        hint="Optional. Stored verbatim."
      />

      <Field label="A note for later" value={note} onChange={setNote} />

      <Row gap={2}>
        <Control tier="primary" onClick={send} disabled={!ready || state.phase === "sending"}>
          {state.phase === "sending" ? "Writing…" : "Propose it"}
        </Control>
        {!ready && (
          <Text step="micro" tone="secondary">
            A topic, the marks, and at least one of the two kinds of error.
          </Text>
        )}
      </Row>

      {state.phase === "refused" && (
        <Stack gap={2}>
          <Chip tone="error">Not written</Chip>
          <Text step="body">{state.detail}</Text>
        </Stack>
      )}

      {state.phase === "done" && (
        <Stack gap={2}>
          <Chip tone="info">Proposed</Chip>
          <Text step="body">
            {state.count === 1 ? "One draft" : `${state.count} drafts`} waiting for you to
            confirm. Nothing is in your record yet.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
