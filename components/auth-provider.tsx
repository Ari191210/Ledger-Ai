"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, migrateLegacyLocalSession } from "@/lib/supabase";
import { pullFromCloud, flushLegacyBlob } from "@/lib/sync";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null, session: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // M4-1: the session moved from localStorage to cookies so the edge can see
    // it. A student who was already signed in still has the old localStorage
    // copy and nothing else; `migrateLegacyLocalSession()` replays it into the
    // cookie store ONCE, and must finish before the first read, or `getSession`
    // would answer "signed out" for a student who is not.
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const onAuthEvent = (_e: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (_e === "SIGNED_IN" && session?.user) {
        // Pull cloud data to localStorage when signing in on a new device
        pullFromCloud(session.user.id).catch(() => {});

        // Send welcome email on first-ever signin; server sets app_metadata.welcomeSent to prevent repeats
        if (!session.user.app_metadata?.welcomeSent) {
          const u = session.user;
          const displayName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "there";
          fetch("/api/jobs/enqueue", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ type: "send-welcome", payload: { userId: u.id, name: displayName } }),
          }).catch(() => {});
        }
      }
      if (_e === "SIGNED_OUT") {
        // Push any last changes before clearing session
        // (user object still set at this point)
      }
    };

    (async () => {
      // Never lets a migration failure strand the provider in `loading` — the
      // helper already swallows its own errors, and this catches anything left.
      await migrateLegacyLocalSession().catch(() => {});
      if (!active) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          pullFromCloud(session.user.id).catch(() => {});
        }
      } catch {
        /* treated as signed out; AuthGuard sends the visitor to /auth */
      } finally {
        if (active) setLoading(false);
      }

      if (!active) return;
      const { data } = supabase.auth.onAuthStateChange(onAuthEvent);
      subscription = data.subscription;
      // The effect may have been torn down while the awaits were in flight.
      if (!active) subscription.unsubscribe();
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (user) {
      // M7-6: the last flush before the local cache is cleared below. Change-
      // gated and scoped — see `lib/sync.ts`'s header for why a write path to
      // `user_data.blob` still exists at all, and what deletes it. If the
      // fingerprint is unchanged this is a no-op, which is correct: unchanged
      // means the server already holds these bytes, and the local copy being
      // erased below is a cache of them.
      await flushLegacyBlob(user.id).catch(() => {});
    }
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      const keep = new Set([
        "theme-base", "theme-accent", "palette-custom-accent",
        "ledger-mode", "ledger-density", "ledger-theme-mode", "ledger-base",
        "ledger-last-light", "ledger-font-sans", "ledger-font-serif",
        "ledger-font-mono", "ledger-radius", "ledger-width", "ledger-anim-speed",
        // M22: dashboard layout moved to server-persisted storage (034's
        // home_layout table) — the old local dashboard-layout cache key is
        // retired and is no longer preserved across sign-out.
      ]);
      Object.keys(localStorage).forEach(k => { if (!keep.has(k)) localStorage.removeItem(k); });
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
