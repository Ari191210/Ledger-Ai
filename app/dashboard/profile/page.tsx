"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, patchUserData } from "@/lib/user-data";
import { supabase } from "@/lib/supabase";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function ProfilePage() {
  const { user } = useAuth();
  const [username,    setUsername]    = useState("");
  const [draft,       setDraft]       = useState("");
  const [checking,    setChecking]    = useState(false);
  const [available,   setAvailable]   = useState<boolean | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");
  const [loaded,      setLoaded]      = useState(false);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      const u = ud?.username || user.email?.split("@")[0] || "";
      setUsername(u);
      setDraft(u);
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!draft || draft === username) { setAvailable(null); return; }
    if (!USERNAME_REGEX.test(draft)) { setAvailable(null); return; }

    setChecking(true);
    setAvailable(null);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("user_data")
        .select("id")
        .eq("username", draft)
        .neq("id", user?.id ?? "")
        .maybeSingle();
      setAvailable(!data);
      setChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, username, user?.id]);

  async function save() {
    if (!user) return;
    if (!USERNAME_REGEX.test(draft)) { setError("Username must be 3–20 chars: letters, numbers, underscores only."); return; }
    if (available === false) { setError("That username is taken."); return; }
    setSaving(true); setError("");
    await patchUserData(user.id, "username", draft);
    setUsername(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  }

  const isValid = USERNAME_REGEX.test(draft);
  const changed = draft !== username;

  const initial = (username || user?.email || "?")[0].toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Account · Profile</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>studyledger.in</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 720, margin: "0 auto" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--ink)" }}>
          <div style={{ width: 80, height: 80, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, color: "var(--paper)", lineHeight: 1 }}>{initial}</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              @{loaded ? username : "…"}
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 8 }}>{user?.email}</div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Member since {joinedDate}</div>
          </div>
        </div>

        {/* Username field */}
        <div style={{ marginBottom: 32 }}>
          <div className="mono cin" style={{ marginBottom: 6 }}>Username</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.5 }}>
            Your username appears on your dashboard, parent view, and referral link. Letters, numbers, underscores only. 3–20 characters.
          </div>

          <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
            <div style={{ padding: "12px 14px", background: "var(--paper-2)", borderRight: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", flexShrink: 0, display: "flex", alignItems: "center" }}>
              @
            </div>
            <input
              value={draft}
              onChange={e => { setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setSaved(false); }}
              maxLength={20}
              placeholder="your_username"
              style={{ flex: 1, padding: "12px 14px", fontFamily: "var(--mono)", fontSize: 14, border: "none", background: "var(--paper)", color: "var(--ink)", outline: "none" }}
            />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
              {checking && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>checking…</span>}
              {!checking && changed && isValid && available === true  && <span className="mono" style={{ fontSize: 10, color: "#1a7a3c" }}>✓ available</span>}
              {!checking && changed && isValid && available === false && <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>✗ taken</span>}
              {!checking && changed && !isValid && draft.length > 0   && <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>invalid</span>}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn"
              onClick={save}
              disabled={saving || !changed || !isValid || available === false || checking}
              style={{ opacity: saving || !changed || !isValid || available === false || checking ? 0.4 : 1 }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save username →"}
            </button>
            {changed && (
              <button className="btn ghost" onClick={() => { setDraft(username); setAvailable(null); }} style={{ padding: "8px 14px", fontSize: 11 }}>
                Cancel
              </button>
            )}
          </div>
          {error && <div style={{ marginTop: 10, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
        </div>

        {/* Account info */}
        <div style={{ border: "1px solid var(--rule)" }}>
          <div style={{ padding: "12px 18px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
            <span className="mono" style={{ color: "var(--ink-3)" }}>Account details</span>
          </div>
          {[
            { label: "Email", value: user?.email || "—" },
            { label: "User ID", value: user?.id?.slice(0, 8) + "…" || "—" },
            { label: "Member since", value: joinedDate },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : "none" }}>
              <div className="mono" style={{ color: "var(--ink-3)" }}>{row.label}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{row.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
