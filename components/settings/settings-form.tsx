"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Segmented } from "@/components/ui/segmented";
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
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="u-card p-4">
      <span className="u-label">
        {index} <span className="mx-1 text-text-3/60">—</span> {title}
      </span>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? (
    <span className="u-mono text-2xs text-positive">saved</span>
  ) : null;
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

  function setThemeTo(next: "dark" | "light") {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sl-theme", next);
    } catch {}
    setTheme(next);
    playClick("soft");
  }

  function setSoundTo(next: "on" | "off") {
    const on = next === "on";
    setSoundOn(on);
    setSound(on);
    if (on) playClick("soft");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <span className="u-label">settings</span>
        <h1 className="mt-1 text-lg font-bold text-text">Settings</h1>
      </div>

      <Section index="01" title="profile">
        <label className="block">
          <span className="u-label">display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className="mt-1.5 w-full max-w-sm rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
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
      </Section>

      <Section index="02" title="syllabus">
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

      <Section index="03" title="preferences">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <span className="text-sm text-text">Appearance</span>
            <Segmented
              options={["dark", "light"]}
              value={theme}
              onChange={(v) => setThemeTo(v as "dark" | "light")}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-text">Interface sounds</span>
            <Segmented
              options={["on", "off"]}
              value={sound ? "on" : "off"}
              onChange={(v) => setSoundTo(v as "on" | "off")}
              size="sm"
            />
          </div>
        </div>
      </Section>

      <Section index="04" title="account">
        <div className="flex items-center justify-between">
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
    </div>
  );
}
