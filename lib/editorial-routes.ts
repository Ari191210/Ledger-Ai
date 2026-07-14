// ═══════════════════════════════════════════════════════════════════════════
// THE MIGRATION ALLOWLIST
//
// The single source of truth for which routes have been migrated to the
// editorial design system. This list IS the migration.
//
//   - A route on this list renders inside <EditorialShell> and gets the
//     editorial design system. Nothing else does.
//   - A route NOT on this list renders exactly as it does on master: the
//     legacy palette, the legacy fonts, the cursor, the shader, the gradient.
//
// There is deliberately no third state. A route is fully one or fully the
// other, which is what makes each phase independently shippable and each
// migration independently revertible.
//
// TO MIGRATE A ROUTE: add it here, and wrap its page in <EditorialShell>.
// TO REVERT ONE:      remove the line. That is the whole rollback.
// ═══════════════════════════════════════════════════════════════════════════

export const EDITORIAL_ROUTES: string[] = [
  "/",              // Phase 0.5 — the front page. The only migrated route.
];

/**
 * Is this path served by the editorial design system?
 *
 * Exact match only. A prefix match would silently pull child routes into the
 * editorial system the moment a parent is migrated — e.g. migrating "/tools"
 * would drag all 46 tool pages in with it. That is precisely the accidental
 * bleed this architecture exists to prevent, so migration must always be an
 * explicit, per-route decision.
 */
export function isEditorialRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Tolerate a trailing slash so "/pricing/" and "/pricing" agree.
  const p = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  return EDITORIAL_ROUTES.includes(p);
}
