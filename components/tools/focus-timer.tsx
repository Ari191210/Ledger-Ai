"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Ring } from "@/components/ui/ring";
import { Button } from "@/components/ui/button";
import { playClick } from "@/lib/sound";
import { logFocusAction } from "@/app/(app)/dashboard/actions";

type Phase = "work" | "short" | "long";

const DURATIONS: Record<Phase, number> = { work: 25 * 60, short: 5 * 60, long: 20 * 60 };
const LABEL: Record<Phase, string> = { work: "focus", short: "short break", long: "long break" };

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({ minutesToday }: { minutesToday: number }) {
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0); // completed work sessions this cycle, 0-3
  const [loggedToday, setLoggedToday] = useState(minutesToday);
  const [, startLog] = useTransition();
  const phaseRef = useRef(phase);
  const cycleRef = useRef(cycle);
  phaseRef.current = phase;
  cycleRef.current = cycle;

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
      startLog(async () => {
        await logFocusAction({ minutes: mins });
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

  function reset() {
    playClick("soft");
    setRunning(false);
    setRemaining(DURATIONS[phase]);
  }

  function skip() {
    playClick("soft");
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
      <span className="u-label">{LABEL[phase]}</span>

      <div className="mt-5 flex justify-center">
        <Ring value={DURATIONS[phase] - remaining} max={DURATIONS[phase]} size={220} stroke={10} color={ringColor}>
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
            style={{
              background: i < cycle ? "var(--accent-strong)" : "var(--surface-3)",
            }}
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
    </div>
  );
}
