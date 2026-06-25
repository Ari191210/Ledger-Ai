"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/posthog";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ledger-sid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ledger-sid", id);
  }
  return id;
}

export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const sessionId = getSessionId();
    const toolSlug = pathname.startsWith("/tools/") ? pathname.replace("/tools/", "") : null;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, page: pathname, tool: toolSlug }),
    }).catch(() => {});

    if (toolSlug) {
      const entry = TOOLS_REGISTRY.find((t) => t.slug === toolSlug);
      track.toolOpen(toolSlug, entry?.cat ?? "UNKNOWN");
    }
  }, [pathname]);

  return null;
}
