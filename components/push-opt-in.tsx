"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

// Push notification opt-in. Renders nothing when: VAPID isn't configured,
// the browser doesn't support push, permission was denied, the user already
// subscribed, or they dismissed the card (localStorage flag).
//
// Copy is deliberately score-framed: this is not "enable notifications",
// it's "we'll tell you when your score is at risk".

const DISMISS_KEY = "ledger-push-dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export default function PushOptIn() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapid || !session) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch {}
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (!sub) setVisible(true); })
      .catch(() => {});
  }, [vapid, session]);

  async function enable() {
    if (!session || !vapid) return;
    setBusy(true); setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setVisible(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save the subscription.");
      }
      setVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

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
        {error && <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 6 }}>{error}</div>}
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
