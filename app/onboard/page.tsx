"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mulish, IBM_Plex_Mono, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import { useAuth } from "@/components/auth-provider";
import { saveStudentProfile, loadUserData } from "@/lib/user-data";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BOARDS } from "@/lib/onboarding-constants";
import "../console/console.css";
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
//
// MOVED TO CONSOLE, 2026-08-21 — this file previously rendered on the
// pre-Console legacy tokens (`--serif` italic headings, `--cinnabar` accent,
// `--paper`/`--ink`). Content and behaviour are unchanged; only the token
// layer moved, matching /auth, /home and the rest of V1. Selection state uses
// weight (an ink-filled check), never hue, per `PRODUCT_PRINCIPLES` §6.6 —
// the same reason Control's primary tier is ink rather than the accent.
// ═══════════════════════════════════════════════════════════════════════════

const sans = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--console-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--console-mono",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--console-deva",
  display: "swap",
  preload: false,
});

const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600"],
  variable: "--console-tamil",
  display: "swap",
  preload: false,
});

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
        if (ud.onboardingDone === true || declared) router.replace("/capture");
      })
      .catch(() => {});
  }, [user, authLoading, router]);

  function toggleSubject(s: string) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const ready = board !== "" && subjects.length > 0;

  // Local closure, not a separate component — styled-jsx's <style jsx> below
  // only scopes JSX literals written inside THIS component's own render tree
  // (same reason /auth's `inp()` helper is a closure, not its own component).
  // A genuinely separate `function OptionPill(...)` never receives the scope
  // class, so `.ob-pill` silently matched nothing and every legacy global
  // `button` reset in globals.css won by default instead.
  const optionPill = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      aria-pressed={selected}
      className={`ob-pill ${selected ? "ob-pill--selected" : ""}`}
    >
      <span className="ob-pill-label">{label}</span>
      <span className="ob-pill-check">{selected && "✓"}</span>
    </button>
  );

  async function finish() {
    if (!user || !ready) return;
    setSaving(true); setError("");
    const { error: err } = await saveStudentProfile(
      user.id,
      { board, subjects, onboardingDone: true },
      "onboarding",
    );
    if (err) { setError("Could not save. Check your connection and try again."); setSaving(false); return; }
    router.replace("/capture");
  }

  const shellClass = `${sans.variable} ${mono.variable} ${devanagari.variable} ${tamil.variable}`;

  if (authLoading || !user) return (
    <div data-console className={shellClass} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--g-0)" }}>
      <span style={{ fontFamily: "var(--type-instrument)", fontSize: "var(--t-label)", color: "var(--g-6)" }}>Loading…</span>
    </div>
  );

  return (
    <div data-console className={shellClass} style={{ minHeight: "100vh", background: "var(--g-0)" }}>
      <div className="ob-header">
        {/* The single bounded accent on this screen (PRODUCT_PRINCIPLES §6.2,
            amended 2026-08-21) — the wordmark, and nothing else. */}
        <span className="ob-wordmark">StudyLedger</span>
      </div>

      <div className="ob-outer">
        <div ref={screenRef} className="ob-card">
          <h1 className="ob-title">Two questions.</h1>
          <p className="ob-subtext">
            Your board decides which papers count. Your subjects decide what the
            record is kept in. Both are editable later in Settings.
          </p>

          {/* ── Question 1 · Board ─────────────────────────────────────── */}
          <div className="ob-question">
            <div className="ob-question-title">Which board do you follow?</div>
            <div className="ob-grid">
              {BOARDS.map(b => optionPill(b, board === b, () => setBoard(b)))}
            </div>
          </div>

          {/* ── Question 2 · Subjects ──────────────────────────────────── */}
          <div className="ob-question ob-question--last">
            <div className="ob-question-title">Which subjects are you studying?</div>
            <div className="ob-grid">
              {SUBJECTS.map(s => optionPill(s, subjects.includes(s), () => toggleSubject(s)))}
            </div>
          </div>

          {error && <div className="ob-error">{error}</div>}

          <button className="ob-finish" onClick={finish} disabled={!ready || saving}>
            {saving ? "Saving…" : "Open my ledger →"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .ob-header {
          padding: var(--s-3) var(--s-5);
          border-bottom: 1px solid var(--g-4);
        }
        .ob-wordmark {
          font-family: var(--type-interface);
          font-weight: 600;
          font-size: var(--t-label);
          letter-spacing: 0.02em;
          color: var(--accent);
        }
        .ob-outer {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--s-6) var(--s-4) var(--s-6);
        }
        .ob-card { width: 100%; max-width: 560px; }
        .ob-title {
          font-family: var(--type-interface);
          font-weight: 500;
          font-size: var(--t-figure);
          letter-spacing: -0.01em;
          line-height: 1.15;
          color: var(--g-7);
          margin: 0 0 var(--s-1);
        }
        .ob-subtext {
          font-family: var(--type-interface);
          font-size: var(--t-body);
          color: var(--g-6);
          line-height: 1.5;
          margin: 0 0 var(--s-5);
        }
        .ob-question { margin-bottom: var(--s-5); }
        .ob-question--last { margin-bottom: var(--s-4); }
        .ob-question-title {
          font-family: var(--type-interface);
          font-weight: 500;
          font-size: var(--t-title);
          color: var(--g-7);
          margin-bottom: var(--s-3);
        }
        .ob-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--s-2);
        }
        .ob-pill {
          width: 100%;
          min-height: 44px;
          padding: var(--control-pad-y) var(--s-3) !important;
          border-radius: var(--r-control);
          border: 1px solid var(--g-4) !important;
          background: var(--g-3) !important;
          color: var(--g-7) !important;
          cursor: pointer;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--s-2);
          transition: border-color var(--m-fast) var(--ease-out), background var(--m-fast) var(--ease-out);
          font-family: var(--type-interface) !important;
          font-size: var(--t-body) !important;
          font-weight: 500;
        }
        .ob-pill--selected {
          border-color: var(--g-7) !important;
          background: var(--g-1) !important;
        }
        .ob-pill-label { line-height: 1.3; }
        .ob-pill-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid var(--g-4) !important;
          background: transparent !important;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: var(--g-0) !important;
          transition: background var(--m-fast) var(--ease-out), border-color var(--m-fast) var(--ease-out);
        }
        .ob-pill--selected .ob-pill-check {
          border-color: var(--g-7) !important;
          background: var(--g-7) !important;
        }
        .ob-error {
          margin-bottom: var(--s-3);
          font-family: var(--type-interface);
          font-size: var(--t-label);
          color: var(--error);
        }
        .ob-finish {
          min-height: 44px;
          padding: var(--control-pad-y) var(--s-5) !important;
          border-radius: var(--r-control);
          border: 1px solid var(--g-7) !important;
          background: var(--g-7) !important;
          color: var(--g-0) !important;
          font-family: var(--type-instrument) !important;
          font-size: var(--t-label) !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity var(--m-fast) var(--ease-out);
        }
        .ob-finish:disabled { cursor: not-allowed; opacity: 0.35; }
      `}</style>
    </div>
  );
}
