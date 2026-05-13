export function AIThinking() {
  return (
    <div style={{ border: "1px solid var(--ink)", animation: "ai-shimmer 1.6s ease-in-out infinite" }}>
      {/* Main content rows */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--ink)" }}>
        <div style={{ height: 8, width: 110, background: "var(--rule)", borderRadius: 2, marginBottom: 18 }} />
        {[100, 87, 93, 78, 96, 71].map((w, i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, background: "var(--rule-2)", borderRadius: 2, marginBottom: 9 }} />
        ))}
        <div style={{ height: 11, width: "44%", background: "var(--rule-2)", borderRadius: 2 }} />
      </div>
      {/* Principle row */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
        <div style={{ height: 8, width: 140, background: "var(--rule)", borderRadius: 2, marginBottom: 14 }} />
        <div style={{ height: 13, width: "80%", background: "var(--rule-2)", borderRadius: 2 }} />
      </div>
      {/* List rows */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ height: 8, width: 155, background: "var(--rule)", borderRadius: 2, marginBottom: 16 }} />
        {[72, 85, 68].map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--rule)" : "none" }}>
            <div style={{ width: 20, height: 9, background: "var(--rule)", borderRadius: 2, flexShrink: 0 }} />
            <div style={{ height: 9, width: `${w}%`, background: "var(--rule-2)", borderRadius: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
