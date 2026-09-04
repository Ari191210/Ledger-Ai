"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import type { FieldSpec, ToolValues } from "@/lib/tools/prompts";
import type { AiResult } from "@/lib/ai/types";

function defaultsFor(fields: FieldSpec[]): ToolValues {
  const v: ToolValues = {};
  for (const f of fields) {
    if (f.type === "number") v[f.key] = f.default;
    else if (f.type === "select") v[f.key] = f.default ?? f.options[0];
    else v[f.key] = "";
  }
  return v;
}

export function AiTool({
  slug,
  fields,
  timerFieldKey,
}: {
  slug: string;
  fields: FieldSpec[];
  /** field key (in minutes) that starts a countdown once a result lands, for timed tools. */
  timerFieldKey?: string;
}) {
  const [values, setValues] = useState<ToolValues>(() => defaultsFor(fields));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function set(key: string, v: string | number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function run() {
    setPending(true);
    setError(null);
    setResult(null);
    setSecondsLeft(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: slug, values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      playClick("done");
      setResult(data.result);
      if (timerFieldKey) {
        const minutes = Number(values[timerFieldKey]) || 0;
        if (minutes > 0) setSecondsLeft(minutes * 60);
      }
    } catch {
      setError("Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="u-card p-4">
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="u-label mb-1.5 block">{f.label}</label>
              {f.type === "textarea" && (
                <textarea
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={f.rows ?? 4}
                  maxLength={6000}
                  className="w-full resize-y rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              )}
              {f.type === "text" && (
                <input
                  type="text"
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  maxLength={200}
                  className="w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              )}
              {f.type === "number" && (
                <input
                  type="number"
                  value={values[f.key] as number}
                  min={f.min}
                  max={f.max}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                  className="w-28 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              )}
              {f.type === "select" && (
                <Segmented
                  options={f.options}
                  value={String(values[f.key])}
                  onChange={(v) => set(f.key, v)}
                  size="sm"
                />
              )}
            </div>
          ))}
        </div>
        <Button onClick={run} disabled={pending} className="mt-4 w-full justify-center">
          <Sparkles size={14} /> {pending ? "thinking…" : "generate"}
        </Button>
        {error && <p className="mt-2 u-mono text-2xs text-negative">{error}</p>}
      </section>

      {result && secondsLeft !== null && (
        <section
          className={cn(
            "u-card flex items-center justify-center gap-2 p-3",
            secondsLeft === 0 && "border-negative",
          )}
        >
          <TimerIcon size={14} className={secondsLeft === 0 ? "text-negative" : "text-accent-strong"} />
          <span className={cn("u-stat-number text-lg", secondsLeft === 0 ? "text-negative" : "text-text")}>
            {secondsLeft > 0
              ? `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
              : "time's up"}
          </span>
        </section>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: AiResult }) {
  if (result.kind === "text") {
    return (
      <section className="u-card space-y-3 p-4">
        {result.text.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="text-sm leading-relaxed text-text">
            {para}
          </p>
        ))}
      </section>
    );
  }

  if (result.kind === "list") {
    return (
      <section className="u-card p-4">
        <div className="divide-y divide-border">
          {result.items.map((item, i) => (
            <div key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="u-stat-number text-sm text-accent-strong">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-2">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (result.kind === "qa") {
    return <QaResult items={result.items} />;
  }

  return (
    <section className="u-card p-5">
      <div className="text-center">
        <span className="u-label">score</span>
        <div className="u-stat-number mt-1 text-5xl leading-none text-accent-strong">
          {result.overall}
          <span className="text-lg text-text-3">/{result.max}</span>
        </div>
      </div>
      <p className="u-mono mt-3 text-2xs text-text-3">{result.summary}</p>
      <div className="mt-4 space-y-3">
        {result.criteria.map((c, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text">{c.label}</span>
              <span className="u-mono text-text-2">
                {c.score}/{c.max}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 bg-surface-3">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${(c.score / c.max) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-2">{c.feedback}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QaResult({ items }: { items: { question: string; answer: string; explanation?: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    playClick("soft");
    setOpen((s) => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} className="u-card overflow-hidden p-0">
            <button
              onClick={() => toggle(i)}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <span className="u-stat-number w-6 shrink-0 text-sm text-text-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 text-sm text-text">{item.question}</span>
              <ChevronDown
                size={14}
                className={cn("shrink-0 text-text-3 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                    <p className="text-sm font-semibold text-accent-strong">{item.answer}</p>
                    {item.explanation && (
                      <p className="mt-1.5 text-xs text-text-2">{item.explanation}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
