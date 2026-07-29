"use client";

// ═══════════════════════════════════════════════════════════════════════════
// EDITION TOGGLE
//
// Flips the desk between day and night. Deliberately not a new theme system:
// it writes the same `ledger-edition` key and the same data-edition attribute
// the rest of the product already reads, so switching here switches the whole
// site and the choice survives a reload.
//
// The label renders as "—" until mount. The server cannot know which edition
// the client's pre-paint script picked, so committing to a label during SSR
// would guarantee a hydration mismatch on half of all loads.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

type Edition = "print" | "evening";

export default function EditionToggle() {
  const [edition, setEdition] = useState<Edition | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.edition;
    setEdition(current === "evening" ? "evening" : "print");
  }, []);

  const flip = () => {
    const next: Edition = edition === "evening" ? "print" : "evening";
    document.documentElement.dataset.edition = next;
    try {
      localStorage.setItem("ledger-edition", next);
    } catch {
      /* private mode — the switch still works for this session */
    }
    setEdition(next);
  };

  const isNight = edition === "evening";

  return (
    <button
      type="button"
      onClick={flip}
      className="te-switch"
      aria-pressed={isNight}
      aria-label={`Switch to ${isNight ? "day" : "night"} edition`}
      disabled={edition === null}
    >
      <span
        className={`te-led ${isNight ? "te-led--warn" : "te-led--on"}`}
        aria-hidden="true"
      />
      {edition === null ? "—" : isNight ? "Night" : "Day"}
    </button>
  );
}
