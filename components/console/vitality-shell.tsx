"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { computeLedgerScore } from "@/lib/ledger-score";
import { currentInputs } from "@/lib/score-projection";
import { computeVitality, vitalityWithFloor, VITALITY_FLOOR } from "@/lib/console/vitality";

// ═══════════════════════════════════════════════════════════════════════════
// VITALITY SHELL — the token host for every Console surface.
//
// Vitality is SHELL state, not page state. It was previously computed inside
// the NOW page and written to that page's <main>, which meant the other four
// surfaces never set it at all and silently fell back to the floor. The
// product's most distinctive idea worked on exactly one page and failed
// invisibly on the rest — invisibly because the fallback is a valid value, so
// nothing errored and nothing looked broken.
//
// Declaring it here, on the same element that owns the [data-console] token
// scope, makes it correct by construction: any surface rendered inside the
// Console layout inherits the right value, and a new page cannot forget to
// set it because a page never sets it at all.
//
// This component owns a `style` prop, which primitives are forbidden. That is
// deliberate and not an exception to the rule: this is the element that
// DECLARES the token scope, not a component consuming it. Something has to be
// the host.
// ═══════════════════════════════════════════════════════════════════════════

export default function VitalityShell({
  className,
  children,
}: {
  /** Font variables from the layout's next/font instances. */
  className: string;
  children: ReactNode;
}) {
  // Starts at the restrained floor, never at zero: mounting dark and jumping
  // to the earned value is a change nothing caused and nothing acknowledged.
  const [vitality, setVitality] = useState(VITALITY_FLOOR);

  useEffect(() => {
    try {
      const inputs = currentInputs();
      if (!inputs) return;
      const score = computeLedgerScore();
      setVitality(vitalityWithFloor(computeVitality(inputs, score.total)));
    } catch {
      // Storage unavailable. The floor is already applied, so the interface is
      // simply at its most restrained — correct, not broken.
    }
  }, []);

  return (
    <div
      data-console
      className={className}
      style={{ minHeight: "100vh", "--vitality": vitality.toFixed(3) } as CSSProperties}
    >
      {children}
    </div>
  );
}
