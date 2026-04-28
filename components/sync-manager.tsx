"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { pushToCloud, pullFromCloud, SYNC_KEYS } from "@/lib/sync";

const PUSH_INTERVAL_MS = 30_000;
const PUSH_DEBOUNCE_MS = 3_000;
const SYNC_SESSION_KEY = "ledger-synced-user";

export default function SyncManager() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    // ── Pull: hydrate localStorage from Supabase on first login per session ──
    if (sessionStorage.getItem(SYNC_SESSION_KEY) !== userId) {
      pullFromCloud(userId)
        .then(hadNewData => {
          sessionStorage.setItem(SYNC_SESSION_KEY, userId);
          // Reload once so all components re-read from the now-populated localStorage
          if (hadNewData) window.location.reload();
        })
        .catch(() => {
          // Mark as synced even on error so we don't loop
          sessionStorage.setItem(SYNC_SESSION_KEY, userId);
        });
    }

    // ── Push: intercept localStorage writes on sync keys via defineProperty ──
    const originalSetItem = Storage.prototype.setItem;

    Object.defineProperty(localStorage, "setItem", {
      configurable: true,
      writable: true,
      value(key: string, value: string) {
        originalSetItem.call(this, key, value);
        if ((SYNC_KEYS as readonly string[]).includes(key)) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(
            () => pushToCloud(userId).catch(() => {}),
            PUSH_DEBOUNCE_MS
          );
        }
      },
    });

    // ── Periodic push as a safety net ─────────────────────────────────────────
    intervalRef.current = setInterval(
      () => pushToCloud(userId).catch(() => {}),
      PUSH_INTERVAL_MS
    );

    // ── Push when tab loses visibility (switch tabs, minimise, close) ─────────
    const handleHide = () => {
      if (document.visibilityState === "hidden") {
        pushToCloud(userId).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleHide);

    return () => {
      // Restore native setItem
      Object.defineProperty(localStorage, "setItem", {
        configurable: true,
        writable: true,
        value: originalSetItem,
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener("visibilitychange", handleHide);
    };
  }, [user?.id]);

  return null;
}
