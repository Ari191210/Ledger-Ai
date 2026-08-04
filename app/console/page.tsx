"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, type Exam } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import { currentInputs } from "@/lib/score-projection";
import { deriveNextMove, nextExam, type NextMove } from "@/lib/console/next-move";
import {
  Stack,
  Row,
  Spacer,
  Rule,
  Measure,
  Text,
  Control,
  Chip,
  Empty,
  Readout,
  Track,
} from "@/components/console/primitives";

// ═══════════════════════════════════════════════════════════════════════════
// NOW — the first surface. CONSOLE.md §8.
//
// Answers one question: "What should I do right now?" Three beats, in reading
// order: where you are · what's coming · what to do.
//
// Rebuilt on the primitives as the Phase 1 gate, and now carries ZERO inline
// styles: every typographic, spacing, colour and motion decision comes from the
// vocabulary, so none of them can drift. Earned colour is inherited from
// VitalityShell in the layout rather than set here — vitality is shell state,
// and a page that sets it is a page that can forget to.
//
// There is no loading state by design: the score computes synchronously from
// local inputs, the shell paints immediately, and the roll from zero IS the
// arrival — faster and better than a skeleton.
// ═══════════════════════════════════════════════════════════════════════════

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/** Where the last-seen score is parked so the Return beat has something to
 *  measure against. Local by design: "since you were last here" is a device
 *  fact, not a claim about the account. */
const LAST_SEEN_KEY = "console:last-seen-score";

export default function NowPage() {
  const { user } = useAuth();
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [move, setMove] = useState<NextMove | null>(null);
  const [exam, setExam] = useState<{ days: number; subject: string } | null>(null);
  const [name, setName] = useState("");
  const [sinceLastSeen, setSinceLastSeen] = useState<number | null>(null);

  useEffect(() => {
    try {
      const s = computeLedgerScore();
      setScore(s);
      const inputs = currentInputs();
      if (inputs) setMove(deriveNextMove(inputs));

      // THE RETURN BEAT (§7). Evidence, not celebration: without it the screen
      // is identical every visit and the student learns their effort is
      // invisible — the failure mode of every study app.
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      const prev = raw === null ? null : Number(raw);
      if (prev !== null && Number.isFinite(prev) && s.total !== prev) {
        setSinceLastSeen(s.total - prev);
      }
      localStorage.setItem(LAST_SEEN_KEY, String(s.total));
    } catch {
      /* storage unavailable — the honest empty state covers it */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadUserData(user.id)
      .then((ud) => {
        if (alive) setExam(nextExam(ud?.exams as Exam[] | undefined));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    setName(
      (user?.user_metadata?.full_name as string | undefined) ??
        (user?.user_metadata?.name as string | undefined) ??
        user?.email?.split("@")[0] ??
        "",
    );
  }, [user]);

  const total = score?.total ?? 0;
  const tier = scoreTier(total);
  const toNext = Math.max(0, tier.nextAt - total);
  const today = new Date().toLocaleDateString("en-GB", DATE_FMT);

  return (
    <main id="main-content">
      {/* CHROME — the Score lives here on every surface, like a battery
          indicator, never as a card (§5.3). */}
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <Readout value={total} label={`Ledger Score ${total} of 1000`} />
            <Track value={total / 1000} size="compact" label="Ledger Score progress" />
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure>
        <Stack gap={6}>
          <Stack gap={5}>
            {/* CONTEXT — the one genuinely daily fact. */}
            <Row gap={3}>
              <Text step="label">{today}</Text>
              <Spacer />
              {exam && (
                <Text step="label" tone="ink">
                  {exam.days}d · {exam.subject}
                </Text>
              )}
            </Row>

            {/* 1 ── WHERE YOU ARE */}
            <Stack gap={3}>
              <Readout
                value={total}
                step="display"
                label={`Your Ledger Score is ${total} of 1000. ${tier.label}.`}
              />
              <Track value={total / 1000} label="Progress to 1000" />
              <Row gap={3}>
                <Text step="label">
                  of 1,000 · {tier.label}
                </Text>
                {sinceLastSeen !== null && (
                  <Chip tone="progress" down={sinceLastSeen < 0}>
                    {Math.abs(sinceLastSeen)} since you were last here
                  </Chip>
                )}
                <Spacer />
                {toNext > 0 && <Chip tone="progress">{toNext} to {tier.next}</Chip>}
              </Row>
            </Stack>
          </Stack>

          <Rule />

          {/* 3 ── WHAT TO DO */}
          <Stack gap={3}>
            <Text step="label">Next</Text>

            {move ? (
              <Stack gap={4}>
                <Text step="title" as="h1" weight={500}>
                  {move.headline}
                </Text>

                {move.gain !== null && (
                  <Row gap={2}>
                    {/* Ink, deliberately. This is a PROJECTION — points the
                        student could earn, not points they have. The progress
                        hue would dress a forecast as a realised gain. */}
                    <Readout value={move.gain} step="figure" prefix="+" />
                    <Text step="label">{move.pillar} · projected</Text>
                  </Row>
                )}

                <Row gap={2}>
                  <Control tier="primary" href={move.href}>
                    {move.cta}
                  </Control>
                  <Control href="/tools/exam-practice">Something else</Control>
                </Row>
              </Stack>
            ) : (
              <Empty
                title="Map your syllabus"
                body="Your score opens once there is something to measure against."
                action={{ label: "Upload it", href: "/tools/syllabus" }}
              />
            )}
          </Stack>

          {name && <Text step="micro">{name}</Text>}
        </Stack>
      </Measure>
    </main>
  );
}
