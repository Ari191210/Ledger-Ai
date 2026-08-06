"use client";

import { useEffect, useRef, useState } from "react";

/**
 * THE VAULT.
 *
 * One mistake, five months, one line. Not analytics — memory. The distinction
 * matters: analytics summarise, memory keeps. Nothing here is aggregated,
 * averaged or charted; five specific days are named.
 *
 * The final tick is the only earned green on the entire page (§6.2). It carries
 * the whole emotional payload of the section precisely because nothing else on
 * the page competes for colour.
 *
 * Vertical on a phone, horizontal on a desk — a genuine re-layout, not a
 * squeezed desktop timeline. A five-point horizontal axis on a 360px screen is
 * unreadable, and shipping it anyway would be collapsing rather than designing.
 */

type Entry = { date: string; state: "occurred" | "practising" | "resolved"; label: string };

const ENTRIES: Entry[] = [
  { date: "2 OCT", state: "occurred", label: "occurred" },
  { date: "14 NOV", state: "occurred", label: "again" },
  { date: "3 DEC", state: "occurred", label: "again" },
  { date: "20 JAN", state: "practising", label: "practising" },
  { date: "8 FEB", state: "resolved", label: "resolved" },
];

export function Vault() {
  const ref = useRef<HTMLUListElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <ul className="vault" ref={ref} data-shown={shown ? "true" : "false"}>
      {ENTRIES.map((entry, i) => (
        <li className="vault__row" key={entry.date}>
          <span className="vault__date">{entry.date}</span>
          <span
            className="vault__dot"
            data-state={entry.state}
            style={{ transitionDelay: `${i * 110}ms` }}
            aria-hidden="true"
          />
          <span className="vault__state" data-state={entry.state}>
            {entry.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
