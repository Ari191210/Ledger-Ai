"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, RotateCcw, SkipForward, Check, X } from "lucide-react";
import { Ring } from "@/components/ui/ring";
import { Button } from "@/components/ui/button";
import { playClick } from "@/lib/sound";
import { recordFocusSession } from "@/app/(app)/tools/focus/actions";
import type { FocusBrief, FocusTarget } from "@/lib/focus/brief";

type Phase = "work" | "short" | "long";

const DURATIONS: Record<Phase, number> = { work: 25 * 60, short: 5 * 60, long: 20 * 60 };
const LABEL: Record<Phase, string> = { work: "focus", short: "short break", long: "long break" };

/** Below this, an abandoned session is a misclick and not worth remembering. */
const ABANDON_FLOOR_SECONDS = 120;

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const targetLabel = (t: FocusTarget) => (t.topic ? `${t.topic}` : t.subject);

export function FocusTimer({
  minutesToday,
  brief,
}: {
  minutesToday: number;
  brief: FocusBrief;
}) {
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [loggedToday, setLoggedToday] = useState(minutesToday);
  const [targetIndex, setTargetIndex] = useState(brief.targets.length ? 0 : -1);
  const [, startLog] = useTransition();

  // Mirrored into refs inside an effect rather than during render. Writing a
  // ref while rendering is forbidden for a reason: React may discard a render
  // and run it again, and the write from the discarded pass would survive.
  const phaseRef = useRef(phase);
  const cycleRef = useRef(cycle);
  const targetRef = useRef(targetIndex);
  useEffect(() => {
    phaseRef.current = phase;
    cycleRef.current = cycle;
    targetRef.current = targetIndex;
  }, [phase, cycle, targetIndex]);

  const target = targetIndex >= 0 ? brief.targets[targetIndex] : null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0 || !running) return;
    setRunning(false);
    playClick("done");

    if (phaseRef.current === "work") {
      const mins = DURATIONS.work / 60;
      setLoggedToday((m) => m + mins);
      const t = targetRef.current >= 0 ? brief.targets[targetRef.current] : null;
      startLog(async () => {
        await recordFocusSession({
          minutes: mins,
          subject: t?.subject ?? null,
          topic: t?.topic ?? null,
          completed: true,
        });
      });

      const nextCycle = cycleRef.current + 1;
      if (nextCycle >= 4) {
        setCycle(0);
        setPhase("long");
        setRemaining(DURATIONS.long);
      } else {
        setCycle(nextCycle);
        setPhase("short");
        setRemaining(DURATIONS.short);
      }
    } else {
      setPhase("work");
      setRemaining(DURATIONS.work);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function toggle() {
    playClick(running ? "soft" : "tap");
    setRunning((r) => !r);
  }

  /** Giving up on a started session is data, so it is recorded as such. */
  function abandonIfStarted() {
    const elapsed = DURATIONS[phaseRef.current] - remaining;
    if (phaseRef.current !== "work" || elapsed < ABANDON_FLOOR_SECONDS) return;
    const t = targetRef.current >= 0 ? brief.targets[targetRef.current] : null;
    startLog(async () => {
      await recordFocusSession({
        minutes: Math.round(elapsed / 60),
        subject: t?.subject ?? null,
        topic: t?.topic ?? null,
        completed: false,
      });
    });
  }

  function reset() {
    playClick("soft");
    abandonIfStarted();
    setRunning(false);
    setRemaining(DURATIONS[phase]);
  }

  function skip() {
    playClick("soft");
    abandonIfStarted();
    setRunning(false);
    if (phase === "work") {
      const nextCycle = cycle + 1 >= 4 ? 0 : cycle + 1;
      const next: Phase = cycle + 1 >= 4 ? "long" : "short";
      setCycle(nextCycle);
      setPhase(next);
      setRemaining(DURATIONS[next]);
    } else {
      setPhase("work");
      setRemaining(DURATIONS.work);
    }
  }

  const isWork = phase === "work";
  const ringColor = isWork ? "var(--accent-strong)" : "var(--accent-2-strong)";

  return (
    <div className="mx-auto max-w-sm text-center">
      {/* what to point this session at, decided before the clock starts */}
      {brief.targets.length > 0 ? (
        <div className="mb-7">
          <span className="u-label">work on</span>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {brief.targets.map((t, i) => (
              <button
                key={`${t.subject}-${t.topic ?? ""}`}
                type="button"
                onClick={() => {
                  playClick("soft");
                  setTargetIndex(i);
                }}
                disabled={running}
                className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-60 ${
                  i === targetIndex
                    ? "border-accent bg-accent text-accent-on"
                    : "border-border-2 bg-surface-2 text-text-2 hover:text-text"
                }`}
              >
                {targetLabel(t)}
              </button>
            ))}
          </div>
          {target && <p className="u-mono mt-2 text-2xs text-text-3">{target.reason}</p>}
        </div>
      ) : (
        <p className="u-mono mb-7 text-2xs text-text-3">
          log a mistake or a deadline and this will tell you what to work on
        </p>
      )}

      <span className="u-label">{LABEL[phase]}</span>

      <div className="mt-5 flex justify-center">
        <Ring
          value={DURATIONS[phase] - remaining}
          max={DURATIONS[phase]}
          size={220}
          stroke={10}
          color={ringColor}
        >
          <div>
            <div className="u-stat-number text-5xl">{fmt(remaining)}</div>
            <div className="u-label mt-1">{isWork ? "work" : "break"}</div>
          </div>
        </Ring>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full"
            style={{ background: i < cycle ? "var(--accent-strong)" : "var(--surface-3)" }}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={reset} aria-label="Reset">
          <RotateCcw size={14} />
        </Button>
        <Button size="lg" onClick={toggle} className="w-32">
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button variant="secondary" size="sm" onClick={skip} aria-label="Skip">
          <SkipForward size={14} />
        </Button>
      </div>

      <p className="u-mono mt-6 text-2xs text-text-3">
        <span className="text-accent-strong">{loggedToday}m</span> focused today
      </p>

      {/* the timing opinion, from this student's own attempt history */}
      {brief.bestWindow && (
        <p className="u-mono mt-2 text-2xs text-text-3">
          {brief.inBestWindowNow
            ? `you are in your best window (${brief.bestWindow.label})`
            : `you score highest in the ${brief.bestWindow.label}, ${brief.bestWindow.range}`}
          {brief.bestWindow.accuracy !== null && ` at ${brief.bestWindow.accuracy}%`}
        </p>
      )}

      {/* what actually happened last time, wins and abandonments both */}
      {brief.recent.length > 0 && (
        <div className="mt-7 border-t border-border pt-5 text-left">
          <div className="flex items-baseline justify-between">
            <span className="u-label">recent sessions</span>
            {brief.followThrough && (
              <span className="u-mono text-2xs text-text-3">
                {brief.followThrough.completed}/{brief.followThrough.started} finished
              </span>
            )}
          </div>
          <div className="mt-2 divide-y divide-dashed divide-border">
            {brief.recent.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-text-2">
                  {s.topic ?? s.subject ?? "unspecified"}
                </span>
                <span className="u-mono shrink-0 text-2xs text-text-3">{s.minutes}m</span>
                {s.completed ? (
                  <Check size={12} className="shrink-0 text-accent-strong" />
                ) : (
                  <X size={12} className="shrink-0 text-text-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
