"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { saveUserData, loadUserData } from "@/lib/user-data";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

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
const LEARNING_STYLES = [
  { value: "examples-first", label: "Show me examples first", sub: "See it in action, then understand why" },
  { value: "theory-first",   label: "Explain the theory first", sub: "Understand the principle, then apply it" },
  { value: "bullet-points",  label: "Bullet points and lists", sub: "Quick, scannable — no long paragraphs" },
  { value: "step-by-step",   label: "Step by step", sub: "One thing at a time, nothing skipped" },
] as const;
const COMM_STYLES = [
  { value: "simple",         label: "Simple and clear", sub: "Everyday English, no jargon" },
  { value: "conversational", label: "Conversational", sub: "Friendly, like a knowledgeable study buddy" },
  { value: "detailed",       label: "Detailed and thorough", sub: "Full context, the bigger picture" },
  { value: "direct",         label: "Direct and concise", sub: "Just the essentials — no filler" },
] as const;

// Step 0 = welcome, steps 1-8 = data, step 9 = done
const TOTAL_DATA_STEPS = 8;

function OptionPill({ label, sub, selected, onClick }: { label: string; sub?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: sub ? "16px 20px" : "15px 20px",
        borderRadius: 14,
        border: `1.5px solid ${selected ? "var(--cinnabar)" : "var(--rule)"}`,
        background: selected ? "color-mix(in srgb, var(--cinnabar) 9%, transparent)" : "color-mix(in srgb, var(--ink) 3%, transparent)",
        color: "var(--ink)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        transition: "border-color 160ms ease, background 160ms ease",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
        {sub && <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{sub}</div>}
      </div>
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        border: `1.5px solid ${selected ? "var(--cinnabar)" : "var(--rule)"}`,
        background: selected ? "var(--cinnabar)" : "transparent",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 160ms ease, border-color 160ms ease",
        fontSize: 11,
        color: selected ? "var(--paper)" : "transparent",
      }}>
        {selected && "✓"}
      </span>
    </button>
  );
}

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // step 0 = welcome, 1-8 = data collection, 9 = done
  const [step, setStep] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<1 | -1>(1);

  useGSAP(() => {
    if (!contentRef.current) return;
    const dir = dirRef.current;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, x: dir * 32 },
      { opacity: 1, x: 0, duration: 0.38, ease: "power3.out", clearProps: "opacity,transform" }
    );
  }, { dependencies: [step], revertOnUpdate: true });

  const [grade,              setGrade]              = useState("");
  const [board,              setBoard]              = useState("");
  const [stream,             setStream]             = useState("");
  const [interests,          setInterests]          = useState<string[]>([]);
  const [learningStyle,      setLearningStyle]      = useState("");
  const [communicationStyle, setCommunicationStyle] = useState("");
  const [targetExam,         setTargetExam]         = useState("");
  const [saving,             setSaving]             = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    loadUserData(user.id)
      .then(ud => { if (ud?.onboardingDone === true) router.push("/dashboard"); })
      .catch(() => {});
  }, [user, authLoading, router]);

  const needsStream = grade === "Class 11" || grade === "Class 12";

  const STEP_VALID: Record<number, boolean> = {
    0: true,
    1: grade !== "",
    2: board !== "",
    3: !needsStream || stream !== "",
    4: interests.length >= 2,
    5: learningStyle !== "",
    6: communicationStyle !== "",
    7: targetExam !== "",
    8: true,
    9: true,
  };

  function toggleInterest(s: string) {
    setInterests(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function finish(skipRedirect = false) {
    if (!user) return;
    setSaving(true);
    try {
      await saveUserData(user.id, {
        onboardingDone: true,
        grade,
        board: board.split(" —")[0].split(" /")[0].trim(),
        stream: stream ? stream.split(" —")[0].split(" (")[0].trim() : undefined,
        interests,
        targetExam: targetExam.split(" /")[0].trim(),
        aiProfile: {
          learningStyle: learningStyle as "examples-first" | "theory-first" | "bullet-points" | "step-by-step",
          communicationStyle: communicationStyle as "simple" | "conversational" | "detailed" | "direct",
        },
      });
    } catch {}
    localStorage.setItem("ledger-onboarding-done", "1");
    if (!skipRedirect) router.push("/dashboard");
  }

  function goNext() {
    dirRef.current = 1;
    if (step === 3 && !needsStream) { setStep(4); return; }
    if (step === 8) {
      // syllabus step — done is handled by buttons inside
      return;
    }
    setStep(s => s + 1);
  }

  function goBack() {
    dirRef.current = -1;
    if (step === 4 && !needsStream) { setStep(3); return; }
    setStep(s => s - 1);
  }

  const firstName = user?.email?.split("@")[0]?.split(".")?.[0] ?? "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  if (authLoading || !user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );

  // Progress: 0 on welcome, 1-8 on data steps, full on done
  const progressPct = step === 0 ? 0 : step === 9 ? 100 : ((step) / TOTAL_DATA_STEPS) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "var(--ink)", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>

      {/* Top bar */}
      <div style={{ padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rule-2)" }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
        {step > 0 && step < 9 && (
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em" }}>
            {step} of {TOTAL_DATA_STEPS}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "var(--rule-2)", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${progressPct}%`,
          background: "var(--cinnabar)",
          transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 24px 80px" }}>
        <div ref={contentRef} style={{ width: "100%", maxWidth: 520 }}>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--cinnabar-ink)", marginBottom: 20, letterSpacing: "0.02em" }}>
                Welcome to Ledger
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
                Hello, {displayName}<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: 40, maxWidth: 400, margin: "0 auto 40px" }}>
                Eight quick questions. Then every AI tool on Ledger is calibrated to your grade, board, and learning style — permanently.
              </div>
              <button className="btn" onClick={goNext} style={{ padding: "14px 36px", fontSize: 13 }}>
                Let&apos;s go →
              </button>
              <div className="mono" style={{ marginTop: 16, fontSize: 9, color: "var(--ink-3)" }}>Takes about 90 seconds</div>
            </div>
          )}

          {/* Step 1: Grade */}
          {step === 1 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                What grade are you in?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>Sets the difficulty level across every tool.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {GRADES.map(g => (
                  <OptionPill key={g} label={g} selected={grade === g} onClick={() => setGrade(g)} />
                ))}
              </div>
            </>
          )}

          {/* Step 2: Board */}
          {step === 2 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                Which board do you follow?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>We&apos;ll surface papers and content relevant to your curriculum.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BOARDS.map(b => (
                  <OptionPill key={b} label={b} selected={board === b} onClick={() => setBoard(b)} />
                ))}
              </div>
            </>
          )}

          {/* Step 3: Stream */}
          {step === 3 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                {needsStream ? "What's your stream?" : "Stream doesn't apply yet."}
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>
                {needsStream ? "The AI uses this for subject-specific advice." : `You're in ${grade} — stream selection comes in Class 11.`}
              </div>
              {needsStream ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {STREAMS.map(s => (
                    <OptionPill key={s} label={s} selected={stream === s} onClick={() => setStream(s)} />
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", borderRadius: 14, border: "1px solid var(--rule)", background: "color-mix(in srgb, var(--ink) 3%, transparent)", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
                  You can update this any time from your profile once you reach Class 11.
                </div>
              )}
            </>
          )}

          {/* Step 4: Interests */}
          {step === 4 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                Which subjects interest you?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>Pick at least 2. The AI learns what to focus on.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {INTERESTS.map(s => (
                  <OptionPill key={s} label={s} selected={interests.includes(s)} onClick={() => toggleInterest(s)} />
                ))}
              </div>
              {interests.length > 0 && (
                <div className="mono" style={{ marginTop: 12, color: "var(--cinnabar-ink)", fontSize: 10 }}>
                  {interests.length} selected{interests.length < 2 ? " — pick one more" : " ✓"}
                </div>
              )}
            </>
          )}

          {/* Step 5: Learning Style */}
          {step === 5 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                How do you learn best?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>Every AI response will match this style.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {LEARNING_STYLES.map(opt => (
                  <OptionPill key={opt.value} label={opt.label} sub={opt.sub} selected={learningStyle === opt.value} onClick={() => setLearningStyle(opt.value)} />
                ))}
              </div>
            </>
          )}

          {/* Step 6: Communication Style */}
          {step === 6 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                How should the AI talk to you?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>Every tool on Ledger uses this voice — you can change it any time.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COMM_STYLES.map(opt => (
                  <OptionPill key={opt.value} label={opt.label} sub={opt.sub} selected={communicationStyle === opt.value} onClick={() => setCommunicationStyle(opt.value)} />
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule-2)", background: "color-mix(in srgb, var(--cinnabar) 5%, transparent)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4, letterSpacing: "0.1em" }}>WHY THIS MATTERS</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
                  The AI doesn&apos;t just answer questions — it learns how to talk to you. Notes, Doubt Solver, Coach — all calibrated.
                </div>
              </div>
            </>
          )}

          {/* Step 7: Target Exam */}
          {step === 7 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                What&apos;s your target exam?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>Study Planner and Exam Triage will build around this.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {EXAMS.map(e => (
                  <OptionPill key={e} label={e} selected={targetExam === e} onClick={() => setTargetExam(e)} />
                ))}
              </div>
            </>
          )}

          {/* Step 8: Syllabus */}
          {step === 8 && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 6 }}>
                One last thing.
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 28, fontSize: 11 }}>
                This step unlocks the full power of Ledger.
              </div>
              <div style={{ borderRadius: 16, border: "1px solid var(--rule)", overflow: "hidden", marginBottom: 20 }}>
                {[
                  ["01", "Upload your syllabus", "A PDF, photo, or even a messy Word doc."],
                  ["02", "AI reads it in seconds", "Subjects, chapters, topics — extracted automatically."],
                  ["03", "Everything personalised", "Every tool calibrated to your exact curriculum from day one."],
                ].map(([num, title, desc], i, arr) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "18px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : "none", background: "color-mix(in srgb, var(--ink) 2%, transparent)" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, fontSize: 11 }}>{num}</span>
                    <div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" onClick={async () => { await finish(true); router.push("/tools/syllabus"); }} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Saving…" : "Upload my syllabus →"}
                </button>
                <button className="btn ghost" onClick={() => { dirRef.current = 1; setStep(9); finish(true); }} disabled={saving} style={{ flexShrink: 0 }}>
                  Skip
                </button>
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginTop: 10, fontSize: 9 }}>You can always do this later from the Syllabus tool.</div>
            </>
          )}

          {/* Step 9: Done */}
          {step === 9 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 34, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 12 }}>
                Your Ledger is ready<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 8 }}>
                {grade && board && <span>{grade} · {board.split(" /")[0].split("(")[0].trim()}</span>}
                {targetExam && <><br /><span style={{ color: "var(--ink-3)" }}>Targeting</span> {targetExam.split(" /")[0].trim()}</>}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 36 }}>
                {interests.slice(0, 3).join(" · ")}{interests.length > 3 ? ` +${interests.length - 3} more` : ""}
              </div>
              <button className="btn" onClick={() => router.push("/dashboard")} style={{ padding: "14px 36px", fontSize: 13 }}>
                Open my dashboard →
              </button>
            </div>
          )}

          {/* Navigation — visible on data steps 1-7 */}
          {step >= 1 && step <= 7 && (
            <div style={{ marginTop: 28, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn ghost" onClick={goBack} style={{ padding: "10px 20px" }}>← Back</button>
              <button
                className="btn"
                onClick={goNext}
                disabled={!STEP_VALID[step]}
                style={{ padding: "10px 28px", opacity: !STEP_VALID[step] ? 0.35 : 1 }}
              >
                Continue →
              </button>
            </div>
          )}
          {/* Back button on step 8 */}
          {step === 8 && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <button className="btn ghost" onClick={goBack} style={{ padding: "8px 16px", fontSize: 11 }}>← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
