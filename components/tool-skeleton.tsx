/* Generic two-column tool skeleton — shown during tool page route transitions */

function Bar({ w, h = 10, mb = 0 }: { w: number | string; h?: number; mb?: number }) {
  return (
    <div className="skel" style={{ width: w, height: h, marginBottom: mb, flexShrink: 0 }} />
  );
}

export default function ToolSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading tool"
      aria-busy="true"
      className="mob-p"
      style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}
    >
      {/* Tool header */}
      <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 20, marginBottom: 32 }}>
        <Bar w={56} h={8} mb={12} />
        <Bar w={240} h={34} mb={10} />
        <Bar w={340} h={11} />
      </div>

      {/* Two-column layout */}
      <div
        className="mob-col"
        style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 48 }}
      >
        {/* Left: controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Bar w="100%" h={44} />
          <Bar w="100%" h={44} />
          <Bar w="100%" h={100} />
          <Bar w={120} h={38} />
          <div style={{ marginTop: 20, border: "1px solid var(--rule)", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Bar w={80} h={8} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
                <Bar w={60} h={10} />
                <Bar w="60%" h={10} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: output placeholder */}
        <div style={{ border: "1px solid var(--rule)", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, minHeight: 400 }}>
          <Bar w={160} h={9} mb={6} />
          <Bar w="90%" h={12} />
          <Bar w="80%" h={12} />
          <Bar w="95%" h={12} />
          <Bar w="70%" h={12} />
          <div style={{ height: 1, background: "var(--rule)", margin: "8px 0" }} />
          <Bar w="85%" h={12} />
          <Bar w="90%" h={12} />
          <Bar w="60%" h={12} />
          <Bar w="75%" h={12} />
          <div style={{ height: 1, background: "var(--rule)", margin: "8px 0" }} />
          <Bar w="80%" h={12} />
          <Bar w="65%" h={12} />
        </div>
      </div>
    </div>
  );
}
