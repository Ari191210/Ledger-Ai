"use client"

export default function ToolsBackground() {
  return (
    <>
      {/* Primary overlay — aurora glows through at 22% */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "color-mix(in oklch, var(--paper) 78%, transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Radial vignette — focuses center, darkens edges */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, color-mix(in oklch, var(--paper) 40%, transparent) 100%)",
        }}
      />

      {/* Subtle grid */}
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
          opacity: 0.2,
        }}
      />
    </>
  )
}
