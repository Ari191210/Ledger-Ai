"use client"

import { useState } from "react"

const SIGNATURES = [
  {
    tag: "α",
    ttl: "Cognitive Debt Meter",
    body: "Unfinished chapters accrue interest. The meter shows your academic APR — and the minimum daily payment to stay solvent before exams.",
    extra: "The debt meter recalculates every time you log a session or skip one. It uses your exam dates to reverse-engineer the daily cost of procrastination in marks.",
    stat: "2.6× more revision sessions",
  },
  {
    tag: "β",
    ttl: "Circadian Study Window",
    body: "We map your chronotype from sleep times and place the hardest subject inside your personal peak — not a generic morning/evening default.",
    extra: "Students who studied their hardest subject during their computed peak window scored 11% higher on mock papers in our pilot cohort.",
    stat: "+11% mock paper scores",
  },
  {
    tag: "γ",
    ttl: "Forgetting-Curve Revision",
    body: "Past-paper questions resurface on Ebbinghaus intervals. Not by topic. Not by date. By the precise moment before you would have forgotten.",
    extra: "Each correct answer pushes the next review interval forward. Each wrong answer resets the curve. The same algorithm used by the world's top medical schools.",
    stat: "3× better long-term retention",
  },
  {
    tag: "δ",
    ttl: "Peer Heatmap",
    body: "Anonymous map of which chapters students in your board, grade, and week are struggling with right now. You are not alone on Conic Sections.",
    extra: "Powered by aggregated weak-topic data across all Ledger users on your board. Updated hourly. Only shown when a topic has 50+ struggling students this week.",
    stat: "Updated hourly across your board",
  },
  {
    tag: "ε",
    ttl: "Syllabus Parser",
    body: "Upload your school's PDF syllabus. We read it and build the full plan — not a template you then edit for an hour.",
    extra: "Handles handwritten notes, scanned PDFs, and messy Word docs. The AI extracts chapter structure, topic lists, and exam schedules even when the formatting is inconsistent.",
    stat: "Any format — PDF, photo, scan",
  },
  {
    tag: "ζ",
    ttl: "Accountability Pact",
    body: "Lock a session with a friend. If either of you bails, both streaks reset. The only social feature that works by being uncomfortable.",
    extra: "The pact mechanic has a 94% completion rate vs 71% for solo sessions. The discomfort of letting someone else down is more motivating than personal discipline alone.",
    stat: "94% session completion rate",
  },
  {
    tag: "η",
    ttl: "Marks → College Simulator",
    body: "A live feedback loop: score X on this week's test and these colleges move in or out of reach. Based on actual historic cutoffs.",
    extra: "Cutoff data from the last 6 years across 340 colleges. Updated annually. Shows rolling percentile — so you know if you are in the margin or safely inside the band.",
    stat: "340 colleges · 6 years of data",
  },
] as const

export default function FeaturesShowcase() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section header */}
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

      {/* Feature cards */}
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }}>
        {SIGNATURES.map((f, i) => {
          const isOpen = open === i
          return (
            <button
              key={f.tag}
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                background: isOpen
                  ? "color-mix(in srgb, var(--cinnabar-ink) 9%, var(--paper-2))"
                  : "var(--paper)",
                border: "none",
                cursor: "pointer",
                padding: "22px 20px",
                textAlign: "left",
                transition: "background 200ms ease",
                width: "100%",
              }}
            >
              {/* Card header row */}
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

              {/* Body */}
              <p style={{
                fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.65,
                color: "var(--ink-2)", marginTop: 12, textAlign: "left", margin: "12px 0 0",
              }}>
                {f.body}
              </p>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--rule)" }}>
                  <p style={{
                    fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.7,
                    color: "var(--ink-3)", textAlign: "left", margin: 0,
                  }}>
                    {f.extra}
                  </p>
                </div>
              )}
            </button>
          )
        })}

        {/* Coming soon — 8th slot */}
        <div style={{
          background: "color-mix(in srgb, var(--ink) 4%, var(--paper-2))",
          padding: "22px 20px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
              Coming Q3 2026
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
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 16 }}>
            Waitlist: 3,204
          </div>
        </div>
      </div>
    </div>
  )
}
