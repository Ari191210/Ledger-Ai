"use client";

// /parent/accept?token=… — the parent side of M17-1's invitation flow.
// Requires the visitor to be authenticated as THEMSELVES before the
// invitation can be accepted (architecture N.3): there is no branch here
// that grants anything to an unauthenticated request, unlike the retired
// `/parent/[code]` page this route replaces.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function AcceptParentInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user, session, loading } = useAuth();
  const [state, setState] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || !session || !token || state !== "idle") return;
    setState("accepting");
    fetch("/api/parent/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ token }),
    })
      .then(async r => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Could not accept the invitation.");
        }
        setState("done");
      })
      .catch(e => { setError(e.message); setState("error"); });
  }, [loading, user, session, token, state]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper, #f5f0e8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, fontFamily: "Georgia, serif" }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#888", letterSpacing: "0.08em", marginBottom: 16 }}>
          STUDYLEDGER.IN · PARENT INVITATION
        </div>

        {!token && <p>This link is missing an invitation token.</p>}

        {token && !loading && !user && (
          <div>
            <p style={{ fontFamily: "Arial,sans-serif", fontSize: 14, lineHeight: 1.6, color: "#333" }}>
              Sign in or create an account to accept this invitation. Once signed in, open this same link again.
            </p>
            <a href="/auth" style={{ fontFamily: "monospace", fontSize: 12, color: "#b83c1a" }}>Sign in →</a>
          </div>
        )}

        {state === "accepting" && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#888" }}>Accepting…</p>}

        {state === "done" && (
          <div>
            <p style={{ fontFamily: "Arial,sans-serif", fontSize: 14, lineHeight: 1.6, color: "#333" }}>
              You're connected. You'll see only what the student turns on for you — never individual mistakes or wrong answers, at any setting.
            </p>
            <a href="/parent" style={{ fontFamily: "monospace", fontSize: 12, color: "#b83c1a" }}>Go to your parent view →</a>
          </div>
        )}

        {state === "error" && (
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#b83c1a" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
