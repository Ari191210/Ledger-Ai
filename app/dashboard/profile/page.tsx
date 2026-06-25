"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, saveUserData, patchUserData, type AiProfile } from "@/lib/user-data";
import { supabase } from "@/lib/supabase";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const GRADES   = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "First Year (College)", "Second Year+ (College)"];
const BOARDS   = ["CBSE", "ICSE", "IB (International Baccalaureate)", "IGCSE / Cambridge", "State Board", "Home School / Other"];
const STREAMS  = ["Science — PCM (Physics, Chemistry, Maths)", "Science — PCB (Physics, Chemistry, Biology)", "Commerce", "Arts / Humanities", "Not applicable yet"];
const EXAMS    = ["JEE Main / Advanced", "NEET UG", "CUET", "IPMAT", "CA Foundation", "SAT / ACT", "A-Levels / IGCSE Boards", "IELTS / TOEFL", "No specific exam — just school boards"];
const LEARNING = [
  { value: "examples-first", label: "Examples first — see it, then understand why" },
  { value: "theory-first",   label: "Theory first — principle, then application" },
  { value: "bullet-points",  label: "Bullet points — quick, scannable" },
  { value: "step-by-step",   label: "Step by step — one idea at a time" },
] as const;
const COMMS = [
  { value: "simple",         label: "Simple and clear — everyday English" },
  { value: "conversational", label: "Conversational — like a study buddy" },
  { value: "detailed",       label: "Detailed and thorough — full context" },
  { value: "direct",         label: "Direct and concise — essentials only" },
] as const;

const sel: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--rule)",
  background: "var(--paper)", color: "var(--ink)",
  fontFamily: "var(--mono)", fontSize: 13, outline: "none", cursor: "pointer",
  appearance: "none", WebkitAppearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

export default function ProfilePage() {
  const { user } = useAuth();

  // Username
  const [username,  setUsername]  = useState("");
  const [draft,     setDraft]     = useState("");
  const [checking,  setChecking]  = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");
  const [loaded,    setLoaded]    = useState(false);

  // Study profile
  const [grade,    setGrade]    = useState("");
  const [board,    setBoard]    = useState("");
  const [stream,   setStream]   = useState("");
  const [exam,     setExam]     = useState("");
  const [learn,    setLearn]    = useState("");
  const [comm,     setComm]     = useState("");
  const [pSaving,  setPSaving]  = useState(false);
  const [pSaved,   setPSaved]   = useState(false);
  const [pError,   setPError]   = useState("");

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      const u = ud?.username || user.email?.split("@")[0] || "";
      setUsername(u); setDraft(u);
      setGrade(ud?.grade || "");
      setBoard(ud?.board || "");
      setStream(ud?.stream || "");
      setExam(ud?.targetExam || "");
      setLearn(ud?.aiProfile?.learningStyle || "");
      setComm(ud?.aiProfile?.communicationStyle || "");
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!draft || draft === username) { setAvailable(null); return; }
    if (!USERNAME_REGEX.test(draft))  { setAvailable(null); return; }
    setChecking(true); setAvailable(null);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("user_data").select("id")
        .eq("username", draft).neq("id", user?.id ?? "").maybeSingle();
      setAvailable(!data); setChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, username, user?.id]);

  async function saveUsername() {
    if (!user) return;
    if (!USERNAME_REGEX.test(draft)) { setError("Username must be 3–20 chars: letters, numbers, underscores only."); return; }
    if (available === false) { setError("That username is taken."); return; }
    setSaving(true); setError("");
    const { error: err } = await patchUserData(user.id, "username", draft);
    if (err) { setError("Save failed — " + err); setSaving(false); return; }
    setUsername(draft); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  }

  async function saveStudyProfile() {
    if (!user) return;
    setPSaving(true); setPError("");
    const aiProfile: AiProfile = {};
    if (learn) aiProfile.learningStyle = learn as AiProfile["learningStyle"];
    if (comm)  aiProfile.communicationStyle = comm as AiProfile["communicationStyle"];
    const { error: err } = await saveUserData(user.id, {
      grade:      grade || undefined,
      board:      board || undefined,
      stream:     stream || undefined,
      targetExam: exam  || undefined,
      aiProfile:  Object.keys(aiProfile).length ? aiProfile : undefined,
    });
    if (err) { setPError("Save failed — " + err); setPSaving(false); return; }
    setPSaved(true);
    setTimeout(() => setPSaved(false), 2500);
    setPSaving(false);
  }

  const isValid    = USERNAME_REGEX.test(draft);
  const changed    = draft !== username;
  const initial    = (username || user?.email || "?")[0].toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const label: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  const row: React.CSSProperties   = { marginBottom: 18 };

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Account · Profile</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>studyledger.in</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 720, margin: "0 auto" }}>

        {/* Avatar + name */}
        <div className="mob-profile" style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--ink)" }}>
          <div style={{ width: 80, height: 80, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, color: "var(--paper)", lineHeight: 1 }}>{initial}</span>
          </div>
          <div>
            <div className="profile-username" style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
              @{loaded ? username : "…"}
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 8 }}>{user?.email}</div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Member since {joinedDate}</div>
          </div>
        </div>

        {/* Username */}
        <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 6 }}>Username</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.5 }}>
            Appears on your dashboard, parent view, and referral link. Letters, numbers, underscores only. 3–20 characters.
          </div>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
            <div style={{ padding: "12px 14px", background: "var(--paper-2)", borderRight: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", flexShrink: 0, display: "flex", alignItems: "center" }}>@</div>
            <input
              value={draft}
              onChange={e => { setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setSaved(false); }}
              maxLength={20}
              placeholder="your_username"
              style={{ flex: 1, padding: "12px 14px", fontFamily: "var(--mono)", fontSize: 14, border: "none", background: "var(--paper)", color: "var(--ink)", outline: "none" }}
            />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
              {checking && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>checking…</span>}
              {!checking && changed && isValid && available === true  && <span className="mono" style={{ fontSize: 10, color: "var(--severity-success-color)" }}>✓ available</span>}
              {!checking && changed && isValid && available === false && <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>✗ taken</span>}
              {!checking && changed && !isValid && draft.length > 0   && <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>invalid</span>}
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={saveUsername} disabled={saving || !changed || !isValid || available === false || checking} style={{ opacity: saving || !changed || !isValid || available === false || checking ? 0.4 : 1 }}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save username →"}
            </button>
            {changed && <button className="btn ghost" onClick={() => { setDraft(username); setAvailable(null); }} style={{ padding: "8px 14px", fontSize: 11 }}>Cancel</button>}
          </div>
          {error && <div style={{ marginTop: 10, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
        </div>

        {/* Study Profile */}
        <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 6 }}>Study Profile</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.5 }}>
            Every AI tool is calibrated to these settings. Update them whenever your grade or goals change.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div style={row}>
              <span style={label}>Grade</span>
              <select value={grade} onChange={e => setGrade(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={label}>Board</span>
              <select value={board} onChange={e => setBoard(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={label}>Stream</span>
              <select value={stream} onChange={e => setStream(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={label}>Target Exam</span>
              <select value={exam} onChange={e => setExam(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={label}>Learning Style</span>
              <select value={learn} onChange={e => setLearn(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {LEARNING.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={row}>
              <span style={label}>AI Tone</span>
              <select value={comm} onChange={e => setComm(e.target.value)} style={sel}>
                <option value="">— select —</option>
                {COMMS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <button className="btn" onClick={saveStudyProfile} disabled={pSaving} style={{ marginTop: 6, opacity: pSaving ? 0.4 : 1 }}>
            {pSaving ? "Saving…" : pSaved ? "Saved ✓" : "Save study profile →"}
          </button>
          {pError && <div style={{ marginTop: 10, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{pError}</div>}
        </div>

        {/* Account info */}
        <div style={{ border: "1px solid var(--rule)" }}>
          <div style={{ padding: "12px 18px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
            <span className="mono" style={{ color: "var(--ink-3)" }}>Account details</span>
          </div>
          {[
            { label: "Email",        value: user?.email || "—" },
            { label: "User ID",      value: (user?.id?.slice(0, 8) + "…") || "—" },
            { label: "Member since", value: joinedDate },
          ].map((row, i, arr) => (
            <div key={row.label} className="profile-detail-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : "none" }}>
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
