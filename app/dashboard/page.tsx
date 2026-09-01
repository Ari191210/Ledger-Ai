import { permanentRedirect } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════
// /dashboard — RETIRED. M3-3.
//
// This route was the product's second shell: it computed the Ledger Score
// (`computeLedgerScore`), rendered its four pillars, rendered its own
// recommendation surface and carried a tool catalogue. Architecture T10 names
// exactly that duplication as the risk M3 resolves, and `PRODUCT_DECISIONS`
// §2.4 merged it into Home.
//
// The done-when is "no route besides `/home` computes and renders the score",
// so the surface is gone rather than hidden: nothing here reads the scoring
// engine, and removing the `next.config.mjs` redirect would not resurrect a
// second dashboard — it would land on this redirect instead. Two mechanisms,
// one destination; the config redirect is the one that answers at the edge.
//
// The route is NOT deleted. §2.4 requires merged routes to 301 and nothing to
// 404, and `/dashboard/profile` and `/dashboard/saved` still live under this
// segment and still resolve (§2.5).
//
// The components it used to mount — `components/dashboard/*`,
// `components/dashboard-skeleton.tsx`, `components/empty-chair.tsx` — are
// left in place, unmounted. They are not orphans to sweep up in M3: Home's
// composition (which of them return, in what order, at what size) is Part M
// of the architecture and milestone M22.
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardRetired(): never {
  permanentRedirect("/today");
}
