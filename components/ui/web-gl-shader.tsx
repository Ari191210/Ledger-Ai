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
        background: "#09070a",
      }}
    >
      {/* Blob 1 — Fiery Terracotta, top-left dominant */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-20%", left: "-10%",
        width: "75vw", height: "75vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(229,89,52,0.34) 0%, rgba(250,121,33,0.14) 40%, transparent 70%)",
        filter: "blur(70px)",
        animation: "meshDriftA 22s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 2 — Sky Surge, top-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-15%", right: "-15%",
        width: "65vw", height: "65vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(91,192,235,0.30) 0%, rgba(91,192,235,0.10) 40%, transparent 70%)",
        filter: "blur(90px)",
        animation: "meshDriftB 28s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 3 — Banana Cream, center-left */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "35%", left: "10%",
        width: "55vw", height: "55vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(253,231,76,0.16) 0%, rgba(253,231,76,0.05) 40%, transparent 70%)",
        filter: "blur(110px)",
        animation: "meshDriftC 35s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 4 — Yellow Green, bottom-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        bottom: "-10%", right: "5%",
        width: "50vw", height: "50vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(155,197,61,0.22) 0%, rgba(155,197,61,0.07) 40%, transparent 70%)",
        filter: "blur(80px)",
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
