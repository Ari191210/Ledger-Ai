/**
 * How the dashboard walkthrough opens.
 *
 * The tour went live on 2026-09-13 with tour_seen_at empty for every existing
 * account, and "never seen" was the only test for making it mandatory. So a
 * student with weeks of logs came back to a tour that could only end by opening
 * Doubt Solver, a first-run lesson forced on someone who is not new. Mandatory
 * now also needs an empty ledger: nothing logged means genuinely new. Anyone
 * with a record still sees it once, and can close it.
 */
export function tourMode({
  requested,
  seen,
  hasLogged,
}: {
  /** ?tour=1 from the header link. */
  requested: boolean;
  seen: boolean;
  hasLogged: boolean;
}): { autoStart: boolean; mandatory: boolean } {
  return {
    autoStart: requested || !seen,
    mandatory: !seen && !hasLogged,
  };
}
