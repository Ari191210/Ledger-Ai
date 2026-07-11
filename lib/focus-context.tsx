"use client";
import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";
import { completeSessionStreak, resolveStreak, shieldAvailable } from "@/lib/streak";

type Mode = "work" | "break" | "longbreak";
export type FocusTask = { id: number; text: string; done: boolean };

export const DURATIONS: Record<Mode, number> = { work: 25 * 60, break: 5 * 60, longbreak: 20 * 60 };
export const MODE_LABELS: Record<Mode, string> = { work: "Work", break: "Short break", longbreak: "Long break" };

export type FocusCtx = {
  mode: Mode;
  seconds: number;
  running: boolean;
  sessions: number;
  tasks: FocusTask[];
  streak: number;
  /** One missed day per month is auto-covered; true while unspent. */
  shieldAvailable: boolean;
  switchMode: (m: Mode) => void;
  toggleRunning: () => void;
  reset: () => void;
  setTasks: React.Dispatch<React.SetStateAction<FocusTask[]>>;
};

const FocusContext = createContext<FocusCtx | null>(null);

let _tid = 1;

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("work");
  const [seconds, setSeconds] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [tasks, setTasks] = useState<FocusTask[]>([
    { id: _tid++, text: "Review chapter notes", done: false },
    { id: _tid++, text: "Solve 5 past-paper questions", done: false },
  ]);
  const [streak, setStreak] = useState(0);
  const [shieldFree, setShieldFree] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs so tick callback never goes stale
  const modeRef = useRef<Mode>("work");
  modeRef.current = mode;
  const userRef = useRef(user);
  userRef.current = user;

  // Load streak from Supabase / localStorage, then normalize it against the
  // calendar (resolveStreak): a lapsed streak resets, a single missed day
  // consumes the monthly shield. Storage is canonical — the score engine
  // reads ledger-focus-streak directly, so it must never hold a stale value.
  useEffect(() => {
    async function load() {
      let stored = 0;
      if (user) {
        const data = await loadUserData(user.id);
        if (data?.focus) stored = (data.focus as { streak: number }).streak ?? 0;
      }
      if (!stored) {
        const s = localStorage.getItem("ledger-focus-streak");
        if (s) stored = parseInt(s, 10) || 0;
      }
      try {
        const resolved = resolveStreak({
          streak: stored,
          lastDate: localStorage.getItem("ledger-focus-last"),
          shieldUsedMonth: localStorage.getItem("ledger-focus-shield"),
        });
        if (resolved.broke || resolved.usedShield) {
          localStorage.setItem("ledger-focus-streak", String(resolved.streak));
          if (resolved.lastDate) localStorage.setItem("ledger-focus-last", resolved.lastDate);
          else localStorage.removeItem("ledger-focus-last");
          if (resolved.shieldUsedMonth) localStorage.setItem("ledger-focus-shield", resolved.shieldUsedMonth);
          const u = userRef.current;
          if (u) patchUserData(u.id, "focus", { streak: resolved.streak, lastDate: resolved.lastDate ?? "" });
        }
        setStreak(resolved.streak);
        setShieldFree(shieldAvailable(resolved.shieldUsedMonth));
      } catch {
        setStreak(stored);
      }
    }
    load();
  }, [user]);

  // Restore on mount — runs before save effects so reads correct data first
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ledger-focus-timer");
      if (raw) {
        const { s, n } = JSON.parse(raw);
        if (typeof s === "number" && s > 0) setSeconds(s);
        if (typeof n === "number") setSessions(n);
      }
      const rawT = localStorage.getItem("ledger-focus-tasks");
      if (rawT) { const t = JSON.parse(rawT); if (Array.isArray(t) && t.length) setTasks(t); }
    } catch {}
  }, []);

  // Persist timer state on every change
  useEffect(() => {
    try { localStorage.setItem("ledger-focus-timer", JSON.stringify({ s: seconds, n: sessions })); } catch {}
  }, [seconds, sessions]);

  useEffect(() => {
    try { localStorage.setItem("ledger-focus-tasks", JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  // Mode reset — skip on first mount so restore wins
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    setSeconds(DURATIONS[mode]);
    setRunning(false);
  }, [mode]);

  const tick = useCallback(() => {
    setSeconds((s) => {
      if (s <= 1) {
        setRunning(false);
        if (modeRef.current === "work") {
          setSessions((n) => {
            const next = n + 1;
            if (next % 4 === 0) setMode("longbreak"); else setMode("break");
            try {
              const result = completeSessionStreak({
                streak: parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10) || 0,
                lastDate: localStorage.getItem("ledger-focus-last"),
                shieldUsedMonth: localStorage.getItem("ledger-focus-shield"),
              });
              if (result.counted || result.broke || result.usedShield) {
                localStorage.setItem("ledger-focus-streak", String(result.streak));
                if (result.lastDate) localStorage.setItem("ledger-focus-last", result.lastDate);
                if (result.shieldUsedMonth) localStorage.setItem("ledger-focus-shield", result.shieldUsedMonth);
                setStreak(result.streak);
                setShieldFree(shieldAvailable(result.shieldUsedMonth));
                const u = userRef.current;
                if (u) patchUserData(u.id, "focus", { streak: result.streak, lastDate: result.lastDate ?? "" });
              }
            } catch {}
            return next;
          });
        } else {
          setMode("work");
        }
        return 0;
      }
      return s - 1;
    });
  }, []);

  useEffect(() => {
    if (running) intervalRef.current = setInterval(tick, 1000);
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const switchMode = (m: Mode) => { setMode(m); setSeconds(DURATIONS[m]); setRunning(false); };
  const toggleRunning = () => setRunning((r) => !r);
  const reset = () => { setRunning(false); setSeconds(DURATIONS[mode]); };

  return (
    <FocusContext.Provider value={{ mode, seconds, running, sessions, tasks, streak, shieldAvailable: shieldFree, switchMode, toggleRunning, reset, setTasks }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be inside FocusProvider");
  return ctx;
}
