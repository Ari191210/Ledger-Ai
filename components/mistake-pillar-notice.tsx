// ═══════════════════════════════════════════════════════════════════════════
// MISTAKE-PILLAR DISCLOSURE
//
// The Mistake pillar of the Ledger Score is not currently measuring anything.
// It pays for resolved mistakes and for evidence, and the shipped product has
// no path that sets either: nothing writes `evidenceId`, and no production
// action can move a mistake to `resolved` (architecture J.9). The pillar is
// therefore 0 for every student, permanently, until the evidence pipeline
// exists — and a 0 the student could read as "measured, and the measurement is
// zero" is a lie in the strict sense of Law 7 (architecture J.3.a).
//
// This is a DISCLOSURE, not a fix. The scoring logic is untouched by design:
// the pillar is a rebuild, not a formula patch (PRODUCT_DECISIONS §9.4), and
// the cheap patch would convert a dead pillar into a self-awardable one, which
// is strictly worse. Ship the truth now; remove this notice as part of the
// score cutover that makes the pillar real.
//
// Tone: factual, brief, and not alarming. It is not the student's fault and
// nothing they have recorded is lost.
// ═══════════════════════════════════════════════════════════════════════════

export const MISTAKE_PILLAR_DISCLOSURE =
  "The Mistake part of your score is not active yet — it currently reads 0 for everyone, and nothing you do can move it. Your mistakes are still being recorded and kept.";

export default function MistakePillarNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        className="mono"
        style={{ fontSize: 9, color: "var(--ink-3)", lineHeight: 1.7, display: "block" }}
      >
        {MISTAKE_PILLAR_DISCLOSURE}
      </span>
    );
  }

  return (
    <div
      role="note"
      style={{
        border: "1px solid var(--rule)",
        background: "var(--paper-2)",
        padding: "12px 16px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span
        className="mono"
        aria-hidden="true"
        style={{ color: "var(--ink-3)", fontSize: 9, flexShrink: 0, marginTop: 2 }}
      >
        ⓘ
      </span>
      <span
        style={{
          fontFamily: "var(--sans)",
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.6,
        }}
      >
        {MISTAKE_PILLAR_DISCLOSURE}
      </span>
    </div>
  );
}
