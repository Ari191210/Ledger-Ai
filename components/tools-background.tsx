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
          opacity: 0.6,
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
    </>
  )
}
