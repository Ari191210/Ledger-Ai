export function AIThinking() {
  return (
    <div style={{ border: "1px solid var(--rule)", background: "var(--paper-2)", animation: "ai-shimmer 1.4s ease-in-out infinite" }}>
      {/* Main content rows */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ height: 7, width: 100, background: "var(--rule)", borderRadius: 2, marginBottom: 16 }} />
        {[100, 87, 93, 78, 96, 71].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w}%`, background: "var(--rule-2)", borderRadius: 2, marginBottom: 8 }} />
        ))}
        <div style={{ height: 10, width: "44%", background: "var(--rule-2)", borderRadius: 2 }} />
      </div>
      {/* Principle row */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", borderLeft: "3px solid var(--cinnabar)" }}>
        <div style={{ height: 7, width: 130, background: "var(--rule)", borderRadius: 2, marginBottom: 12 }} />
        <div style={{ height: 12, width: "80%", background: "var(--rule-2)", borderRadius: 2 }} />
      </div>
      {/* List rows */}
      <div style={{ padding: "14px 20px" }}>
        <div style={{ height: 7, width: 145, background: "var(--rule)", borderRadius: 2, marginBottom: 14 }} />
        {[72, 85, 68].map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 2 ? "1px solid var(--rule-2)" : "none" }}>
            <div style={{ width: 18, height: 8, background: "var(--rule)", borderRadius: 2, flexShrink: 0 }} />
            <div style={{ height: 8, width: `${w}%`, background: "var(--rule-2)", borderRadius: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
