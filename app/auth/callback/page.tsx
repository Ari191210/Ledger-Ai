"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    const type = params.get("type");
    if (!code) { router.replace("/auth?error=oauth"); return; }

    const storedState = sessionStorage.getItem("google_oauth_state");

    if (state && storedState && state === storedState) {
      // Manual Google OAuth callback
      sessionStorage.removeItem("google_oauth_state");
      handleGoogleCallback(code);
    } else {
      // Supabase callback (email confirmation, etc.)
      handleSupabaseCallback(code);
    }

    async function handleGoogleCallback(authCode: string) {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: authCode }),
      });

      if (!res.ok) { router.replace("/auth?error=oauth"); return; }

      const { id_token, access_token } = await res.json();

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token,
        access_token,
      });

      if (error) { router.replace("/auth?error=oauth"); return; }

      const u = data.user;
      if (u && !u.app_metadata?.welcomeSent) {
        const displayName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "there";
        await fetch("/api/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: u.id, name: displayName }),
        }).catch(() => {});
      }

      router.replace("/dashboard");
    }

    async function handleSupabaseCallback(authCode: string) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) { router.replace("/auth?error=oauth"); return; }

      // Recovery flow: redirect to password reset page
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: u.id, name: displayName }),
        }).catch(() => {});
      }

      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
      color: "var(--ink-3)",
    }}>
      Signing you in…
    </div>
  );
}
