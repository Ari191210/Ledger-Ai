/* Home page skeleton — shown during route transition to / */

function Bar({ w, h = 10, mb = 0 }: { w: number | string; h?: number; mb?: number }) {
  return (
    <div className="skel" style={{ width: w, height: h, marginBottom: mb, flexShrink: 0 }} />
  );
}

export default function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy="true"
      style={{ background: "var(--paper)", minHeight: "100vh" }}
    >
      {/* ── Top bar ── */}
      <div style={{
        borderBottom: "1px solid var(--rule)",
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 24,
      }}>
        <Bar w={72} h={16} />
        <Bar w={1} h={24} />
        <Bar w={96} h={10} />
        <Bar w={72} h={10} />
        <div style={{ flex: 1 }} />
        <Bar w={60} h={28} />
        <Bar w={80} h={28} />
      </div>

      {/* ── Scroll progress bar ── */}
      <div style={{ height: 2, background: "var(--rule)" }} />

      {/* ── Live activity strip ── */}
      <div style={{
        borderBottom: "1px solid var(--rule)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Bar w={8} h={8} />
        <Bar w={280} h={8} />
      </div>

      {/* ── Hero section ── */}
      <div style={{
        borderBottom: "1px solid var(--rule)",
        padding: "64px 40px 72px",
        maxWidth: 1280,
        margin: "0 auto",
      }}>
        {/* Date label */}
        <Bar w={200} h={9} mb={28} />

        {/* Hero headline — 3 lines */}
        <Bar w="85%" h={56} mb={10} />
        <Bar w="70%" h={56} mb={10} />
        <Bar w="55%" h={56} mb={32} />

        {/* Sub-headline */}
        <Bar w="60%" h={14} mb={8} />
        <Bar w="48%" h={14} mb={36} />

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
          <div className="skel" style={{ width: 160, height: 44, borderRadius: 2 }} />
          <div className="skel" style={{ width: 120, height: 44, borderRadius: 2 }} />
        </div>

        {/* Stats strip — 4 cells */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--rule)",
          border: "1px solid var(--rule)",
          marginTop: 32,
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: "var(--paper)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Bar w={56} h={36} />
              <Bar w={120} h={9} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Features bento / section divider ── */}
      <div style={{ padding: "64px 40px 0", maxWidth: 1280, margin: "0 auto" }}>
        {/* Section label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
          <Bar w={24} h={9} />
          <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
          <Bar w={80} h={9} />
        </div>

        {/* 2-column bento grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--rule)",
          border: "1px solid var(--rule)",
          marginBottom: 64,
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--paper)",
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 180,
              borderBottom: i < 2 ? "1px solid var(--rule)" : undefined,
            }}>
              <Bar w={24} h={9} />
              <Bar w="70%" h={18} />
              <Bar w="90%" h={10} />
              <Bar w="80%" h={10} />
              <Bar w="65%" h={10} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tool directory skeleton ── */}
      <div style={{ padding: "0 40px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <Bar w={24} h={9} />
          <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
          <Bar w={100} h={9} />
        </div>

        {/* Category filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {[36, 44, 56, 64, 72, 60, 52].map((w, i) => (
            <div key={i} className="skel" style={{ width: w, height: 28, borderRadius: 2 }} />
          ))}
        </div>

        {/* Tool list rows */}
        <div style={{ border: "1px solid var(--rule)" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "18px 24px",
              borderBottom: i < 5 ? "1px solid var(--rule)" : undefined,
            }}>
              <Bar w={24} h={9} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Bar w="40%" h={13} />
                <Bar w="60%" h={9} />
              </div>
              <Bar w={48} h={9} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
