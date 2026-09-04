"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, User, ListTree, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { GRADES, BOARDS, STREAMS, EXAMS, streamApplies } from "@/lib/onboarding";
import { isSoundOn, setSoundOn, playClick } from "@/lib/sound";
import { flashTheme } from "@/lib/theme-flash";
import { saveSyllabus, saveDisplayName } from "@/app/(app)/settings/actions";

type Props = {
  email: string;
  displayName: string;
  grade: string;
  board: string;
  stream: string;
  targetExam: string;
};

function Section({
  index,
  title,
  icon: Icon,
  children,
}: {
  index: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section className="u-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-md border border-border bg-surface-2 text-text-3">
          <Icon size={12} />
        </span>
        <span className="u-label">
          {index} <span className="mx-1 text-text-3/60">—</span> {title}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Saved({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8, x: -4 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="u-mono inline-flex items-center gap-1 text-2xs text-positive"
        >
          <Check size={12} /> saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function SettingsForm(p: Props) {
  const [name, setName] = useState(p.displayName);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [savingName, startName] = useTransition();
  const nameDirty = name.trim() !== p.displayName;

  const [grade, setGrade] = useState(p.grade);
  const [board, setBoard] = useState(p.board);
  const [stream, setStream] = useState(p.stream);
  const [exam, setExam] = useState(p.targetExam);
  const [sylSaved, setSylSaved] = useState(false);
  const [sylErr, setSylErr] = useState<string | null>(null);
  const [savingSyl, startSyl] = useTransition();

  const needsStream = grade && streamApplies(grade);
  const sylDirty =
    grade !== p.grade ||
    board !== p.board ||
    exam !== p.targetExam ||
    (needsStream ? stream : "") !== (streamApplies(p.grade) ? p.stream : "");
  const sylValid = grade && board && exam && (!needsStream || stream);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sound, setSound] = useState(true);
  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "light" ? "light" : "dark",
    );
    setSound(isSoundOn());
  }, []);

  function saveName() {
    setNameErr(null);
    startName(async () => {
      const r = await saveDisplayName(name);
      if ("error" in r) setNameErr(r.error);
      else {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
      }
    });
  }

  function saveSyl() {
    setSylErr(null);
    startSyl(async () => {
      const r = await saveSyllabus({
        grade,
        board,
        stream: needsStream ? stream : null,
        target_exam: exam,
      });
      if ("error" in r) setSylErr(r.error);
      else {
        setSylSaved(true);
        setTimeout(() => setSylSaved(false), 2000);
      }
    });
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sl-theme", next);
    } catch {}
    setTheme(next);
    flashTheme();
  }

  function toggleSound(next: boolean) {
    setSoundOn(next);
    setSound(next);
    if (next) playClick("soft");
  }

  const initial = (name.trim()[0] || p.email[0] || "?").toUpperCase();
  const summary = [grade && `grade ${grade}`, board, needsStream ? stream : null, exam]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Reveal>
        <div className="flex items-center justify-between">
          <div>
            <span className="u-label">settings</span>
            <h1 className="mt-1 text-lg font-bold text-text">Settings</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="u-mono hidden text-2xs text-text-3 sm:block">{summary}</span>
            <span className="grid size-8 place-items-center rounded-full border border-border-2 bg-surface-2 text-xs font-bold text-text-2">
              {initial}
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.03}>
        <Section index="01" title="profile" icon={User}>
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border-2 bg-surface-2 text-sm font-bold text-text-2">
              {initial}
            </span>
            <div className="flex-1">
              <label className="block">
                <span className="u-label">display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Your name"
                  className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
                />
              </label>
              {nameErr && <p className="mt-2 u-mono text-2xs text-negative">{nameErr}</p>}
              <div className="mt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!nameDirty || savingName}
                  onClick={saveName}
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
                <Saved show={nameSaved} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <div>
              <span className="u-label">signed in as</span>
              <p className="u-mono mt-0.5 text-xs text-text">{p.email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <Button type="submit" size="sm" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </Section>
      </Reveal>

      <Reveal delay={0.06}>
        <Section index="02" title="syllabus" icon={ListTree}>
          <div className="space-y-5">
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
          </div>
          {sylErr && <p className="mt-3 u-mono text-2xs text-negative">{sylErr}</p>}
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="sm"
              disabled={!sylDirty || !sylValid || savingSyl}
              onClick={saveSyl}
            >
              {savingSyl ? "Saving…" : "Save changes"}
            </Button>
            <Saved show={sylSaved} />
          </div>
        </Section>
      </Reveal>

      <Reveal delay={0.09}>
        <Section index="03" title="preferences" icon={SlidersHorizontal}>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-3 first:pt-0">
              <div>
                <span className="text-sm text-text">Appearance</span>
                <p className="u-mono text-2xs text-text-3">{theme}</p>
              </div>
              <ToggleSwitch checked={theme === "light"} onChange={toggleTheme} label="Appearance" />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="text-sm text-text">Interface sounds</span>
                <p className="u-mono text-2xs text-text-3">{sound ? "on" : "off"}</p>
              </div>
              <ToggleSwitch checked={sound} onChange={toggleSound} label="Interface sounds" />
            </div>
          </div>
        </Section>
      </Reveal>
    </div>
  );
}
