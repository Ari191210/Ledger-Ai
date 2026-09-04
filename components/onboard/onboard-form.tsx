"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import {
  GRADES,
  BOARDS,
  STREAMS,
  EXAMS,
  streamApplies,
} from "@/lib/onboarding";
import { completeOnboarding } from "@/app/onboard/actions";

type Option = { readonly value: string; readonly label: string };

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-text-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onPointerDown={() => playClick("soft")}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "border-accent bg-accent text-accent-on"
                  : "border-border bg-surface-2 text-text-2 hover:text-text",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="w-full max-w-lg">
      <div className="u-brand mb-6 text-lg text-accent-strong">StudyLedger</div>
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
