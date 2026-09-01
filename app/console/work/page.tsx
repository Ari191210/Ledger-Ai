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
  Chip,
  Empty,
  Readout,
  Track,
} from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// STRESS TEST 1 — WORK
//
// NOT a production surface. An unlinked harness built to attack the Console
// vocabulary with a task-oriented workspace: hierarchy, actions, progress.
// Sample data is obviously synthetic and never rendered as if it were the
// student's own.
//
// Built with ONLY the 13 primitives. No inline styles, no style props, no raw
// values. Friction is recorded in the Phase 2 report, not patched here.
// ═══════════════════════════════════════════════════════════════════════════

type Task = { id: string; title: string; subject: string; est: number; done: boolean };

const SAMPLE: Task[] = [
  { id: "a", title: "Rotational motion — worked examples", subject: "Physics", est: 40, done: true },
  { id: "b", title: "Electrochemistry past paper", subject: "Chemistry", est: 60, done: true },
  { id: "c", title: "Integration by parts drill", subject: "Maths", est: 30, done: false },
  { id: "d", title: "Review yesterday's mistakes", subject: "Physics", est: 20, done: false },
  { id: "e", title: "Organic reactions flashcards", subject: "Chemistry", est: 25, done: false },
];

export default function WorkStressPage() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE);

  const done = tasks.filter((t) => t.done).length;
  const minutes = tasks.filter((t) => !t.done).reduce((n, t) => n + t.est, 0);

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <Measure wide>
      <Stack gap={6}>
        <Stack gap={3}>
          <Text step="label">Work · stress test</Text>
          <Row gap={4} align="baseline">
            <Readout value={done} step="display" label={`${done} of ${tasks.length} done`} />
            <Stack gap={1}>
              <Text step="label">of {tasks.length} complete</Text>
              <Text step="label" tone="secondary">
                {minutes} minutes remaining
              </Text>
            </Stack>
            <Spacer />
            <Control tier="primary" onClick={() => setTasks(SAMPLE)}>
              Reset
            </Control>
          </Row>
          <Track value={tasks.length ? done / tasks.length : 0} label="Session progress" />
        </Stack>

        <Rule />

        <Stack gap={3}>
          <Text step="label">Today</Text>

          {tasks.length === 0 ? (
            <Empty
              title="Nothing queued"
              body="Add work from the planner and it appears here."
              action={{ label: "Open planner", href: "/tools/study-command" }}
            />
          ) : (
            <Stack gap={2}>
              {tasks.map((t) => (
                <Panel key={t.id} tone="raised" pad={3} bordered>
                  <Row gap={3}>
                    <Stack gap={1}>
                      <Text weight={500} tone={t.done ? "ghost" : "ink"}>
                        {t.title}
                      </Text>
                      <Row gap={2}>
                        <Text step="label">{t.subject}</Text>
                        <Text step="label" tone="secondary">
                          {t.est}m
                        </Text>
                        {t.done && <Chip tone="progress">done</Chip>}
                      </Row>
                    </Stack>
                    <Spacer />
                    <Control tier={t.done ? "tertiary" : "secondary"} onClick={() => toggle(t.id)}>
                      {t.done ? "Undo" : "Mark done"}
                    </Control>
                  </Row>
                </Panel>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Measure>
  );
}
