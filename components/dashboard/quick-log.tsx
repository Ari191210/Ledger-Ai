"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    setMinutes("30");
  }

  function submit() {
    setErr(null);
    start(async () => {
      const res =
        tab === "mistake"
          ? await logMistakeAction({ subject, topic })
          : tab === "pyq"
            ? await logPyqAction({ subject, total: Number(total), correct: Number(correct) })
            : await logFocusAction({ minutes: Number(minutes) });

      if ("error" in res) {
        setErr(res.error);
        return;
      }
      playClick("switch");
      setOpen(false);
      reset();
    });
  }

  return (
    <>
      <span onClick={launch} className="contents">
        {children}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="u-card w-full max-w-sm p-4"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
