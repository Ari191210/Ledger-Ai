"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Sparkles, TimerIcon, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logMistakeAction } from "@/app/(app)/dashboard/actions";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import type { FieldSpec, ToolValues } from "@/lib/tools/prompts";
import type { AiResult } from "@/lib/ai/types";
import { Scene3D } from "@/components/tools/scene-3d";

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
  logMistake,
}: {
  slug: string;
  fields: FieldSpec[];
  /** field key (in minutes) that starts a countdown once a result lands, for timed tools. */
  timerFieldKey?: string;
  /**
   * Which fields carry the subject and topic, enabling "add to Fix Next" once
   * an answer lands. Without this an AI tool is a dead end: you get an answer
   * and the ledger never hears about the thing you were stuck on.
   */
  logMistake?: { subjectKey: string; topicKey: string };
}) {
  const [values, setValues] = useState<ToolValues>(() => defaultsFor(fields));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logging, startLogging] = useTransition();

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function set(key: string, v: string | number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  // Question sets mark misses per question; everything else offers one button
  // under the answer. Both end up writing the same kind of mistake row.
  const topicValue = logMistake ? String(values[logMistake.topicKey] ?? "").trim() : "";
  const qaLogTarget =
    logMistake && topicValue
      ? { subject: String(values[logMistake.subjectKey] ?? "").trim(), topic: topicValue }
      : undefined;
  const showLogCard = !!logMistake && result?.kind !== "qa";

  async function run() {
    setPending(true);
    setError(null);
    setResult(null);
    setSecondsLeft(null);
    setLogged(false);
    setLogError(null);
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
      if (typeof data.remaining === "number") setRemaining(data.remaining);
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
    // Two panes on a wide screen: what you ask on the left, what came back on
    // the right. The tool used to be one 576px column down the middle of a
    // 1440px page, so an answer pushed the form off the top of the screen and
    // most of the display showed nothing at all. The form stays put now, and
    // the answer has the room a worked solution actually needs.
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
      {/* min-w-0: a grid item is min-width:auto by default, so the horizontally
          scrolling subject picker inside would push the whole pane wider than
          the phone instead of scrolling within it. */}
      <div className="min-w-0 lg:sticky lg:top-4">
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
                <div className="overflow-x-auto pb-1">
                  <Segmented
                    options={f.options}
                    value={String(values[f.key])}
                    onChange={(v) => set(f.key, v)}
                    size="sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <Button onClick={run} disabled={pending} className="mt-4 w-full justify-center">
          <Sparkles size={14} /> {pending ? "thinking…" : "generate"}
        </Button>
        {error && <p className="mt-2 u-mono text-2xs text-negative">{error}</p>}

        {/* Only near the end. Counting down from the first request would make
            the allowance feel like the point, when most sessions never reach
            it. Running out with no warning at all is the thing to avoid. */}
        {remaining !== null && remaining <= 3 && (
          <p className="mt-2 u-mono text-2xs text-text-3">
            {remaining === 0
              ? "that was your last AI request for today"
              : `${remaining} AI ${remaining === 1 ? "request" : "requests"} left today`}
          </p>
        )}
      </section>
      </div>

      <div className="min-w-0 space-y-3">
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

      {result && <ResultView result={result} qaLogTarget={qaLogTarget} />}

      {result && showLogCard && (
        <section className="u-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm text-text">Still shaky on this?</p>
            <p className="u-mono mt-0.5 text-2xs text-text-3">
              {logged
                ? "added, it will come back in Fix Next and Spaced Review"
                : "put it in your ledger so it comes back until you have it"}
            </p>
          </div>
          <Button
            variant={logged ? "secondary" : "primary"}
            size="sm"
            disabled={logged || logging}
            onClick={() => {
              const subject = String(values[logMistake.subjectKey] ?? "").trim();
              const topic = String(values[logMistake.topicKey] ?? "").trim();
              if (!topic) {
                setLogError(`Fill in "${logMistake.topicKey}" first so this lands on a real topic.`);
                return;
              }
              setLogError(null);
              // Marked straight away and put back only if the write fails. The
              // student has told us something true about themselves; making
              // them watch a spinner to find out whether we believe it is the
              // wrong shape for that.
              setLogged(true);
              startLogging(async () => {
                const res = await logMistakeAction({ subject, topic });
                if (res && "error" in res) {
                  setLogged(false);
                  setLogError(res.error);
                }
              });
            }}
          >
            {logged ? <Check size={14} /> : <Plus size={14} />}
            {logged ? "in Fix Next" : "Add to Fix Next"}
          </Button>
          {logError && <p className="u-mono w-full text-2xs text-negative">{logError}</p>}
        </section>
      )}

      {/* An empty right pane on a wide screen reads as a broken page rather
          than as a tool waiting for input. Flat is evidence, not emptiness:
          say what will land here and what it costs. */}
      {!result && !pending && (
        <section className="u-card u-grille grid min-h-[16rem] place-items-center p-6 text-center">
          <div>
            <span className="u-label">no answer yet</span>
            <p className="u-mono mt-2 text-2xs text-text-3">
              fill the form and generate
            </p>
          </div>
        </section>
      )}

      {pending && (
        <section className="u-card u-grille grid min-h-[16rem] place-items-center p-6 text-center">
          <span className="u-mono text-2xs text-text-3">working on it</span>
        </section>
      )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  qaLogTarget,
}: {
  result: AiResult;
  qaLogTarget?: { subject: string; topic: string };
}) {
  if (result.kind === "text") {
    return (
      <div className="space-y-3">
        {/* The card fills the page; the prose inside it does not. A line of
            text 2000px wide is unreadable no matter how much room there is,
            because the eye loses its place on the return sweep. The diagram
            below takes all the width it is given, which is what width is
            actually worth having here. */}
        <section className="u-card space-y-3 p-4">
          {result.text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="max-w-[85ch] text-sm leading-relaxed text-text">
              {para}
            </p>
          ))}
        </section>
        {/* The diagram sits under the answer, never in place of it. A student
            who cannot see it, or who has motion turned off, has lost nothing
            from the explanation itself. */}
        {result.scene && <Scene3D scene={result.scene} />}
      </div>
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
    return <QaResult items={result.items} logTarget={qaLogTarget} />;
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

function QaResult({
  items,
  logTarget,
}: {
  items: { question: string; answer: string; explanation?: string }[];
  /**
   * When present, each question can be marked as missed and becomes a real
   * mistake row. This is what turns a generated practice set from a disposable
   * quiz into something that feeds Fix Next and Spaced Review: miss four
   * questions on one topic and that topic climbs your list on its own.
   */
  logTarget?: { subject: string; topic: string };
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [, startLogging] = useTransition();

  function markMissed(i: number) {
    if (!logTarget || missed.has(i)) return;
    playClick("tap");
    setMissed((s) => new Set(s).add(i));
    startLogging(async () => {
      await logMistakeAction({ subject: logTarget.subject, topic: logTarget.topic });
    });
  }

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
                className={cn(
                  "shrink-0 text-text-3 transition-[rotate] duration-200 ease-out",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {/* A grid row travelling 0fr to 1fr, not an animated height.
                Height is a layout property, so the old version ran layout,
                paint and composite on every frame of every answer a student
                opened. This one composites, and the browser never needs to
                measure the content to do it. */}
            <div
              aria-hidden={!isOpen}
              className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                  <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                    <p className="text-sm font-semibold text-accent-strong">{item.answer}</p>
                    {item.explanation && (
                      <p className="mt-1.5 text-xs text-text-2">{item.explanation}</p>
                    )}
                    {logTarget && (
                      <button
                        type="button"
                        onClick={() => markMissed(i)}
                        disabled={missed.has(i)}
                        className={cn(
                          "u-mono mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs transition-colors",
                          missed.has(i)
                            ? "border-border-2 bg-surface-2 text-text-3"
                            : "border-border-2 bg-surface-2 text-text-2 hover:text-text",
                        )}
                      >
                        {missed.has(i) ? <Check size={11} /> : <Plus size={11} />}
                        {missed.has(i) ? "logged to Fix Next" : "I got this wrong"}
                      </button>
                    )}
                  </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
