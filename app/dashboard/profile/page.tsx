"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, saveUserData, patchUserData, type AiProfile } from "@/lib/user-data";
import { supabase } from "@/lib/supabase";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const GRADES   = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "First Year (College)", "Second Year+ (College)"];
const GRADE_SHORT: Record<string,string> = { "First Year (College)": "1st yr", "Second Year+ (College)": "2nd yr+" };
const BOARDS   = ["CBSE", "ICSE", "IB (International Baccalaureate)", "IGCSE / Cambridge", "State Board", "Home School / Other"];
const BOARD_SHORT: Record<string,string> = { "IB (International Baccalaureate)": "IB", "IGCSE / Cambridge": "IGCSE", "State Board": "State", "Home School / Other": "Other" };
const STREAMS  = ["Science — PCM (Physics, Chemistry, Maths)", "Science — PCB (Physics, Chemistry, Biology)", "Commerce", "Arts / Humanities", "Not applicable yet"];
const STREAM_SHORT: Record<string,string> = { "Science — PCM (Physics, Chemistry, Maths)": "Science PCM", "Science — PCB (Physics, Chemistry, Biology)": "Science PCB", "Not applicable yet": "N/A" };
const EXAMS    = ["JEE Main / Advanced", "NEET UG", "CUET", "IPMAT", "CA Foundation", "SAT / ACT", "A-Levels / IGCSE Boards", "IELTS / TOEFL", "No specific exam — just school boards"];
const EXAM_SHORT: Record<string,string> = { "JEE Main / Advanced": "JEE", "A-Levels / IGCSE Boards": "A-Level", "No specific exam — just school boards": "School only" };
const LEARNING = [
  { value: "examples-first", label: "Examples first" },
  { value: "theory-first",   label: "Theory first" },
  { value: "bullet-points",  label: "Bullet points" },
  { value: "step-by-step",   label: "Step by step" },
] as const;
const COMMS = [
  { value: "simple",         label: "Simple" },
  { value: "conversational", label: "Conversational" },
  { value: "detailed",       label: "Detailed" },
  { value: "direct",         label: "Direct" },
] as const;

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

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={row}>
              <span style={label}>Grade</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {GRADES.map(g => <button key={g} type="button" onClick={() => setGrade(g)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${grade === g ? "var(--ink)" : "var(--rule)"}`, background: grade === g ? "var(--ink)" : "var(--paper)", color: grade === g ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{GRADE_SHORT[g] || g}</button>)}
              </div>
            </div>
            <div style={row}>
              <span style={label}>Board</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {BOARDS.map(b => <button key={b} type="button" onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{BOARD_SHORT[b] || b}</button>)}
              </div>
            </div>
            <div style={row}>
              <span style={label}>Stream</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {STREAMS.map(s => <button key={s} type="button" onClick={() => setStream(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${stream === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: stream === s ? "var(--cinnabar-ink)" : "var(--paper)", color: stream === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{STREAM_SHORT[s] || s}</button>)}
              </div>
            </div>
            <div style={row}>
              <span style={label}>Target Exam</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {EXAMS.map(e => <button key={e} type="button" onClick={() => setExam(e)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${exam === e ? "var(--ink)" : "var(--rule)"}`, background: exam === e ? "var(--ink)" : "var(--paper)", color: exam === e ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{EXAM_SHORT[e] || e}</button>)}
              </div>
            </div>
            <div style={row}>
              <span style={label}>Learning Style</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {LEARNING.map(l => <button key={l.value} type="button" onClick={() => setLearn(l.value)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${learn === l.value ? "var(--sage)" : "var(--rule)"}`, background: learn === l.value ? "var(--sage)" : "var(--paper)", color: learn === l.value ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l.label}</button>)}
              </div>
            </div>
            <div style={row}>
              <span style={label}>AI Tone</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {COMMS.map(c => <button key={c.value} type="button" onClick={() => setComm(c.value)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${comm === c.value ? "var(--gold)" : "var(--rule)"}`, background: comm === c.value ? "var(--gold)" : "var(--paper)", color: comm === c.value ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{c.label}</button>)}
              </div>
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
