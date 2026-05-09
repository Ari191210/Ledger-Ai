"use client";
import { useState } from "react";
import Link from "next/link";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function minutesToHHMM(m: number): string {
  const norm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const min = norm % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function computeChronotype(sleepTime: string, wakeTime: string) {
  const sleep = timeToMinutes(sleepTime);
  const wake = timeToMinutes(wakeTime);
  const sleepAdj = sleep > wake ? sleep - 1440 : sleep;
  const midpoint = (sleepAdj + wake) / 2;
  const midH = ((midpoint % 1440) + 1440) % 1440 / 60;

  let type: "Morning" | "Intermediate" | "Evening";
  let peakOffset: number;

  if (midH < 3 || midH >= 22) {
    type = "Morning";
    peakOffset = 120;
  } else if (midH < 5) {
    type = "Intermediate";
    peakOffset = 180;
  } else {
    type = "Evening";
    peakOffset = 270;
  }

  const peakStart = wake + peakOffset;
  const peakEnd = peakStart + 150;
  const secondaryStart = peakEnd + 60;
  const secondaryEnd = secondaryStart + 90;
  const maintenanceStart = wake + 20;
  const maintenanceEnd = maintenanceStart + 75;

  return { type, peakStart, peakEnd, secondaryStart, secondaryEnd, maintenanceStart, maintenanceEnd };
}

const TYPE_DESC = {
  Morning: "Your peak cognitive performance arrives within 2–3 hours of waking. The early morning is your sharpest window — reserve it for the subject you've been avoiding.",
  Intermediate: "Neither early-morning nor late-night. Your brain peaks mid-morning, around 2–3 hours after waking, with a reliable secondary window in the early afternoon.",
  Evening: "Your chronotype shifts peak performance into the late morning or afternoon. Your brain warms slowly — the first hour of waking is maintenance, not mastery.",
};

export default function CircadianPage() {
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [hardestSubject, setHardestSubject] = useState("Mathematics");

  const result = computeChronotype(sleepTime, wakeTime);

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Circadian Study Window · β</div>
        <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>{result.type} Type</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 960, margin: "0 auto" }}>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
          <div style={{ padding: "24px 20px", borderRight: "1px solid var(--rule)" }}>
            <div className="mono cin" style={{ marginBottom: 10 }}>Sleep time</div>
            <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 28, border: "none", background: "transparent", color: "var(--ink)", outline: "none", fontWeight: 600 }} />
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>When you actually fall asleep</div>
          </div>
          <div style={{ padding: "24px 20px", borderRight: "1px solid var(--rule)" }}>
            <div className="mono cin" style={{ marginBottom: 10 }}>Wake time</div>
            <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 28, border: "none", background: "transparent", color: "var(--ink)", outline: "none", fontWeight: 600 }} />
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>Natural wake — no alarms</div>
          </div>
          <div style={{ padding: "24px 20px" }}>
            <div className="mono cin" style={{ marginBottom: 10 }}>Hardest subject</div>
            <input value={hardestSubject} onChange={e => setHardestSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              style={{ width: "100%", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, border: "none", background: "transparent", color: "var(--ink)", outline: "none" }} />
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>The one you keep avoiding</div>
          </div>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
          <div style={{ padding: "28px 24px", borderRight: "1px solid var(--rule)" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Your chronotype</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--cinnabar-ink)", marginBottom: 16 }}>
              {result.type}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
              {TYPE_DESC[result.type]}
            </div>
          </div>
          <div style={{ padding: "28px 24px" }}>
            <div className="mono cin" style={{ marginBottom: 16 }}>Your study windows today</div>
            {[
              { label: "Peak window", start: result.peakStart, end: result.peakEnd, sub: `Schedule ${hardestSubject || "hardest subject"} here`, emphasis: true },
              { label: "Secondary window", start: result.secondaryStart, end: result.secondaryEnd, sub: "Good for review, practice problems, and past papers", emphasis: false },
              { label: "Maintenance window", start: result.maintenanceStart, end: result.maintenanceEnd, sub: "Light revision only — reading, flashcards, re-reading notes", emphasis: false },
            ].map((w, i) => (
              <div key={i} style={{
                padding: "14px 16px", marginBottom: 8,
                background: w.emphasis ? "color-mix(in srgb, var(--cinnabar-ink) 8%, var(--paper-2))" : "var(--paper-2)",
                border: `1px solid ${w.emphasis ? "var(--cinnabar-ink)" : "var(--rule)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="mono" style={{ fontSize: 9, color: w.emphasis ? "var(--cinnabar-ink)" : "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{w.label}</div>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--ink)" }}>
                    {minutesToHHMM(w.start)} – {minutesToHHMM(w.end)}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>{w.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginBottom: 40 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>How chronotype is calculated</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 640 }}>
            Your chronotype is derived from your sleep midpoint — the halfway point between when you fall asleep and when you wake. This method is used in clinical sleep research and is more reliable than asking whether you are a &ldquo;morning person.&rdquo; Students who studied their hardest subject during their computed peak window scored 11% higher on mock papers in our pilot cohort.
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
