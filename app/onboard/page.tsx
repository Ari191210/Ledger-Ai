"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { saveStudentProfile, loadUserData } from "@/lib/user-data";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BOARDS } from "@/lib/onboarding-constants";
gsap.registerPlugin(useGSAP);

// ═══════════════════════════════════════════════════════════════════════════
// M5-3 — ONBOARDING, REBUILT TO WHAT IS RATIFIED.
//
// `PRODUCT_DECISIONS` §2.6, in full:
//
//   > **Board and subjects, one screen.** The ceiling is three questions; we
//   > use one screen's worth. Then straight into Home with a real starting
//   > Score. Never a tour. Never a checklist.
//
// and §3, describing the route: *"`/onboard` — Board and subjects. Nothing
// else."*
//
// This file used to be a nine-step wizard — `TOTAL_DATA_STEPS = 8`, plus a
// welcome screen and a done screen — asking grade, board, stream, interests,
// learning style, communication style, target exam and a syllabus upload.
// Architecture S.6 states the verdict: *"Eight steps is four times the
// ratified ceiling."*
//
// TWO QUESTIONS SHIP. Not three. The ceiling is three; §2.6 and §3 both name
// the two, and "nothing else" is not a budget to spend. Grade, stream, target
// exam and the AI style pair are NOT asked here — every one of them is
// editable in Settings (`PRODUCT_DECISIONS` §2.2: *"/settings — Profile,
// subjects, board, plan, parent access"*), and none of them gates the first
// screen a student sees.
//
// ONE SCREEN means one render with both questions visible and one control that
// finishes. No step index, no progress bar, no back button, no "N of M", no
// congratulations screen — a checklist and a tour are both banned by §2.6 by
// name, and a nine-step counter is a checklist with a progress bar attached.
// ═══════════════════════════════════════════════════════════════════════════

// The subject list is deliberately the same twelve entries the retired flow
// offered, under its own question ("Which subjects interest you?"). Keeping
// the values identical is what makes migration `012`'s backfill — which maps
// `user_data.interests` into `student_profiles.subjects` — line up with what a
// student selects here, instead of producing two vocabularies for one field.
const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Psychology", "History", "Geography",
  "Economics", "English Literature", "Accountancy", "Political Science",
];

function OptionPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        width: "100%",
        padding: "13px 16px",
        borderRadius: 14,
        border: `1.5px solid ${selected ? "var(--cinnabar)" : "var(--rule)"}`,
        background: selected ? "color-mix(in srgb, var(--cinnabar) 9%, var(--paper))" : "color-mix(in srgb, var(--ink) 3%, var(--paper))",
        color: "var(--ink)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        minHeight: 44,
        transition: "border-color 160ms ease, background 160ms ease",
      }}
    >
      <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
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

  const [board,    setBoard]    = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const screenRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!screenRef.current) return;
    gsap.from(screenRef.current.children, {
      opacity: 0, y: 16, duration: 0.45, stagger: 0.08, ease: "power3.out",
      clearProps: "opacity,transform",
    });
  }, { scope: screenRef });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    // A student who has already answered does not answer again. Completion is
    // "board and subjects are declared" — the same rule `isOnboarded()` in
    // `lib/student-profile.ts` applies server-side — with the legacy
    // `onboardingDone` flag still honoured for accounts that predate M5.
    loadUserData(user.id)
      .then(ud => {
        if (!ud) return;
        const declared = Boolean(ud.board) && Array.isArray(ud.interests) && ud.interests.length > 0;
        if (ud.onboardingDone === true || declared) router.replace("/home");
      })
      .catch(() => {});
  }, [user, authLoading, router]);

  function toggleSubject(s: string) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const ready = board !== "" && subjects.length > 0;

  async function finish() {
    if (!user || !ready) return;
    setSaving(true); setError("");
    const { error: err } = await saveStudentProfile(
      user.id,
      { board, subjects, onboardingDone: true },
      "onboarding",
    );
    if (err) { setError("Could not save. Check your connection and try again."); setSaving(false); return; }
    router.replace("/home");
  }

  if (authLoading || !user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "var(--ink)", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>

      <div style={{ padding: "18px 28px", borderBottom: "1px solid var(--rule-2)" }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
      </div>

      <div className="onboard-outer" style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px 80px" }}>
        <div ref={screenRef} style={{ width: "100%", maxWidth: 560 }}>

          <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8 }}>
            Two questions<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 36 }}>
            Your board decides which papers count. Your subjects decide what the
            record is kept in. Both are editable later in Settings.
          </div>

          {/* ── Question 1 · Board ─────────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, marginBottom: 14 }}>
              Which board do you follow?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              {BOARDS.map(b => (
                <OptionPill key={b} label={b} selected={board === b} onClick={() => setBoard(b)} />
              ))}
            </div>
          </div>

          {/* ── Question 2 · Subjects ──────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, marginBottom: 14 }}>
              Which subjects are you studying?
            </div>
            <div className="onboard-interests" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              {SUBJECTS.map(s => (
                <OptionPill key={s} label={s} selected={subjects.includes(s)} onClick={() => toggleSubject(s)} />
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 14, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>
          )}

          <button
            className="btn"
            onClick={finish}
            disabled={!ready || saving}
            style={{ padding: "14px 32px", fontSize: 13, opacity: !ready || saving ? 0.35 : 1 }}
          >
            {saving ? "Saving…" : "Open my ledger →"}
          </button>
        </div>
      </div>
    </div>
  );
}
