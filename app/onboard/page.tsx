"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { saveUserData, loadUserData } from "@/lib/user-data";

const GRADES = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "First Year (College)", "Second Year+ (College)"];
const BOARDS = ["CBSE", "ICSE", "IB (International Baccalaureate)", "IGCSE / Cambridge", "State Board", "Home School / Other"];
const STREAMS = ["Science — PCM (Physics, Chemistry, Maths)", "Science — PCB (Physics, Chemistry, Biology)", "Commerce", "Arts / Humanities", "Not applicable yet"];
const INTERESTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Psychology", "History", "Geography",
  "Economics", "English Literature", "Accountancy", "Political Science",
];
const EXAMS = [
  "JEE Main / Advanced", "NEET UG", "CUET", "IPMAT",
  "CA Foundation", "SAT / ACT", "A-Levels / IGCSE Boards",
  "IELTS / TOEFL", "No specific exam — just school boards",
];

const STEPS = ["Grade", "Board", "Stream", "Interests", "Target"];

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step,       setStep]       = useState(0);
  const [grade,      setGrade]      = useState("");
  const [board,      setBoard]      = useState("");
  const [stream,     setStream]     = useState("");
  const [interests,  setInterests]  = useState<string[]>([]);
  const [targetExam, setTargetExam] = useState("");
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    // Skip onboarding if already done
    loadUserData(user.id).then(ud => {
      if (ud?.onboardingDone === true) router.push("/dashboard");
    });
  }, [user, authLoading, router]);

  const needsStream = grade === "Class 11" || grade === "Class 12";

  const STEP_VALID = [
    grade !== "",
    board !== "",
    !needsStream || stream !== "",
    interests.length >= 2,
    targetExam !== "",
  ];

  function toggleInterest(i: string) {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    await saveUserData(user.id, {
      onboardingDone: true,
      grade,
      board: board.split(" —")[0].split(" /")[0].trim(), // short form
      stream: stream ? stream.split(" —")[0].split(" (")[0].trim() : undefined,
      interests,
      targetExam: targetExam.split(" /")[0].trim(),
    });
    router.push("/dashboard");
  }

  function next() {
    if (step === 2 && !needsStream) { setStep(3); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  }

  if (authLoading || !user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--paper)" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Set up your profile · {step + 1} of {STEPS.length}</div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--rule)" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, padding: "10px 0", textAlign: "center", background: i === step ? "var(--ink)" : i < step ? "var(--paper-2)" : "transparent", borderRight: i < STEPS.length - 1 ? "1px solid var(--rule)" : "none" }}>
            <div className="mono" style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: i === step ? "var(--paper)" : i < step ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>
              {String(i + 1).padStart(2, "0")} · {s}
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>

          {step === 0 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
                What grade are you in?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28 }}>Helps us set the right difficulty for all tools.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
                {GRADES.map((g, i) => (
                  <button key={g} onClick={() => setGrade(g)}
                    style={{ padding: "16px 20px", background: grade === g ? "var(--ink)" : "transparent", color: grade === g ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: i < GRADES.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{g}</span>
                    {grade === g && <span className="mono" style={{ fontSize: 10, color: "var(--paper)", opacity: 0.7 }}>Selected</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
                Which board do you follow?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28 }}>We&apos;ll surface papers and content relevant to your curriculum.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
                {BOARDS.map((b, i) => (
                  <button key={b} onClick={() => setBoard(b)}
                    style={{ padding: "16px 20px", background: board === b ? "var(--ink)" : "transparent", color: board === b ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: i < BOARDS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{b}</span>
                    {board === b && <span className="mono" style={{ fontSize: 10, color: "var(--paper)", opacity: 0.7 }}>Selected</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
                {needsStream ? "What's your stream?" : "Stream doesn't apply yet."}
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28 }}>
                {needsStream ? "The AI uses this for subject-specific advice." : "You're in " + grade + " — stream selection comes later."}
              </div>
              {needsStream ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
                  {STREAMS.map((s, i) => (
                    <button key={s} onClick={() => setStream(s)}
                      style={{ padding: "16px 20px", background: stream === s ? "var(--ink)" : "transparent", color: stream === s ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: i < STREAMS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{s}</span>
                      {stream === s && <span className="mono" style={{ fontSize: 10, color: "var(--paper)", opacity: 0.7 }}>Selected</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)" }}>
                  We&apos;ll ask again when you upgrade to Class 11. You can update this any time in your profile.
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
                Which subjects interest you?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28 }}>Pick at least 2. The AI learns what to focus on.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)" }}>
                {INTERESTS.map((s, i) => {
                  const sel = interests.includes(s);
                  return (
                    <button key={s} onClick={() => toggleInterest(s)}
                      style={{ padding: "14px 16px", background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i % 2 === 0 ? "1px solid var(--rule)" : "none", borderBottom: i < INTERESTS.length - 2 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{s}</span>
                      {sel && <span style={{ color: "var(--cinnabar-ink)", fontSize: 12 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {interests.length > 0 && (
                <div className="mono" style={{ marginTop: 10, color: "var(--cinnabar-ink)" }}>{interests.length} selected{interests.length < 2 ? " — pick at least one more" : ""}</div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
                What&apos;s your target exam?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28 }}>Career Pathfinder and Study Planner will use this.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
                {EXAMS.map((e, i) => (
                  <button key={e} onClick={() => setTargetExam(e)}
                    style={{ padding: "16px 20px", background: targetExam === e ? "var(--ink)" : "transparent", color: targetExam === e ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: i < EXAMS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{e}</span>
                    {targetExam === e && <span className="mono" style={{ fontSize: 10, color: "var(--paper)", opacity: 0.7 }}>Selected</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Navigation */}
          <div style={{ marginTop: 28, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {step > 0 && (
                <button className="btn ghost" onClick={() => setStep(s => s - 1)} style={{ padding: "10px 20px" }}>← Back</button>
              )}
            </div>
            <div>
              {step < STEPS.length - 1 ? (
                <button className="btn" onClick={next} disabled={!STEP_VALID[step]} style={{ padding: "10px 24px", opacity: !STEP_VALID[step] ? 0.4 : 1 }}>
                  Continue →
                </button>
              ) : (
                <button className="btn" onClick={finish} disabled={!STEP_VALID[step] || saving} style={{ padding: "10px 24px", opacity: !STEP_VALID[step] || saving ? 0.4 : 1 }}>
                  {saving ? "Saving…" : "Go to dashboard →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
