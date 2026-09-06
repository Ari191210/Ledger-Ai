/**
 * The rules a logged row has to pass, extracted from the server actions.
 *
 * They lived inline in `"use server"` files, which cannot be imported by a
 * test: pulling one in drags in the Supabase server client and `redirect`.
 * So the decisions about what a student is allowed to log were the one part of
 * the write path with no coverage at all, and a write path that silently
 * accepts the wrong thing is how a ledger stops being trustworthy.
 *
 * Pure. No database, no session, no framework.
 */

import { boundedText, MAX_NOTE } from "@/lib/text";

export type Invalid = { ok: false; error: string };
export type Valid<T> = { ok: true; value: T };

export type MistakeInput = { subject: string; topic: string; note?: string };
export type MistakeRow = { subject: string; topic: string; note?: string };

export function validateMistake(input: MistakeInput): Valid<MistakeRow> | Invalid {
  const subject = boundedText(input.subject, "Subject", 60);
  if (!subject.ok) return subject;
  const topic = boundedText(input.topic, "Topic");
  if (!topic.ok) return topic;
  const note = boundedText(input.note, "Note", MAX_NOTE, false);
  if (!note.ok) return note;

  return {
    ok: true,
    value: { subject: subject.value, topic: topic.value, note: note.value || undefined },
  };
}

export type PyqInput = {
  subject: string;
  total: number;
  correct: number;
  predictedCorrect?: number | null;
};
export type PyqRow = {
  subject: string;
  total: number;
  correct: number;
  predictedCorrect: number | null;
};

export function validatePyq(input: PyqInput): Valid<PyqRow> | Invalid {
  const subject = boundedText(input.subject, "Subject", 60);
  if (!subject.ok) return subject;

  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { ok: false, error: "Enter how many questions you attempted." };
  }
  if (!Number.isFinite(input.correct) || input.correct < 0 || input.correct > input.total) {
    return { ok: false, error: "Correct can't exceed the total." };
  }

  // A prediction is optional, but a nonsensical one is not: calibration
  // differences it against the real score, so garbage in is a wrong claim out.
  const predicted = input.predictedCorrect;
  if (predicted !== null && predicted !== undefined) {
    if (!Number.isFinite(predicted) || predicted < 0 || predicted > input.total) {
      return { ok: false, error: "Your guess can't be negative or exceed the total." };
    }
  }

  return {
    ok: true,
    value: {
      subject: subject.value,
      total: input.total,
      correct: input.correct,
      predictedCorrect: predicted ?? null,
    },
  };
}

export function validateFocusMinutes(minutes: number): Valid<number> | Invalid {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { ok: false, error: "Enter minutes greater than zero." };
  }
  // Rounded here rather than at the call site, so the number reaching the
  // database is the number these rules approved. Rounding is the reason for the
  // second guard: 0.4 clears "greater than zero" and then rounds to nothing,
  // which would report success while logging no study at all.
  const whole = Math.round(minutes);
  if (whole <= 0) return { ok: false, error: "That session is under a minute." };
  return { ok: true, value: whole };
}
