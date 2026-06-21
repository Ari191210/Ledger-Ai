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
        background: "#08090c",
      }}
    >
      {/* Blob 1 — Peach Fuzz, top-left dominant */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-20%", left: "-10%",
        width: "80vw", height: "80vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(255,202,175,0.52) 0%, rgba(218,184,148,0.22) 40%, transparent 70%)",
        filter: "blur(60px)",
        animation: "meshDriftA 13s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 2 — Powder Blue, top-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-15%", right: "-15%",
        width: "70vw", height: "70vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(167,190,211,0.46) 0%, rgba(198,226,233,0.18) 40%, transparent 70%)",
        filter: "blur(75px)",
        animation: "meshDriftB 17s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 3 — Cream, center */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "35%", left: "10%",
        width: "60vw", height: "60vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(241,255,196,0.34) 0%, rgba(241,255,196,0.12) 40%, transparent 70%)",
        filter: "blur(90px)",
        animation: "meshDriftC 22s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 4 — Light Blue, bottom-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        bottom: "-10%", right: "5%",
        width: "55vw", height: "55vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(198,226,233,0.42) 0%, rgba(167,190,211,0.16) 40%, transparent 70%)",
        filter: "blur(65px)",
        animation: "meshDriftD 11s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 5 — Tan, bottom-left accent */}
      <div className="mesh-blob" style={{
        position: "absolute",
        bottom: "15%", left: "-5%",
        width: "40vw", height: "40vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(218,184,148,0.32) 0%, transparent 70%)",
        filter: "blur(80px)",
        animation: "meshDriftA 19s ease-in-out infinite reverse",
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
