"use client";
import { useState } from "react";
import Link from "next/link";

type Board = "CBSE" | "JEE" | "NEET" | "IB" | "IGCSE";
type Trend = "up" | "down" | "stable";
type Topic = { name: string; count: number; trend: Trend };
type SubjectData = { subject: string; topics: Topic[] };

const DATA: Record<Board, SubjectData[]> = {
  CBSE: [
    { subject: "Mathematics", topics: [
      { name: "Conic Sections",            count: 847, trend: "up"     },
      { name: "Integrals",                 count: 634, trend: "up"     },
      { name: "Probability",               count: 521, trend: "stable" },
      { name: "Matrices & Determinants",   count: 489, trend: "down"   },
      { name: "Differential Equations",    count: 412, trend: "up"     },
      { name: "Vector Algebra",            count: 287, trend: "stable" },
    ]},
    { subject: "Physics", topics: [
      { name: "Electromagnetic Induction", count: 723, trend: "up"     },
      { name: "Optics",                    count: 598, trend: "stable" },
      { name: "Semiconductor Devices",     count: 445, trend: "up"     },
      { name: "Alternating Current",       count: 412, trend: "down"   },
      { name: "Dual Nature of Matter",     count: 334, trend: "stable" },
      { name: "Atoms & Nuclei",            count: 298, trend: "up"     },
    ]},
    { subject: "Chemistry", topics: [
      { name: "Organic Mechanisms",        count: 812, trend: "up"     },
      { name: "Coordination Compounds",    count: 687, trend: "up"     },
      { name: "Electrochemistry",          count: 534, trend: "stable" },
      { name: "p-Block Elements",          count: 478, trend: "down"   },
      { name: "Polymers",                  count: 356, trend: "stable" },
      { name: "Biomolecules",              count: 289, trend: "up"     },
    ]},
  ],
  JEE: [
    { subject: "Mathematics", topics: [
      { name: "Complex Numbers",             count: 1284, trend: "up"     },
      { name: "Quadratic Equations",         count: 967,  trend: "stable" },
      { name: "Sequences & Series",          count: 834,  trend: "up"     },
      { name: "Circle Geometry",             count: 712,  trend: "up"     },
      { name: "Permutations & Combinations", count: 645,  trend: "down"   },
      { name: "3D Geometry",                 count: 589,  trend: "stable" },
    ]},
    { subject: "Physics", topics: [
      { name: "Rotational Motion",    count: 1145, trend: "up"     },
      { name: "Thermodynamics",       count: 987,  trend: "up"     },
      { name: "Electrostatics",       count: 823,  trend: "stable" },
      { name: "SHM & Waves",          count: 734,  trend: "up"     },
      { name: "Modern Physics",       count: 612,  trend: "down"   },
      { name: "Fluid Mechanics",      count: 489,  trend: "stable" },
    ]},
    { subject: "Chemistry", topics: [
      { name: "Mole Concept",                   count: 934, trend: "stable" },
      { name: "Chemical Bonding",               count: 812, trend: "up"     },
      { name: "General Organic Chemistry",      count: 756, trend: "up"     },
      { name: "Ionic Equilibrium",              count: 678, trend: "up"     },
      { name: "Thermochemistry",                count: 534, trend: "down"   },
      { name: "d-Block Elements",               count: 445, trend: "stable" },
    ]},
  ],
  NEET: [
    { subject: "Biology", topics: [
      { name: "Genetics & Inheritance",  count: 1156, trend: "up"     },
      { name: "Human Physiology",        count: 934,  trend: "stable" },
      { name: "Reproduction",            count: 812,  trend: "up"     },
      { name: "Ecology & Environment",   count: 723,  trend: "up"     },
      { name: "Plant Physiology",        count: 567,  trend: "down"   },
      { name: "Cell Biology",            count: 489,  trend: "stable" },
    ]},
    { subject: "Physics", topics: [
      { name: "Laws of Motion",          count: 712, trend: "stable" },
      { name: "Optics",                  count: 634, trend: "up"     },
      { name: "Electricity",             count: 578, trend: "up"     },
      { name: "Work, Energy & Power",    count: 489, trend: "down"   },
      { name: "Magnetism",               count: 423, trend: "stable" },
      { name: "Thermodynamics",          count: 345, trend: "up"     },
    ]},
    { subject: "Chemistry", topics: [
      { name: "Organic Reactions",       count: 867, trend: "up"     },
      { name: "Chemical Equilibrium",    count: 712, trend: "up"     },
      { name: "Periodic Table Trends",   count: 589, trend: "stable" },
      { name: "Biomolecules",            count: 512, trend: "up"     },
      { name: "Coordination Chemistry",  count: 445, trend: "down"   },
      { name: "Solid State",             count: 334, trend: "stable" },
    ]},
  ],
  IB: [
    { subject: "Mathematics", topics: [
      { name: "Calculus",              count: 634, trend: "up"     },
      { name: "Statistics",            count: 512, trend: "up"     },
      { name: "Vectors",               count: 445, trend: "stable" },
      { name: "Complex Numbers",       count: 389, trend: "up"     },
      { name: "Proof",                 count: 312, trend: "down"   },
      { name: "Differential Eqs",     count: 267, trend: "stable" },
    ]},
    { subject: "Physics", topics: [
      { name: "Wave Phenomena",        count: 567, trend: "up"     },
      { name: "Electricity & Mag",    count: 489, trend: "stable" },
      { name: "Thermal Physics",       count: 412, trend: "up"     },
      { name: "Quantum & Nuclear",     count: 378, trend: "up"     },
      { name: "Fields",                count: 334, trend: "down"   },
      { name: "Mechanics",             count: 289, trend: "stable" },
    ]},
    { subject: "Chemistry", topics: [
      { name: "Organic Chemistry",     count: 623, trend: "up"     },
      { name: "Equilibrium",           count: 512, trend: "stable" },
      { name: "Acid-Base Chemistry",   count: 445, trend: "up"     },
      { name: "Redox Reactions",       count: 389, trend: "up"     },
      { name: "Energetics",            count: 334, trend: "down"   },
      { name: "Bonding Structure",     count: 289, trend: "stable" },
    ]},
  ],
  IGCSE: [
    { subject: "Mathematics", topics: [
      { name: "Algebra",               count: 534, trend: "up"     },
      { name: "Trigonometry",          count: 445, trend: "up"     },
      { name: "Geometry & Mensuration",count: 389, trend: "stable" },
      { name: "Probability & Stats",   count: 334, trend: "up"     },
      { name: "Functions & Graphs",    count: 289, trend: "down"   },
      { name: "Vectors & Matrices",    count: 234, trend: "stable" },
    ]},
    { subject: "Physics", topics: [
      { name: "Forces & Motion",       count: 489, trend: "stable" },
      { name: "Waves & Optics",        count: 412, trend: "up"     },
      { name: "Electricity",           count: 378, trend: "up"     },
      { name: "Thermal Physics",       count: 312, trend: "up"     },
      { name: "Magnetism",             count: 267, trend: "down"   },
      { name: "Radioactivity",         count: 223, trend: "stable" },
    ]},
    { subject: "Chemistry", topics: [
      { name: "Organic Chemistry",     count: 523, trend: "up"     },
      { name: "Acids & Bases",         count: 445, trend: "up"     },
      { name: "Metals & Reactivity",   count: 389, trend: "stable" },
      { name: "Electrolysis",          count: 312, trend: "up"     },
      { name: "Rates of Reaction",     count: 267, trend: "down"   },
      { name: "The Periodic Table",    count: 234, trend: "stable" },
    ]},
  ],
};

const MAX_COUNT = 1300;

function heatColor(count: number): string {
  if (count >= 900) return "#d62b2b";
  if (count >= 600) return "#e07c2a";
  if (count >= 400) return "#c4a520";
  if (count >= 200) return "#3a7a5a";
  return "var(--ink-3)";
}

function heatBg(count: number): string {
  if (count >= 900) return "color-mix(in srgb, #d62b2b 12%, var(--paper-2))";
  if (count >= 600) return "color-mix(in srgb, #e07c2a 10%, var(--paper-2))";
  if (count >= 400) return "color-mix(in srgb, #c4a520 10%, var(--paper-2))";
  if (count >= 200) return "color-mix(in srgb, #3a7a5a 8%, var(--paper-2))";
  return "var(--paper)";
}

const TREND_SYMBOL: Record<Trend, string> = { up: "↑", down: "↓", stable: "→" };
const TREND_LABEL: Record<Trend, string> = { up: "rising", down: "cooling", stable: "stable" };

export default function PeerHeatmapPage() {
  const [board, setBoard] = useState<Board>("CBSE");

  const data = DATA[board];
  const allTopics = data.flatMap(s => s.topics.map(t => ({ ...t, subject: s.subject })));
  const trending = [...allTopics].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Peer Heatmap · δ</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Sample data · {board}</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 32, overflow: "hidden" }}>
          {(["CBSE", "JEE", "NEET", "IB", "IGCSE"] as Board[]).map(b => (
            <button key={b} onClick={() => setBoard(b)}
              style={{
                flex: 1, padding: "10px 0", border: "none", borderRight: "1px solid var(--rule)",
                background: board === b ? "var(--ink)" : "var(--paper)",
                color: board === b ? "var(--paper)" : "var(--ink-2)",
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em",
                cursor: "pointer", transition: "all 150ms",
              }}>
              {b}
            </button>
          ))}
        </div>

        <div className="mono cin" style={{ marginBottom: 12 }}>Top 5 — most students struggling right now</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--ink)", marginBottom: 36 }} className="mob-col">
          {trending.map((t, i) => (
            <div key={i} style={{ padding: "16px 14px", background: heatBg(t.count) }}>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 4 }}>#{i + 1}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, marginBottom: 4 }}>{t.name}</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 10 }}>{t.subject}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26, color: heatColor(t.count), lineHeight: 1 }}>{t.count}</span>
              </div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginTop: 2 }}>
                {TREND_SYMBOL[t.trend]} {TREND_LABEL[t.trend]} · students struggling
              </div>
            </div>
          ))}
        </div>

        <div className="mono cin" style={{ marginBottom: 16 }}>Full heatmap — {board}</div>
        {data.map(subj => (
          <div key={subj.subject} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8, paddingLeft: 2 }}>{subj.subject}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }} className="mob-col">
              {subj.topics.map(t => (
                <div key={t.name} style={{ padding: "14px 16px", background: heatBg(t.count) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", flex: 1, lineHeight: 1.3 }}>{t.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: heatColor(t.count), flexShrink: 0, marginTop: 1 }}>{TREND_SYMBOL[t.trend]}</div>
                  </div>
                  <div style={{ height: 3, background: "var(--rule)", marginBottom: 5 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (t.count / MAX_COUNT) * 100)}%`, background: heatColor(t.count) }} />
                  </div>
                  <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{t.count} students · {TREND_LABEL[t.trend]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8, marginBottom: 40, flexWrap: "wrap" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Struggle intensity:</div>
          {[
            { label: "Low (<200)", color: "#3a7a5a" },
            { label: "Moderate (200–400)", color: "#c4a520" },
            { label: "High (400–600)", color: "#e07c2a" },
            { label: "Critical (600+)", color: "#d62b2b" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, background: l.color, borderRadius: 1, flexShrink: 0 }} />
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{l.label}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginBottom: 40 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>About the data</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 640 }}>
            Sample data · Representative distribution of common struggle topics across boards. When live aggregation is available, this will reflect real student data from your board.
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
