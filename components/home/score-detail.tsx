"use client";

import type { ScoreBreakdown } from "@/lib/ledger-score";
import { Stack, Row, Rule, Text, Readout, Track, Empty } from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// SCORE DETAIL — the "how it adds up" and "by subject" sections on Home.
//
// Every figure here already exists on `ScoreBreakdown`, computed once by
// `computeLedgerScore()` in `app/home/page.tsx` — this component adds no
// fetch, no derivation, no number that isn't already the score's own working.
// It exists because that working was being thrown away: the shell rendered
// only `total`, and a real per-subject and per-pillar breakdown sat unused in
// the same object.
//
// TWO LISTS, NOT CARDS. Hairline rows read top-to-bottom, exactly like the
// rest of Console (`--elev` shadows and rounded-card grids are permanently
// banned, `PRODUCT_PRINCIPLES.md` §5). Nothing here is an identical box
// repeated — a subject row and a pillar row carry different information in a
// different shape on purpose.
//
// NEVER `streak`. `ScoreBreakdown.streak` still exists on the type (retired,
// M14-2) so old literals keep compiling — this component does not read it,
// and does not read `consistencyScore` either (same retirement, §9.3).
// ═══════════════════════════════════════════════════════════════════════════

const PILLARS: ReadonlyArray<{
  key: "pqaScore" | "syllabusScore" | "mistakeScore";
  label: string;
  max: number;
}> = [
  { key: "pqaScore", label: "Practice accuracy", max: 400 },
  { key: "syllabusScore", label: "Syllabus mapped", max: 250 },
  { key: "mistakeScore", label: "Mistakes resolved", max: 200 },
];

export default function ScoreDetail({ score }: { score: ScoreBreakdown }) {
  const subjects = score.subjectAccuracy ?? [];

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <Text step="label">How this adds up</Text>
        <Stack gap={4}>
          {PILLARS.map((p, i) => {
            const value = score[p.key] ?? 0;
            return (
              <Stack gap={2} key={p.key}>
                {i > 0 && <Rule />}
                <Row justify="between" align="baseline">
                  <Text step="body" tone="secondary">{p.label}</Text>
                  <Row gap={1} align="baseline">
                    <Readout value={value} step="body" label={`${p.label}: ${value} of ${p.max} points`} />
                    <Text step="label" tone="ghost">/ {p.max}</Text>
                  </Row>
                </Row>
                <Track value={p.max > 0 ? value / p.max : 0} size="compact" label={`${p.label} progress`} />
              </Stack>
            );
          })}
        </Stack>
      </Stack>

      <Stack gap={3}>
        <Text step="label">By subject</Text>
        {subjects.length === 0 ? (
          <Empty
            title="No subject data yet"
            body="Accuracy breaks down by subject once you finish sessions in more than one."
            action={{ label: "Start a session", href: "/tools/exam-practice" }}
          />
        ) : (
          <Stack gap={3}>
            {subjects.map((s, i) => {
              const pct = Math.round(s.accuracy * 100);
              return (
                <Stack gap={2} key={s.subject}>
                  {i > 0 && <Rule />}
                  <Row justify="between" align="baseline">
                    <Text step="body" tone="ink">{s.subject}</Text>
                    <Row gap={2} align="baseline">
                      <Text step="label" tone="secondary">
                        {s.sessions} session{s.sessions === 1 ? "" : "s"}
                      </Text>
                      <Row gap={1} align="baseline">
                        <Readout value={pct} step="body" label={`${s.subject} accuracy: ${pct} percent`} />
                        <Text step="label" tone="ghost">%</Text>
                      </Row>
                    </Row>
                  </Row>
                  <Track value={s.accuracy} size="compact" label={`${s.subject} accuracy`} />
                </Stack>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
