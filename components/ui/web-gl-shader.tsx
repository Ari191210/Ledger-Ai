"use client"

export function WebGLShader() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        background: "#030a0d",
      }}
    >
      {/* Blob 1 — cyan, top-left dominant */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-20%", left: "-10%",
        width: "70vw", height: "70vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,212,255,0.22) 0%, rgba(0,180,220,0.10) 40%, transparent 70%)",
        filter: "blur(80px)",
        animation: "meshDriftA 22s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 2 — indigo, top-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-15%", right: "-15%",
        width: "60vw", height: "60vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(80,60,220,0.16) 0%, rgba(60,40,200,0.07) 40%, transparent 70%)",
        filter: "blur(100px)",
        animation: "meshDriftB 28s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 3 — deep teal, center */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "35%", left: "20%",
        width: "55vw", height: "55vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,160,180,0.12) 0%, rgba(0,120,160,0.05) 40%, transparent 70%)",
        filter: "blur(120px)",
        animation: "meshDriftC 35s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 4 — cyan, bottom-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        bottom: "-15%", right: "5%",
        width: "45vw", height: "45vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,212,255,0.14) 0%, rgba(0,180,220,0.06) 40%, transparent 70%)",
        filter: "blur(90px)",
        animation: "meshDriftD 18s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Subtle grain */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
      }} />
    </div>
  )
}
