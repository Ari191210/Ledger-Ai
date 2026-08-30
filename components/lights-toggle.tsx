"use client";
import { useEffect, useState } from "react";
import {
  DARK_MATERIAL,
  LIGHT_MATERIAL,
  readStoredDNA,
  writeStoredDNA,
  WORKSPACE_CHANGE_EVENT,
} from "@/lib/console/workspace";

// ═══════════════════════════════════════════════════════════════════════════
// THE LIGHTS — swan, or swan at night.
//
// This writes ONE field of the workspace DNA and nothing else. The shell is
// already the single write point for tokens (WORKSPACE.md §6, "one element,
// one write"), and `writeStoredDNA` already dispatches the change event every
// mounted shell listens for, so switching the lights on `/settings` changes
// `/capture` in another tab without either surface knowing this control
// exists.
//
// ── WHY IT IS A MATERIAL SWAP AND NOT A DARK MODE ────────────────────────
// There is no `.dark` class, no second stylesheet, and no duplicated palette
// to keep in sync. `swan-night` is a material in the same list `swan` is in,
// derived through the same function, contrast-checked by the same CI pass.
// Radius, spacing and motion are material-independent, so turning the lights
// off cannot resize or re-time the interface - which is the failure mode of
// almost every bolted-on dark mode.
//
// ── WHY LIGHT REMAINS THE DEFAULT ────────────────────────────────────────
// Founder ruling, 2026-08-30: "we will always go for light mode". A student
// opens this in a lit room far more often than a dark one, and `prefers-
// color-scheme` is deliberately NOT consulted: the operating system knows
// what time it is, not what this student wants. Dark is a choice they make.
//
// ── STATE, AND THE SINGLE-STATEMENT RULE ─────────────────────────────────
// A toggle whose label reads "Dark" while the screen is light is ambiguous:
// it could be describing the current state or the destination. This one shows
// the state it IS in, and `aria-pressed` carries the same fact to assistive
// technology, so there is exactly one interpretation.
// ═══════════════════════════════════════════════════════════════════════════

export default function LightsToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Read after mount. The server has no student and rendering a guess would
  // put a wrong state on screen for one frame.
  useEffect(() => {
    setDark(readStoredDNA().material === DARK_MATERIAL);
    setReady(true);
  }, []);

  // Another surface may switch the lights. Follow it rather than drift.
  useEffect(() => {
    const onChange = () => setDark(readStoredDNA().material === DARK_MATERIAL);
    window.addEventListener(WORKSPACE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, onChange);
  }, []);

  function toggle() {
    const next = !dark;
    // Read-modify-write on ONE field. Writing a whole DNA object here would
    // silently reset a student's voice, pressure and temperament to defaults.
    const dna = readStoredDNA();
    writeStoredDNA({ ...dna, material: next ? DARK_MATERIAL : LIGHT_MATERIAL });
    setDark(next);
  }

  return (
    <button
      className="lights"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Dark. Switch to light." : "Light. Switch to dark."}
      // Invisible until the real state is known, rather than flashing the
      // wrong one. It still occupies its space, so nothing shifts.
      style={ready ? undefined : { visibility: "hidden" }}
    >
      <span className="lights-mark" aria-hidden="true" />
      <span className="lights-label">{dark ? "Dark" : "Light"}</span>

      <style jsx global>{`
        .lights {
          display: inline-flex;
          align-items: center;
          gap: var(--s-2);
          min-height: 32px;
          padding: 6px var(--s-2) !important;
          border: 1px solid var(--g-4) !important;
          border-radius: var(--r-control);
          background: transparent !important;
          color: var(--g-6) !important;
          font-family: var(--type-instrument) !important;
          font-size: var(--t-micro) !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color var(--m-fast) var(--ease-out),
                      color var(--m-fast) var(--ease-out);
        }
        .lights:hover { border-color: var(--g-5) !important; color: var(--g-7) !important; }

        /* The mark is the state, drawn in tone rather than in an icon font:
           a filled disc under light, a ring under dark. It is aria-hidden
           because the label already says which, so the mark is never the
           sole carrier of the meaning (PRINCIPLES §6.2). */
        .lights-mark {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid var(--g-6);
          background: var(--g-6);
          transition: background var(--m-fast) var(--ease-out);
        }
        .lights[aria-pressed="true"] .lights-mark { background: transparent; }
        .lights-label { line-height: 1; }
      `}</style>
    </button>
  );
}
