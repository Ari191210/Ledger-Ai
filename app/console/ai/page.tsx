"use client";

import { useState } from "react";
import {
  Stack,
  Row,
  Spacer,
  Rule,
  Measure,
  Panel,
  Text,
  Control,
  Field,
  Chip,
  Empty,
} from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// STRESS TEST 2 — AI
//
// NOT a production surface. An unlinked harness attacking the vocabulary with
// a conversational interface: history, streaming, suggestions, empty state.
//
// This is where the system was expected to fail. Findings are recorded in the
// Phase 2 report; nothing is patched here.
// ═══════════════════════════════════════════════════════════════════════════

type Turn = { id: number; role: "student" | "ledger"; text: string; streaming?: boolean };

const SUGGESTIONS = [
  "Explain integration by parts",
  "Why did I lose marks on Q4?",
  "Make me 10 flashcards on redox",
];

export default function AiStressPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    const id = Date.now();
    setTurns((p) => [
      ...p,
      { id, role: "student", text },
      { id: id + 1, role: "ledger", text: "", streaming: true },
    ]);
    setDraft("");

    // Simulated stream. The real route is /api/ai; this harness only needs to
    // prove the vocabulary can express text arriving progressively.
    const full =
      "Integration by parts comes from the product rule. You choose u and dv, " +
      "then apply ∫u dv = uv − ∫v du. Pick u so that differentiating it gets simpler.";
    let i = 0;
    const tick = setInterval(() => {
      i += 4;
      setTurns((p) =>
        p.map((t) =>
          t.id === id + 1 ? { ...t, text: full.slice(0, i), streaming: i < full.length } : t,
        ),
      );
      if (i >= full.length) clearInterval(tick);
    }, 24);
  }

  return (
    <Measure>
      <Stack gap={5}>
        <Row gap={3}>
          <Text step="label">AI · stress test</Text>
          <Spacer />
          {turns.length > 0 && (
            <Control tier="tertiary" onClick={() => setTurns([])}>
              Clear
            </Control>
          )}
        </Row>

        <Rule />

        {turns.length === 0 ? (
          <Stack gap={5}>
            <Empty
              title="Ask anything about your syllabus"
              body="Answers are grounded in the subjects and board on your profile."
              action={{ label: "Open Learn Lab", href: "/tools/learn-lab" }}
            />
            <Stack gap={2}>
              <Text step="label">Try</Text>
              {SUGGESTIONS.map((s) => (
                <Control key={s} tier="secondary" onClick={() => send(s)}>
                  {s}
                </Control>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack gap={4}>
            {turns.map((t) =>
              t.role === "student" ? (
                <Stack key={t.id} gap={1}>
                  <Text step="label">You</Text>
                  <Text>{t.text}</Text>
                </Stack>
              ) : (
                <Panel key={t.id} tone="raised" pad={4} bordered>
                  <Stack gap={2}>
                    <Row gap={2}>
                      <Text step="label">Ledger</Text>
                      {t.streaming && <Chip tone="info">writing</Chip>}
                    </Row>
                    <Text>{t.text}</Text>
                  </Stack>
                </Panel>
              ),
            )}
          </Stack>
        )}

        <Rule />

        <Stack gap={3}>
          <Field
            label="Ask a question"
            hideLabel
            value={draft}
            onChange={setDraft}
            placeholder="Ask anything…"
            multiline
          />
          <Row gap={2}>
            <Control tier="primary" onClick={() => send(draft)} disabled={!draft.trim()}>
              Send
            </Control>
            <Control tier="tertiary" onClick={() => setDraft("")}>
              Clear
            </Control>
          </Row>
        </Stack>
      </Stack>
    </Measure>
  );
}
