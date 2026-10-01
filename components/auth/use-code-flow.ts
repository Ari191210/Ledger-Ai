"use client";

import { useEffect, useState } from "react";

type Purpose = "signin" | "enable" | "disable";

/**
 * Send and check an emailed two-factor code. Shared by the sign-in step
 * (/auth/mfa) and the switch in Settings, so both say the same things and keep
 * the same one-minute resend cooldown the server enforces.
 */
export function useCodeFlow(purpose: Purpose) {
  const [to, setTo] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(): Promise<boolean> {
    setSending(true);
    setErr(null);
    const res = await fetch("/auth/two-factor/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setSending(false);
    if (j?.to) setTo(j.to);
    if (res?.ok) {
      setSent(true);
      setCooldown(60);
      return true;
    }
    // "Sent less than a minute ago" still means a code is on its way.
    if (res?.status === 429 && j?.to) {
      setSent(true);
      setCooldown(60);
    }
    setErr(j?.error ?? "Couldn't send the code. Check your connection and try again.");
    return false;
  }

  async function verify(code: string): Promise<boolean> {
    setBusy(true);
    setErr(null);
    const res = await fetch("/auth/two-factor/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, code }),
    }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) return true;
    setErr(j?.error ?? "Couldn't check the code. Check your connection and try again.");
    return false;
  }

  function reset() {
    setSent(false);
    setErr(null);
  }

  return { to, sent, sending, busy, err, cooldown, send, verify, reset };
}
