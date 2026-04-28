"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
    const tool = pathname.startsWith("/tools/") ? pathname.replace("/tools/", "") : null;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, page: pathname, tool }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
