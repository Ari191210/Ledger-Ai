"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadOutputs, deleteOutput, type SavedOutput } from "@/lib/saved-outputs";
import { AIOutput } from "@/components/ai-output";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

function groupByTool(outputs: SavedOutput[]): Record<string, SavedOutput[]> {
  const groups: Record<string, SavedOutput[]> = {};
  for (const o of outputs) {
    if (!groups[o.toolName]) groups[o.toolName] = [];
    groups[o.toolName].push(o);
  }
  return groups;
}

export default function SavedOutputsPage() {
  const [outputs, setOutputs] = useState<SavedOutput[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setOutputs(loadOutputs());
  }, []);

  function handleDelete(id: string) {
    deleteOutput(id);
    setOutputs((prev) => prev.filter((o) => o.id !== id));
    if (expanded === id) setExpanded(null);
  }

  const groups = groupByTool(outputs);
  const toolNames = Object.keys(groups);

  return (
    <div>
      <header
        className="mob-hp"
        style={{
          padding: "24px 44px",
          borderBottom: "1px solid var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="mono" style={{ color: "var(--ink-3)" }}>Saved Outputs</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>
          {outputs.length === 0 ? "Nothing saved yet" : `${outputs.length} saved · across ${toolNames.length} tool${toolNames.length !== 1 ? "s" : ""}`}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        {outputs.length === 0 ? (
          <div style={{ border: "1px solid var(--rule)", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, color: "var(--ink-2)", marginBottom: 12 }}>
              No saved outputs yet
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>
              When a tool generates something useful, hit &ldquo;Save →&rdquo; to keep it here.
            </div>
            <Link href="/dashboard" className="btn ghost" style={{ padding: "8px 18px", fontSize: 11 }}>
              ← Back to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            {toolNames.map((toolName) => (
              <div key={toolName} style={{ marginBottom: 48 }}>
                <div
                  className="mono cin"
                  style={{ marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--ink)" }}
                >
                  {toolName} · {groups[toolName].length}
                </div>
                <div style={{ border: "1px solid var(--rule)" }}>
                  {groups[toolName].map((entry, i) => {
                    const isExpanded = expanded === entry.id;
                    return (
                      <div
                        key={entry.id}
                        style={{
                          borderBottom: i < groups[toolName].length - 1 ? "1px solid var(--rule)" : "none",
                        }}
                      >
                        {/* Row header */}
                        <div
                          style={{
                            padding: "14px 18px",
                            display: "flex",
                            gap: 16,
                            alignItems: "flex-start",
                            background: isExpanded ? "var(--paper-2)" : "transparent",
                          }}
                        >
                          <button
                            onClick={() => setExpanded(isExpanded ? null : entry.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              flex: 1,
                              textAlign: "left",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "var(--sans)",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--ink)",
                                lineHeight: 1.35,
                                marginBottom: 4,
                              }}
                            >
                              {entry.input || "(no input)"}
                            </div>
                            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>
                              {formatDate(entry.savedAt)}
                              {!isExpanded && (
                                <span style={{ marginLeft: 10, color: "var(--cinnabar-ink)" }}>
                                  tap to expand →
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "var(--mono)",
                              fontSize: 10,
                              color: "var(--ink-3)",
                              flexShrink: 0,
                              padding: "2px 0",
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Expanded output */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: "20px 18px",
                              borderTop: "1px solid var(--rule)",
                              background: "var(--paper)",
                            }}
                          >
                            <AIOutput text={entry.outputText} />
                            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                              <Link
                                href={`/tools/${entry.toolSlug}`}
                                className="btn ghost"
                                style={{ padding: "6px 14px", fontSize: 10 }}
                              >
                                Open {entry.toolName} →
                              </Link>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="btn ghost"
                                style={{ padding: "6px 14px", fontSize: 10, color: "var(--ink-3)" }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 60,
            borderTop: "1px solid var(--ink)",
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>
            ← Dashboard
          </Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
