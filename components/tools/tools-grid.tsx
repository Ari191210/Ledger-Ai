"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { CATEGORIES, TOOLS, type ToolCategory } from "@/lib/tools/registry";

const FILTERS = ["all", ...CATEGORIES.map((c) => c.id)] as const;

export function ToolsGrid() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const shown =
    filter === "all" ? TOOLS : TOOLS.filter((t) => t.category === (filter as ToolCategory));

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <Segmented
          options={FILTERS as unknown as string[]}
          value={filter}
          onChange={(v) => setFilter(v as (typeof FILTERS)[number])}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="u-card u-card--hover flex flex-col justify-between p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="u-label">
                {t.category}
                {t.signature && <span className="ml-1.5 text-accent-strong">★</span>}
              </span>
              <ArrowUpRight size={13} className="shrink-0 text-text-3" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text">{t.name}</p>
                {t.kind === "stub" && (
                  <span className="u-mono rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] text-text-3">
                    soon
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-2">{t.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CategoryLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {CATEGORIES.map((c) => (
        <span key={c.id} className={cn("u-mono text-2xs text-text-3")}>
          {c.label.toLowerCase()} — {c.blurb}
        </span>
      ))}
    </div>
  );
}
