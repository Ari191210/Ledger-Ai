/**
 * THE VAULT.
 *
 * One mistake, five months, one line. Not analytics — memory. The distinction
 * matters: analytics summarise, memory keeps. Nothing here is aggregated or
 * averaged; five specific days are named.
 *
 * A SERVER COMPONENT. The dots and connectors are scroll-driven CSS, so this
 * ships no JavaScript and renders complete without a client bundle.
 *
 * The final tick is the only earned green on the page (§6.2). It carries the
 * whole section precisely because nothing else competes for colour.
 *
 * Vertical on a phone, horizontal on a desk — a genuine re-layout, not a
 * squeezed desktop timeline. A five-point horizontal axis is unreadable at
 * 360px, and shipping it anyway would be collapsing rather than designing.
 */

type Entry = {
  date: string;
  state: "occurred" | "practising" | "resolved";
  label: string;
};

const ENTRIES: Entry[] = [
  { date: "2 OCT", state: "occurred", label: "occurred" },
  { date: "14 NOV", state: "occurred", label: "again" },
  { date: "3 DEC", state: "occurred", label: "again" },
  { date: "20 JAN", state: "practising", label: "practising" },
  { date: "8 FEB", state: "resolved", label: "resolved" },
];

export function Vault() {
  return (
    <ol className="vault">
      {ENTRIES.map((entry, i) => (
        <li
          className="vault__row"
          key={entry.date}
          style={{ "--i": i } as React.CSSProperties}
        >
          <span className="vault__date">{entry.date}</span>
          <span className="vault__dot" data-state={entry.state} aria-hidden="true" />
          <span className="vault__state" data-state={entry.state}>
            {entry.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
