"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Data = { inWindow: boolean; awakeCount?: number; percentile?: number; istTime?: string; stream?: string };

function detectStream(): string {
  try {
    const explicit = localStorage.getItem("ledger:exam-stream");
    if (explicit) return explicit.toLowerCase();

    // Infer from user_data exams array stored by sync-manager
    const raw = localStorage.getItem("ledger-user-data");
    if (raw) {
      const ud = JSON.parse(raw) as { exams?: string[] };
      const exams = (ud.exams ?? []).map((e: string) => e.toLowerCase());
      if (exams.some(e => e.includes("neet"))) return "neet";
      if (exams.some(e => e.includes("cbse") || e.includes("class 12") || e.includes("class 11"))) return "cbse";
    }
  } catch { /* ignore */ }
  return "jee";
}

export default function RankWhisper() {
  const path = usePathname();
  const [data, setData] = useState<Data | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try { if (localStorage.getItem("ledger:rank-whisper-off") === "1") setDismissed(true); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (dismissed) return;

    const stream = detectStream();

    async function poll() {
      try {
        const res = await fetch(`/api/awake-count?stream=${stream}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent — don't crash the page */ }
    }

    poll();
    intervalRef.current = setInterval(poll, 90_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [dismissed]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("ledger:rank-whisper-off", "1"); } catch { /* ignore */ }
  }

  // Hide conditions
  if (dismissed)              return null;
  if (!data?.inWindow)        return null;
  if (path === "/tools/focus-lab") return null;

  const { awakeCount = 0, percentile = 0, istTime = "" } = data;
  const countStr = awakeCount.toLocaleString("en-IN");

  return (
    <div style={{
      position:    "fixed",
      bottom:      18,
      left:        "50%",
      transform:   "translateX(-50%)",
      zIndex:      998,
      display:     "flex",
      alignItems:  "center",
      gap:         0,
      pointerEvents: "none",
      userSelect:  "none",
    }}>
      <span style={{
        fontFamily:    "var(--mono)",
        fontSize:      11,
        letterSpacing: "-0.01em",
        color:         "var(--ink-3)",
        whiteSpace:    "nowrap",
      }}>
        {istTime} IST&nbsp;·&nbsp;{countStr} aspirants awake&nbsp;·&nbsp;
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>top {percentile}%</span>
      </span>

      <button
        onClick={dismiss}
        title="Hide"
        style={{
          pointerEvents: "auto",
          marginLeft:    8,
          background:    "none",
          border:        "none",
          cursor:        "pointer",
          fontFamily:    "var(--mono)",
          fontSize:      10,
          color:         "var(--ink-3)",
          opacity:       0.5,
          padding:       "0 2px",
          lineHeight:    1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
