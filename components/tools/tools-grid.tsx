"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import {
  CATEGORIES,
  TOOLS,
  toolsByCategory,
} from "@/lib/tools/registry";

const SIGNATURE = TOOLS.filter((t) => t.signature);
const FILTERS = ["all", ...CATEGORIES.map((c) => c.id)] as const;

/**
 * No ordinal here, deliberately. The dashboard numbers its panels because it is
 * an instrument face: the gauges sit in fixed positions and a student learns
 * where to look. Tool categories are a set, not a sequence, so "00 - signature"
 * was numbering for the look of numbering. Same label, no false ordinal.
 */
function SectionLabel({ children }: { children: string }) {
  return <span className="u-label">{children}</span>;
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
          <SectionLabel>signature</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNATURE.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="u-card u-card--hover u-grille flex min-h-[9.5rem] flex-col justify-between p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-md border border-border bg-surface-2 text-accent-strong">
                    <t.icon size={16} />
                  </span>
                  <ArrowUpRight size={14} className="text-text-3" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{t.name}</p>
                  <p className="mt-1 text-xs text-text-2">{t.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cats.map((c) => {
        return (
          <section key={c.id} className="mt-8">
            <div className="flex items-center gap-2">
              <c.icon size={13} className="text-text-3" />
              <SectionLabel>{c.label.toLowerCase()}</SectionLabel>
              <span className="u-mono hidden text-2xs text-text-3 sm:inline">· {c.blurb}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {toolsByCategory(c.id).map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  title={t.blurb}
                  className="group relative flex flex-col items-center gap-2 rounded-[11px] border border-border bg-surface-2 p-3 text-center transition-colors hover:border-border-2 hover:bg-surface-3"
                >
                  {t.signature && (
                    <span className="absolute right-2 top-2 text-2xs text-accent-strong">★</span>
                  )}
                  {/* There was a "coming soon" dot here, keyed off kind
                      "stub". Every tool that carried it was fully built and
                      working, including three signature ones, so the grid was
                      telling students that seven finished tools did not exist
                      yet. Nothing in the registry is unbuilt; the dot is gone
                      rather than re-pointed at something else. */}
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-md bg-surface text-text-2 transition-colors",
                      "group-hover:text-accent-strong",
                    )}
                  >
                    <t.icon size={16} />
                  </span>
                  <span className="line-clamp-2 text-2xs font-medium leading-tight text-text">
                    {t.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
