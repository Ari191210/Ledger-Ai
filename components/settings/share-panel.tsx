"use client";

// ═══════════════════════════════════════════════════════════════════════════
// SHARE PANEL — REBUILT for M17 (architecture Part N, PRODUCT_DECISIONS §9.2).
//
// Replaces the unauthenticated `parentCode` mechanism this component used to
// mint (M0–M16 carried it forward unchanged because M17's real data model did
// not exist yet — see the M16-3 note this replaces). What is different now:
//
//   · A parent is invited by email and must authenticate to accept — no bare
//     link grants access on its own (M17-1).
//   · Sharing is seven independent categories, ALL OFF by default (M17-3) —
//     never a single "share/don't share" switch, and there is structurally no
//     eighth toggle for "weak topics" or "marks lost": PRODUCT_DECISIONS §9.2
//     forbids it, and the type this panel is built against
//     (`lib/parent-space.ts`) has no field to bind such a toggle to.
//   · Revocation is a button per connection, effective immediately (M17-5).
//   · A log of every parent read is visible here (V.8.7).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  SHARE_CATEGORIES,
  SHARE_CATEGORY_LABELS,
  allCategoriesOff,
  type ShareCategory,
} from "@/lib/parent-space";

type Connection = { connection_id: string; parent_id: string; state: "active" | "revoked"; created_at: string; revoked_at: string | null };
type Invitation = { invitation_id: string; email: string; status: string; created_at: string; expires_at: string };
type AccessLogRow = { access_id: number; parent_id: string; policy_version: number; categories_read: string[]; accessed_at: string };
type Policy = Record<ShareCategory, boolean> & { version: number; digest_enabled?: boolean };

async function authedFetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  return res;
}

export default function SharePanel({ token }: { token: string | undefined }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [accessLog, setAccessLog]     = useState<AccessLogRow[]>([]);
  const [policy, setPolicy]           = useState<Policy>({ version: 0, ...allCategoriesOff() });
  const [email, setEmail]             = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [savingCat, setSavingCat]     = useState<ShareCategory | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [connRes, invRes, logRes, polRes] = await Promise.all([
      authedFetch(token, "/api/parent/connections").then(r => r.json()).catch(() => null),
      authedFetch(token, "/api/parent/invitations").then(r => r.json()).catch(() => null),
      authedFetch(token, "/api/parent/access-log").then(r => r.json()).catch(() => null),
      authedFetch(token, "/api/parent/policy").then(r => r.json()).catch(() => null),
    ]);
    if (connRes?.asStudent) setConnections(connRes.asStudent);
    if (invRes?.invitations) setInvitations(invRes.invitations.filter((i: Invitation) => i.status === "pending"));
    if (logRes?.log) setAccessLog(logRes.log);
    if (polRes?.policy) setPolicy({ version: polRes.policy.version, digest_enabled: polRes.policy.digest_enabled, ...mapPolicyRow(polRes.policy) });
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function sendInvite() {
    if (!token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError("Enter a valid email address."); setInviteState("error"); return; }
    setInviteState("sending");
    const res = await authedFetch(token, "/api/parent/invite", { method: "POST", body: JSON.stringify({ email }) });
    if (res.ok) {
      setInviteState("sent");
      setEmail("");
      refresh();
      setTimeout(() => setInviteState("idle"), 3000);
    } else {
      const j = await res.json().catch(() => ({}));
      setInviteError(j.error || "Could not send the invitation.");
      setInviteState("error");
    }
  }

  async function cancelInvite(invitationId: string) {
    if (!token) return;
    await authedFetch(token, "/api/parent/invitations", { method: "DELETE", body: JSON.stringify({ invitationId }) });
    refresh();
  }

  async function revoke(connectionId: string) {
    if (!token) return;
    await authedFetch(token, `/api/parent/connections/${connectionId}/revoke`, { method: "POST" });
    refresh();
  }

  async function toggleCategory(cat: ShareCategory, value: boolean) {
    if (!token) return;
    setSavingCat(cat);
    const res = await authedFetch(token, "/api/parent/policy", { method: "POST", body: JSON.stringify({ [cat]: value }) });
    if (res.ok) {
      const j = await res.json();
      if (j.policy) setPolicy({ version: j.policy.version, digest_enabled: j.policy.digest_enabled, ...mapPolicyRow(j.policy) });
    }
    setSavingCat(null);
  }

  const activeConnections = connections.filter(c => c.state === "active");

  return (
    <div className="mob-share" style={{ display: "grid", gap: 12 }}>
      {/* Invite */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div className="mono cin" style={{ marginBottom: 6 }}>Invite a parent</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
          They sign in with their own account and see only what you turn on below. There is no link that grants access on its own — an invitation is single-use and expires in 72 hours.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setInviteState("idle"); }}
            placeholder="parent@email.com"
            aria-label="Parent email"
            style={{ flex: 1, minWidth: 180, fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", padding: "8px 10px", background: "var(--paper-2)", color: "var(--ink)" }}
          />
          <button className="btn ghost" onClick={sendInvite} disabled={inviteState === "sending"} style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
            {inviteState === "sending" ? "Sending…" : inviteState === "sent" ? "Sent ✓" : "Send invitation →"}
          </button>
        </div>
        {inviteState === "error" && <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 6 }}>{inviteError}</div>}

        {invitations.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Pending</div>
            {invitations.map(inv => (
              <div key={inv.invitation_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{inv.email}</span>
                <button className="btn ghost" onClick={() => cancelInvite(inv.invitation_id)} style={{ padding: "3px 10px", fontSize: 10 }}>Cancel</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections + categories */}
      {activeConnections.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="mono cin" style={{ marginBottom: 6 }}>Connected parents</div>
          {activeConnections.map(c => (
            <div key={c.connection_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>Connected {new Date(c.created_at).toLocaleDateString()}</span>
              <button className="btn ghost" onClick={() => revoke(c.connection_id)} style={{ padding: "3px 10px", fontSize: 10 }}>Revoke access</button>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--rule)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
              What they can see — every category starts off
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {SHARE_CATEGORIES.map(cat => (
                <label key={cat} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(policy[cat])}
                    disabled={savingCat === cat}
                    onChange={e => toggleCategory(cat, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{SHARE_CATEGORY_LABELS[cat].title}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)" }}>{SHARE_CATEGORY_LABELS[cat].body}</div>
                  </span>
                </label>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.7 }}>
              Individual mistakes, wrong answers and topic-level miss counts are never shown to a parent, at any setting. This is not a toggle — it is how the product is built.
            </div>
          </div>
        </div>
      )}

      {/* Access log */}
      {accessLog.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>Who has looked, and when</div>
          <div style={{ display: "grid", gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {accessLog.slice(0, 20).map(row => (
              <div key={row.access_id} className="mono" style={{ fontSize: 10, color: "var(--ink-3)", display: "flex", justifyContent: "space-between" }}>
                <span>{new Date(row.accessed_at).toLocaleString()}</span>
                <span>{row.categories_read.length} categor{row.categories_read.length === 1 ? "y" : "ies"} read</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function mapPolicyRow(row: Record<string, unknown>): Record<ShareCategory, boolean> {
  return {
    scoreTrajectory: Boolean(row.score_trajectory),
    dimensionBreakdown: Boolean(row.dimension_breakdown),
    subjectState: Boolean(row.subject_state),
    progressFixing: Boolean(row.progress_fixing),
    consistency: Boolean(row.consistency),
    upcomingExams: Boolean(row.upcoming_exams),
    assessmentActivity: Boolean(row.assessment_activity),
  };
}
