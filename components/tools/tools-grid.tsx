"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  BookOpen,
  PenLine,
  Target,
  Compass,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import {
  CATEGORIES,
  TOOLS,
  toolsByCategory,
  type ToolCategory,
} from "@/lib/tools/registry";

const CATEGORY_ICON: Record<ToolCategory, LucideIcon> = {
  plan: CalendarDays,
  learn: BookOpen,
  write: PenLine,
  practise: Target,
  future: Compass,
  track: Activity,
};

const SIGNATURE = TOOLS.filter((t) => t.signature);
const FILTERS = ["all", ...CATEGORIES.map((c) => c.id)] as const;

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <span className="u-label">
      {index} <span className="mx-1 text-text-3/60">—</span> {children}
    </span>
  );
}

export function ToolsGrid() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const cats =
    filter === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === filter);

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <Segmented
          options={FILTERS as unknown as string[]}
          value={filter}
          onChange={(v) => setFilter(v as (typeof FILTERS)[number])}
        />
      </div>

      {filter === "all" && (
        <section className="mt-7">
          <SectionLabel index="00">signature</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNATURE.map((t) => {
              const Icon = CATEGORY_ICON[t.category];
              return (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="u-card u-card--hover u-grille flex min-h-[9.5rem] flex-col justify-between p-5"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-9 place-items-center rounded-md border border-border bg-surface-2 text-accent-strong">
                      <Icon size={16} />
                    </span>
                    <ArrowUpRight size={14} className="text-text-3" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{t.name}</p>
                    <p className="mt-1 text-xs text-text-2">{t.blurb}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {cats.map((c) => {
        const Icon = CATEGORY_ICON[c.id];
        const idx = CATEGORIES.findIndex((x) => x.id === c.id) + 1;
        return (
          <section key={c.id} className="mt-8">
            <div className="flex items-center gap-2">
              <Icon size={13} className="text-text-3" />
              <SectionLabel index={String(idx).padStart(2, "0")}>{c.label.toLowerCase()}</SectionLabel>
              <span className="u-mono hidden text-2xs text-text-3 sm:inline">— {c.blurb}</span>
            </div>

            <div className="mt-3 divide-y divide-border rounded-[13px] border border-border">
              {toolsByCategory(c.id).map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-text">
                    {t.name}
                    {t.signature && <span className="ml-1.5 text-accent-strong">★</span>}
                  </span>
                  <span className="flex-1 truncate text-xs text-text-2">{t.blurb}</span>
                  {t.kind === "stub" && (
                    <span className="u-mono shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] text-text-3">
                      soon
                    </span>
                  )}
                  <ArrowUpRight size={13} className="shrink-0 text-text-3" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
