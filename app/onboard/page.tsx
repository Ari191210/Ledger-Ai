"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mulish, IBM_Plex_Mono, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import { useAuth } from "@/components/auth-provider";
import { saveStudentProfile, loadUserData } from "@/lib/user-data";
import { supabase } from "@/lib/supabase";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ONBOARDING_PAGES,
  PAGE_COUNT,
  isComplete,
  dimensionWrites,
  type OnboardingAnswers,
  type OnboardingQuestion,
} from "@/lib/onboarding-questions";
import "../console/console.css";
gsap.registerPlugin(useGSAP);

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING — ten pages, one question each.
//
// `PRODUCT_DECISIONS` §2.6 as rewritten 2026-08-30; the reversal and its
// reasoning are recorded at §7.7. This file REPLACES the two-question single
// screen that M5-3 shipped under the previous §2.6.
//
// The script is not here. Every question, option, ordering and piece of
// helper copy lives in `lib/onboarding-questions.ts`, so this file is a
// renderer with no opinions of its own and the flow can be audited, tested
// and reordered without touching React.
//
// ── WHAT THE STRUCTURE GUARANTEES ────────────────────────────────────────
// · ONE question per page. Page 1 carries board and subjects together, for
//   the reason the script file states.
// · Progress is visible and BACK always works. §2.6: "a question a student
//   cannot un-answer is an interrogation."
// · Answers persist AS THEY ARE GIVEN, not at the end. A student who closes
//   the tab on page 6 keeps five answers; the profile is partial, which
//   architecture J.3.a treats as a legal state rather than an error.
// · Only board and subjects gate completion. The nine preference questions
//   are skippable by design — `isComplete()` in the script file is the same
//   rule `isOnboarded()` applies server-side, and it names those two only.
//
// ── WHY THE ANSWERS ARE WRITTEN AS EXPLICIT ──────────────────────────────
// The nine dimension answers go to `personal_model` as `explicit` signals,
// which architecture I.6 guarantees outrank anything later inferred from
// behaviour. That is the entire point of asking: an inferred model has
// nothing to say about a student on their first day.
// ═══════════════════════════════════════════════════════════════════════════

const sans = Mulish({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--console-sans", display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--console-mono", display: "swap",
});
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"], weight: ["400", "500", "600"], variable: "--console-deva", display: "swap", preload: false,
});
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"], weight: ["400", "500", "600"], variable: "--console-tamil", display: "swap", preload: false,
});

/** Where a half-finished flow is kept between visits. Local only: these are
 *  preferences, not academic record, and nothing here is evidence. */
const DRAFT_KEY = "ledger-onboarding-draft";

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const page = ONBOARDING_PAGES[index];
  const isLast = index === PAGE_COUNT - 1;

  // Restore a partial flow before anything renders, so a returning student
  // resumes rather than restarts.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { answers?: OnboardingAnswers; index?: number };
      if (draft.answers) setAnswers(draft.answers);
      if (typeof draft.index === "number" && draft.index > 0 && draft.index < PAGE_COUNT) {
        setIndex(draft.index);
      }
    } catch { /* a corrupt draft is discarded, never surfaced */ }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    // A student who has already declared board and subjects does not answer
    // again. Same rule as `isOnboarded()` server-side, with the pre-M5
    // `onboardingDone` flag still honoured.
    loadUserData(user.id)
      .then((ud) => {
        if (!ud) return;
        const declared = Boolean(ud.board) && Array.isArray(ud.interests) && ud.interests.length > 0;
        if (ud.onboardingDone === true || declared) router.replace("/dashboard");
      })
      .catch(() => {});
  }, [user, authLoading, router]);

  // Slide, not fade (PRODUCT_PRINCIPLES §6.5: press, slide, roll, fill).
  // Direction carries meaning: forward enters from the right, back from the
  // left, so the flow has a spatial sense rather than being a stack of modals.
  const directionRef = useRef(1);
  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.from(cardRef.current, {
      x: 24 * directionRef.current, autoAlpha: 0, duration: 0.34, ease: "power3.out",
      clearProps: "transform,opacity,visibility",
    });
  }, { dependencies: [index], scope: cardRef });

  const persistDraft = useCallback((next: OnboardingAnswers, nextIndex: number) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: next, index: nextIndex }));
    } catch { /* private mode: the flow still works, it just will not resume */ }
  }, []);

  function answer(q: OnboardingQuestion, optionId: string) {
    setAnswers((prev) => {
      let next: OnboardingAnswers;
      if (q.select === "many") {
        const current = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
        const toggled = current.includes(optionId)
          ? current.filter((x) => x !== optionId)
          : [...current, optionId];
        next = { ...prev, [q.id]: toggled };
      } else {
        next = { ...prev, [q.id]: optionId };
      }
      persistDraft(next, index);
      return next;
    });
  }

  const answered = (q: OnboardingQuestion, optionId: string) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.includes(optionId) : v === optionId;
  };

  // A page is passable when every question on it has an answer. Identity is
  // required; a preference page is passable the moment it is answered, and
  // skippable without one.
  const pageAnswered = page.questions.every((q) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0;
  });
  const identityPage = page.questions.some((q) => q.kind === "identity");

  function go(delta: number) {
    directionRef.current = delta;
    const next = Math.max(0, Math.min(PAGE_COUNT - 1, index + delta));
    setIndex(next);
    persistDraft(answers, next);
  }

  async function finish() {
    if (!user) return;
    if (!isComplete(answers)) { setIndex(0); return; }
    setSaving(true); setError("");

    const board = answers.board as string;
    const subjects = answers.subjects as string[];

    const { error: err } = await saveStudentProfile(
      user.id, { board, subjects, onboardingDone: true }, "onboarding",
    );
    if (err) {
      setError("Could not save. Check your connection and try again.");
      setSaving(false);
      return;
    }

    // The nine preferences, as EXPLICIT signals. Written straight from the
    // browser because `031_personal_model.sql` grants exactly this and nothing
    // more: `GRANT INSERT (student_id, dimension, explicit_value,
    // overridden_at)` and `GRANT UPDATE (explicit_value, overridden_at)` to
    // `authenticated`, under RLS scoped to `auth.uid() = student_id`. A student
    // can state a preference and can never touch `inferred_value` or
    // `confidence`, which is the column-level GRANT I.6 asks for.
    //
    // Deliberately not awaited into a hard failure: identity is already saved,
    // so nobody is held at the door because a preference write was slow. A
    // dropped preference is recoverable in Settings; a blocked signup is not.
    const writes = dimensionWrites(answers);
    if (writes.length > 0) {
      const now = new Date().toISOString();
      supabase
        .from("personal_model")
        .upsert(
          writes.map((w) => ({
            student_id: user.id,
            dimension: w.dimension,
            explicit_value: w.value,
            overridden_at: now,
          })),
          { onConflict: "student_id,dimension" },
        )
        .then(({ error: pmErr }) => {
          if (pmErr && process.env.NODE_ENV !== "production") {
            console.info("[onboarding] preference write failed:", pmErr.message);
          }
        });
    }

    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    // The walkthrough runs on first arrival and never again.
    router.replace("/dashboard?first=1");
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
        <span className="ob-wordmark">StudyLedger</span>
        <span className="ob-count">{index + 1} of {PAGE_COUNT}</span>
      </div>

      {/* A track, filled. Not a checklist: it reports position, and claims
          nothing about achievement (PRINCIPLES §4.3). */}
      <div className="ob-track" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={PAGE_COUNT}>
        <div className="ob-track-fill" style={{ width: `${((index + 1) / PAGE_COUNT) * 100}%` }} />
      </div>

      <div className="ob-outer">
        <div ref={cardRef} className="ob-card">
          {page.questions.map((q) => (
            <div key={q.id} className="ob-question">
              <h1 className="ob-prompt">{q.prompt}</h1>
              <p className="ob-because">{q.because}</p>
              <div className={`ob-grid ${q.options.length > 6 ? "ob-grid--dense" : ""}`}>
                {q.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => answer(q, o.id)}
                    aria-pressed={answered(q, o.id)}
                    className={`ob-pill ${answered(q, o.id) ? "ob-pill--selected" : ""}`}
                  >
                    <span className="ob-pill-text">
                      <span className="ob-pill-label">{o.label}</span>
                      {o.hint && <span className="ob-pill-hint">{o.hint}</span>}
                    </span>
                    <span className="ob-pill-check">{answered(q, o.id) && "✓"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {error && <div className="ob-error">{error}</div>}

          <div className="ob-actions">
            <button className="ob-back" onClick={() => go(-1)} disabled={index === 0}>
              ← Back
            </button>

            {isLast ? (
              <button className="ob-next" onClick={finish} disabled={saving}>
                {saving ? "Saving…" : "Open my ledger →"}
              </button>
            ) : (
              <button
                className="ob-next"
                onClick={() => go(1)}
                disabled={identityPage && !pageAnswered}
              >
                {pageAnswered ? "Next →" : identityPage ? "Next →" : "Skip →"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ob-header {
          padding: var(--s-3) var(--s-5);
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: var(--s-3);
        }
        .ob-wordmark {
          font-family: var(--type-interface);
          font-weight: 600;
          font-size: var(--t-label);
          letter-spacing: 0.02em;
          color: var(--accent);
        }
        .ob-count {
          font-family: var(--type-instrument);
          font-size: var(--t-micro);
          letter-spacing: 0.1em;
          color: var(--g-6);
          font-variant-numeric: tabular-nums;
        }
        .ob-track {
          height: 2px;
          background: var(--g-1);
        }
        .ob-track-fill {
          height: 100%;
          background: var(--g-7);
          transition: width var(--m-base) var(--ease-settle);
        }
        .ob-outer {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--s-6) var(--s-4);
        }
        .ob-card { width: 100%; max-width: 560px; }
        .ob-question { margin-bottom: var(--s-5); }
        .ob-prompt {
          font-family: var(--type-interface);
          font-weight: 500;
          font-size: var(--t-figure);
          letter-spacing: -0.01em;
          line-height: 1.2;
          color: var(--g-7);
          margin: 0 0 var(--s-1);
        }
        .ob-because {
          font-family: var(--type-interface);
          font-size: var(--t-body);
          color: var(--g-6);
          line-height: 1.5;
          margin: 0 0 var(--s-4);
        }
        .ob-grid { display: grid; grid-template-columns: 1fr; gap: var(--s-2); }
        .ob-grid--dense {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .ob-pill:hover { border-color: var(--g-5) !important; }
        .ob-pill--selected {
          border-color: var(--g-7) !important;
          background: var(--g-1) !important;
        }
        .ob-pill-text { display: flex; flex-direction: column; gap: 2px; }
        .ob-pill-label { line-height: 1.3; }
        .ob-pill-hint {
          font-size: var(--t-label);
          font-weight: 400;
          color: var(--g-6);
          line-height: 1.35;
        }
        .ob-pill-check {
          width: 20px; height: 20px;
          border-radius: 50%;
          border: 1px solid var(--g-4) !important;
          background: transparent !important;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
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
        .ob-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s-3);
          margin-top: var(--s-5);
        }
        .ob-back, .ob-next {
          min-height: 44px;
          padding: var(--control-pad-y) var(--s-4) !important;
          border-radius: var(--r-control);
          font-family: var(--type-instrument) !important;
          font-size: var(--t-label) !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity var(--m-fast) var(--ease-out);
        }
        .ob-back {
          border: 1px solid var(--g-4) !important;
          background: transparent !important;
          color: var(--g-6) !important;
        }
        .ob-next {
          border: 1px solid var(--g-7) !important;
          background: var(--g-7) !important;
          color: var(--g-0) !important;
        }
        .ob-back:disabled, .ob-next:disabled { cursor: not-allowed; opacity: 0.35; }
      `}</style>
    </div>
  );
}
