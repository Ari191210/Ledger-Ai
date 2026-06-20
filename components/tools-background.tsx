"use client"

export default function ToolsBackground() {
  return (
    <>
      {/* Semi-transparent overlay — lets WebGL shader aurora show through */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "color-mix(in oklch, var(--paper) 72%, transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle rule grid */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage: [
            "linear-gradient(var(--rule-2) 1px, transparent 1px)",
            "linear-gradient(90deg, var(--rule-2) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
          opacity: 0.25,
        }}
      />
    </>
  )
}
