"use client";
import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs so tick callback never goes stale
  const modeRef = useRef<Mode>("work");
  modeRef.current = mode;
  const userRef = useRef(user);
  userRef.current = user;

  // Load streak from Supabase / localStorage
  useEffect(() => {
    async function load() {
      if (user) {
        const data = await loadUserData(user.id);
        if (data?.focus) { setStreak((data.focus as { streak: number }).streak ?? 0); return; }
      }
      const s = localStorage.getItem("ledger-focus-streak");
      if (s) setStreak(parseInt(s, 10));
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
    localStorage.setItem("ledger-focus-timer", JSON.stringify({ s: seconds, n: sessions }));
  }, [seconds, sessions]);

  useEffect(() => {
    localStorage.setItem("ledger-focus-tasks", JSON.stringify(tasks));
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
            const today = new Date().toDateString();
            const last = localStorage.getItem("ledger-focus-last");
            const strk = parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10);
            if (last !== today) {
              const ns = strk + 1;
              localStorage.setItem("ledger-focus-streak", String(ns));
              localStorage.setItem("ledger-focus-last", today);
              setStreak(ns);
              const u = userRef.current;
              if (u) patchUserData(u.id, "focus", { streak: ns, lastDate: today });
            }
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
    <FocusContext.Provider value={{ mode, seconds, running, sessions, tasks, streak, switchMode, toggleRunning, reset, setTasks }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be inside FocusProvider");
  return ctx;
}
