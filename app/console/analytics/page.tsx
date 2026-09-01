"use client";

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
// STRESS TEST 4 — ANALYTICS
//
// NOT a production surface. An unlinked harness attacking the vocabulary with
// charts, trends, comparisons and score history.
//
// This is where the system genuinely breaks. Horizontal comparisons compose
// beautifully out of Row + Track. A TREND OVER TIME does not: Track is a
// single one-dimensional fill, and nothing in the vocabulary can express a
// series of values across an axis. Recorded as finding B-2 — the only place in
// four pages where a workaround was impossible rather than merely awkward.
// ═══════════════════════════════════════════════════════════════════════════

const SECTORS = [
  { name: "Examination", value: 179, max: 400, delta: +12 },
  { name: "Coverage", value: 0, max: 250, delta: 0 },
  { name: "Recovery", value: 200, max: 200, delta: 0 },
  { name: "Momentum", value: 0, max: 150, delta: -8 },
];

const SUBJECTS = [
  { name: "Physics", accuracy: 0.72, papers: 6 },
  { name: "Chemistry", accuracy: 0.64, papers: 5 },
  { name: "Mathematics", accuracy: 0.81, papers: 3 },
];

const TOTAL = SECTORS.reduce((n, s) => n + s.value, 0);

export default function AnalyticsStressPage() {
  return (
    <Measure wide>
      <Stack gap={6}>
        <Stack gap={3}>
          <Text step="label">Analytics · stress test</Text>
          <Row gap={4} align="baseline">
            <Readout value={TOTAL} step="display" label={`Ledger Score ${TOTAL} of 1000`} />
            <Stack gap={1}>
              <Text step="label">of 1,000</Text>
              <Chip tone="progress">4 since last close</Chip>
            </Stack>
            <Spacer />
            <Control tier="secondary" href="/console">
              Back to now
            </Control>
          </Row>
          <Track value={TOTAL / 1000} label="Score progress" />
        </Stack>

        <Rule />

        {/* COMPOSES WELL — a comparison across categories is Row + Track,
            repeated. No new vocabulary needed. */}
        <Stack gap={3}>
          <Text step="label">Sectors</Text>
          <Stack gap={3}>
            {SECTORS.map((s) => (
              <Stack key={s.name} gap={2}>
                <Row gap={3} align="baseline">
                  <Text weight={500}>{s.name}</Text>
                  <Spacer />
                  <Readout value={s.value} label={`${s.name} ${s.value} of ${s.max}`} />
                  <Text step="label">/ {s.max}</Text>
                  {s.delta !== 0 && (
                    <Chip tone="progress" down={s.delta < 0}>
                      {Math.abs(s.delta)}
                    </Chip>
                  )}
                </Row>
                <Track value={s.value / s.max} label={`${s.name} progress`} />
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Rule />

        {/* ALSO COMPOSES — a per-subject comparison is the same shape. */}
        <Stack gap={3}>
          <Text step="label">Accuracy by subject</Text>
          <Stack gap={3}>
            {SUBJECTS.map((s) => (
              <Stack key={s.name} gap={2}>
                <Row gap={3} align="baseline">
                  <Text weight={500}>{s.name}</Text>
                  <Spacer />
                  <Readout value={Math.round(s.accuracy * 100)} label={`${s.name} accuracy`} />
                  <Text step="label">%</Text>
                  <Text step="label" tone="secondary">
                    {s.papers} papers
                  </Text>
                </Row>
                <Track value={s.accuracy} label={`${s.name} accuracy`} />
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Rule />

        {/* ── THE FAILURE ──────────────────────────────────────────────────
            A trend across 14 closes cannot be expressed. Track is a single
            one-dimensional fill; there is no primitive that renders a series
            against an axis, and no composition of Stack, Row, Panel or Track
            produces one — Panel has no height dimension to vary, so even a
            column chart is unreachable.

            Rendering the series as a list of figures is what the vocabulary
            CAN do. It is honest and readable, and for a handful of closes it
            is arguably better than a chart. It is not a trend, and pretending
            otherwise would be the kind of workaround this exercise exists to
            expose. */}
        <Stack gap={3}>
          <Row gap={2}>
            <Text step="label">Recent closes</Text>
            <Spacer />
            <Text step="micro">series, not a trend — see finding B-2</Text>
          </Row>
          <Panel tone="raised" pad={4} bordered>
            <Stack gap={3}>
              {[
                { d: "28 Jul", v: 379 },
                { d: "27 Jul", v: 375 },
                { d: "26 Jul", v: 375 },
                { d: "25 Jul", v: 362 },
                { d: "24 Jul", v: 358 },
              ].map((p, n, arr) => {
                const prev = arr[n + 1]?.v;
                const delta = prev === undefined ? 0 : p.v - prev;
                return (
                  <Row key={p.d} gap={3} align="baseline">
                    <Text step="label">{p.d}</Text>
                    <Spacer />
                    <Readout value={p.v} label={`${p.d}: ${p.v}`} />
                    {delta !== 0 && (
                      <Chip tone="progress" down={delta < 0}>
                        {Math.abs(delta)}
                      </Chip>
                    )}
                  </Row>
                );
              })}
            </Stack>
          </Panel>
        </Stack>
      </Stack>
    </Measure>
  );
}
