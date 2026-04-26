"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper, #f7f4ee)", padding: "0 24px" }}>
      <div style={{ maxWidth: 560, width: "100%", border: "2px solid #222", padding: "40px 36px" }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c44b2a", marginBottom: 16 }}>
          Client error · Ledger
        </div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>
          Something broke.
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: "#f0ede7", border: "1px solid #ddd", padding: "12px 16px", marginBottom: 20, wordBreak: "break-word", lineHeight: 1.6 }}>
          {error?.message || "Unknown error"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={reset}
            style={{ fontFamily: "monospace", fontSize: 11, padding: "10px 20px", background: "#222", color: "#f7f4ee", border: "none", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Try again
          </button>
          <a href="/"
            style={{ fontFamily: "monospace", fontSize: 11, padding: "10px 20px", background: "transparent", color: "#222", border: "1px solid #ddd", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
