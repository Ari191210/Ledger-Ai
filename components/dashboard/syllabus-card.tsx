/**
 * Syllabus coverage as a punch card.
 *
 * It was a single full-width bar reading "89%", which is a number you cannot
 * act on: it says how much is left without saying where. An IBM 80-column card
 * holds every column whether it is punched or not, so the unpunched ones keep
 * their position and stay countable. Same idea here: one fixed slot per topic,
 * in the order the student listed them, and the gaps are the whole point.
 *
 * No accent on the slots. Ledger paper spends its one strong colour on the
 * closing figure, not on the workings, so lime here belongs to the percentage
 * and nowhere else.
 */

// Each slot takes an equal share of the row, so a subject reads as one
// segmented bar and every gap sits exactly where its topic does. min-w keeps a
// long syllabus legible; the row wraps rather than shrinking slots to slivers.
const SLOT = "h-3.5 min-w-[6px] flex-1 rounded-[1px]";

export function SyllabusCard({
  card,
  coveragePct,
}: {
  card: { subject: string; slots: boolean[] }[];
  coveragePct: number;
}) {
  return (
    <div className="mt-4 space-y-2.5">
      {card.map(({ subject, slots }) => {
        const covered = slots.filter(Boolean).length;
        return (
          <div key={subject} className="flex items-center gap-3">
            <span className="u-label w-24 shrink-0 truncate">{subject}</span>

            {/* Wraps rather than scrolls: a card that runs off the edge hides
                exactly the gaps this is meant to make countable. */}
            <div
              className="flex flex-1 flex-wrap gap-[3px]"
              role="img"
              aria-label={`${subject}: ${covered} of ${slots.length} topics covered`}
            >
              {slots.map((done, i) => (
                <span
                  key={i}
                  className={`${SLOT} ${done ? "bg-text-3" : "bg-surface-3"}`}
                />
              ))}
            </div>

            <span className="u-mono w-12 shrink-0 text-right text-2xs text-text-3">
              {covered}/{slots.length}
            </span>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className="u-mono text-2xs text-text-3">target 100%</span>
        <span className="u-stat-number text-sm text-accent-strong">{coveragePct}%</span>
      </div>
    </div>
  );
}
