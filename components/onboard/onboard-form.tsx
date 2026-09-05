"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import {
  GRADES,
  BOARDS,
  STREAMS,
  EXAMS,
  streamApplies,
} from "@/lib/onboarding";
import { completeOnboarding } from "@/app/onboard/actions";
import { MIN_AGE } from "@/lib/age";

// no future dates, and nobody younger than we accept
const MAX_DOB = (() => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
})();

export function OnboardForm() {
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [stream, setStream] = useState("");
  const [exam, setExam] = useState("");
  const [dob, setDob] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needsStream = grade && streamApplies(grade);
  const ready =
    grade && board && exam && dob && (!needsStream || stream);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await completeOnboarding({
        grade,
        board,
        stream: needsStream ? stream : null,
        target_exam: exam,
        date_of_birth: dob,
      });
      if (res?.error) setErr(res.error);
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>
      <span className="u-label">setup</span>
      <h1 className="mt-2 text-xl font-bold text-text">Set up your ledger</h1>
      <p className="mt-1 text-sm text-text-2">
        Five questions. This calibrates every tool to your syllabus.
      </p>

      <div className="mt-7 space-y-6">
        <ChipGroup label="grade" options={GRADES} value={grade} onChange={setGrade} />
        <ChipGroup label="board" options={BOARDS} value={board} onChange={setBoard} />
        {needsStream && (
          <ChipGroup
            label="stream"
            options={STREAMS}
            value={stream}
            onChange={setStream}
          />
        )}
        <ChipGroup
          label="target exam"
          options={EXAMS}
          value={exam}
          onChange={setExam}
        />

        <label className="block">
          <span className="u-label">date of birth</span>
          <input
            type="date"
            required
            value={dob}
            max={MAX_DOB}
            onChange={(e) => setDob(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <span className="mt-1.5 block text-xs leading-relaxed text-text-3">
            India&apos;s data protection law treats under-18s differently, so we have to
            know. Nothing changes about your account today.
          </span>
        </label>
      </div>

      {err && <p className="mt-4 text-xs text-negative">{err}</p>}

      <Button
        onClick={submit}
        size="lg"
        disabled={!ready || pending}
        className="mt-7 w-full"
      >
        {pending ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}
