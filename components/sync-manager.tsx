"use client";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { flushLegacyBlob, pullFromCloud } from "@/lib/sync";
import { getLocalProfile, loadUserData, writeLocalProfile } from "@/lib/user-data";

// ═══════════════════════════════════════════════════════════════════════════
// M7-6 — THE 15-SECOND INTERVAL IS DELETED.
//
// EXECUTION_PLAN M7-6 done-when: *"`lib/sync.ts:67`,
// `components/sync-manager.tsx:7,42-45` no longer write the academic record."*
// Line 7 was `const PUSH_INTERVAL_MS = 15_000;` and 42–45 was the
// `setInterval(() => pushToCloud(userId), PUSH_INTERVAL_MS)` it drove. Both are
// gone, along with the `intervalRef` that held it and the `pushToCloud` import.
//
// WHAT REPLACED IT, AND WHY IT IS NOT A REGRESSION. The timer fired every 15
// seconds unconditionally — it re-uploaded the entire twenty-key record whether
// or not a byte had changed, so a student reading a page for an hour wrote the
// same bytes 240 times. The two moments that actually matter are unchanged and
// still covered:
//
//   `visibilitychange` → hidden   every tab switch, app background, screen
//                                 lock. This is the moment a student stops
//                                 working, and it is the one the timer was
//                                 approximating.
//   `pagehide`                    tab close and navigation away. `pagehide`
//                                 rather than `beforeunload`: `beforeunload`
//                                 does not fire reliably on mobile Safari or
//                                 when a backgrounded tab is discarded, which
//                                 is precisely the platform a sixteen-year-old
//                                 is holding.
//
// And the flush itself is change-gated (`lib/sync.ts` compares a stable hash of
// the payload), so a hidden-then-visible-then-hidden student writes once, not
// three times.
//
// The residual exposure is a browser or OS crash with the tab in the
// foreground, which loses the current session's unflushed keys. That exposure
// existed under the timer too — bounded at 15 seconds instead of a session —
// and it is stated here rather than implied away, because the honest fix is
// not a shorter timer, it is M9's session events landing in `academic_events`
// as they happen. That is what removes this component entirely; see the
// removal conditions in `lib/sync.ts`'s header.
// ═══════════════════════════════════════════════════════════════════════════

const SYNC_SESSION_KEY = "ledger-synced-user";

export default function SyncManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    // Pull: hydrate localStorage from Supabase on first login per session.
    // M7-6: `pullFromCloud` now FILLS keys this device lacks and never
    // overwrites one it has — the merge-by-string-length is deleted.
    if (sessionStorage.getItem(SYNC_SESSION_KEY) !== userId) {
      pullFromCloud(userId)
        .then(async hadNewData => {
          sessionStorage.setItem(SYNC_SESSION_KEY, userId);

          // Fallback: if profile still not in localStorage, load from Supabase columns directly.
          // This catches users whose blob predates the sync system or whose push failed.
          const profile = getLocalProfile();
          if (!profile.grade) {
            try {
              const ud = await loadUserData(userId);
              if (ud?.grade) writeLocalProfile(ud);
            } catch {}
          }

          if (hadNewData) window.location.reload();
        })
        .catch(() => {
          sessionStorage.setItem(SYNC_SESSION_KEY, userId);
        });
    }

    // Flush when the tab loses focus / the user switches apps.
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushLegacyBlob(userId).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Flush before the page goes away — tab close, navigation, bfcache entry.
    const handlePageHide = () => { flushLegacyBlob(userId).catch(() => {}); };
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [user]);

  return null;
}
