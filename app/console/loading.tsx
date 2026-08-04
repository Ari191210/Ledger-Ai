// Console has no loading state, by design.
//
// Without this file, Next falls back to the nearest ancestor — app/loading.tsx,
// which renders the LEGACY HomeSkeleton. Every navigation between Console
// surfaces flashed the old design system before painting the new one, which is
// the most damaging possible first impression of a redesign.
//
// Returning null rather than a Console-styled skeleton is deliberate:
// CONSOLE.md §8 states the Score computes synchronously from local inputs and
// "the roll from zero IS the arrival". A skeleton would be a second, competing
// arrival animation for data that is already there.

export default function ConsoleLoading() {
  return null;
}
