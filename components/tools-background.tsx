"use client"

export default function ToolsBackground() {
  return (
    <>
      {/* Opaque base — fully blocks the WebGL shader canvas (z-index 0) */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 1, background: "var(--paper)", pointerEvents: "none" }}
      />

      {/* Subtle repeating rule grid — newsprint / graph-paper feel */}
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
          opacity: 0.4,
        }}
      />

      {/* Slow ambient glow blobs — palette-aware, barely moves */}
      <div
        aria-hidden="true"
        className="tools-bg-blob-a"
        style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
      />
      <div
        aria-hidden="true"
        className="tools-bg-blob-b"
        style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
      />

      {/* Atmospheric orbs — subtle cinnabar + plum drift */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--cinnabar) 9%, transparent) 0%, transparent 70%)",
          filter: "blur(80px)", top: "-10%", right: "5%",
          animation: "hero-orb-drift 20s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, oklch(0.55 0.18 300) 7%, transparent) 0%, transparent 70%)",
          filter: "blur(90px)", bottom: "5%", left: "-5%",
          animation: "float-orb 26s ease-in-out infinite reverse",
        }} />
      </div>
    </>
  )
}
