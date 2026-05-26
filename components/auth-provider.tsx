"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { pullFromCloud, pushToCloud } from "@/lib/sync";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        pullFromCloud(session.user.id).catch(() => {});
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
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
          fetch("/api/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, name: displayName }),
          }).catch(() => {});
        }
      }
      if (_e === "SIGNED_OUT") {
        // Push any last changes before clearing session
        // (user object still set at this point)
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    if (user) {
      // Sync localStorage to cloud before signing out
      await pushToCloud(user.id).catch(() => {});
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
