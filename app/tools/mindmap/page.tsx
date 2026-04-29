"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Node = { label: string; children?: Node[] };
type MapData = { center: string; branches: Node[] };

function Branch({ node, depth = 0 }: { node: Node; depth?: number }) {
  const [open, setOpen] = useState(true);
  const colors = ["var(--cinnabar-ink)", "#1a6091", "#2d7a3c", "#8b5a2b", "#6b3fa0"];
  const color  = colors[depth % colors.length];
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div onClick={() => node.children?.length && setOpen(o => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: `${depth === 0 ? 10 : 6}px ${depth === 0 ? 16 : 12}px`, border: `1px solid ${color}`, marginBottom: 6, cursor: node.children?.length ? "pointer" : "default", background: depth === 0 ? color : "transparent", color: depth === 0 ? "var(--paper)" : color }}>
        {node.children?.length ? <span style={{ fontFamily: "var(--mono)", fontSize: 9 }}>{open ? "▾" : "▸"}</span> : null}
        <span style={{ fontFamily: depth === 0 ? "var(--serif)" : "var(--sans)", fontSize: depth === 0 ? 15 : 13, fontWeight: depth === 0 ? 700 : 400, fontStyle: depth === 0 ? "italic" : "normal" }}>{node.label}</span>
      </div>
      {open && node.children?.map((c, i) => (
        <div key={i} style={{ paddingLeft: 16, borderLeft: `1px solid ${color}20`, marginLeft: depth === 0 ? 8 : 0 }}>
          <Branch node={c} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export default function MindMapPage() {
  const [topic, setTopic]   = useState("");
  const [detail, setDetail] = useState("medium");
  const [map, setMap]       = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setMap(null);
    try {
      const res  = await callAI({ tool: "mindmap", topic, detail });
      const data = await res.json();
      if (!res.ok || !data.branches) { setError("Could not generate — try again."); return; }
      setMap(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 21 · Mind Map Builder</div>
        {map && <button className="btn ghost" onClick={() => setMap(null)}>New map</button>}
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {!map ? (
          <>
            <div className="mono cin" style={{ marginBottom: 8 }}>Build a mind map</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Full concept breakdown.</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 20 }}>
              <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="e.g. Photosynthesis, French Revolution, Machine Learning, Supply and Demand…"
                style={{ fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)" }} />
              <select value={detail} onChange={e => setDetail(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 10px", color: "var(--ink)" }}>
                <option value="brief">Overview (3 branches)</option>
                <option value="medium">Standard (5 branches)</option>
                <option value="deep">Deep dive (7+ branches)</option>
              </select>
            </div>
            {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
            <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Building map…" : "Generate mind map →"}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-block", padding: "14px 28px", background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700 }}>{map.center}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {map.branches.map((b, i) => (
                <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px" }}>
                  <Branch node={b} depth={0} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn ghost" onClick={() => window.print()} style={{ marginRight: 10 }}>Print / PDF ↗</button>
            </div>
          </>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 21 of 44.</div>
        </div>
      </main>
    </div>
  );
}
