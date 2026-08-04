"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, type Exam } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import { currentInputs } from "@/lib/score-projection";
import { deriveNextMove, nextExam, type NextMove } from "@/lib/console/next-move";
import { computeVitality, vitalityWithFloor } from "@/lib/console/vitality";
import Readout from "@/components/console/readout";
import Track from "@/components/console/track";

/** Where the last-seen score is parked so the Return beat has something to
 *  measure against. Local by design: this is "since you were last here", a
 *  device-level fact, not a claim about the account. */
const LAST_SEEN_KEY = "console:last-seen-score";

// ═══════════════════════════════════════════════════════════════════════════
// NOW — the first surface. CONSOLE.md §8.
//
// Answers exactly one question: "What should I do right now?"
//
// Three beats, in reading order, and nothing else on the screen:
//   1. WHERE YOU ARE     the Score, rolling up from zero on arrival
//   2. WHAT'S COMING     days to the next exam — the one genuinely daily fact
//   3. WHAT TO DO        one move, one control
//
// There is no loading state by design. The score is computed from local inputs
// synchronously, so the shell paints immediately and the figure rolls into
// place — the roll IS the arrival, which is why a skeleton would be both
// slower and worse. "Speed is the feature" (CONSOLE.md §1.4).
//
// Every figure on this screen is real. The score comes from the live engine,
// the gain from the projection engine, the countdown from the student's own
// exam dates. Nothing is illustrative.
// ═══════════════════════════════════════════════════════════════════════════

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

export default function NowPage() {
  const { user } = useAuth();
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [move, setMove] = useState<NextMove | null>(null);
  const [exam, setExam] = useState<{ days: number; subject: string } | null>(null);
  const [name, setName] = useState<string>("");
  const [vitality, setVitality] = useState(0);
  const [sinceLastSeen, setSinceLastSeen] = useState<number | null>(null);

  // Local, synchronous, no network: the score and the move are available on
  // the first client frame.
  useEffect(() => {
    try {
      const s = computeLedgerScore();
      setScore(s);
      const inputs = currentInputs();
      if (inputs) {
        setMove(deriveNextMove(inputs));
        setVitality(vitalityWithFloor(computeVitality(inputs, s.total)));
      }

      // THE RETURN BEAT (CONSOLE.md §7). Without this the screen is identical
      // on every visit and the student learns their effort is invisible —
      // which is the actual failure mode of every study app. Comparing against
      // the last score this device saw means work done since then is stated as
      // a fact, not celebrated.
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      const prev = raw === null ? null : Number(raw);
      if (prev !== null && Number.isFinite(prev) && s.total !== prev) {
        setSinceLastSeen(s.total - prev);
      }
      localStorage.setItem(LAST_SEEN_KEY, String(s.total));
    } catch {
      /* storage unavailable — the honest empty state below covers it */
    }
  }, []);

  // Exams live in the cloud profile. This is the only async read on the
  // screen, and it lands in a fixed-height row so nothing shifts.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadUserData(user.id)
      .then((ud) => {
        if (!alive) return;
        setExam(nextExam(ud?.exams as Exam[] | undefined));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    const n =
      (user?.user_metadata?.full_name as string | undefined) ??
      (user?.user_metadata?.name as string | undefined) ??
      user?.email?.split("@")[0] ??
      "";
    setName(n);
  }, [user]);

  const total = score?.total ?? 0;
  const tier = scoreTier(total);
  const toNext = Math.max(0, tier.nextAt - total);
  const today = new Date().toLocaleDateString("en-GB", DATE_FMT);

  return (
    <main
      id="main-content"
      // Earned colour: every hue that is allowed to vary resolves through this
      // one number. A student who has done nothing sees a monochrome
      // instrument; the product becomes vivid only because of their work.
      style={
        {
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--g-0)",
          "--vitality": vitality.toFixed(3),
        } as React.CSSProperties
      }
    >
      {/* ── CHROME ── persistent. The Score lives here on every surface, like a
          battery indicator, never as a card (CONSOLE.md §5.3). */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--s-3) var(--s-4)",
          borderBottom: "1px solid var(--g-4)",
        }}
      >
        <span
          className="c-label"
          style={{ color: "var(--g-7)", letterSpacing: "0.2em", fontWeight: 600 }}
        >
          StudyLedger
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
          <Readout
            value={total}
            className="c-readout"
            style={{ fontSize: "var(--t-body)", fontWeight: 500 }}
            label={`Ledger Score ${total} of 1000`}
          />
          <span style={{ width: 44 }}>
            <Track value={total / 1000} label="Ledger Score progress" />
          </span>
        </span>
      </header>

      {/* ── THE SURFACE ── one column, vertically centred, one viewport. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "var(--s-5) var(--s-4)",
          maxWidth: 620,
          width: "100%",
          marginInline: "auto",
        }}
      >
        {/* CONTEXT — fixed height so the async exam read cannot shift layout. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            height: 20,
            marginBottom: "var(--s-5)",
          }}
        >
          <span className="c-label">{today}</span>
          {exam && (
            <span className="c-label c-enter" style={{ color: "var(--g-7)" }}>
              {exam.days}d · {exam.subject}
            </span>
          )}
        </div>

        {/* 1 ── WHERE YOU ARE */}
        <div className="c-enter">
          <Readout
            value={total}
            className="c-readout"
            style={{
              fontSize: "var(--t-display)",
              fontWeight: 500,
              display: "block",
              lineHeight: 1,
            }}
            label={`Your Ledger Score is ${total} of 1000. ${tier.label}.`}
          />

          <div style={{ margin: "var(--s-4) 0 var(--s-3)" }}>
            <Track value={total / 1000} label="Progress to 1000" />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="c-label">
              of 1,000 · {tier.label}
              {/* Movement since this device last saw the score. Stated as a
                  fact, never celebrated — and direction is carried by the
                  glyph as well as the hue, so colour is never the sole
                  carrier of meaning. */}
              {sinceLastSeen !== null && (
                <span
                  style={{
                    marginLeft: "var(--s-2)",
                    color: sinceLastSeen > 0 ? "var(--progress)" : "var(--g-6)",
                  }}
                >
                  {sinceLastSeen > 0 ? "▲" : "▼"} {Math.abs(sinceLastSeen)} since you were last here
                </span>
              )}
            </span>
            {toNext > 0 && (
              // Progress information, so it carries the progress hue — the one
              // place on this screen where colour is doing a job.
              <span className="c-label" style={{ color: "var(--progress)" }}>
                {toNext} to {tier.next}
              </span>
            )}
          </div>
        </div>

        {/* 3 ── WHAT TO DO */}
        <div
          className="c-rule c-enter"
          style={{ marginTop: "var(--s-6)", paddingTop: "var(--s-4)", animationDelay: "80ms" }}
        >
          <div className="c-label" style={{ marginBottom: "var(--s-3)" }}>
            Next
          </div>

          {move ? (
            <>
              <h1
                style={{
                  fontSize: "var(--t-title)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "var(--g-7)",
                  margin: 0,
                }}
              >
                {move.headline}
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "var(--s-2)",
                  margin: "var(--s-3) 0 var(--s-4)",
                  minHeight: 34,
                }}
              >
                {move.gain !== null && (
                  <>
                    {/* Set in ink, deliberately. This is a PROJECTION — points
                        the student could earn, not points they have. Colouring
                        it with the progress hue would dress a forecast as a
                        realised gain, which breaks "never lie". */}
                    <span
                      className="c-readout"
                      style={{ fontSize: "var(--t-figure)", fontWeight: 500 }}
                    >
                      +{move.gain}
                    </span>
                    <span className="c-label">{move.pillar} · projected</span>
                  </>
                )}
              </div>

              {/* Three tiers, hierarchy built from weight and never from hue:
                  filled ink carries the one action that creates momentum,
                  outlined offers the alternative, text is the escape. */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                <Link href={move.href} className="c-control c-control--primary">
                  {move.cta}
                </Link>
                <Link href="/tools/exam-practice" className="c-control">
                  Something else
                </Link>
              </div>
            </>
          ) : (
            // Honest empty state — an invitation with exactly one control.
            // Never an apology, never an illustration (CONSOLE.md §9).
            <>
              <h1
                style={{
                  fontSize: "var(--t-title)",
                  fontWeight: 500,
                  color: "var(--g-7)",
                  margin: 0,
                }}
              >
                Map your syllabus
              </h1>
              <p style={{ color: "var(--g-6)", margin: "var(--s-2) 0 var(--s-4)" }}>
                Your score opens once there is something to measure against.
              </p>
              <Link href="/tools/syllabus" className="c-control c-control--primary">
                Upload it
              </Link>
            </>
          )}
        </div>

        {name && (
          <div className="c-micro" style={{ marginTop: "var(--s-6)" }}>
            {name}
          </div>
        )}
      </div>
    </main>
  );
}
