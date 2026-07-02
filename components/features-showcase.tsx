"use client"

import { useState } from "react"
import Link from "next/link"

const SIGNATURES = [
  {
    tag: "α",
    ttl: "Cognitive Debt Meter",
    body: "Unfinished chapters accrue interest. The meter shows your academic APR — and the minimum daily payment to stay solvent before exams.",
    extra: "The debt meter recalculates every time you log a session or skip one. It uses your exam dates to reverse-engineer the daily cost of procrastination in marks.",
    stat: "Recalculates after every session",
    href: "/tools/study-command",
  },
  {
    tag: "β",
    ttl: "Circadian Study Window",
    body: "We map your chronotype from sleep times and place the hardest subject inside your personal peak — not a generic morning/evening default.",
    extra: "Your chronotype is computed from your actual sleep pattern, and the planner slots your hardest subject into that window automatically — no willpower required.",
    stat: "Hardest subject · your peak hour",
    href: "/tools/focus-lab",
  },
  {
    tag: "γ",
    ttl: "Forgetting-Curve Revision",
    body: "Past-paper questions resurface on Ebbinghaus intervals. Not by topic. Not by date. By the precise moment before you would have forgotten.",
    extra: "Each correct answer pushes the next review interval forward. Each wrong answer resets the curve. The same method behind every serious spaced-repetition system.",
    stat: "Ebbinghaus intervals · per question",
    href: "/tools/forgetting-forecast",
  },
  {
    tag: "δ",
    ttl: "Peer Heatmap",
    body: "Anonymous map of which chapters students in your board and grade struggle with most. You are not alone on Conic Sections.",
    extra: "Builds from aggregated weak-topic data as Ledger students complete sessions — always anonymous, and sharper as the platform grows.",
    stat: "Anonymous · aggregated by board",
    href: "/tools/grade-tracker",
  },
  {
    tag: "ε",
    ttl: "Syllabus Parser",
    body: "Upload your school's PDF syllabus. We read it and build the full plan — not a template you then edit for an hour.",
    extra: "Handles handwritten notes, scanned PDFs, and messy Word docs. The AI extracts chapter structure, topic lists, and exam schedules even when the formatting is inconsistent.",
    stat: "Any format — PDF, photo, scan",
    href: "/tools/syllabus",
  },
  {
    tag: "ζ",
    ttl: "Accountability Pact",
    body: "Lock a session with a friend. If either of you bails, both streaks reset. The only social feature that works by being uncomfortable.",
    extra: "If either of you leaves early, both streaks reset — the discomfort of letting someone else down is more motivating than personal discipline alone.",
    stat: "Shared streak · shared stakes",
    href: "/tools/rooms",
  },
  {
    tag: "η",
    ttl: "Marks → College Simulator",
    body: "A feedback loop: score X on this week's test and these universities move in or out of reach. Based on published historic cutoffs.",
    extra: "Built on published cutoff data across 60 universities. Shows where you stand — in the margin or safely inside the band — and how this week's marks move it.",
    stat: "60 universities · published cutoffs",
    href: "/tools/admissions",
  },
] as const

export default function FeaturesShowcase() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 24 }}>
        <div className="mono" style={{
          color: "var(--cinnabar-ink)", fontSize: 9,
          letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8,
        }}>
          Seven Signatures · Exclusive to Ledger
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500, color: "var(--ink)" }}>
            Features nobody else ships.
          </div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Click any card to read more</div>
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginTop: 8, maxWidth: 620 }}>
          The 55 tools above are the price of entry. These seven are the reason you stay. None of them are available in another student app — we looked, and then we built them.
        </p>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }}>
        {SIGNATURES.map((f, i) => {
          const isOpen = open === i
          return (
            <div
              key={f.tag}
              onClick={() => setOpen(isOpen ? null : i)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && setOpen(isOpen ? null : i)}
              style={{
                background: isOpen
                  ? "color-mix(in srgb, var(--cinnabar-ink) 9%, var(--paper-2))"
                  : "var(--paper)",
                cursor: "pointer",
                padding: "22px 20px",
                textAlign: "left",
                transition: "background 200ms ease",
                outline: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{
                    fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 28,
                    color: "var(--cinnabar-ink)", fontWeight: 400, lineHeight: 1, flexShrink: 0,
                  }}>
                    {f.tag}
                  </span>
                  <div>
                    <div style={{
                      fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15,
                      fontWeight: 500, color: "var(--ink)", lineHeight: 1.25,
                    }}>
                      {f.ttl}
                    </div>
                    <div className="mono" style={{ fontSize: 8, color: "var(--cinnabar-ink)", marginTop: 4 }}>
                      {f.stat}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9,
                  color: isOpen ? "var(--cinnabar-ink)" : "var(--ink-3)",
                  flexShrink: 0, marginTop: 3,
                  transition: "color 200ms",
                }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              <p style={{
                fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.65,
                color: "var(--ink-2)", margin: "12px 0 0",
              }}>
                {f.body}
              </p>

              {isOpen && (
                <div
                  style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--rule)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <p style={{
                    fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.7,
                    color: "var(--ink-3)", margin: 0,
                  }}>
                    {f.extra}
                  </p>
                  <Link
                    href={f.href}
                    style={{
                      display: "inline-block", marginTop: 14,
                      fontFamily: "var(--mono)", fontSize: 10,
                      color: "var(--cinnabar-ink)", letterSpacing: "0.08em",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--cinnabar-ink)",
                      paddingBottom: 1,
                    }}
                  >
                    Open tool →
                  </Link>
                </div>
              )}
            </div>
          )
        })}

        <div style={{
          background: "color-mix(in srgb, var(--ink) 4%, var(--paper-2))",
          padding: "22px 20px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
              Now live
            </div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, fontWeight: 500, color: "var(--ink)", lineHeight: 1.25 }}>
              Exam-Day Mode
            </div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.65,
              color: "var(--ink-3)", marginTop: 10,
            }}>
              The morning of the paper, Ledger locks to a single-screen revision of only what you got wrong in the last 14 days. No distractions. No decisions. Just the gaps.
            </p>
          </div>
          <Link
            href="/tools/exam-day"
            style={{
              display: "inline-block", marginTop: 16,
              fontFamily: "var(--mono)", fontSize: 10,
              color: "var(--cinnabar-ink)", letterSpacing: "0.08em",
              textDecoration: "none",
              borderBottom: "1px solid var(--cinnabar-ink)",
              paddingBottom: 1, alignSelf: "flex-start",
            }}
          >
            Open tool →
          </Link>
        </div>
      </div>
    </div>
  )
}
