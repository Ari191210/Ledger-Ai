"use client";

import { useEffect, useState } from "react";
import {
  Stack,
  Row,
  Spacer,
  Rule,
  Measure,
  Panel,
  Text,
  Control,
  Chip,
  Readout,
  Track,
} from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// STRESS TEST 3 — PRACTICE
//
// NOT a production surface. An unlinked harness attacking the vocabulary with
// dense interaction: questions, options, a timer, immediate feedback, review.
//
// The timer is the deliberate attack on the motion language: Console bans
// perpetual motion ("everything settles"), and a countdown is by definition
// never at rest. Findings are recorded in the report, not patched here.
// ═══════════════════════════════════════════════════════════════════════════

type Q = { q: string; options: string[]; answer: number; why: string };

const SAMPLE: Q[] = [
  {
    q: "A body moves with constant speed in a circle. What is true of its acceleration?",
    options: ["It is zero", "It is constant in magnitude and direction", "It points to the centre", "It points along the velocity"],
    answer: 2,
    why: "Speed is constant but direction changes, so acceleration is centripetal — directed at the centre.",
  },
  {
    q: "Which is the strongest reducing agent?",
    options: ["F₂", "Li", "Cl⁻", "Na⁺"],
    answer: 1,
    why: "Lithium has the most negative standard electrode potential, so it is most readily oxidised.",
  },
];

export default function PracticeStressPage() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const q = SAMPLE[i];
  const answered = picked !== null;
  const isRight = picked === q.answer;

  function choose(n: number) {
    if (answered) return;
    setPicked(n);
    if (n === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    setPicked(null);
    setI((n) => (n + 1) % SAMPLE.length);
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <Measure>
      <Stack gap={5}>
        <Row gap={3}>
          <Text step="label">Practice · stress test</Text>
          <Spacer />
          {/* THE ATTACK: a running clock. Readout rolls on every change, so a
              per-second timer rolls forever — perpetual motion, which the
              motion language forbids. Recorded as finding D-1. */}
          <Readout value={mins} label={`${mins} minutes elapsed`} />
          <Text step="label">m</Text>
          <Readout value={secs} label={`${secs} seconds`} />
          <Text step="label">s</Text>
        </Row>

        <Track value={(i + (answered ? 1 : 0)) / SAMPLE.length} label="Set progress" />

        <Rule />

        <Stack gap={4}>
          <Row gap={2}>
            <Text step="label">
              Question {i + 1} of {SAMPLE.length}
            </Text>
            <Spacer />
            <Chip tone="progress">{correct} correct</Chip>
          </Row>

          <Text step="title" as="h1" weight={500}>
            {q.q}
          </Text>

          <Stack gap={2}>
            {q.options.map((opt, n) => {
              // FRICTION: options need three visual states — unanswered,
              // chosen-and-right, chosen-and-wrong — plus "this was the right
              // one" after a wrong pick. Control has tiers, not states, and
              // Panel has tone but no semantic status. Recorded as finding B-1.
              const showRight = answered && n === q.answer;
              const showWrong = answered && n === picked && !isRight;
              return (
                <Panel key={opt} tone={showRight || showWrong ? "recessed" : "flat"} pad={3} bordered>
                  <Row gap={3}>
                    <Text tone={answered && !showRight && !showWrong ? "ghost" : "ink"}>{opt}</Text>
                    <Spacer />
                    {showRight && <Chip tone="progress">correct</Chip>}
                    {showWrong && <Chip tone="error">your answer</Chip>}
                    {!answered && (
                      <Control tier="secondary" onClick={() => choose(n)}>
                        Choose
                      </Control>
                    )}
                  </Row>
                </Panel>
              );
            })}
          </Stack>

          {answered && (
            <Panel tone="raised" pad={4} bordered>
              <Stack gap={2}>
                <Text step="label">Why</Text>
                <Text>{q.why}</Text>
              </Stack>
            </Panel>
          )}

          {answered && (
            <Row gap={2}>
              <Control tier="primary" onClick={next}>
                Next question
              </Control>
              <Control tier="tertiary" href="/console">
                Stop
              </Control>
            </Row>
          )}
        </Stack>
      </Stack>
    </Measure>
  );
}
