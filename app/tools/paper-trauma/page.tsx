"use client";

import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type EvidenceCluster = {
  papers: string[];
  pattern_in_this_cluster: string;
  marks_lost: number;
};

type MicroDrill = {
  drill_name: string;
  time_required: string;
  exact_method: string;
};

type TraumaMapResult = {
  trauma_signature: string;
  severity: "low" | "medium" | "high";
  evidence_clusters: EvidenceCluster[];
  ghost_questions: string[];
  patch_protocol: MicroDrill[];
  one_line_verdict: string;
};

/*
  Severity colours use CSS custom properties defined in globals.css:
    --severity-low-color    / --severity-low-bg
    --severity-medium-color / --severity-medium-bg
    --severity-high-color   / --severity-high-bg

  Add to globals.css (light theme):
    --severity-low-color:    oklch(0.45 0.13 72);
    --severity-low-bg:       oklch(0.97 0.04 90);
    --severity-medium-color: oklch(0.45 0.18 42);
    --severity-medium-bg:    oklch(0.97 0.05 60);
    --severity-high-color:   oklch(0.38 0.18 25);
    --severity-high-bg:      oklch(0.96 0.05 25);
*/

const severityConfig: Record<
  "low" | "medium" | "high",
  { label: string; color: string; bg: string }
> = {
  low:    { label: "LOW RISK",    color: "var(--severity-low-color)",    bg: "var(--severity-low-bg)"    },
  medium: { label: "MEDIUM RISK", color: "var(--severity-medium-color)", bg: "var(--severity-medium-bg)" },
  high:   { label: "HIGH RISK",   color: "var(--severity-high-color)",   bg: "var(--severity-high-bg)"   },
};

export default function PaperTraumaPage() {
  const [mockData, setMockData] = useState("");
  const [whyNotes, setWhyNotes] = useState("");
  const [result, setResult] = useState<TraumaMapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    signature: true,
    clusters: false,
    ghost: false,
    patch: false,
  });
  const [copied, setCopied] = useState(false);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!mockData.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await callAI({
        tool: "paper_trauma_map",
        mock_data: mockData.trim(),
        why_notes: whyNotes.trim(),
      }) as TraumaMapResult;
      setResult(res);
      setOpenSections({ signature: true, clusters: true, ghost: true, patch: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!result) return;
    const drills = result.patch_protocol
      .map((d, i) => `${i + 1}. ${d.drill_name} (${d.time_required}): ${d.exact_method}`)
      .join("\n");
    const text = `📌 My Paper Trauma Signature: "${result.trauma_signature}"\n\nSeverity: ${result.severity.toUpperCase()}\n\n48-Hour Patch Protocol:\n${drills}\n\n— via Paper Trauma Map`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const sev = result ? severityConfig[result.severity] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--rule)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          background: "var(--paper)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "var(--ink-3)",
            textDecoration: "none",
            fontSize: "0.8rem",
            fontFamily: "var(--mono)",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          ← Dashboard
        </Link>
        <span
          style={{
            color: "var(--rule)",
            fontSize: "1rem",
            lineHeight: 1,
          }}
        >
          /
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--mono)",
            color: "var(--ink-2)",
            letterSpacing: "0.04em",
          }}
        >
          PRACTISE
        </span>
        <span style={{ color: "var(--rule)", fontSize: "1rem", lineHeight: 1 }}>/</span>
        <span
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--mono)",
            color: "var(--ink)",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          Paper Trauma Map
        </span>
      </header>

      <main
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem 4rem",
        }}
      >
        {/* Title block */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 0.6rem",
              lineHeight: 1.2,
            }}
          >
            Paper Trauma Map
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "0.95rem",
              color: "var(--ink-2)",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            Paste your last 2–5 mock results. The AI finds the hidden failure
            pattern repeating across every paper — and gives you a 48-hour fix.
          </p>
        </div>

        {/* Input card */}
        <div
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            borderRadius: "10px",
            padding: "1.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <label
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            Mock Results (2–5 papers)
          </label>
          <textarea
            value={mockData}
            onChange={(e) => setMockData(e.target.value)}
            placeholder={`Paste your results here. Example format:\n\nMock 1:\nQ3 — My: B, Correct: D — Topic: Integration (sign error?)\nQ11 — My: A, Correct: C — Topic: Assertion-Reason (misread?)\nQ22 — My: C, Correct: C ✓\n\nMock 2:\nQ14 — My: B, Correct: D — Topic: Integration\nQ31 — My: A, Correct: C — Topic: Limiting cases\n...\n\nAny format works — just be consistent.`}
            rows={12}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              borderRadius: "6px",
              padding: "0.9rem 1rem",
              fontFamily: "var(--mono)",
              fontSize: "0.82rem",
              color: "var(--ink)",
              resize: "vertical",
              lineHeight: 1.7,
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "1.25rem 0 0.6rem",
            }}
          >
            Your Gut Notes (optional)
          </label>
          <textarea
            value={whyNotes}
            onChange={(e) => setWhyNotes(e.target.value)}
            placeholder="e.g. 'I always rush the last 5 questions' or 'Sign errors keep killing me in calculus' or 'I misread except/not questions'"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              borderRadius: "6px",
              padding: "0.9rem 1rem",
              fontFamily: "var(--sans)",
              fontSize: "0.88rem",
              color: "var(--ink)",
              resize: "vertical",
              lineHeight: 1.6,
              outline: "none",
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !mockData.trim()}
            style={{
              marginTop: "1.25rem",
              background:
                loading || !mockData.trim()
                  ? "var(--ink-3)"
                  : "var(--cinnabar)",
              color: "var(--cinnabar-ink)",
              border: "none",
              borderRadius: "6px",
              padding: "0.75rem 1.75rem",
              fontFamily: "var(--mono)",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              cursor: loading || !mockData.trim() ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              opacity: loading || !mockData.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "Analysing…" : "Generate Trauma Map →"}
          </button>
        </div>

        {/* Thinking state */}
        {loading && (
          <div style={{ margin: "1rem 0" }}>
            <AIThinking />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "var(--severity-high-bg)",
              border: "1px solid var(--severity-high-border)",
              borderRadius: "6px",
              padding: "1rem 1.25rem",
              color: "var(--severity-high-color)",
              fontFamily: "var(--sans)",
              fontSize: "0.88rem",
              marginBottom: "1.5rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && sev && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* One-line verdict */}
            <div
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
              }}
            >
              <AIOutput text={result.one_line_verdict} variant="principle" />
            </div>

            {/* Section 1: Trauma Signature */}
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggleSection("signature")}
                style={{
                  width: "100%",
                  background: "var(--paper-2)",
                  border: "none",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    01
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    Trauma Signature
                  </span>
                  <span
                    style={{
                      background: sev.bg,
                      color: sev.color,
                      border: `1px solid ${sev.color}`,
                      borderRadius: "4px",
                      padding: "0.15rem 0.55rem",
                      fontFamily: "var(--mono)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                    }}
                  >
                    {sev.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--ink-3)",
                    transform: openSections.signature ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {openSections.signature && (
                <div
                  style={{
                    padding: "1.25rem",
                    borderTop: "1px solid var(--rule)",
                    background: "var(--paper)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--cinnabar)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    &ldquo;{result.trauma_signature.split("—")[0]?.trim() || result.trauma_signature}&rdquo;
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "0.92rem",
                      color: "var(--ink-2)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {result.trauma_signature}
                  </p>
                </div>
              )}
            </div>

            {/* Section 2: Evidence Clusters */}
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggleSection("clusters")}
                style={{
                  width: "100%",
                  background: "var(--paper-2)",
                  border: "none",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    02
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    Evidence Clusters
                  </span>
                  <span
                    style={{
                      background: "var(--paper-2)",
                      border: "1px solid var(--rule)",
                      borderRadius: "4px",
                      padding: "0.15rem 0.55rem",
                      fontFamily: "var(--mono)",
                      fontSize: "0.68rem",
                      color: "var(--ink-3)",
                    }}
                  >
                    {result.evidence_clusters.length} clusters
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--ink-3)",
                    transform: openSections.clusters ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {openSections.clusters && (
                <div
                  style={{
                    padding: "1.25rem",
                    borderTop: "1px solid var(--rule)",
                    background: "var(--paper)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.9rem",
                  }}
                >
                  {result.evidence_clusters.map((cluster, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--rule)",
                        borderRadius: "6px",
                        padding: "1rem 1.1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginBottom: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                          }}
                        >
                          {cluster.papers.map((p, j) => (
                            <span
                              key={j}
                              style={{
                                background: "var(--paper)",
                                border: "1px solid var(--rule)",
                                borderRadius: "4px",
                                padding: "0.15rem 0.5rem",
                                fontFamily: "var(--mono)",
                                fontSize: "0.72rem",
                                color: "var(--ink-2)",
                              }}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.75rem",
                            color: "var(--severity-high-color)",
                            background: "var(--severity-high-bg)",
                            border: "1px solid var(--severity-high-border)",
                            borderRadius: "4px",
                            padding: "0.15rem 0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          −{cluster.marks_lost} marks
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "0.88rem",
                          color: "var(--ink-2)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {cluster.pattern_in_this_cluster}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Ghost Questions */}
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggleSection("ghost")}
                style={{
                  width: "100%",
                  background: "var(--paper-2)",
                  border: "none",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    03
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    Ghost Questions
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--ink-3)",
                    transform: openSections.ghost ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {openSections.ghost && (
                <div
                  style={{
                    padding: "1.25rem",
                    borderTop: "1px solid var(--rule)",
                    background: "var(--paper)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "0.8rem",
                      color: "var(--ink-3)",
                      margin: "0 0 1rem",
                      fontStyle: "italic",
                    }}
                  >
                    These question types are statistically likely to carry your trauma
                    pattern in tomorrow&apos;s paper. Watch for them.
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.55rem",
                    }}
                  >
                    {result.ghost_questions.map((q, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          fontFamily: "var(--sans)",
                          fontSize: "0.9rem",
                          color: "var(--ink-2)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.7rem",
                            color: "var(--cinnabar)",
                            marginTop: "0.25rem",
                            minWidth: "1.2rem",
                          }}
                        >
                          ◆
                        </span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Section 4: Patch Protocol */}
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggleSection("patch")}
                style={{
                  width: "100%",
                  background: "var(--paper-2)",
                  border: "none",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    04
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    48-Hour Patch Protocol
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--ink-3)",
                    transform: openSections.patch ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {openSections.patch && (
                <div
                  style={{
                    padding: "1.25rem",
                    borderTop: "1px solid var(--rule)",
                    background: "var(--paper)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {result.patch_protocol.map((drill, i) => (
                    <div
                      key={i}
                      style={{
                        borderLeft: "3px solid var(--cinnabar)",
                        paddingLeft: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          marginBottom: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--sans)",
                            fontSize: "0.93rem",
                            fontWeight: 700,
                            color: "var(--ink)",
                          }}
                        >
                          {i + 1}. {drill.drill_name}
                        </span>
                        <span
                          style={{
                            background: "var(--paper-2)",
                            border: "1px solid var(--rule)",
                            borderRadius: "4px",
                            padding: "0.1rem 0.5rem",
                            fontFamily: "var(--mono)",
                            fontSize: "0.7rem",
                            color: "var(--ink-3)",
                          }}
                        >
                          {drill.time_required}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "0.87rem",
                          color: "var(--ink-2)",
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {drill.exact_method}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share button */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: "0.5rem",
              }}
            >
              <button
                onClick={handleShare}
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--rule)",
                  borderRadius: "6px",
                  padding: "0.6rem 1.25rem",
                  fontFamily: "var(--mono)",
                  fontSize: "0.75rem",
                  color: copied ? "var(--severity-success-color)" : "var(--ink-2)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
              >
                {copied ? "✓ Copied to clipboard" : "⎘ Copy Signature + Patch Plan"}
              </button>
            </div>

            {/* Tier gate hint */}
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.78rem",
                color: "var(--ink-3)",
                textAlign: "center",
                margin: "0.5rem 0 0",
                fontStyle: "italic",
              }}
            >
              Save & track your trauma history across sessions —{" "}
              <Link
                href="/dashboard"
                style={{
                  color: "var(--cinnabar)",
                  textDecoration: "none",
                  fontStyle: "normal",
                  fontFamily: "var(--mono)",
                  fontSize: "0.78rem",
                }}
              >
                upgrade to unlock
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
