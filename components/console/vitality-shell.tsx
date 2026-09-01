"use client";

import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { computeLedgerScore } from "@/lib/ledger-score";
import { currentInputs } from "@/lib/score-projection";
import { computeVitality, vitalityWithFloor, VITALITY_FLOOR } from "@/lib/console/vitality";
import {
  DEFAULT_DNA,
  derive,
  readStoredDNA,
  WORKSPACE_CHANGE_EVENT,
  type WorkspaceDNA,
} from "@/lib/console/workspace";

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
//
// It is now also the Workspace Engine's single write point (WORKSPACE.md §6):
// "one element, one write". The shell reads the student's four-trait DNA,
// derives the semantic tokens, and stamps them here. Nothing else in the
// application knows a workspace exists — every primitive still reads --g-3 and
// --s-4 exactly as it did before, and cannot tell that the values are now
// computed rather than declared.
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

  // STUDIO on the server and on first paint. Today that is what every student
  // is on, so nothing flashes; once the workspace sheet ships, a student on a
  // non-default workspace WILL see one frame of STUDIO, and §6's inline-in-head
  // step becomes required. It is deliberately not built yet — there is nothing
  // to flash from, and building flash prevention before anything can flash
  // means shipping an untestable mechanism.
  const [dna, setDna] = useState<WorkspaceDNA>(DEFAULT_DNA);

  useEffect(() => {
    setDna(readStoredDNA());
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

  // M24 — GENERALISATION. Every shell mounts its own VitalityShell instance
  // (`/console`, `/home`, `/settings`, `/capture`, `/diagnosis`, `/record` —
  // S.6), and a choice made on one of them must be visible on the others
  // without a reload for "customisation applies outside /console" to be a
  // live fact rather than a claim that only holds after navigation.
  // `writeStoredDNA` dispatches this event on every successful write; each
  // mounted shell just re-reads storage — no cross-shell state is passed
  // directly, so a shell that never mounted still reads the same source of
  // truth the next time it does.
  useEffect(() => {
    const onChange = () => setDna(readStoredDNA());
    window.addEventListener(WORKSPACE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, onChange);
  }, []);

  // Derivation is pure and cheap, but it produces a fresh object every call —
  // and this object is the style prop of the element every Console surface
  // renders inside. Memoised so an unrelated re-render cannot restyle the
  // entire tree.
  const workspace = useMemo(() => derive(dna), [dna]);

  const style = useMemo(() => {
    // TEMPERAMENT caps how loud earned colour becomes. It caps the CEILING, not
    // the floor: a reserved student still sees their progress register, just
    // more quietly. Restraint is a preference; hiding evidence would be a lie.
    const capped = Math.min(vitality, workspace.vitalityCeiling);
    return {
      ...workspace.tokens,
      minHeight: "100vh",
      colorScheme: workspace.scheme,
      "--vitality": capped.toFixed(3),
    } as CSSProperties;
  }, [workspace, vitality]);

  return (
    <div data-console className={className} style={style}>
      {children}
    </div>
  );
}
