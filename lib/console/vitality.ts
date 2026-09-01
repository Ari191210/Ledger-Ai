import type { ScoreInputs } from "@/lib/ledger-score";

// ═══════════════════════════════════════════════════════════════════════════
// VITALITY — colour is earned, never given (CONSOLE.md §2.2).
//
// A single 0–1 number, derived entirely from real work the student has done.
// It drives how much colour the interface is allowed to show: at 0 the product
// is genuinely monochrome, and every hue resolves to grey. As the student
// accumulates real evidence, colour saturates toward full.
//
// This is not a reward mechanic and not gamification — nothing is awarded, no
// threshold is announced, and the student is never told a number. It is the
// interface honestly reflecting how much there is to show. An empty product
// has nothing to be colourful about.
//
// Three components, deliberately chosen so no single behaviour can drive the
// whole thing:
//   · STANDING   how far the score has actually come
//   · MOMENTUM   whether they are here repeatedly, not once
//   · EVIDENCE   how much real material exists to render
//
// Capped conservatively: full vitality is a genuinely committed student, not a
// week of use. Reaching it should take a term.
// ═══════════════════════════════════════════════════════════════════════════

/** Days of streak at which the momentum component is fully earned. */
const STREAK_CEILING = 21;
/** Pieces of real work at which the evidence component is fully earned. */
const EVIDENCE_CEILING = 15;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

export function computeVitality(inputs: ScoreInputs | null, score: number): number {
  if (!inputs) return 0;

  const standing = clamp01(score / 1000);
  const momentum = clamp01(inputs.streak / STREAK_CEILING);
  const evidence = clamp01(
    (inputs.papersLog.length + inputs.notesHistory.length) / EVIDENCE_CEILING,
  );

  // Weighted so no one axis can carry it alone: a student with a long streak
  // but no work, or a high score with no consistency, stays partly muted.
  return clamp01(standing * 0.4 + momentum * 0.3 + evidence * 0.3);
}

/**
 * The floor exists so the interface is never *completely* colourless — a
 * progress bar that is pure grey reads as broken rather than restrained. The
 * first real action a student takes should be visible.
 */
export const VITALITY_FLOOR = 0.18;

export function vitalityWithFloor(v: number): number {
  return VITALITY_FLOOR + clamp01(v) * (1 - VITALITY_FLOOR);
}
