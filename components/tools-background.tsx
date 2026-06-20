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
          background: "color-mix(in oklch, var(--paper) 72%, transparent)",
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

    </>
  )
}
