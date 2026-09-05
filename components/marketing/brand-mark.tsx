/**
 * The StudyLedger mark — a lime instrument key with a ledger rule through it.
 * Same shape as the app's nav mark, the favicon, and the OG card, so the
 * brand reads identically everywhere.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[7px] bg-accent"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent-on)"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        {/* three ledger rules, rising — the score going up */}
        <line x1="5" y1="17.5" x2="19" y2="17.5" />
        <line x1="5" y1="12" x2="15" y2="12" />
        <line x1="5" y1="6.5" x2="11" y2="6.5" />
      </svg>
    </span>
  );
}
