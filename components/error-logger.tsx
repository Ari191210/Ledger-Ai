"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function log(payload: Record<string, unknown>) {
  try {
    await fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // never throw from logger
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export default function ErrorLogger() {
  const pathname = usePathname();

  useEffect(() => {
    const base = {
      url:        window.location.href,
      route:      pathname,
      user_agent: navigator.userAgent,
    };

    /* ── JS errors ── */
    const onError = async (event: ErrorEvent) => {
      log({
        ...base,
        type:    "js_error",
        message: event.message,
        stack:   event.error?.stack ?? null,
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        user_id: await getUserId(),
      });
    };

    /* ── Unhandled promise rejections ── */
    const onRejection = async (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      log({
        ...base,
        type:    "unhandled_rejection",
        message: reason instanceof Error ? reason.message : String(reason),
        stack:   reason instanceof Error ? reason.stack ?? null : null,
        user_id: await getUserId(),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    /* ── Blank screen detector ──
       After 4s, if visible text on the page is < 60 chars the page likely
       rendered nothing. Check once — avoids noise on intentionally minimal pages. */
    const blankTimer = setTimeout(async () => {
      const text = document.body?.innerText?.trim() ?? "";
      if (text.length < 60) {
        log({
          ...base,
          type:    "blank_screen",
          message: "Page rendered with < 60 chars of visible text",
          context: {
            bodyTextLength:   text.length,
            childElementCount: document.body?.childElementCount ?? 0,
          },
          user_id: await getUserId(),
        });
      }
    }, 4000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(blankTimer);
    };
  }, [pathname]);

  return null;
}
