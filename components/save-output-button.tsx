"use client";

import { useState } from "react";
import { saveOutput } from "@/lib/saved-outputs";

type Props = {
  toolSlug: string;
  toolName: string;
  input: string;
  outputText: string;
};

export default function SaveOutputButton({ toolSlug, toolName, input, outputText }: Props) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (saved) return;
    saveOutput({
      toolSlug,
      toolName,
      input: input.trim().slice(0, 300),
      outputText: outputText.trim().slice(0, 8000),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <button
      className="btn ghost"
      onClick={handleSave}
      style={{
        padding: "6px 14px",
        fontSize: 11,
        color: saved ? "var(--cinnabar-ink)" : "var(--ink-3)",
        transition: "color 200ms",
      }}
    >
      {saved ? "Saved ✓" : "Save →"}
    </button>
  );
}
