"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initPostHog, track, identifyUser, resetUser } from "@/lib/posthog";
import { supabase } from "@/lib/supabase";

export default function PostHogProvider() {
  const pathname  = usePathname();
  const prevPath  = useRef<string | null>(null);

  // Init once on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname !== prevPath.current) {
      track.pageView(pathname);
      prevPath.current = pathname;
    }
  }, [pathname]);

  // Identify / reset on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          identifyUser(session.user.id, {
            email:      session.user.email,
            created_at: session.user.created_at,
          });
        }
        if (event === "SIGNED_OUT") {
          resetUser();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
