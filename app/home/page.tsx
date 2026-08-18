"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, type Exam } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import { currentInputs } from "@/lib/score-projection";
import { deriveNextMove, type NextMove } from "@/lib/console/next-move";
import { examProximity, soonestExam, type ExamProximity, type UpcomingExam } from "@/lib/exam-day";
import ExamDayPanel from "@/components/home/exam-day-panel";
import HomeComposer, { type HomeContent } from "@/components/home/composer";
import type { HomeComposition } from "@/lib/home";
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
// HOME — the one shell. M3-1.
//
// `/dashboard` and `/console` both computed the Ledger Score and both rendered
// a next-action surface (architecture T10). They are merged here, and both now
// redirect permanently (`next.config.mjs`). This is the only route in the
// product that renders the score as a *shell*.
//
// Three beats, in reading order — `PRODUCT_DECISIONS` §2.1's NOW surface:
//   where you are (the Score) · what to do (ONE move) · today's context.
//
// THE SCORE IS REUSED, NOT REIMPLEMENTED. `computeLedgerScore()` is called
// exactly as `/console` called it; `lib/ledger-score.ts` is untouched by M3.
//
// THE MOVE IS REUSED, NOT REINVENTED. `deriveNextMove()` is the single
// recommendation source (it is strictly the more complete of the two that
// existed — it carries the mistake branch and refuses a figure it cannot pay).
// A third engine is M20's problem, not this milestone's.
//
// EXAM-DAY IS A STATE, NOT A ROUTE (§2.4, M3-2). When a dated paper is close
// enough, the exam panel takes the top of the page — the student navigates
// nowhere to reach it.
//
// There is no loading state by design: the score computes synchronously from
// local inputs and the roll from zero IS the arrival.
// ═══════════════════════════════════════════════════════════════════════════

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/** Where the last-seen score is parked so the Return beat has something to
 *  measure against. Local by design: "since you were last here" is a device
 *  fact, not a claim about the account. Key retained from `/console` so a
 *  student who used that shell does not see a spurious first-visit delta. */
const LAST_SEEN_KEY = "console:last-seen-score";

export default function HomePage() {
  const { user, session } = useAuth();
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [move, setMove] = useState<NextMove | null>(null);
  const [exam, setExam] = useState<UpcomingExam | null>(null);
  const [proximity, setProximity] = useState<ExamProximity>("none");
  const [name, setName] = useState("");
  const [sinceLastSeen, setSinceLastSeen] = useState<number | null>(null);

  // M22 — the composed section. `HomeComposer` renders whatever
  // `/api/home-layout` resolves through the M.2 registry; this page never
  // hardcodes which widgets exist (that list lives only in
  // `lib/home/registry.ts`).
  const [composition, setComposition] = useState<HomeComposition | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContent>({});

  useEffect(() => {
    try {
      const s = computeLedgerScore();
      setScore(s);
      const inputs = currentInputs();
      if (inputs) setMove(deriveNextMove(inputs));

      // THE RETURN BEAT. Evidence, not celebration: without it the screen is
      // identical every visit and the student learns their effort is invisible.
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      const prev = raw === null ? null : Number(raw);
      if (prev !== null && Number.isFinite(prev) && s.total !== prev) {
        setSinceLastSeen(s.total - prev);
      }
      localStorage.setItem(LAST_SEEN_KEY, String(s.total));
    } catch {
      /* storage unavailable — the honest empty state covers it */
    }

    // Proximity from the local plan alone, so the exam state is correct before
    // the record round-trips. Refined below once `user_data.exams` arrives.
    const local = soonestExam();
    setExam(local);
    setProximity(examProximity(local));
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadUserData(user.id)
      .then((ud) => {
        if (!alive) return;
        const next = soonestExam(ud?.exams as Exam[] | undefined);
        setExam(next);
        setProximity(examProximity(next));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  // M22-1/M22-2 — the composed section. Fetches the resolved M.3 merge
  // (registry defaults ⊕ the student's server-persisted HomeLayout ⊕ system
  // importance signals ⊕ viewport) from `/api/home-layout`. Never reads or
  // writes `localStorage["ledger-dash-layout"]` — that mechanism is retired
  // (`lib/dash-layout.ts`'s M22 rebuild).
  useEffect(() => {
    if (!user || !session) return;
    let alive = true;
    const viewport = typeof window !== "undefined" && window.innerWidth < 720 ? "mobile" : "desktop";
    fetch(`/api/home-layout?viewport=${viewport}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d?.ok) return;
        setComposition(d.composition as HomeComposition);
        setHomeContent((d.content ?? {}) as HomeContent);
      })
      .catch(() => {
        /* the composed section is additive — its absence never blocks the shell */
      });
    return () => {
      alive = false;
    };
  }, [user, session]);

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
  const examState = exam && proximity !== "none" ? proximity : null;

  return (
    <main id="main-content">
      {/* CHROME — the Score is persistent chrome on every surface, like a
          battery indicator, never a card (`PRODUCT_PRINCIPLES` §6.8). */}
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <Readout value={total} label={`Ledger Score ${total} of 1000`} />
            <Track value={total / 1000} size="compact" label="Ledger Score progress" />
            {/* The account chip, in the only form this shell has a vocabulary
                for. `PRODUCT_DECISIONS` §2.1 — settings live behind the
                account, never in the primary nav. Everything else is reached
                through the move; every tool route carries the full nav. */}
            <Control tier="tertiary" href="/settings">
              Settings
            </Control>
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
                <Text step="label">of 1,000 · {tier.label}</Text>
                {sinceLastSeen !== null && (
                  <Chip tone="progress" down={sinceLastSeen < 0}>
                    {Math.abs(sinceLastSeen)} since you were last here
                  </Chip>
                )}
                <Spacer />
                {toNext > 0 && (
                  <Chip tone="progress">
                    {toNext} to {tier.next}
                  </Chip>
                )}
              </Row>
            </Stack>
          </Stack>

          {/* 2 ── EXAM-DAY, AS A STATE (M3-2). Above the standing move, because
              a paper that is hours away outranks the long game. */}
          {examState && exam && (
            <>
              <Rule />
              <ExamDayPanel exam={exam} proximity={examState} />
            </>
          )}

          <Rule />

          {/* 3 ── WHAT TO DO. Exactly one move, always. */}
          <Stack gap={3}>
            <Text step="label">Next</Text>

            {move ? (
              <Stack gap={4}>
                <Text step="title" as="h1" weight={500}>
                  {move.headline}
                </Text>

                {move.gain !== null ? (
                  <Row gap={2}>
                    {/* Ink, deliberately. This is a PROJECTION — points the
                        student could earn, not points they have. */}
                    <Readout value={move.gain} step="figure" prefix="+" />
                    <Text step="label">{move.pillar} · projected</Text>
                  </Row>
                ) : move.note ? (
                  <Text step="label">{move.note}</Text>
                ) : null}

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

          {/* 4 ── THE COMPOSED SECTION (M22). Registry-driven: what renders
              here, in what order and at what importance tier, is entirely a
              function of `lib/home/registry.ts` + the student's server-
              persisted HomeLayout + live importance signals — this file
              names none of it directly. */}
          {composition && <HomeComposer composition={composition} content={homeContent} />}

          {name && <Text step="micro">{name}</Text>}
        </Stack>
      </Measure>
    </main>
  );
}
