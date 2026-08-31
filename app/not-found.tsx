import Link from "next/link";

// Root 404. There was none, so every dead link in the product landed on the
// Next.js default page — no branding, no way back, and no signal to the student
// that they had not broken something.
//
// Styled to match app/error.tsx rather than Console: Console is unlinked, so
// every route a student can actually reach today is on the legacy system, and a
// 404 that looks like a different product is its own kind of broken.

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper, #f7f4ee)", padding: "0 24px" }}>
      <div style={{ maxWidth: 560, width: "100%", border: "2px solid #222", padding: "40px 36px" }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c44b2a", marginBottom: 16 }}>
          404 · Ledger
        </div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>
          This page doesn&apos;t exist.
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginBottom: 24, lineHeight: 1.7 }}>
          The link may be out of date, or the tool may have moved. Your work is
          unaffected — nothing here is stored on this page.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/today"
            style={{ fontFamily: "monospace", fontSize: 11, padding: "10px 20px", background: "#222", color: "#f7f4ee", border: "none", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Capture
          </Link>
          <Link href="/"
            style={{ fontFamily: "monospace", fontSize: 11, padding: "10px 20px", background: "transparent", color: "#222", border: "1px solid #ddd", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Landing
          </Link>
        </div>
      </div>
    </div>
  );
}
