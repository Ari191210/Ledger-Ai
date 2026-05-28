"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

type LastItem = { type: string; title: string; route: string };

function findLastItem(): LastItem | null {
  try {
    const notes = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
    if (notes.length > 0 && notes[0]?.title)
      return { type: "Note", title: notes[0].title, route: "/tools/learn-lab" };
  } catch { /* ignore */ }

  try {
    const papers = JSON.parse(localStorage.getItem("ledger-papers-log") || "[]");
    if (papers.length > 0)
      return { type: "Past Paper", title: `${papers[0].subject} — ${papers[0].board}`, route: "/tools/exam-practice" };
  } catch { /* ignore */ }

  try {
    const debriefs = JSON.parse(localStorage.getItem("ledger-exam-debriefs") || "[]");
    if (debriefs.length > 0 && debriefs[0]?.examName)
      return { type: "Exam Debrief", title: debriefs[0].examName, route: "/tools/grade-tracker" };
  } catch { /* ignore */ }

  try {
    const fc = JSON.parse(localStorage.getItem("ledger-flashcards") || "[]");
    if (fc.length > 0 && fc[0]?.topic)
      return { type: "Flashcard Deck", title: fc[0].topic, route: "/tools/recall-studio" };
  } catch { /* ignore */ }

  return null;
}

interface Props {
  daysSince: number;
  onDismiss: () => void;
}

export default function EmptyChair({ daysSince, onDismiss }: Props) {
  const [item,  setItem]  = useState<LastItem | null>(null);
  const [phase, setPhase] = useState<"chair" | "fading" | "done">("chair");

  useEffect(() => { setItem(findLastItem()); }, []);

  function closeForGood() {
    try {
      if (item) {
        const prev = JSON.parse(localStorage.getItem("ledger:chair-archived") || "[]");
        localStorage.setItem("ledger:chair-archived", JSON.stringify([...prev, item.title]));
      }
    } catch { /* ignore */ }
    setPhase("fading");
    setTimeout(() => setPhase("done"), 500);
  }

  const daysLabel = Math.round(daysSince) === 1 ? "1 day" : `${Math.round(daysSince)} days`;
  const pickRoute = item?.route ?? "/dashboard";

  if (phase === "done") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "0 clamp(24px, 6vw, 80px)" }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 4vw, 40px)", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 28, color: "var(--ink)" }}>
            Done. Start anywhere.
          </div>
          <Link href="/dashboard" onClick={onDismiss} style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.06em" }}>
            → Open the dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "flex-start", justifyContent: "center",
      padding: "0 clamp(24px, 6vw, 80px)",
      opacity:    phase === "fading" ? 0 : 1,
      transition: phase === "fading" ? "opacity 500ms ease" : "none",
    }}>
      <div style={{ maxWidth: 600, width: "100%" }}>

        {/* Timestamp */}
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 32 }}>
          Last here {daysLabel} ago
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: "clamp(36px, 5.5vw, 56px)",
          fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em",
          lineHeight: 1.05, margin: "0 0 48px", color: "var(--ink)",
        }}>
          You left this open.
        </h1>

        {/* The abandoned item — slightly faded, dust-covered */}
        <div style={{
          border: "1px solid var(--rule)",
          padding: "22px 26px",
          marginBottom: 44,
          opacity: 0.52,
          width: "100%",
          maxWidth: 460,
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 10 }}>
            {item?.type ?? "Last session"}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", lineHeight: 1.35, color: "var(--ink)" }}>
            {item?.title ?? "a quiet tab"}
          </div>
        </div>

        {/* Actions — equal weight, no default highlight */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
          <Link href={pickRoute} onClick={onDismiss} className="btn" style={{ textDecoration: "none" }}>
            Pick it up
          </Link>
          <button className="btn ghost" onClick={closeForGood}>
            Close it for good
          </button>
        </div>

      </div>
    </div>
  );
}
