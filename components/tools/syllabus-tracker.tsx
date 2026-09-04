"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/lib/subjects";
import type { SyllabusTopic } from "@/lib/study/types";
import { addTopicAction, deleteTopicAction, toggleTopicAction } from "@/app/(app)/tools/syllabus/actions";

export function SyllabusTracker({ topics }: { topics: SyllabusTopic[] }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [topic, setTopic] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, SyllabusTopic[]>();
    for (const t of topics) {
      const arr = m.get(t.subject) ?? [];
      arr.push(t);
      m.set(t.subject, arr);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [topics]);

  function add() {
    if (!topic.trim()) return;
    setErr(null);
    const list = grouped.find(([s]) => s === subject)?.[1] ?? [];
    start(async () => {
      const res = await addTopicAction({ subject, topic, position: list.length });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setTopic("");
    });
  }

  return (
    <div className="space-y-3">
      <section className="u-card p-4">
        <span className="u-label">new topic</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-md border border-border-2 bg-surface-2 px-2.5 py-2 text-xs text-text outline-none focus:border-accent"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Rotational motion"
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <Button size="sm" onClick={add} disabled={pending || !topic.trim()}>
            <Plus size={13} /> add
          </Button>
        </div>
        {err && <p className="mt-2 u-mono text-2xs text-negative">{err}</p>}
      </section>

      {grouped.length === 0 && (
        <p className="u-mono py-6 text-center text-2xs text-text-3">
          no topics yet — add your first one above and mark it off as you cover it
        </p>
      )}

      {grouped.map(([subj, rows]) => {
        const covered = rows.filter((t) => t.covered).length;
        return (
          <section key={subj} className="u-card p-4">
            <div className="flex items-center justify-between">
              <span className="u-label">{subj}</span>
              <span className="u-mono text-2xs text-text-3">
                {covered}/{rows.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-surface-3">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${(covered / rows.length) * 100}%` }}
              />
            </div>
            <div className="mt-2 divide-y divide-border">
              {rows.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <ToggleSwitch
                    checked={t.covered}
                    onChange={(v) =>
                      start(async () => {
                        await toggleTopicAction(t.id, v);
                      })
                    }
                    label={`Mark ${t.topic} covered`}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${t.covered ? "text-text-3 line-through" : "text-text"}`}
                  >
                    {t.topic}
                  </span>
                  <button
                    onClick={() => start(async () => { await deleteTopicAction(t.id); })}
                    aria-label={`Remove ${t.topic}`}
                    className="shrink-0 text-text-3 hover:text-negative"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
