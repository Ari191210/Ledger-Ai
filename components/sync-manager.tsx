"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { pushToCloud, pullFromCloud } from "@/lib/sync";
import { getLocalProfile, loadUserData, writeLocalProfile } from "@/lib/user-data";

const PUSH_INTERVAL_MS = 15_000;
const SYNC_SESSION_KEY = "ledger-synced-user";

export default function SyncManager() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    // Pull: hydrate localStorage from Supabase on first login per session
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

    // Push on a regular interval as the primary mechanism
    intervalRef.current = setInterval(
      () => pushToCloud(userId).catch(() => {}),
      PUSH_INTERVAL_MS
    );

    // Push when tab loses focus / user switches apps
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        pushToCloud(userId).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Push before the page unloads — catches tab closes and navigation away
    const handleUnload = () => { pushToCloud(userId).catch(() => {}); };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user?.id]);

  return null;
}
