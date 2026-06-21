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
        width: "75vw", height: "75vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,212,255,0.38) 0%, rgba(0,180,220,0.16) 40%, transparent 70%)",
        filter: "blur(70px)",
        animation: "meshDriftA 22s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 2 — indigo/violet, top-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "-15%", right: "-15%",
        width: "65vw", height: "65vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(100,60,255,0.28) 0%, rgba(70,40,220,0.12) 40%, transparent 70%)",
        filter: "blur(90px)",
        animation: "meshDriftB 28s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 3 — deep teal, center */}
      <div className="mesh-blob" style={{
        position: "absolute",
        top: "35%", left: "20%",
        width: "60vw", height: "60vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,200,220,0.20) 0%, rgba(0,140,180,0.08) 40%, transparent 70%)",
        filter: "blur(110px)",
        animation: "meshDriftC 35s ease-in-out infinite",
        willChange: "transform",
      }} />
      {/* Blob 4 — electric cyan, bottom-right */}
      <div className="mesh-blob" style={{
        position: "absolute",
        bottom: "-10%", right: "5%",
        width: "50vw", height: "50vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,230,255,0.26) 0%, rgba(0,200,240,0.10) 40%, transparent 70%)",
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
