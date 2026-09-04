"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { GRADES, BOARDS, STREAMS, EXAMS, streamApplies } from "@/lib/onboarding";
import { isSoundOn, setSoundOn, playClick } from "@/lib/sound";
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
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="u-card p-5">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? (
    <span className="text-xs font-medium text-positive">Saved</span>
  ) : null;
}

export function SettingsForm(p: Props) {
  // ── profile ──
  const [name, setName] = useState(p.displayName);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [savingName, startName] = useTransition();
  const nameDirty = name.trim() !== p.displayName;

  // ── syllabus ──
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
  const sylValid =
    grade && board && exam && (!needsStream || stream);

  // ── preferences ──
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
    playClick("soft");
  }

  function toggleSound() {
    const next = !sound;
    setSoundOn(next);
    setSound(next);
    if (next) playClick("soft");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-text">Settings</h1>

      <Section title="Profile">
        <label className="block">
          <span className="text-xs font-semibold text-text-2">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className="mt-1.5 w-full max-w-sm rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        {nameErr && <p className="mt-2 text-xs text-negative">{nameErr}</p>}
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
      </Section>

      <Section title="Syllabus">
        <div className="space-y-5">
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
        {sylErr && <p className="mt-3 text-xs text-negative">{sylErr}</p>}
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

      <Section title="Preferences">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <span className="text-sm text-text">Appearance</span>
            <Button size="sm" variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? "Dark" : "Light"}
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-text">Interface sounds</span>
            <Button size="sm" variant="secondary" onClick={toggleSound}>
              {sound ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-3">Signed in as</p>
            <p className="text-sm text-text">{p.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" size="sm" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}
