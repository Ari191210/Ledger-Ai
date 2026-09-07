"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playClick } from "@/lib/sound";
import { reviewMistakeAction } from "@/app/(app)/tools/spaced-review/actions";
import type { Mistake } from "@/lib/study/types";

export function ReviewQueue({ due }: { due: Mistake[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  function review(m: Mistake, remembered: boolean) {
    playClick(remembered ? "done" : "switch");
    setHidden((s) => new Set(s).add(m.id));
    start(async () => {
      await reviewMistakeAction(m.id, m.review_count, remembered);
    });
  }

  const visible = due.filter((m) => !hidden.has(m.id));

  if (visible.length === 0) {
    return (
      <section className="u-card p-8 text-center">
        <span className="u-led mx-auto block" />
        <p className="mt-3 text-sm font-semibold text-text">Queue clear</p>
        <p className="u-mono mt-1 text-2xs text-text-3">
          nothing due for review right now, check back later
        </p>
      </section>
    );
  }

  return (
    // Columns rather than one long column: a review queue is worked through
    // card by card, and seeing how much is left in one glance is the difference
    // between starting it and putting it off.
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((m) => (
        <div key={m.id} className="u-card flex items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{m.topic}</p>
            <p className="u-label mt-0.5">
              {m.subject}
              {m.review_count > 0 && <span> · reviewed {m.review_count}x</span>}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => review(m, false)}
            aria-label="Forgot"
          >
            <X size={14} />
          </Button>
          <Button size="sm" onClick={() => review(m, true)} aria-label="Remembered">
            <Check size={14} />
          </Button>
        </div>
      ))}
    </div>
  );
}
