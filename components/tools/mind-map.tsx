"use client";
// Mind Map — the shared half of a tab that exists in two hosts (M2-5).
//
// `MindMapTab` lives in `app/tools/learn-lab/page.tsx` and
// `app/tools/reference-builder/page.tsx`. PRODUCT_DECISIONS §1.5 lists it as
// duplicate functionality, and the *engine* genuinely is duplicated
// byte-for-byte — the node type, the recursive `Branch` renderer, and the
// generate cycle. Their **presentation has diverged**: learn-lab lays the input
// out as a 1fr/auto grid inside a 820px column and puts the result actions in a
// header row; reference-builder stacks the input and puts the actions below the
// map, in the opposite order.
//
// M2 is a deduplication, not a redesign, so the divergent JSX stays with each
// host and only the genuinely-identical engine moves here. Consolidating the
// two layouts would change what one of the two hosts renders, which this
// milestone forbids. Flagged in the M2 report as a design decision for later.

import { useState } from "react";
import { callAIOrThrow } from "@/lib/ai-fetch";

export type MMNode  = { label: string; children?: MMNode[] };
export type MapData = { center: string; branches: MMNode[] };

/** Recursive branch renderer. Identical in both hosts before extraction. */
export function Branch({ node, depth = 0 }: { node: MMNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const colors = ["var(--cinnabar-ink)", "var(--ink-2)", "var(--sage)", "var(--gold)", "var(--ink-2)"];
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

/** State + generate cycle. Identical in both hosts before extraction. */
export function useMindMap() {
  const [topic, setTopic]     = useState("");
  const [detail, setDetail]   = useState("medium");
  const [map, setMap]         = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setMap(null);
    try {
      const data = await callAIOrThrow<MapData>({ tool: "mindmap", topic, detail });
      setMap(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return { topic, setTopic, detail, setDetail, map, setMap, loading, error, generate };
}

/** The three detail levels, offered identically by both hosts. */
export const MINDMAP_DETAIL_LEVELS: [string, string][] = [
  ["brief", "Overview"], ["medium", "Standard"], ["deep", "Deep dive"],
];
