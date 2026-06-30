"use client";

import React from "react";
import { AnimatedList } from "@/components/ui/animated-list";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";

interface FeedRow {
  tool: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function ActivityRow({ label, ago }: { label: string; ago: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "1px 0" }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "var(--severity-success-color)",
        flexShrink: 0,
      }} />
      <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", flex: 1 }}>
        Someone used <strong style={{ color: "var(--ink)" }}>{label}</strong>
      </span>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)",
        flexShrink: 0, letterSpacing: "0.08em",
      }}>
        {ago}
      </span>
    </div>
  );
}

export function LiveActivityCard({
  activeCount,
  feed,
  toolLabel,
}: {
  activeCount: number | null;
  feed: FeedRow[];
  toolLabel: (slug: string) => string;
}) {
  if (activeCount === null && feed.length === 0) return null;

  return (
    <div
      className="glass-card"
      style={{ marginBottom: 32, padding: "20px 24px", position: "relative", overflow: "hidden" }}
    >
      {/* Travelling cinnabar beam along the card border */}
      <BorderBeam size={180} duration={12} colorFrom="#e89a80" colorTo="transparent" borderWidth={1.5} />

      {/* Live header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--severity-success-color)",
          display: "inline-block",
          boxShadow: "0 0 0 3px color-mix(in oklch, var(--severity-success-color) 25%, transparent)",
          animation: "pulse-dot 2s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9,
          letterSpacing: "0.16em", textTransform: "uppercase" as const,
          color: "var(--ink-3)",
        }}>
          Live
        </span>
        {activeCount !== null && (
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, marginLeft: 4 }}>
            <NumberTicker
              value={activeCount}
              style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--ink)" } as React.CSSProperties}
            />
            <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
              students studying right now
            </span>
          </span>
        )}
      </div>

      {/* Feed items appear one by one with a spring pop */}
      {feed.length > 0 && (
        <AnimatedList delay={450} className="gap-2">
          {feed.slice(0, 6).map((row, i) => (
            <ActivityRow key={i} label={toolLabel(row.tool)} ago={timeAgo(row.created_at)} />
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
