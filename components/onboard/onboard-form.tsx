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

export function OnboardForm() {
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [stream, setStream] = useState("");
  const [exam, setExam] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needsStream = grade && streamApplies(grade);
  const ready =
    grade && board && exam && (!needsStream || stream);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await completeOnboarding({
        grade,
        board,
        stream: needsStream ? stream : null,
        target_exam: exam,
      });
      if (res?.error) setErr(res.error);
    });
  }

  return (
    <div>
      <div className="u-brand mb-6 text-lg text-accent-strong lg:hidden">
        StudyLedger
      </div>
      <h1 className="text-xl font-bold text-text">Set up your ledger</h1>
      <p className="mt-1 text-sm text-text-2">
        Four questions. This calibrates every tool to your syllabus.
      </p>

      <div className="mt-7 space-y-6">
        <ChipGroup label="Grade" options={GRADES} value={grade} onChange={setGrade} />
        <ChipGroup label="Board" options={BOARDS} value={board} onChange={setBoard} />
        {needsStream && (
          <ChipGroup
            label="Stream"
            options={STREAMS}
            value={stream}
            onChange={setStream}
          />
        )}
        <ChipGroup
          label="Target exam"
          options={EXAMS}
          value={exam}
          onChange={setExam}
        />
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
