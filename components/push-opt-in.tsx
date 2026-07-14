"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";

// Push notification opt-in. Renders nothing when: the SERVER reports push
// isn't configured, the browser doesn't support push, permission was denied,
// the server already holds a subscription for this device, or the user
// dismissed the card (localStorage flag).
//
// Copy is deliberately score-framed: this is not "enable notifications",
// it's "we'll tell you when your score is at risk".
//
// ── Why this component is written defensively ──────────────────────────────
// Until 2026-07-14 it decided everything from browser state and hung on
// `navigator.serviceWorker.ready`, which produced three compounding silent
// failures and an empty `push_subscriptions` table:
//
//   1. `ready` never resolves if the service worker failed to install (it did
//      — see public/sw.js), so the card never became visible and `enable()`
//      would have awaited forever if it had.
//   2. `pushManager.getSubscription()` returns a live subscription for anyone
//      who granted permission back when the table didn't exist in prod. The
//      card read that as "already subscribed" and hid — permanently locking
//      out the exact users who had opted in.
//   3. The VAPID key came from a build-time-inlined NEXT_PUBLIC_ var. Missing
//      at build time, it inlines as `undefined` and the feature disappears
//      with a green build and no error.
//
// Fixes: the server is the source of truth (GET /api/push/subscribe), every
// service-worker promise is timeout-guarded, and success is only claimed once
// the API confirms the row was read back.

const DISMISS_KEY = "ledger-push-dismissed";
const SW_TIMEOUT_MS = 8000;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// A service worker that never activates leaves `ready` pending forever. Every
// await on it gets a deadline so a dead worker surfaces as an error the user
// can see, instead of a button that spins until the tab is closed.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

// An existing subscription created with a different (or absent) VAPID key can
// never be pushed to — the server's signature won't validate. Detect it so we
// can tear it down and mint a fresh one rather than storing a dead endpoint.
function keyMatches(sub: PushSubscription, vapid: string): boolean {
  const applied = sub.options?.applicationServerKey;
  if (!applied) return false;
  const a = new Uint8Array(applied);
  const b = urlBase64ToUint8Array(vapid);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export default function PushOptIn() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const token = session?.access_token;

  useEffect(() => {
    if (!token || !pushSupported()) return;
    if (Notification.permission === "denied") return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch {}

    let cancelled = false;

    (async () => {
      // Ground truth: what the server actually stored. Never the browser.
      const res = await fetch("/api/push/subscribe", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (!res?.ok || cancelled) return;

      const status = await res.json().catch(() => null) as
        | { configured?: boolean; publicKey?: string | null; subscribed?: boolean }
        | null;
      if (!status?.configured || !status.publicKey || cancelled) return;

      setPublicKey(status.publicKey);

      // Server has no row for this user → offer, whatever the browser thinks.
      if (!status.subscribed) { setVisible(true); return; }

      // Server has a row, but it may belong to another device. Offer only if
      // THIS browser has no live subscription. Timeout-guarded: a broken
      // service worker must not silently swallow the card again.
      const localSub = await withTimeout(
        navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()),
        SW_TIMEOUT_MS,
        "sw-timeout",
      ).catch(() => null);
      if (!cancelled && !localSub) setVisible(true);
    })();

    return () => { cancelled = true; };
  }, [token]);

  const enable = useCallback(async () => {
    if (!token || !publicKey) return;
    setBusy(true); setError("");
    try {
      // Requested first, while the click's user activation is still fresh —
      // awaiting anything before this can invalidate the gesture in Safari.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setVisible(false); return; }

      const reg = await withTimeout(
        navigator.serviceWorker.ready,
        SW_TIMEOUT_MS,
        "Notifications could not start on this device. Reload and try again.",
      );

      // Reuse the browser's existing subscription when it's still valid for
      // our current VAPID key — that's the path for every user stranded by the
      // months when the table didn't exist. Otherwise mint a fresh one.
      let sub = await reg.pushManager.getSubscription();
      if (sub && !keyMatches(sub, publicKey)) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const body = await res.json().catch(() => ({}));

      // `verified` means the API read the row back out of the table. Anything
      // less is the same unverified "success" that left the table empty.
      if (!res.ok || !body?.verified) {
        await sub.unsubscribe().catch(() => {});
        throw new Error(body?.error || "Could not save the subscription.");
      }

      setVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [token, publicKey]);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, new Date().toISOString()); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="glass-card" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div className="mono cin" style={{ marginBottom: 4 }}>Score alerts</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          One nudge, only when it matters: your streak about to break, an exam closing in, or your score crossing a milestone. Never more than one a day.
        </div>
        {error && (
          <div className="mono" role="alert" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 6 }}>{error}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button className="btn" onClick={enable} disabled={busy} style={{ fontSize: 11, padding: "8px 16px", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enabling…" : "Turn on →"}
        </button>
        <button className="btn ghost" onClick={dismiss} aria-label="Dismiss score alerts prompt" style={{ fontSize: 11, padding: "8px 12px" }}>
          Not now
        </button>
      </div>
    </div>
  );
}
