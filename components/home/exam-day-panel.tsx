"use client";

// ═══════════════════════════════════════════════════════════════════════════
// EXAM-DAY PANEL — Home's exam state (M3-2).
//
// `PRODUCT_DECISIONS` §2.4: exam-day is a *state* of Home, not a place.
// This is the in-page expression of that state. It renders on `/home` when
// `examProximity()` fires, from the same `lib/exam-day.ts` functions the
// `/tools/exam-day` route reads — so there is one definition of "what the
// student's gaps are", not two.
//
// What it deliberately does NOT do: run the AI sweep. Generating and grading
// the ten-question drill is an assessment flow, and M3 is a structural merge,
// not the place to rebuild one. The sweep stays where it is and this panel
// hands off to it. That handoff is a control, not navigation the student had
// to discover — the state arrived on Home by itself.
//
// No figure is projected for closing these gaps: no production action can
// resolve a mistake yet, so any number here would be a promise the system
// cannot pay (`PRODUCT_PRINCIPLES` Law 7).
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  WINDOW_DAYS,
  getGaps,
  mostMissedSubject,
  type ExamProximity,
  type Gap,
  type UpcomingExam,
} from "@/lib/exam-day";
import { Stack, Row, Spacer, Rule, Text, Control, Chip } from "@/components/console/primitives";

export default function ExamDayPanel({
  exam,
  proximity,
}: {
  exam: UpcomingExam;
  proximity: Exclude<ExamProximity, "none">;
}) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [misses, setMisses] = useState(0);
  const [source, setSource] = useState<"recent" | "all-time">("recent");
  const [subject, setSubject] = useState<string>(exam.subject);

  useEffect(() => {
    const g = getGaps(exam.name);
    setGaps(g.gaps);
    setMisses(g.misses);
    setSource(g.source);
    setSubject(exam.subject || mostMissedSubject() || "General");
  }, [exam.name, exam.subject]);

  const when =
    exam.days === 0 ? "Today" : exam.days === 1 ? "Tomorrow" : `In ${exam.days} days`;

  return (
    <Stack gap={4}>
      <Row gap={3}>
        <Text step="label" tone="ink" weight={600}>
          {proximity === "exam-day" ? "Exam day" : "Paper approaching"}
        </Text>
        <Spacer />
        <Chip tone="info">
          {when} · {exam.name}
        </Chip>
      </Row>

      <Text step="title" as="h2" weight={500}>
        {exam.days === 0 ? `${exam.name}. Today.` : `${exam.name} — ${when.toLowerCase()}.`}
      </Text>

      {gaps.length > 0 ? (
        <Stack gap={3}>
          <Text step="label">
            {source === "recent"
              ? `Last ${WINDOW_DAYS} days · ${misses} miss${misses === 1 ? "" : "es"} · ${gaps.length} gap${gaps.length === 1 ? "" : "s"}. No decisions — just these.`
              : `Nothing missed in ${WINDOW_DAYS} days — your all-time weak topics instead.`}
          </Text>
          <Rule />
          <Stack gap={2}>
            {gaps.map((g) => (
              <Row key={g.topic} gap={3}>
                <Text step="body">{g.topic}</Text>
                <Spacer />
                <Text step="label">
                  ×{g.count}
                  {g.topCategory ? ` · ${g.topCategory}` : ""}
                </Text>
              </Row>
            ))}
          </Stack>
        </Stack>
      ) : (
        <Text step="label">
          Nothing logged for {subject} yet. The sweep can build a plan from five questions.
        </Text>
      )}

      <Row gap={2} wrap>
        <Control tier="primary" href="/tools/exam-day">
          Sweep these gaps
        </Control>
        <Control href="/tools/panic-triage">Triage the hours left</Control>
        <Control href="/tools/exam-triage">Last-night plan</Control>
      </Row>
    </Stack>
  );
}
