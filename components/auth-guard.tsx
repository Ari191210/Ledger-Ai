"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

// ═══════════════════════════════════════════════════════════════════════════
// M4-2 — the client guard, rebuilt around one rule.
//
// **Children never mount until the auth decision has resolved to "signed in".**
// That is the done-when — "no student data mounts client-side before an auth
// decision" — and it is enforced structurally: there is exactly one `return`
// below that renders `children`, and it is unreachable unless `user` is
// non-null. There is no branch that renders children optimistically, none that
// renders them while `loading`, and none that renders them on the way to a
// redirect. The guard fails closed on every state it does not recognise.
//
//
// WHY THIS COMPONENT STILL EXISTS
//
// Architecture R.1 says authentication must happen "at the server or the edge",
// and M4-1 puts that check in `middleware.ts`. The obvious reading is that a
// client guard becomes redundant. It does not, for two reasons that its four
// usage sites make concrete — `app/home/layout.tsx`, `app/tools/layout.tsx`,
// `app/dashboard/layout.tsx` and `app/console/layout.tsx`:
//
//   1. **Session expiry mid-session.** Middleware runs per request. A student
//      who is on `/tools/exam-practice` when their refresh token expires makes
//      no request; `onAuthStateChange` fires in `auth-provider`, `user` becomes
//      null, and only a client guard can stop the already-mounted tool from
//      continuing to render and write. Nothing at the edge can see that event.
//
//   2. **The edge cannot see the session today.** The browser session lives in
//      localStorage (see the header of `lib/auth-routes.ts`), so edge
//      enforcement is gated OFF until the session moves onto cookie transport.
//      Until that lands, this component is not the secondary guard — it is
//      still the only one. Deleting it on the strength of a middleware check
//      that is switched off would have removed the product's sole auth gate.
//
// So the guard is kept and hardened rather than removed. What changed:
//
//   · The three states are now named and exhaustive — `pending`, `denied`,
//     `allowed` — instead of two boolean reads that both fell through to the
//     same "Loading…" panel.
//   · A DENIED student no longer sees "Loading…" while being redirected. That
//     was a false statement about what the product was doing (PRINCIPLES §7),
//     and it is the state a signed-out visitor spends the most time in.
//   · The redirect is `replace`, still — a bounced visitor must not be able to
//     press Back into a protected route — and it now fires from a `pathname`-
//     keyed effect, so a client-side navigation from one protected route to
//     another while signed out re-fires it instead of stalling.
// ═══════════════════════════════════════════════════════════════════════════

type Decision = "pending" | "denied" | "allowed";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const decision: Decision = loading ? "pending" : user ? "allowed" : "denied";

  useEffect(() => {
    if (decision === "denied") router.replace("/auth");
  }, [decision, pathname, router]);

  // Resolving. Say so, and render nothing else.
  if (decision === "pending") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--paper)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
      </div>
    );
  }

  // Denied. The redirect is already in flight; render nothing at all rather
  // than a loading state that claims work is happening on the student's behalf.
  if (decision === "denied") return null;

  return <>{children}</>;
}
