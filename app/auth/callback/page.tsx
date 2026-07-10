"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Phase = "loading" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const type = params.get("type");

    if (!code) {
      setPhase("error");
      setTimeout(() => router.replace("/auth?error=oauth"), 2000);
      return;
    }

    const storedState = sessionStorage.getItem("google_oauth_state");

    if (state && storedState && state === storedState) {
      sessionStorage.removeItem("google_oauth_state");
      handleGoogleCallback(code);
    } else {
      handleSupabaseCallback(code);
    }

    async function handleGoogleCallback(authCode: string) {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: authCode }),
        });

        if (!res.ok) throw new Error("google_api");

        const { id_token, access_token } = await res.json();

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: id_token,
          access_token,
        });

        if (error) throw error;

        const u = data.user;
        if (u && !u.app_metadata?.welcomeSent) {
          const displayName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "there";
          await fetch("/api/welcome", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
            },
            body: JSON.stringify({ userId: u.id, name: displayName }),
          }).catch(() => {});
        }

        router.replace("/dashboard");
      } catch {
        setPhase("error");
        setTimeout(() => router.replace("/auth?error=oauth"), 2000);
      }
    }

    async function handleSupabaseCallback(authCode: string) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) throw error;

        if (type === "recovery") { router.replace("/auth/reset"); return; }

        const u = data.session?.user;
        if (u && !u.app_metadata?.welcomeSent) {
          const displayName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "there";
          await fetch("/api/welcome", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
            },
            body: JSON.stringify({ userId: u.id, name: displayName }),
          }).catch(() => {});
        }

        router.replace("/dashboard");
      } catch {
        setPhase("error");
        setTimeout(() => router.replace("/auth?error=oauth"), 2000);
      }
    }
  }, [router]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--paper)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      {phase === "loading" ? (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            style={{ animation: "spin 1s linear infinite" }}
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" stroke="var(--rule)" strokeWidth="2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--cinnabar-ink)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--ink)",
          }}>
            Signing you in&hellip;
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 20, color: "var(--cinnabar-ink)" }}>&#x2715;</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--ink)",
          }}>
            Something went wrong &mdash; redirecting&hellip;
          </span>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
