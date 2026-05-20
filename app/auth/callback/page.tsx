"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) { router.replace("/auth?error=oauth"); return; }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) router.replace("/auth?error=oauth");
      else router.replace("/dashboard");
    });
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
