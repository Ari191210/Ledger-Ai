/* Dashboard skeleton — shown during auth load and route transition.
   Mirrors the exact layout of app/dashboard/page.tsx so there's no layout shift. */

function Bar({ w, h = 10, mb = 0 }: { w: number | string; h?: number; mb?: number }) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, marginBottom: mb, flexShrink: 0 }}
    />
  );
}

function StatCell() {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRight: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Bar w={56} h={8} />
      <Bar w={44} h={28} />
      <Bar w={72} h={8} />
    </div>
  );
}

function ScoreRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 42px 1fr", gap: 10, alignItems: "center" }}>
      <Bar w="100%" h={8} />
      <Bar w="100%" h={12} />
      <div className="skel" style={{ height: 4, width: "100%" }} />
    </div>
  );
}

function ToolCard() {
  return (
    <div
      style={{
        background: "var(--paper)",
        padding: "22px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 188,
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <Bar w={32} h={7} />
      <Bar w="75%" h={16} />
      <Bar w="60%" h={8} />
      <Bar w="90%" h={8} />
      <Bar w="80%" h={8} />
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
        <Bar w={20} h={8} />
        <Bar w={12} h={12} />
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <main
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
      style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}
      className="mob-p"
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 24, marginBottom: 32 }}>
        <Bar w={120} h={9} mb={12} />
        <Bar w={280} h={44} mb={20} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[88, 76, 64, 72, 90, 80].map((w, i) => (
            <div key={i} className="skel" style={{ width: w, height: 30, borderRadius: 2 }} />
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div
        className="mob-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 1,
          background: "var(--rule)",
          border: "1px solid var(--rule)",
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => <StatCell key={i} />)}
      </div>

      {/* ── Score widget ── */}
      <div style={{ border: "1px solid var(--rule)", marginBottom: 40 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 20px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--paper-2)",
          }}
        >
          <Bar w={100} h={8} />
          <Bar w={80} h={8} />
        </div>
        {/* Body */}
        <div className="dash-score-body" style={{ display: "flex", background: "var(--paper)" }}>
          <div style={{ padding: "24px 28px", borderRight: "1px solid var(--rule)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <Bar w={72} h={52} />
            <Bar w={88} h={9} />
          </div>
          <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 11, justifyContent: "center" }}>
            <ScoreRow />
            <ScoreRow />
            <ScoreRow />
            <ScoreRow />
          </div>
        </div>
      </div>

      {/* ── Tools archive header ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "1px solid var(--rule)",
            paddingBottom: 14,
            marginBottom: 20,
          }}
        >
          <Bar w={140} h={24} />
          <Bar w={80} h={8} />
        </div>

        {/* Search bar placeholder */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid var(--rule)",
            background: "var(--paper-2)",
            padding: "0 14px",
            marginBottom: 28,
            height: 42,
          }}
        >
          <Bar w={18} h={18} />
          <Bar w={160} h={12} />
        </div>

        {/* Category 1 */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              paddingBottom: 10,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <Bar w={40} h={8} />
            <Bar w={40} h={7} />
          </div>
          <div
            className="mob-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: "var(--rule)",
              border: "1px solid var(--rule)",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => <ToolCard key={i} />)}
          </div>
        </div>

        {/* Category 2 — partial */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              paddingBottom: 10,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <Bar w={48} h={8} />
            <Bar w={40} h={7} />
          </div>
          <div
            className="mob-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: "var(--rule)",
              border: "1px solid var(--rule)",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => <ToolCard key={i} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
