"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { playClick } from "@/lib/sound";
import { logMistakeAction, logPyqAction, logFocusAction } from "@/app/(app)/dashboard/actions";
import { SUBJECTS } from "@/lib/subjects";

type Tab = "mistake" | "pyq" | "focus";

export function QuickLog({
  defaultTab = "mistake",
  children,
}: {
  defaultTab?: Tab;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [topic, setTopic] = useState("");
  const [total, setTotal] = useState("10");
  const [correct, setCorrect] = useState("7");
  const [predicted, setPredicted] = useState("");
  const [minutes, setMinutes] = useState("30");

  function launch() {
    setTab(defaultTab);
    setErr(null);
    setOpen(true);
  }

  function reset() {
    setTopic("");
    setTotal("10");
    setCorrect("7");
    setPredicted("");
    setMinutes("30");
  }

  function submit() {
    setErr(null);
    // Closed on the press, not on the reply. Logging is the thing a student
    // does most and always in the middle of something else: holding the modal
    // open until Postgres answers turns a two second capture into a wait. If
    // the write does fail the modal comes back with the values still in it and
    // the reason on screen, which is the only case where waiting was buying
    // anything.
    playClick("switch");
    setOpen(false);
    start(async () => {
      try {
        const res =
          tab === "mistake"
            ? await logMistakeAction({ subject, topic })
            : tab === "pyq"
              ? await logPyqAction({
                  subject,
                  total: Number(total),
                  correct: Number(correct),
                  predictedCorrect: predicted.trim() === "" ? null : Number(predicted),
                })
              : await logFocusAction({ minutes: Number(minutes) });

        if ("error" in res) {
          setErr(res.error);
          setOpen(true);
          return;
        }
        reset();
      } catch {
        // A server action that cannot reach the server throws rather than
        // returning an error, and with the modal already closed on the press
        // that threw away what the student had typed without telling them.
        // Closing early is only honest if every way it can fail brings the
        // form back.
        setErr("That didn't save. Check your connection and try again.");
        setOpen(true);
      }
    });
  }

  return (
    <>
      <span onClick={launch} className="contents">
        {children}
      </span>

      {/* Mounted only while open, and the entrance is a CSS animation playing
          into the resting state. There is no exit animation: unmounting is the
          exit, and needing one is the whole reason this used to carry an
          animation library. */}
      {open && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Log activity"
            onClick={(e) => e.stopPropagation()}
            className="modal-panel u-card w-full max-w-sm p-4"
          >
            <div className="flex items-center justify-between">
              <span className="u-label">log activity</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-text-3 hover:text-text"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3">
              <Segmented
                options={["mistake", "pyq", "focus"]}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
                size="sm"
              />
            </div>

            <div className="mt-4 space-y-3">
              {(tab === "mistake" || tab === "pyq") && (
                <label className="block">
                  <span className="u-label">subject</span>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}

              {tab === "mistake" && (
                <label className="block">
                  <span className="u-label">topic</span>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Rotational motion"
                    className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </label>
              )}

              {tab === "pyq" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="u-label">questions</span>
                    <input
                      type="number"
                      min={1}
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                  <label className="block">
                    <span className="u-label">correct</span>
                    <input
                      type="number"
                      min={0}
                      value={correct}
                      onChange={(e) => setCorrect(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                  {/* the prediction is what makes calibration possible: guess
                      first, then mark, and the gap between the two is the
                      thing worth knowing */}
                  <label className="col-span-2 block">
                    <span className="u-label">how many did you think you got? (optional)</span>
                    <input
                      type="number"
                      min={0}
                      value={predicted}
                      onChange={(e) => setPredicted(e.target.value)}
                      placeholder="guess before you mark it"
                      className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                </div>
              )}

              {tab === "focus" && (
                <label className="block">
                  <span className="u-label">minutes studied today</span>
                  <input
                    type="number"
                    min={1}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  />
                </label>
              )}
            </div>

            {err && <p className="mt-3 u-mono text-2xs text-negative">{err}</p>}

            <Button className="mt-4 w-full" disabled={pending} onClick={submit}>
              {pending ? "Saving…" : "Add"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
