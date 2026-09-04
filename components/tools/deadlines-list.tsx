"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { playClick } from "@/lib/sound";
import { SUBJECTS } from "@/lib/subjects";
import type { Deadline, DeadlineKind } from "@/lib/study/deadlines";
import { addDeadlineAction, deleteDeadlineAction } from "@/app/(app)/tools/deadlines/actions";

const KINDS: DeadlineKind[] = ["assignment", "exam", "test", "other"];

function toUTCms(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function countdown(due: string, today: string): { label: string; tone: "over" | "soon" | "normal" } {
  const days = Math.round((toUTCms(due) - toUTCms(today)) / 86_400_000);
  if (days < 0) return { label: `overdue ${Math.abs(days)}d`, tone: "over" };
  if (days === 0) return { label: "today", tone: "soon" };
  if (days === 1) return { label: "tomorrow", tone: "soon" };
  if (days <= 3) return { label: `in ${days}d`, tone: "soon" };
  return { label: `in ${days}d`, tone: "normal" };
}

export function DeadlinesList({ deadlines, today }: { deadlines: Deadline[]; today: string }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [kind, setKind] = useState<DeadlineKind>("assignment");
  const [dueDate, setDueDate] = useState(today);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function add() {
    if (!title.trim()) return;
    setErr(null);
    start(async () => {
      const res = await addDeadlineAction({ title, subject, kind, due_date: dueDate });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setTitle("");
      playClick("switch");
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteDeadlineAction(id);
    });
  }

  return (
    <div className="space-y-3">
      <section className="u-card p-4">
        <span className="u-label">new deadline</span>
        <div className="mt-2 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Physics assignment 3"
            maxLength={80}
            className="w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={KINDS}
              value={kind}
              onChange={(v) => setKind(v as DeadlineKind)}
              size="sm"
            />
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-md border border-border-2 bg-surface-2 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-border-2 bg-surface-2 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <Button size="sm" onClick={add} disabled={pending || !title.trim()} className="ml-auto">
              <Plus size={13} /> add
            </Button>
          </div>
        </div>
        {err && <p className="mt-2 u-mono text-2xs text-negative">{err}</p>}
      </section>

      {deadlines.length === 0 && (
        <p className="u-mono py-6 text-center text-2xs text-text-3">
          nothing on the calendar — add your first deadline above
        </p>
      )}

      {deadlines.map((d) => {
        const c = countdown(d.due_date, today);
        return (
          <div key={d.id} className="u-card flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{d.title}</p>
              <p className="u-label mt-0.5">
                {d.kind}
                {d.subject && <span> · {d.subject.toLowerCase()}</span>}
              </p>
            </div>
            <span
              className={cn(
                "u-mono shrink-0 rounded-full px-2.5 py-1 text-2xs font-semibold",
                c.tone === "over"
                  ? "bg-negative-weak text-negative"
                  : c.tone === "soon"
                    ? "bg-accent-weak text-accent-strong"
                    : "bg-surface-2 text-text-2",
              )}
            >
              {c.label}
            </span>
            <button
              onClick={() => remove(d.id)}
              aria-label={`Remove ${d.title}`}
              className="shrink-0 text-text-3 hover:text-negative"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
